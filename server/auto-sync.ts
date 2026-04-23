import { storage } from "./storage";
import {
  computeHealthScore,
  persistHealthScore,
  persistMonthlySnapshot,
  computeCustomerPhase,
} from "./health-score";

const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;
const NIGHTLY_MS = 24 * 60 * 60 * 1000;
const STARTUP_DELAY_MS = 2 * 60 * 1000; // 2 min after boot
const NIGHTLY_DELAY_MS = 30 * 1000; // 30 s after boot — ensures scores are ready quickly after any restart

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

      // Auto-complete milestone 6 (first_job) when a Phase-1 client's job is marked complete
      const clientIdForJob = payload.clientId;
      const isCompletedJob = !!payload.completedDate;
      if (clientIdForJob && isCompletedJob) {
        try {
          const client = await storage.getClient(clientIdForJob);
          if (client && client.customerPhase === 1) {
            await storage.autoCompleteOnboardingMilestone(clientIdForJob, "first_job");
          }
        } catch {}
      }
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

  // Health score nightly run (runs once 5 min after boot, then every 24 hours)
  setTimeout(() => {
    runHealthScoreUpdate();
    setInterval(runHealthScoreUpdate, NIGHTLY_MS);
  }, NIGHTLY_DELAY_MS);
  console.log(`[health-score] Nightly recalculation scheduled: first run in ${NIGHTLY_DELAY_MS / 60000} min.`);
}

// ── Health Score Nightly Run ─────────────────────────────────────────────────

const DAILY_AUTO_TASK_CAP = 5;
const OVERFLOW_QUEUE_KEY = "health.autoTask.overflowQueue";

interface OverflowItem {
  repId: string;
  clientId: number;
  clientName: string;
  title: string;
  priority: "high" | "medium" | "low";
  score: number;
  scoreDelta: number;
  sortKey: number; // lower = higher priority
}

async function loadOverflowQueue(): Promise<OverflowItem[]> {
  try {
    const { db } = await import("./db");
    const { adminSettings } = await import("@shared/schema");
    const { eq } = await import("drizzle-orm");
    const [row] = await db.select().from(adminSettings).where(eq(adminSettings.key, OVERFLOW_QUEUE_KEY));
    return row ? (JSON.parse(row.value) as OverflowItem[]) : [];
  } catch {
    return [];
  }
}

async function saveOverflowQueue(items: OverflowItem[]): Promise<void> {
  try {
    const { db } = await import("./db");
    const { adminSettings } = await import("@shared/schema");
    const { eq } = await import("drizzle-orm");
    const value = JSON.stringify(items);
    const [existing] = await db.select().from(adminSettings).where(eq(adminSettings.key, OVERFLOW_QUEUE_KEY));
    if (existing) {
      await db.update(adminSettings).set({ value, updatedAt: new Date() }).where(eq(adminSettings.key, OVERFLOW_QUEUE_KEY));
    } else {
      await db.insert(adminSettings).values({ key: OVERFLOW_QUEUE_KEY, value });
    }
  } catch (err: any) {
    console.error("[health-score] Failed to save overflow queue:", err.message);
  }
}

