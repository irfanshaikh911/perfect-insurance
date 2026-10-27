import { fetchWithAuth } from "./auth";

export type UploadResult = {
  success: boolean;
  filename: string;
  clients_created: number;
  policies_created: number;
  policies_updated: number;
  total_policies: number;
  message: string;
};

export type UploadHistoryItem = {
  id: string;
  filename: string;
  file_type: string;
  file_size: number;
  records_count: number;
  status: string;
  created_at: string;
};

export type ApiClient = {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  dob?: string | null;
  address?: string | null;
  status: string;
  policy_count: number;
  total_premium: number;
};

export type ApiPolicy = {
  id: string;
  client_id: string;
  client_name: string;
  policy_number: string;
  plan_code: string;
  plan_name: string;
  term?: number | null;
  ppt?: number | null;
  sum_assured: number;
  premium: number;
  mode: string;
  doc?: string | null;
  fup?: string | null;
  dom?: string | null;
  status: string;
};

export type ApiSummary = {
  total_clients: number;
  total_policies: number;
  active_policies: number;
  lapsed_policies: number;
  dues_this_week: number;
  due_amount_this_week: number;
};

export async function uploadPolicyBookApi(file: File): Promise<UploadResult> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetchWithAuth("/api/agent/upload", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to upload and parse policy book.");
  }

  return res.json();
}

export async function getUploadHistoryApi(): Promise<UploadHistoryItem[]> {
  const res = await fetchWithAuth("/api/agent/uploads");
  if (!res.ok) return [];
  return res.json();
}

export async function getAgentClientsApi(query?: string): Promise<ApiClient[]> {
  const path = query ? `/api/agent/clients?q=${encodeURIComponent(query)}` : "/api/agent/clients";
  const res = await fetchWithAuth(path);
  if (!res.ok) return [];
  return res.json();
}

export async function getAgentPoliciesApi(filters?: {
  status?: string;
  mode?: string;
  q?: string;
}): Promise<ApiPolicy[]> {
  const params = new URLSearchParams();
  if (filters?.status && filters.status !== "All") params.set("status", filters.status);
  if (filters?.mode && filters.mode !== "All") params.set("mode", filters.mode);
  if (filters?.q) params.set("q", filters.q);

  const qs = params.toString();
  const res = await fetchWithAuth(qs ? `/api/agent/policies?${qs}` : "/api/agent/policies");
  if (!res.ok) return [];
  return res.json();
}

export async function getAgentSummaryApi(): Promise<ApiSummary | null> {
  const res = await fetchWithAuth("/api/agent/summary");
  if (!res.ok) return null;
  return res.json();
}
