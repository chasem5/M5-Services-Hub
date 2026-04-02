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

// ── Employees (M5's own staff in BuildOps) ────────────────────────────────────

export interface BuildOpsEmployee {
  id: string;
  name?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  email?: string;
  cellPhone?: string;
  landlinePhone?: string;
  userTitle?: string;
  isActive?: boolean;
  isTech?: boolean;
  isSales?: boolean;
}

function extractEmployeeArray(data: any): BuildOpsEmployee[] {
  if (Array.isArray(data)) return data;
  for (const key of ["items", "data", "results", "employees", "records"]) {
    const val = data?.[key];
    if (Array.isArray(val)) return val;
    if (val && typeof val === "object") {
      for (const nested of ["items", "data", "results", "employees"]) {
        if (Array.isArray(val[nested])) return val[nested];
      }
    }
  }
  return [];
}

export async function getEmployees(
  clientId: string,
  clientSecret: string,
  tenantId: string
): Promise<{ employees: BuildOpsEmployee[]; totalCount: number; debug?: Record<string, any> }> {
  const token = await getToken(clientId, clientSecret);
  const headers = buildOpsHeaders(token, tenantId);

  // API spec: page is 0-indexed, page_size max=100. Correct params are ?page=N&page_size=100
  // (NOT limit/size/pageSize — those all return 400 from the OpenAPI strict validator)
  const allEmployees: BuildOpsEmployee[] = [];
  let totalCount = 0;
  let page = 0;

  while (true) {
    const url = `${BASE_URL}/v1/employees?page=${page}&page_size=100`;
    const res = await fetch(url, { headers });
    if (!res.ok) {
      const rawText = await res.text().catch(() => "");
      console.warn(`[BuildOps getEmployees] page ${page} HTTP ${res.status}: ${rawText.slice(0, 300)}`);
      if (page === 0) return { employees: [], totalCount: 0, debug: { status: res.status, bodyPreview: rawText.slice(0, 500) } };
      break;
    }
    const data = await res.json();
    const items = extractEmployeeArray(data);
    totalCount = data.totalCount ?? (allEmployees.length + items.length);
    allEmployees.push(...items);
    console.log(`[BuildOps getEmployees] page ${page}: got ${items.length}, total so far: ${allEmployees.length}/${totalCount}`);
    if (items.length === 0 || allEmployees.length >= totalCount) break;
    page++;
    if (page > 20) break;
  }

  return { employees: allEmployees, totalCount };
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
  customerPropertyTypeValue?: string;
  address?: BuildOpsAddress;
  addresses?: BuildOpsAddress[];
}

export async function getProperties(
  clientId: string,
  clientSecret: string,
  tenantId: string,
  page = 1,
  pageSize = 100
): Promise<{ items: BuildOpsProperty[]; totalCount: number }> {
  const token = await getToken(clientId, clientSecret);
  const headers = buildOpsHeaders(token, tenantId);

  // Try limit= first (1-indexed), fall back to page_size= (0-indexed like employees)
  async function tryFetch(url: string) {
    const res = await fetch(url, { headers });
    if (!res.ok) {
      const rawText = await res.text().catch(() => "");
      console.log(`[BuildOps getProperties] HTTP ${res.status} ${url}:`, rawText.slice(0, 300));
      let body: any = {};
      try { body = JSON.parse(rawText); } catch {}
      throw new Error(body.message ?? body.error ?? `HTTP ${res.status}`);
    }
    return res.json();
  }

  let data: any;
  try {
    data = await tryFetch(`${BASE_URL}/v1/properties?page=${page}&limit=${pageSize}`);
  } catch (e: any) {
    // If limit= fails (e.g. API strict validator rejects it), try page_size= with 0-indexed page
    console.warn(`[BuildOps getProperties] limit= failed, trying page_size=: ${e.message}`);
    data = await tryFetch(`${BASE_URL}/v1/properties?page=${page - 1}&page_size=${pageSize}`);
  }

  const items: BuildOpsProperty[] = data.items ?? data.data ?? [];
  return { items, totalCount: data.totalCount ?? data.total ?? items.length };
}

export async function getAllProperties(
  clientId: string,
  clientSecret: string,
  tenantId: string,
): Promise<BuildOpsProperty[]> {
  const all: BuildOpsProperty[] = [];
  let page = 1;
  const pageSize = 100;
  while (true) {
    const batch = await getProperties(clientId, clientSecret, tenantId, page, pageSize);
    all.push(...batch.items);
    console.log(`[BuildOps getAllProperties] page ${page}: got ${batch.items.length} (total so far: ${all.length})`);
    if (batch.items.length === 0 || batch.items.length < pageSize) break;
    page++;
    if (page > 100) break;
  }
  return all;
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
  // Extended fields
  accountManager?: string;
  projectManager?: string;
  soldBy?: string;
  reviewStatus?: string;
  procurementStatus?: string;
  totalBudgetedHours?: number;
  department?: string;
}

