import { storage } from "./storage";

const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;
const STARTUP_DELAY_MS = 2 * 60 * 1000; // 2 min after boot

async function getBuildOpsCreds(): Promise<{ clientId: string; clientSecret: string; tenantId: string } | null> {
  const clientId = await storage.getAppSetting("buildopsClientId");
  const clientSecret = await storage.getAppSetting("buildopsClientSecret");
  const tenantId = await storage.getAppSetting("buildopsTenantId");
  if (!clientId || !clientSecret || !tenantId) return null;
  return { clientId, clientSecret, tenantId };
}

const parseDate = (d?: any): Date | null => {
  if (d === null || d === undefined || d === "") return null;
  const n = typeof d === "number" ? d : (/^\d{9,11}$/.test(String(d)) ? Number(d) : null);
  if (n !== null) return new Date(n > 9e8 && n < 4e9 ? n * 1000 : n);
  const s = String(d);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, day] = s.split("-").map(Number);
    return new Date(y, m - 1, day);
  }
  const parsed = new Date(s);
  return isNaN(parsed.getTime()) ? null : parsed;
};

async function runSync() {
  console.log("[auto-sync] Starting scheduled BuildOps sync…");
  try {
    const creds = await getBuildOpsCreds();
    if (!creds) {
      console.log("[auto-sync] BuildOps not configured — skipping.");
      return;
    }

    const { getCustomers, getJobs, getInvoices, getAllServiceAgreements } = await import("./buildops");
    const { db } = await import("./db");
    const { eq } = await import("drizzle-orm");
    const { buildopsJobs, buildopsInvoices, buildopsAgreements } = await import("@shared/schema");

    // ── 1. Customers ─────────────────────────────────────────────────────────
    let allCustomers: any[] = [];
    let page = 1;
    while (true) {
      const batch = await getCustomers(creds.clientId, creds.clientSecret, creds.tenantId, page, 100);
      allCustomers = allCustomers.concat(batch.items ?? []);
      if (allCustomers.length >= batch.totalCount || (batch.items ?? []).length === 0) break;
      page++;
    }

    const allClients = await storage.listClients();
    let custCreated = 0, custUpdated = 0;

    const buildFieldsFromCustomer = (customer: any) => {
      const addrs = Array.isArray(customer.addresses) ? customer.addresses : (customer.addresses ? Object.values(customer.addresses) : []);
      const billing = addrs.find((a: any) => a.addressType === "billing") ?? addrs[0] ?? null;
      const isInactive = customer.isActive === false || (customer.status && customer.status.toLowerCase() !== "active");
      return {
        name: customer.name || "Unnamed",
        email: customer.email || null,
        phone: customer.phonePrimary || null,
        phoneAlternate: customer.phoneAlternate || null,
        website: customer.websiteUrl || customer.website || null,
        addressStreet: billing?.street || null,
        addressCity: billing?.city || null,
        addressState: billing?.state || null,
        addressZip: billing?.zipCode || null,
        buildopsCustomerType: customer.customerType || null,
        ...(customer.customerType ? { industry: customer.customerType } : {}),
        buildopsStatus: isInactive ? "inactive" : "active",
        buildopsAccountNumber: customer.accountNumber || null,
        buildopsCustomerNumber: customer.customerNumber || null,
        buildopsLastSyncedAt: new Date(),
        buildopsId: customer.id,
      };
    };

    for (const customer of allCustomers) {
      const boName = (customer.name || "").toLowerCase().trim();
      const boEmail = (customer.email || "").toLowerCase().trim();
      const existing = allClients.find(c => c.buildopsId === customer.id) ||
        (boEmail ? allClients.find(c => c.email && c.email.toLowerCase().trim() === boEmail && !c.buildopsId) : null) ||
        allClients.find(c => c.name.toLowerCase().trim() === boName && !c.buildopsId);
      const fields = buildFieldsFromCustomer(customer);
      if (existing) {
        await storage.updateClient(existing.id, fields);
        custUpdated++;
      } else {
        const newClient = await storage.createClient(fields);
        await storage.createBuildopsSyncLog({ entityType: "client", entityId: newClient.id, buildopsId: customer.id, action: "pull", message: `Auto-sync imported` });
        custCreated++;
      }
    }
    console.log(`[auto-sync] Customers: ${custCreated} created, ${custUpdated} updated of ${allCustomers.length}`);

    // ── 2. Jobs ──────────────────────────────────────────────────────────────
    const allClientsRefreshed = await storage.listClients();
    const clientByBuildopsId = new Map(allClientsRefreshed.filter(c => c.buildopsId).map(c => [c.buildopsId!, c]));

    const jobs = await getJobs(creds.clientId, creds.clientSecret, creds.tenantId);
    let jobCreated = 0, jobUpdated = 0, jobSkipped = 0;
    for (const job of jobs) {
      if (!job.id) { jobSkipped++; continue; }
      const matchedClient = job.customerId ? clientByBuildopsId.get(job.customerId) : null;
      const rawJob = job as any;
      const visitsScheduled = Array.isArray(rawJob.visits) && rawJob.visits.length > 0
        ? (rawJob.visits[0].scheduledDate ?? rawJob.visits[0].scheduledStart ?? rawJob.visits[0].start ?? null)
        : null;
      const scheduledDateRaw = job.scheduledDate ?? job.scheduledStart ?? rawJob.scheduledStartDate ?? rawJob.firstVisitDate ?? rawJob.visitDate ?? visitsScheduled ?? null;
      const isSAJob = !!(job.serviceAgreementId) || /SA/i.test(job.jobNumber ?? "");
      const payload = {
        buildopsId: job.id,
        clientId: matchedClient?.id ?? null,
        jobNumber: job.jobNumber ?? null,
        title: job.title ?? null,
        issueDescription: job.issueDescription ?? null,
        status: job.status ?? null,
        priority: job.priority ?? null,
        jobTypeName: job.jobTypeName ?? null,
        billingType: job.billingType ?? rawJob.billingTypeName ?? rawJob.contractBillingType ?? null,
        customerName: job.customerName ?? null,
        customerPropertyName: job.customerPropertyName ?? null,
        amountQuoted: job.amountQuoted != null ? String(job.amountQuoted) : null,
        totalAmount: job.totalAmount != null ? String(job.totalAmount) : null,
        costAmount: job.costAmount != null ? String(job.costAmount) : null,
        laborCost: job.laborCost != null ? String(job.laborCost) : null,
        materialCost: job.materialCost != null ? String(job.materialCost) : null,
        grossProfit: job.grossProfit != null ? String(job.grossProfit) : null,
        billingStatus: job.billingStatus ?? null,
        isServiceAgreementJob: isSAJob,
        scheduledDate: parseDate(scheduledDateRaw),
        dueDate: parseDate(job.dueDate),
        completedDate: parseDate(job.completedDate),
        buildopsCustomerId: job.customerId ?? null,
        buildopsPropertyId: job.customerPropertyId ?? null,
        buildopsQuoteId: job.quoteId ?? null,
        buildopsServiceAgreementId: job.serviceAgreementId ?? null,
        syncedAt: new Date(),
      };
      const [existing] = await db.select().from(buildopsJobs).where(eq(buildopsJobs.buildopsId, job.id));
      if (existing) { await db.update(buildopsJobs).set(payload).where(eq(buildopsJobs.buildopsId, job.id)); jobUpdated++; }
      else { await db.insert(buildopsJobs).values(payload); jobCreated++; }
    }
    console.log(`[auto-sync] Jobs: ${jobCreated} created, ${jobUpdated} updated, ${jobSkipped} skipped of ${jobs.length}`);

    // ── 3. Invoices ──────────────────────────────────────────────────────────
    const invoices = await getInvoices(creds.clientId, creds.clientSecret, creds.tenantId);
    let invCreated = 0, invUpdated = 0, invSkipped = 0;
    for (const inv of invoices) {
      if (!inv.id) { invSkipped++; continue; }
      const matchedClient = inv.customerId ? clientByBuildopsId.get(inv.customerId) : null;
      const payload = {
        buildopsId: inv.id,
        clientId: matchedClient?.id ?? null,
        invoiceNumber: inv.invoiceNumber ?? null,
        status: inv.status ?? null,
        totalAmount: inv.totalAmount != null ? String(inv.totalAmount) : null,
        subtotal: inv.subtotal != null ? String(inv.subtotal) : null,
        taxAmount: inv.taxAmount != null ? String(inv.taxAmount) : null,
        customerName: inv.customerName ?? null,
        jobNumber: inv.jobNumber ?? null,
        isFinalInvoice: inv.isFinalInvoice ?? false,
        issuedDate: parseDate((inv as any).issuedDate ?? (inv as any).invoicedDate ?? (inv as any).invoiceDate ?? (inv as any).sentDate ?? (inv as any).createdDate ?? null),
        dueDate: parseDate((inv as any).dueDate ?? (inv as any).paymentDueDate ?? null),
        closedDate: parseDate((inv as any).closedDate ?? (inv as any).paidDate ?? (inv as any).closedAt ?? (inv as any).exportedDate ?? null),
        buildopsCustomerId: inv.customerId ?? null,
        buildopsJobId: (inv as any).jobId ?? (inv as any).job?.id ?? null,
        syncedAt: new Date(),
      };
      const [existing] = await db.select().from(buildopsInvoices).where(eq(buildopsInvoices.buildopsId, inv.id));
      if (existing) { await db.update(buildopsInvoices).set(payload).where(eq(buildopsInvoices.buildopsId, inv.id)); invUpdated++; }
      else { await db.insert(buildopsInvoices).values(payload); invCreated++; }
    }
    console.log(`[auto-sync] Invoices: ${invCreated} created, ${invUpdated} updated, ${invSkipped} skipped of ${invoices.length}`);

    // ── 4. Service Agreements ────────────────────────────────────────────────
    const agreements = await getAllServiceAgreements(creds.clientId, creds.clientSecret, creds.tenantId);
    let agrCreated = 0, agrUpdated = 0, agrSkipped = 0;
    for (const agr of agreements) {
      if (!agr.id) { agrSkipped++; continue; }
      const matchedClient = agr.customerId ? clientByBuildopsId.get(agr.customerId) : null;
      const payload = {
        buildopsId: agr.id,
        clientId: matchedClient?.id ?? null,
        agreementName: agr.agreementName ?? agr.name ?? null,
        agreementNumber: agr.agreementNumber != null ? String(agr.agreementNumber) : null,
        customerName: matchedClient ? matchedClient.name : null,
        status: agr.status ?? null,
        contractValue: agr.contractValue != null ? String(agr.contractValue) : (agr.totalAmount != null ? String(agr.totalAmount) : null),
        frequency: agr.frequency ?? null,
        startDate: parseDate(agr.startDate),
        endDate: parseDate(agr.endDate),
        advancedSchedulingState: agr.advancedSchedulingState ?? null,
        buildopsCustomerId: agr.customerId ?? null,
        syncedAt: new Date(),
      };
      const [existing] = await db.select().from(buildopsAgreements).where(eq(buildopsAgreements.buildopsId, agr.id));
      if (existing) { await db.update(buildopsAgreements).set(payload).where(eq(buildopsAgreements.buildopsId, agr.id)); agrUpdated++; }
      else { await db.insert(buildopsAgreements).values(payload); agrCreated++; }
    }
    console.log(`[auto-sync] Agreements: ${agrCreated} created, ${agrUpdated} updated, ${agrSkipped} skipped of ${agreements.length}`);

    await storage.createBuildopsSyncLog({
      entityType: "client",
      action: "pull",
      message: `Auto-sync complete: ${custCreated + custUpdated} customers, ${jobCreated + jobUpdated} jobs, ${invCreated + invUpdated} invoices, ${agrCreated + agrUpdated} agreements`,
    });
    console.log("[auto-sync] Scheduled sync complete.");
  } catch (err: any) {
    console.error("[auto-sync] Error during scheduled sync:", err.message);
    try {
      await storage.createBuildopsSyncLog({ entityType: "client", action: "error", message: `Auto-sync error: ${err.message}` });
    } catch {}
  }
}

export function scheduleAutoSync() {
  // Run once after a short startup delay so the server is fully ready
  setTimeout(() => {
    runSync();
    // Then run every 4 hours
    setInterval(runSync, FOUR_HOURS_MS);
  }, STARTUP_DELAY_MS);
  console.log(`[auto-sync] Scheduled: first run in ${STARTUP_DELAY_MS / 60000} min, then every ${FOUR_HOURS_MS / 3600000}h.`);
}