async function runHealthScoreUpdate() {
  console.log("[health-score] Starting nightly health score recalculation…");
  try {
    const allClients = await storage.listClients();
    const now = new Date();

    // ── Pass 1: Score all clients, collect pending triggers (no tasks created yet) ──
    let updated = 0;
    let skipped = 0;
    const pendingTriggers: OverflowItem[] = [];

    for (const client of allClients) {
      try {
        // Capture previous score before update (for delta computation)
        const prevScore = client.healthScore ?? null;

        // computeHealthScore handles all phase logic internally, including
        // using earliest job date to correctly classify imported clients.
        const breakdown = await computeHealthScore(client.id);
        if (!breakdown) { skipped++; continue; }

        // Phase 1 — score is intentionally null; persist phase & clear stale fields
        if (breakdown.phase === 1) {
          await storage.updateClient(client.id, {
            customerPhase: 1,
            healthScore: null,
            healthTrend: null,
            healthScoreBreakdown: null,
          });
          skipped++;
          continue;
        }

        await persistHealthScore(client.id, breakdown);

        if (breakdown.totalScore !== null) {
          await persistMonthlySnapshot(client.id, breakdown.totalScore, breakdown.trend, breakdown, now);
        }

        updated++;

        // Collect triggers for this client (no tasks created yet)
        if (breakdown.totalScore !== null && client.accountManagerUserId) {
          const scoreDelta = prevScore !== null ? prevScore - breakdown.totalScore : 0;
          const triggers = await collectTriggers(client, breakdown, scoreDelta, now);
          pendingTriggers.push(...triggers);
        }
      } catch (err: any) {
        console.error(`[health-score] Error on client ${client.id} (${client.name}):`, err.message);
      }
    }

    // ── Pass 2: Load overflow from prior runs, merge with new triggers, enforce cap globally per rep ──
    const priorOverflow = await loadOverflowQueue();

    // Combine overflow + new (overflow items carry their sortKey from when they were generated)
    // Note: prior overflow items get processed first as they're already deferred
    const allCandidates = [...priorOverflow, ...pendingTriggers];

    // Group by rep
    const byRep = new Map<string, OverflowItem[]>();
    for (const item of allCandidates) {
      const existing = byRep.get(item.repId) ?? [];
      existing.push(item);
      byRep.set(item.repId, existing);
    }

    const nextOverflow: OverflowItem[] = [];

    for (const [repId, items] of byRep) {
      // Global sort: at-risk (sortKey 0) → largest drops (sortKey 1–99) → no-contact (200) → quotes (300)
      items.sort((a, b) => a.sortKey - b.sortKey);
      const toCreate = items.slice(0, DAILY_AUTO_TASK_CAP);
      const toQueue = items.slice(DAILY_AUTO_TASK_CAP);

      for (const t of toCreate) {
        try {
          await storage.createTask({
            title: t.title,
            assignedTo: repId,
            relatedClientId: t.clientId,
            priority: t.priority,
            status: "todo",
            description: `Auto-generated health score alert. Score: ${t.score}/100.`,
            sortOrder: 0,
          });
        } catch (err: any) {
          console.error("[health-score] Failed to create auto-task:", err.message);
          toQueue.push(t); // failed — re-queue
        }
      }

      nextOverflow.push(...toQueue);
    }

    await saveOverflowQueue(nextOverflow);

    // ── Pass 3: Onboarding milestone overdue checks + Day-90/6-month tasks ──
    try {
      await runOnboardingNightlyChecks(allClients, now);
    } catch (err: any) {
      console.error("[onboarding] Nightly check error:", err.message);
    }

    console.log(`[health-score] Done: ${updated} scored, ${skipped} skipped, ${nextOverflow.length} tasks queued for tomorrow.`);
  } catch (err: any) {
    console.error("[health-score] Fatal error:", err.message);
  }
}

// ── Onboarding nightly checks ─────────────────────────────────────────────────
async function taskExists(title: string, relatedClientId: number): Promise<boolean> {
  try {
    const { db } = await import("./db");
    const { tasks: tasksTable } = await import("@shared/schema");
    const { and, eq: eqFn, ne } = await import("drizzle-orm");
    const rows = await db.select({ id: tasksTable.id }).from(tasksTable).where(
      and(eqFn(tasksTable.title, title), eqFn(tasksTable.relatedClientId, relatedClientId), ne(tasksTable.status, "done")),
    ).limit(1);
    return rows.length > 0;
  } catch { return false; }
}