export interface BuildOpsVisit {
  id: string;
  visitNumber?: number;
  description?: string;
  jobNumber?: string;
  jobId?: string;
  jobType?: string;
  status?: string;
  reviewStatus?: string;
  onHold?: boolean;
  onHoldReason?: string;
  primaryTechName?: string;
  minimumDurationMins?: number;
  actualDurationMins?: number;
  scheduledFor?: string;
  startTime?: string;
  endTime?: string;
  submittedBy?: string;
  submittedTime?: string;
  departmentName?: string;
  billingCustomerName?: string;
  customerName?: string;
  propertyName?: string;
  addressLine1?: string;
  city?: string;
  state?: string;
  zipcode?: string;
  customerId?: string;
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
  // Extended fields
  departmentName?: string;
  daysPastDue?: number;
  paymentTermName?: string;
  serviceAgreementNumber?: string;
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
    if (items.length < limit) break;
    page++;
    if (page > 200) break;
  }
  return allJobs;
}

export async function getVisits(
  clientId: string,
  clientSecret: string,
  tenantId: string,
  customerId?: string,
): Promise<BuildOpsVisit[]> {
  const token = await getToken(clientId, clientSecret);
  const headers = buildOpsHeaders(token, tenantId);
  const allVisits: BuildOpsVisit[] = [];
  let page = 1;
  const limit = 100;
  while (true) {
    let url = `${BASE_URL}/v1/visits?page=${page}&limit=${limit}`;
    if (customerId) url += `&customer_id=${encodeURIComponent(customerId)}`;
    const res = await fetch(url, { headers });
    if (!res.ok) {
      const rawText = await res.text().catch(() => "");
      let body: any = {};
      try { body = JSON.parse(rawText); } catch {}
      console.warn(`[BuildOps getVisits] HTTP ${res.status} page ${page}:`, rawText.slice(0, 200));
      // If the endpoint doesn't exist or returns 404/405, break gracefully
      if (res.status === 404 || res.status === 405) break;
      throw new Error(body.message ?? body.error ?? `HTTP ${res.status}`);
    }
    const data = await res.json();
    if (page === 1) {
      const keys = Object.keys(data);
      const totalCount = data.totalCount ?? data.total ?? "?";
      console.log(`[BuildOps getVisits] page=1 keys=${JSON.stringify(keys)} totalCount=${totalCount}`);
    }
    const items: BuildOpsVisit[] = (
      Array.isArray(data.items) ? data.items :
      Array.isArray(data.data) ? data.data :
      Array.isArray(data.results) ? data.results :
      Array.isArray(data.visits) ? data.visits :
      Array.isArray(data) ? data : []
    );
    const totalCount: number = data.totalCount ?? data.total ?? data.count ?? 0;
    // Map raw API fields to our interface (handle various field name conventions)
    const mapped: BuildOpsVisit[] = items.map((v: any) => ({
      id: v.id,
      visitNumber: v.visitNumber ?? v.visit_number ?? v.number ?? null,
      description: v.description ?? null,
      jobNumber: v.jobNumber ?? v.job_number ?? v.job?.jobNumber ?? null,
      jobId: v.jobId ?? v.job_id ?? v.job?.id ?? null,
      jobType: v.jobType ?? v.job_type ?? v.job?.jobTypeName ?? null,
      status: v.status ?? null,
      reviewStatus: v.reviewStatus ?? v.review_status ?? null,
      onHold: v.onHold ?? v.on_hold ?? false,
      onHoldReason: v.onHoldReason ?? v.on_hold_reason ?? null,
      primaryTechName: v.primaryTechName ?? v.primary_tech_name ?? v.techName ?? v.tech?.name ?? v.assignee?.name ?? null,
      minimumDurationMins: v.minimumDurationMins ?? v.minimum_duration_mins ?? v.minDuration ?? null,
      actualDurationMins: v.actualDurationMins ?? v.actual_duration_mins ?? v.duration ?? null,
      scheduledFor: v.scheduledFor ?? v.scheduled_for ?? v.scheduledStart ?? v.scheduledDate ?? null,
      startTime: v.startTime ?? v.start_time ?? v.start ?? null,
      endTime: v.endTime ?? v.end_time ?? v.end ?? null,
      submittedBy: v.submittedBy ?? v.submitted_by ?? v.submitter?.name ?? null,
      submittedTime: v.submittedTime ?? v.submitted_time ?? v.submittedAt ?? null,
      departmentName: v.departmentName ?? v.department_name ?? v.department?.name ?? null,
      billingCustomerName: v.billingCustomerName ?? v.billing_customer_name ?? v.billingCustomer?.name ?? null,
      customerName: v.customerName ?? v.customer_name ?? v.customer?.name ?? null,
      propertyName: v.propertyName ?? v.property_name ?? v.property?.name ?? null,
      addressLine1: v.addressLine1 ?? v.address_line1 ?? v.address?.addressLine1 ?? v.address?.street ?? null,
      city: v.city ?? v.address?.city ?? null,
      state: v.state ?? v.address?.state ?? null,
      zipcode: v.zipcode ?? v.zip ?? v.address?.zipCode ?? null,
      customerId: v.customerId ?? v.customer_id ?? v.customer?.id ?? null,
    }));
    allVisits.push(...mapped);
    console.log(`[BuildOps getVisits] page=${page} got=${items.length} total=${totalCount} accumulated=${allVisits.length}`);
    if (items.length === 0) break;
    if (totalCount > 0 && allVisits.length >= totalCount) break;
    if (items.length < limit && totalCount === 0) break;
    page++;
    if (page > 500) break;
  }
  return allVisits;
}

