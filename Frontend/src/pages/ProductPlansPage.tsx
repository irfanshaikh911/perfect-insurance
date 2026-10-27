import { ChevronLeft, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { EmptyState } from "../components/ui/Tabs";
import { Input } from "../components/ui/Field";
import { fetchProduct, type ProductDetail } from "../lib/api";
import { PlansTable } from "../components/PlansTable";

export function ProductPlansPage() {
  const { productId = "" } = useParams();
  const [q, setQ] = useState("");
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchProduct(productId)
      .then((row) => {
        if (!cancelled) {
          setProduct(row);
          setError(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setProduct(null);
          setError("Could not load this product.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [productId]);

  const plans = useMemo(() => {
    if (!product) return [];
    const needle = q.trim().toLowerCase();
    if (!needle) return product.plans;
    return product.plans.filter(
      (plan) =>
        plan.plan_name.toLowerCase().includes(needle) ||
        (plan.plan_number || "").toLowerCase().includes(needle) ||
        (plan.uin || "").toLowerCase().includes(needle),
    );
  }, [product, q]);

  return (
    <div className="space-y-5">
      <Link to="/plans" className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" />
        All products
      </Link>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
        <div className="flex items-center justify-between gap-3 bg-gold px-4 py-3 text-gold-foreground">
          <h1 className="text-lg font-semibold tracking-tight">{product?.name ?? "Loading..."}</h1>
          <span className="text-sm font-medium">
            {loading ? "…" : `${plans.length} ${plans.length === 1 ? "plan" : "plans"}`}
          </span>
        </div>
        <div className="border-b border-border p-3">
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Filter plans in this product..."
              className="pl-9"
            />
          </div>
        </div>
        {error ? (
          <div className="p-4">
            <EmptyState>{error}</EmptyState>
          </div>
        ) : loading ? (
          <p className="px-4 py-8 text-sm text-muted-foreground">Loading plans...</p>
        ) : plans.length === 0 ? (
          <div className="p-4">
            <EmptyState>No plans in this product.</EmptyState>
          </div>
        ) : (
          <PlansTable plans={plans} framed={false} />
        )}
      </div>
    </div>
  );
}
