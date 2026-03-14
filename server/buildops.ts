const BASE_URL = "https://public-api.live.buildops.com";

// ── Token cache ───────────────────────────────────────────────────────────────
interface TokenCache {
  token: string;
  expiresAt: number;
}
const tokenCache = new Map<string, TokenCache>();

async function getToken(clientId: string, clientSecret: string): Promise<string> {
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

function buildOpsHeaders(token: string, tenantId: string): Record<string, string> {
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
  scopeOfWork?: string;
  billingCustomerId?: string;
  customerId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface BuildOpsServiceAgreement {
  id: string;
  agreementNumber?: number | string;
  name?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  totalAmount?: number;
  customerId?: string;
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
  data: { name: string; email?: string | null; phonePrimary?: string | null; status?: string }
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
  data: { name?: string; email?: string | null; phonePrimary?: string | null }
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
}): { name: string; email?: string | null; phonePrimary?: string | null } {
  return {
    name: client.name,
    email: client.email || null,
    phonePrimary: client.phone || null,
  };
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
    throw new Error(body.message ?? `HTTP ${res.status}`);
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

// ── Service Agreements ────────────────────────────────────────────────────────

export async function getServiceAgreements(
  clientId: string,
  clientSecret: string,
  tenantId: string,
  customerId: string
): Promise<BuildOpsServiceAgreement[]> {
  const token = await getToken(clientId, clientSecret);
  const res = await fetch(
    `${BASE_URL}/v1/service-agreements?customer_id=${encodeURIComponent(customerId)}&page=1&limit=50`,
    { headers: buildOpsHeaders(token, tenantId) }
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.items ?? [];
}