async function runOnboardingNightlyChecks(
  allClients: Array<{ id: number; name: string; createdAt: Date; customerPhase?: number | null; accountManagerUserId: string | null; qualificationRecommendation?: string | null; qualificationReviewedAt?: Date | null }>,
  now: Date,
): Promise<void> {
  const { ONBOARDING_MILESTONES } = await import("@shared/schema");

  for (const client of allClients) {
    const repId = client.accountManagerUserId;
    if (!repId) continue;

    const daysSinceCreation = (now.getTime() - client.createdAt.getTime()) / (1000 * 60 * 60 * 24);

    // ─── Day-90 qualification task (only once, only if not already reviewed) ───
    if (daysSinceCreation >= 90 && !client.qualificationReviewedAt) {
      try {
        const qualTitle = `Complete 90-day qualification review for ${client.name}`;
        if (!(await taskExists(qualTitle, client.id))) {
          await storage.createTask({
            title: qualTitle,
            assignedTo: repId,
            relatedClientId: client.id,
            priority: "high",
            status: "todo",
            description: `Day-90 qualification review is due for ${client.name}. Visit the customer profile to complete the review.`,
            sortOrder: 0,
          });
        }
      } catch {}
    }

    // ─── 6-month re-evaluation task for nurture clients ────────────────────────
    if (client.qualificationRecommendation === "nurture" && client.qualificationReviewedAt) {
      const sixMonthsAfterReview = new Date(client.qualificationReviewedAt.getTime() + 180 * 24 * 60 * 60 * 1000);
      if (now >= sixMonthsAfterReview) {
        try {
          const reEvalTitle = `6-month re-evaluation due for ${client.name}`;
          if (!(await taskExists(reEvalTitle, client.id))) {
            await storage.createTask({
              title: reEvalTitle,
              assignedTo: repId,
              relatedClientId: client.id,
              priority: "medium",
              status: "todo",
              description: `6-month nurture re-evaluation is due for ${client.name}. Complete the review on the customer profile.`,
              sortOrder: 0,
            });
          }
        } catch {}
      }
    }

    // ─── Overdue milestone tasks (Phase 1 or still within 90-day window) ────────
    if (daysSinceCreation > 90 && client.customerPhase !== 1) continue;

    try {
      const milestones = await storage.getClientOnboardingMilestones(client.id);
      for (const m of ONBOARDING_MILESTONES) {
        const record = milestones.find(r => r.milestoneKey === m.key);
        if (!record || record.status === "complete") continue;
        const targetDate = new Date(client.createdAt.getTime() + m.targetDayEnd * 24 * 60 * 60 * 1000);
        if (now <= targetDate) continue;

        // Mark as overdue in DB if not already
        if (record.status !== "overdue") {
          try { await storage.updateOnboardingMilestone(client.id, m.key, { status: "overdue" }); } catch {}
        }

        // Create overdue task (max 1 per client per day)
        const overdueTitle = `${m.label} overdue for ${client.name}`;
        if (!(await taskExists(overdueTitle, client.id))) {
          try {
            await storage.createTask({
              title: overdueTitle,
              assignedTo: repId,
              relatedClientId: client.id,
              priority: "medium",
              status: "todo",
              description: `Onboarding milestone overdue: "${m.label}" was due by day ${m.targetDayEnd} for ${client.name}.`,
              sortOrder: 0,
            });
          } catch {}
        }
        break; // max 1 onboarding task per client per nightly run
      }
    } catch {}
  }
}

// Collect triggers for one client (pure data collection, no DB writes for tasks)
async function collectTriggers(
  client: { id: number; name: string; accountManagerUserId: string | null },
  breakdown: { totalScore: number; trend: string; components?: Record<string, unknown> },
  scoreDelta: number, // positive = score dropped this run
  now: Date,
): Promise<OverflowItem[]> {
  const repId = client.accountManagerUserId;
  if (!repId) return [];

  const score = breakdown.totalScore;
  const recency = breakdown.components?.recency as { detail?: { daysSinceContact?: number } } | undefined;
  const daysSince = recency?.detail?.daysSinceContact ?? null;

  interface Trigger {
    title: string;
    priority: "high" | "medium" | "low";
    sortKey: number;
  }

  const triggers: Trigger[] = [];

  // at-risk: score below 40 (watch threshold)
  if (score < 40) {
    triggers.push({ title: `At-Risk Alert: ${client.name} health score is ${score}/100`, priority: "high", sortKey: 0 });
  }

  // declining fast: explicit score drop >= 15 points this run
  if (scoreDelta >= 15) {
    triggers.push({
      title: `Declining Account: ${client.name} dropped ${scoreDelta} pts (now ${score}/100)`,
      priority: "high",
      sortKey: 100 - Math.min(scoreDelta, 99), // larger drops first (lower key)
    });
  }

  // no contact in 45 days
  if (daysSince !== null && daysSince > 45) {
    triggers.push({
      title: `No Contact: ${client.name} — ${Math.round(daysSince)} days since last touchpoint`,
      priority: "medium",
      sortKey: 200,
    });
  }

  // open (non-closed) quote with no response for 30+ days
  try {
    const { db } = await import("./db");
    const { leads: leadsTable } = await import("@shared/schema");
    const { and, eq, lt, isNotNull, sql: sqlFn } = await import("drizzle-orm");
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const openQuotes = await db
      .select({ id: leadsTable.id })
      .from(leadsTable)
      .where(
        and(
          eq(leadsTable.clientId, client.id),
          isNotNull(leadsTable.buildopsQuoteId),
          sqlFn`${leadsTable.stage} NOT IN ('won', 'lost', 'closed_lost')`,
          lt(leadsTable.updatedAt, thirtyDaysAgo),
        ),
      )
      .limit(1);
    if (openQuotes.length > 0) {
      triggers.push({
        title: `Unresponsive Quote: ${client.name} — open quote with no response for 30+ days`,
        priority: "medium",
        sortKey: 300,
      });
    }
  } catch {}

  return triggers.map((t) => ({
    repId,
    clientId: client.id,
    clientName: client.name,
    title: t.title,
    priority: t.priority,
    score,
    scoreDelta,
    sortKey: t.sortKey,
  }));
}
