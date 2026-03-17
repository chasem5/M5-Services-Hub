export const BASE_URL = "https://public-api.live.buildops.com";

// ── Token cache ───────────────────────────────────────────────────────────────
interface TokenCache {
  token: string;
  expiresAt: number;
}
const tokenCache = new Map<string, TokenCache>();

export async function getToken(clientId: string, clientSecret: string): Promise<string> {
  const cacheKey = `${clientId}:${clientSecret}`;
  const cached = tokenCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) return cached.token;

  const res = await fetch(`${BASE_URL}/v1/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientId, clientSecret }),
  });
  if (!res.ok) {
    const rawText = await res.text().catch(() => "");
    let parsed: any = {};
    try { parsed = JSON.parse(rawText); } catch {}
    const msg = parsed?.message ?? parsed?.error ?? (rawText || `HTTP ${res.status}`);
    throw new Error(`Auth failed (${res.status}): ${msg}`);
  }
  const data = await res.json();
  const token = data.access_token ?? data.token ?? data.accessToken;
  if (!token) {
    throw new Error(`No token in BuildOps auth response. Keys: ${Object.keys(data).join(", ")}`);
  }

  tokenCache.set(cacheKey, { token, expiresAt: Date.now() + 55 * 60 * 1000 });
  return token;
}

export function buildOpsHeaders(token: string, tenantId: string): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (tenantId) {
    headers["tenantId"] = tenantId;
  }
  return headers;
}

// ── Shared types ──────────────────────────────────────────────────────────────

export interface BuildOpsCustomer {
  id: string;
  name: string;
  email?: string | null;
  phonePrimary?: string | null;
  phoneAlternate?: string | null;
  status?: string;
  customerType?: string | null;
  customerNumber?: string | null;
  accountNumber?: string | null;
  addresses?: BuildOpsAddress[];
}

export interface BuildOpsAddress {
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  addressType?: string;
}

export interface BuildOpsDepartment {
  id: string;
  name: string;
}

export interface BuildOpsQuote {
  id: string;
  quoteNumber?: number;
  name?: string;
  status?: string;
  totalAmount?: number;
  totalAmountQuoted?: number;
  scopeOfWork?: string;
  issueDescription?: string;
  billingCustomerId?: string;
  customerId?: string;
  propertyId?: string;
  billTo?: string;
  expirationDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface BuildOpsRepresentative {
  id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  middleName?: string;
  nickName?: string;
  email?: string;
  phone?: string;           // legacy / generic
  cellPhone?: string;
  landlinePhone?: string;
  title?: string;
  salutation?: string;
  company?: string;         // customer/company name for matching
  contactType?: string;
  status?: string;
  isActive?: boolean;
  isSmsOptOut?: boolean;
  isEmailOptOut?: boolean;
  isDoNotCall?: boolean;
  profilePictureUrl?: string;
}

/** Map a BuildOps quote status to a CRM pipeline stage slug */
export function mapBuildOpsStatusToStage(status: string | null | undefined): string {
  if (!status) return "proposal_sent";
  const s = status.toLowerCase().replace(/\s+/g, "");
  if (["approved", "jobadded", "projectadded", "won", "converted"].includes(s)) return "won";
  if (["rejected", "declined", "lost"].includes(s)) return "lost";
  if (s === "expired") return "expired";
  if (s === "cancelled") return "canceled";
  if (["draft", "new", "open"].includes(s)) return "draft";
  return "proposal_sent"; // senttocustomer, customerviewed, sent, submitted, pending, review, awaitingapproval
}

export interface BuildOpsServiceAgreement {
  id: string;
  agreementNumber?: number | string;
  agreementName?: string;
  name?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  totalAmount?: number;
  contractValue?: number;
  frequency?: string;
  customerId?: string;
  advancedSchedulingState?: string;
}

interface BuildOpsListResponse<T> {
  totalCount: number;
  items: T[];
}

// ── Customers ─────────────────────────────────────────────────────────────────

export async function testConnection(
  clientId: string,
  clientSecret: string,
  tenantId: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const token = await getToken(clientId, clientSecret);
    const res = await fetch(`${BASE_URL}/v1/customers?page=1&limit=1`, {
      headers: buildOpsHeaders(token, tenantId),
    });
    if (res.ok) return { ok: true };
    const rawText = await res.text().catch(() => "");
    let parsed: any = {};
    try { parsed = JSON.parse(rawText); } catch {}
    const msg = parsed?.message ?? parsed?.error ?? (rawText || `HTTP ${res.status}`);
    const detail = `Customers call failed (${res.status}): ${msg}`;
    console.error("[BuildOps]", detail, "| raw:", rawText.slice(0, 300));
    return { ok: false, error: detail };
  } catch (err: any) {
    const detail = err.message ?? "Network error";
    console.error("[BuildOps] testConnection error:", detail);
    return { ok: false, error: detail };
  }
}

export async function getCustomers(
  clientId: string,
  clientSecret: string,
  tenantId: string,
  page = 1,
  pageSize = 100
): Promise<BuildOpsListResponse<BuildOpsCustomer>> {
  const token = await getToken(clientId, clientSecret);
  const res = await fetch(
    `${BASE_URL}/v1/customers?page=${page}&limit=${pageSize}`,
    { headers: buildOpsHeaders(token, tenantId) }
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export async function getCustomerById(
  clientId: string,
  clientSecret: string,
  tenantId: string,
  id: string
): Promise<BuildOpsCustomer> {
  const token = await getToken(clientId, clientSecret);
  const res = await fetch(`${BASE_URL}/v1/customers/${id}`, {
    headers: buildOpsHeaders(token, tenantId),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export async function createCustomer(
  clientId: string,
  clientSecret: string,
  tenantId: string,
  data: { name: string; email?: string | null; phonePrimary?: string | null; phoneAlternate?: string | null; websiteUrl?: string | null; customerType?: string | null; addresses?: BuildOpsAddress[]; status?: string }
): Promise<BuildOpsCustomer> {
  const token = await getToken(clientId, clientSecret);
  const res = await fetch(`${BASE_URL}/v1/customers`, {
    method: "POST",
    headers: buildOpsHeaders(token, tenantId),
    body: JSON.stringify({ ...data, status: data.status ?? "active" }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export async function updateCustomer(
  clientId: string,
  clientSecret: string,
  tenantId: string,
  id: string,
  data: { name?: string; email?: string | null; phonePrimary?: string | null; phoneAlternate?: string | null; websiteUrl?: string | null; customerType?: string | null; addresses?: BuildOpsAddress[] }
): Promise<BuildOpsCustomer> {
  const token = await getToken(clientId, clientSecret);
  const res = await fetch(`${BASE_URL}/v1/customers/${id}`, {
    method: "PUT",
    headers: buildOpsHeaders(token, tenantId),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export function mapClientToCustomer(client: {
  name: string;
  email?: string | null;
  phone?: string | null;
  phoneAlternate?: string | null;
  website?: string | null;
  addressStreet?: string | null;
  addressCity?: string | null;
  addressState?: string | null;
  addressZip?: string | null;
  buildopsCustomerType?: string | null;
}): { name: string; email?: string | null; phonePrimary?: string | null; phoneAlternate?: string | null; websiteUrl?: string | null; customerType?: string | null; addresses?: BuildOpsAddress[] } {
  const addresses: BuildOpsAddress[] = [];
  if (client.addressStreet || client.addressCity || client.addressState || client.addressZip) {
    addresses.push({
      street: client.addressStreet || undefined,
      city: client.addressCity || undefined,
      state: client.addressState || undefined,
      zipCode: client.addressZip || undefined,
      addressType: "billing",
    });
  }
  return {
    name: client.name,
    email: client.email || null,
    phonePrimary: client.phone || null,
    phoneAlternate: client.phoneAlternate || null,
    websiteUrl: client.website || null,
    customerType: client.buildopsCustomerType || null,
    ...(addresses.length > 0 ? { addresses } : {}),
  };
}

/**
 * Fetch ALL representatives from the top-level /v1/representatives endpoint (paginated).
 * Each rep has a `company` field identifying which customer it belongs to.
 */
function extractRepArray(data: any): BuildOpsRepresentative[] {
  if (Array.isArray(data)) return data;
  for (const key of ["items", "data", "results", "representatives", "contacts"]) {
    const val = data?.[key];
    if (Array.isArray(val)) return val;
    if (val && typeof val === "object" && !Array.isArray(val)) {
      for (const nested of ["items", "data", "results", "representatives", "contacts"]) {
        if (Array.isArray(val[nested])) return val[nested];
      }
    }
  }
  return [];
}

export async function getAllRepresentatives(
  clientId: string,
  clientSecret: string,
  tenantId: string
): Promise<{ reps: BuildOpsRepresentative[]; debug?: Record<string, any> }> {
  const token = await getToken(clientId, clientSecret);
  const allReps: BuildOpsRepresentative[] = [];
  let debugInfo: Record<string, any> | undefined;
  let page = 1;
  while (true) {
    const url = `${BASE_URL}/v1/representatives?page=${page}&limit=100`;
    const res = await fetch(url, { headers: buildOpsHeaders(token, tenantId) });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      console.warn(`[BuildOps getAllRepresentatives] HTTP ${res.status} page ${page}: ${body.message ?? JSON.stringify(body).slice(0, 200)}`);
      break;
    }
    const data = await res.json();
    const items = extractRepArray(data);
    console.log(`[BuildOps getAllRepresentatives] page ${page}: got ${items.length} reps, totalCount=${data.totalCount ?? "?"}`);
    allReps.push(...items);
    const totalCount: number = data.totalCount ?? items.length;
    if (items.length === 0 || allReps.length >= totalCount) break;
    page++;
    if (page > 50) break;
  }
  if (allReps.length === 0) {
    const probeUrl = `${BASE_URL}/v1/representatives?page=1&limit=5`;
    const probeRes = await fetch(probeUrl, { headers: buildOpsHeaders(token, tenantId) });
    const rawText = await probeRes.text().catch(() => "");
    debugInfo = {
      status: probeRes.status,
      headers: Object.fromEntries(probeRes.headers.entries()),
      bodyPreview: rawText.slice(0, 500),
    };
    const hdrs = JSON.stringify(debugInfo.headers).slice(0, 300);
    console.warn(`[BuildOps getAllRepresentatives] 0 reps returned. Raw probe response: status=${probeRes.status}, headers=${hdrs}, body=${rawText.slice(0, 500)}`);
  }
  return { reps: allReps, debug: debugInfo };
}

export async function getRepresentativesForCustomer(
  clientId: string,
  clientSecret: string,
  tenantId: string,
  customerId: string
): Promise<BuildOpsRepresentative[]> {
  const token = await getToken(clientId, clientSecret);
  const headers = buildOpsHeaders(token, tenantId);
  const reps: BuildOpsRepresentative[] = [];

  const endpoints = [
    { label: "contacts", urlFn: (p: number) => `${BASE_URL}/v1/contacts?customerId=${customerId}&page=${p}&limit=100` },
    { label: "representatives", urlFn: (p: number) => `${BASE_URL}/v1/customers/${customerId}/representatives?page=${p}&limit=100` },
  ];

  for (const ep of endpoints) {
    let page = 1;
    let succeeded = false;
    while (true) {
      const url = ep.urlFn(page);
      const res = await fetch(url, { headers });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        const preview = body.slice(0, 200);
        console.warn(`[BuildOps getRepresentativesForCustomer] ${ep.label} HTTP ${res.status} customer=${customerId} page ${page}: ${preview}`);
        break;
      }
      succeeded = true;
      const data = await res.json();
      const items = extractRepArray(data);
      reps.push(...items);
      const totalCount: number = data.totalCount ?? items.length;
      if (items.length === 0 || reps.length >= totalCount) break;
      page++;
      if (page > 20) break;
    }
    if (succeeded || reps.length > 0) break;
  }
  return reps;
}

export async function getRepresentatives(
  clientId: string,
  clientSecret: string,
  tenantId: string,
  _customerId: string
): Promise<BuildOpsRepresentative[]> {
  const result = await getAllRepresentatives(clientId, clientSecret, tenantId);
  return result.reps;
}

// ── Departments ───────────────────────────────────────────────────────────────

export async function getDepartments(
  clientId: string,
  clientSecret: string,
  tenantId: string
): Promise<BuildOpsDepartment[]> {
  const token = await getToken(clientId, clientSecret);
  const res = await fetch(`${BASE_URL}/v1/departments?page=1&limit=100`, {
    headers: buildOpsHeaders(token, tenantId),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    console.warn(`[BuildOps] departments endpoint returned ${res.status}: ${body.message ?? "unknown error"} — returning empty list`);
    return [];
  }
  const data = await res.json();
  return data.departments ?? data.items ?? [];
}

// ── Quotes ────────────────────────────────────────────────────────────────────

export async function getQuotes(
  clientId: string,
  clientSecret: string,
  tenantId: string,
  page = 1,
  pageSize = 100
): Promise<{ items: BuildOpsQuote[]; totalCount: number }> {
  const token = await getToken(clientId, clientSecret);
  const res = await fetch(
    `${BASE_URL}/v1/quotes?page=${page}&limit=${pageSize}`,
    { headers: buildOpsHeaders(token, tenantId) }
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `HTTP ${res.status}`);
  }
  const data = await res.json();
  return { items: data.items ?? data ?? [], totalCount: data.totalCount ?? (data.items ?? data ?? []).length };
}

export async function getQuoteById(
  clientId: string,
  clientSecret: string,
  tenantId: string,
  quoteId: string
): Promise<BuildOpsQuote> {
  const token = await getToken(clientId, clientSecret);
  const res = await fetch(
    `${BASE_URL}/v1/quotes/${quoteId}`,
    { headers: buildOpsHeaders(token, tenantId) }
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export interface QuoteLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  name?: string;
}

export interface CreateQuotePayload {
  propertyId?: string;
  departmentId: string;
  name: string;
  scopeOfWork?: string;
  totalAmountQuoted?: number;
  billingCustomerId?: string;
  items?: QuoteLineItem[];
}

export async function createQuote(
  clientId: string,
  clientSecret: string,
  tenantId: string,
  payload: CreateQuotePayload
): Promise<BuildOpsQuote> {
  const token = await getToken(clientId, clientSecret);
  const res = await fetch(`${BASE_URL}/v1/quotes`, {
    method: "POST",
    headers: buildOpsHeaders(token, tenantId),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `HTTP ${res.status}`);
  }
  return res.json();
}

// ── Properties / Locations ───────────────────────────────────────────────────

export interface BuildOpsProperty {
  id: string;
  companyName?: string;
  customerId?: string;
  billingCustomerId?: string;
  status?: string;
  isActive?: boolean;
}

export async function getProperties(
  clientId: string,
  clientSecret: string,
  tenantId: string,
  page = 1,
  pageSize = 100
): Promise<{ items: BuildOpsProperty[]; totalCount: number }> {
  const token = await getToken(clientId, clientSecret);
  const res = await fetch(
    `${BASE_URL}/v1/properties?page=${page}&limit=${pageSize}`,
    { headers: buildOpsHeaders(token, tenantId) }
  );
  if (!res.ok) {
    const rawText = await res.text().catch(() => "");
    console.log(`[BuildOps getProperties] HTTP ${res.status} body:`, rawText.slice(0, 500));
    let body: any = {};
    try { body = JSON.parse(rawText); } catch {}
    throw new Error(body.message ?? body.error ?? `HTTP ${res.status}`);
  }
  const data = await res.json();
  const items: BuildOpsProperty[] = data.items ?? [];
  return { items, totalCount: data.totalCount ?? items.length };
}

// ── Service Agreements ────────────────────────────────────────────────────────

export interface BuildOpsJob {
  id: string;
  jobNumber?: string;
  title?: string;
  issueDescription?: string;
  status?: string;
  priority?: string;
  jobTypeName?: string;
  billingType?: string;
  customerName?: string;
  customerPropertyName?: string;
  amountQuoted?: number;
  totalAmount?: number;
  costAmount?: number;
  laborCost?: number;
  materialCost?: number;
  grossProfit?: number;
  billingStatus?: string;
  scheduledDate?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  dueDate?: string;
  completedDate?: string;
  customerId?: string;
  customerPropertyId?: string;
  quoteId?: string;
  serviceAgreementId?: string;
}

export interface BuildOpsInvoice {
  id: string;
  invoiceNumber?: string;
  status?: string;
  totalAmount?: number;
  subtotal?: number;
  taxAmount?: number;
  customerName?: string;
  jobNumber?: string;
  isFinalInvoice?: boolean;
  issuedDate?: string;
  dueDate?: string;
  closedDate?: string;
  customerId?: string;
  jobId?: string;
}

export async function getJobs(
  clientId: string,
  clientSecret: string,
  tenantId: string,
  customerId?: string,
): Promise<BuildOpsJob[]> {
  const token = await getToken(clientId, clientSecret);
  const headers = buildOpsHeaders(token, tenantId);
  const allJobs: BuildOpsJob[] = [];
  let page = 1;
  const limit = 100;
  while (true) {
    let url = `${BASE_URL}/v1/jobs?page=${page}&limit=${limit}`;
    if (customerId) url += `&customer_id=${encodeURIComponent(customerId)}`;
    const res = await fetch(url, { headers });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message ?? `HTTP ${res.status}`);
    }
    const data = await res.json();
    const items: BuildOpsJob[] = data.items ?? [];
    const totalCount: number = data.totalCount ?? data.total ?? 0;
    allJobs.push(...items);
    if (items.length === 0 || (totalCount > 0 && allJobs.length >= totalCount)) break;
    page++;
    if (page > 200) break;
  }
  return allJobs;
}

export async function getInvoices(
  clientId: string,
  clientSecret: string,
  tenantId: string,
  customerId?: string,
): Promise<BuildOpsInvoice[]> {
  const token = await getToken(clientId, clientSecret);
  const headers = buildOpsHeaders(token, tenantId);
  const allInvoices: BuildOpsInvoice[] = [];
  let page = 1;
  const limit = 100;
  while (true) {
    let url = `${BASE_URL}/v1/invoices?page=${page}&limit=${limit}`;
    if (customerId) url += `&customer_id=${encodeURIComponent(customerId)}`;
    const res = await fetch(url, { headers });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message ?? `HTTP ${res.status}`);
    }
    const data = await res.json();
    const items: BuildOpsInvoice[] = data.items ?? [];
    const totalCount: number = data.totalCount ?? data.total ?? 0;
    allInvoices.push(...items);
    if (items.length === 0 || (totalCount > 0 && allInvoices.length >= totalCount)) break;
    page++;
    if (page > 200) break;
  }
  return allInvoices;
}

export async function getAllServiceAgreements(
  clientId: string,
  clientSecret: string,
  tenantId: string,
): Promise<BuildOpsServiceAgreement[]> {
  const token = await getToken(clientId, clientSecret);
  const headers = buildOpsHeaders(token, tenantId);
  const all: BuildOpsServiceAgreement[] = [];
  let page = 1;
  const limit = 100;
  while (true) {
    const res = await fetch(
      `${BASE_URL}/v1/service-agreements?page=${page}&limit=${limit}`,
      { headers }
    );
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message ?? `HTTP ${res.status}`);
    }
    const data = await res.json();
    const items: BuildOpsServiceAgreement[] = data.items ?? [];
    const totalCount: number = data.totalCount ?? data.total ?? 0;
    all.push(...items);
    if (items.length === 0 || (totalCount > 0 && all.length >= totalCount)) break;
    page++;
    if (page > 200) break;
  }
  return all;
}

export async function getServiceAgreements(
  clientId: string,
  clientSecret: string,
  tenantId: string,
  customerId: string
): Promise<BuildOpsServiceAgreement[]> {
  const token = await getToken(clientId, clientSecret);
  const headers = buildOpsHeaders(token, tenantId);
  const all: BuildOpsServiceAgreement[] = [];
  let page = 1;
  const limit = 100;
  while (true) {
    const res = await fetch(
      `${BASE_URL}/v1/service-agreements?customer_id=${encodeURIComponent(customerId)}&page=${page}&limit=${limit}`,
      { headers }
    );
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message ?? `HTTP ${res.status}`);
    }
    const data = await res.json();
    const items: BuildOpsServiceAgreement[] = data.items ?? [];
    const totalCount: number = data.totalCount ?? data.total ?? 0;
    all.push(...items);
    if (items.length === 0 || (totalCount > 0 && all.length >= totalCount)) break;
    page++;
    if (page > 50) break;
  }
  return all;
}
