const BASE_URL = "https://public-api.live.buildops.com";

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

interface BuildOpsListResponse<T> {
  totalCount: number;
  items: T[];
}

function buildOpsHeaders(apiKey: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

export async function testConnection(apiKey: string, tenantId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${BASE_URL}/v1/customers?tenantId=${encodeURIComponent(tenantId)}&limit=1`, {
      headers: buildOpsHeaders(apiKey),
    });
    if (res.ok) return { ok: true };
    const body = await res.json().catch(() => ({}));
    return { ok: false, error: body.message ?? `HTTP ${res.status}` };
  } catch (err: any) {
    return { ok: false, error: err.message ?? "Network error" };
  }
}

export async function getCustomers(
  apiKey: string,
  tenantId: string,
  page = 0,
  limit = 100
): Promise<BuildOpsListResponse<BuildOpsCustomer>> {
  const res = await fetch(
    `${BASE_URL}/v1/customers?tenantId=${encodeURIComponent(tenantId)}&page=${page}&limit=${limit}`,
    { headers: buildOpsHeaders(apiKey) }
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export async function getCustomerById(apiKey: string, tenantId: string, id: string): Promise<BuildOpsCustomer> {
  const res = await fetch(
    `${BASE_URL}/v1/customers/${id}?tenantId=${encodeURIComponent(tenantId)}`,
    { headers: buildOpsHeaders(apiKey) }
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export async function createCustomer(
  apiKey: string,
  tenantId: string,
  data: { name: string; email?: string | null; phonePrimary?: string | null; status?: string }
): Promise<BuildOpsCustomer> {
  const res = await fetch(`${BASE_URL}/v1/customers?tenantId=${encodeURIComponent(tenantId)}`, {
    method: "POST",
    headers: buildOpsHeaders(apiKey),
    body: JSON.stringify({ ...data, status: data.status ?? "active" }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export async function updateCustomer(
  apiKey: string,
  tenantId: string,
  id: string,
  data: { name?: string; email?: string | null; phonePrimary?: string | null }
): Promise<BuildOpsCustomer> {
  const res = await fetch(`${BASE_URL}/v1/customers/${id}?tenantId=${encodeURIComponent(tenantId)}`, {
    method: "PUT",
    headers: buildOpsHeaders(apiKey),
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
