export type PlanDocument = {
  type: string;
  label: string;
  url: string;
};

export type CatalogProduct = {
  id: string;
  name: string;
  plan_count: number;
};

export type PlanSummary = {
  id: string;
  plan_number: string | null;
  plan_name: string;
  uin: string | null;
  product_id: string;
  product_name: string;
  doc_count: number;
};

export type ProductDetail = CatalogProduct & {
  plans: PlanSummary[];
};

export type CatalogPlan = {
  id: string;
  plan_number: string | null;
  plan_name: string;
  uin: string | null;
  product_id: string;
  product_name: string;
  docs: PlanDocument[];
};

const API_BASE = import.meta.env.VITE_API_URL ?? "";

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`);
  if (!response.ok) {
    throw new Error("Could not load catalog");
  }
  return response.json() as Promise<T>;
}

export function fetchProducts(): Promise<CatalogProduct[]> {
  return getJson("/api/products");
}

export function fetchProduct(productId: string): Promise<ProductDetail> {
  return getJson(`/api/products/${encodeURIComponent(productId)}`);
}

export function fetchPlans(q = "", productId = ""): Promise<PlanSummary[]> {
  const params = new URLSearchParams();
  if (q.trim()) params.set("q", q.trim());
  if (productId) params.set("product", productId);
  const query = params.toString();
  return getJson(`/api/plans${query ? `?${query}` : ""}`);
}

export function fetchPlan(planId: string): Promise<CatalogPlan> {
  return getJson(`/api/plans/${encodeURIComponent(planId)}`);
}

export function planPath(productId: string, planId: string) {
  return `/plans/${encodeURIComponent(productId)}/${encodeURIComponent(planId)}`;
}