async function fetchInvoicePages(
  headers: Record<string, string>,
  customerId: string | undefined,
  statusFilter: string | null,
): Promise<BuildOpsInvoice[]> {
  const results: BuildOpsInvoice[] = [];
  let page = 1;
  const limit = 100;
  while (true) {
    let url = `${BASE_URL}/v1/invoices?page=${page}&limit=${limit}`;
    if (customerId) url += `&customer_id=${encodeURIComponent(customerId)}`;
    if (statusFilter) url += `&status=${encodeURIComponent(statusFilter)}`;
    const res = await fetch(url, { headers });
    if (!res.ok) {
      // If the status filter param is not supported, the API may return 400 — skip gracefully
      const body = await res.json().catch(() => ({}));
      console.warn(`[BuildOps invoices] HTTP ${res.status} for status=${statusFilter ?? "none"}: ${body.message ?? "error"}`);
      break;
    }
    const data = await res.json();
    if (page === 1) {
      const keys = Object.keys(data);
      const totalCount = data.totalCount ?? data.total ?? data.count ?? data.totalItems ?? "?";
      const itemsKey = ["items","data","results","invoices"].find(k => Array.isArray((data as any)[k])) ?? "(none)";
      console.log(`[BuildOps invoices] status=${statusFilter ?? "none"} page=1 keys=${JSON.stringify(keys)} totalCount=${totalCount} itemsKey=${itemsKey}`);
    }
    const items: BuildOpsInvoice[] = (
      Array.isArray(data.items) ? data.items :
      Array.isArray(data.data) ? data.data :
      Array.isArray(data.results) ? data.results :
      Array.isArray(data.invoices) ? data.invoices :
      Array.isArray(data) ? data : []
    );
    const totalCount: number = data.totalCount ?? data.total ?? data.count ?? data.totalItems ?? 0;
    results.push(...items);
    console.log(`[BuildOps invoices] status=${statusFilter ?? "none"} page=${page} got=${items.length} total=${totalCount} accumulated=${results.length}`);
    if (items.length === 0) break;
    if (totalCount > 0 && results.length >= totalCount) break;
    if (items.length < limit && totalCount === 0) break;
    page++;
    if (page > 200) break;
  }
  return results;
}

export async function getInvoices(
  clientId: string,
  clientSecret: string,
  tenantId: string,
  customerId?: string,
): Promise<BuildOpsInvoice[]> {
  const token = await getToken(clientId, clientSecret);
  const headers = buildOpsHeaders(token, tenantId);

  // BuildOps may default to a single status (e.g. "exported"). Sweep all
  // common statuses to ensure we capture the full invoice history.
  const statusesToTry = [
    null,         // unfiltered — whatever the API default is
    "exported",
    "paid",
    "sent",
    "approved",
    "pending",
    "draft",
    "void",
    "voided",
    "cancelled",
  ];

  const seen = new Set<string>();
  const allInvoices: BuildOpsInvoice[] = [];

  for (const status of statusesToTry) {
    const batch = await fetchInvoicePages(headers, customerId, status);
    let added = 0;
    for (const inv of batch) {
      if (inv.id && !seen.has(inv.id)) {
        seen.add(inv.id);
        allInvoices.push(inv);
        added++;
      }
    }
    console.log(`[BuildOps invoices] status=${status ?? "none"} → ${added} new unique invoices (running total: ${allInvoices.length})`);
  }

  console.log(`[BuildOps invoices] TOTAL unique invoices fetched: ${allInvoices.length}`);
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
      const rawText = await res.text().catch(() => "");
      console.error(`[BuildOps getAllServiceAgreements] HTTP ${res.status} page ${page}:`, rawText.slice(0, 300));
      let body: any = {};
      try { body = JSON.parse(rawText); } catch {}
      throw new Error(body.message ?? body.error ?? `HTTP ${res.status}`);
    }
    const data = await res.json();
    const items: BuildOpsServiceAgreement[] = data.items ?? data ?? [];
    console.log(`[BuildOps getAllServiceAgreements] page ${page}: got ${items.length} items (totalCount=${data.totalCount ?? "?"})`);
    all.push(...items);
    // BuildOps caps SA pages at 10 regardless of limit= value, so we must only stop on a truly empty page
    if (items.length === 0) break;
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
      const rawText = await res.text().catch(() => "");
      let body: any = {};
      try { body = JSON.parse(rawText); } catch {}
      throw new Error(body.message ?? body.error ?? `HTTP ${res.status}`);
    }
    const data = await res.json();
    const items: BuildOpsServiceAgreement[] = data.items ?? data ?? [];
    all.push(...items);
    // Only stop on a truly empty page — BuildOps caps pages at 10 regardless of limit=
    if (items.length === 0) break;
    page++;
    if (page > 50) break;
  }
  return all;
}
