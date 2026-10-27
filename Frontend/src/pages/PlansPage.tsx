import { Activity, Briefcase, Heart, Landmark, Layers, Search, Shield, Sparkles, Umbrella, Users, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/Tabs";
import { Input } from "../components/ui/Field";
import { fetchPlans, fetchProducts, type CatalogProduct, type PlanSummary } from "../lib/api";
import { PlansTable } from "../components/PlansTable";

const productIcons: Record<string, typeof Shield> = {
  endowment: Landmark,
  "whole-life": Heart,
  "money-back": Wallet,
  term: Umbrella,
  riders: Sparkles,
  pension: Shield,
  ulip: Activity,
  health: Activity,
  micro: Layers,
  group: Users,
  other: Briefcase,
};

export function PlansPage() {
  const [q, setQ] = useState("");
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [hits, setHits] = useState<PlanSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const searching = q.trim().length > 0;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchProducts()
      .then((rows) => {
        if (!cancelled) {
          setProducts(rows);
          setError(null);
        }
      })
      .catch(() => {
        if (!cancelled) setError("Could not load products. Start the backend on port 8000.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!searching) {
      setHits([]);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      fetchPlans(q)
        .then((rows) => {
          if (!cancelled) setHits(rows);
        })
        .catch(() => {
          if (!cancelled) setHits([]);
        });
    }, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [q, searching]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">Products</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose a product type, then a plan, then open its brochure, policy or CIS.
        </p>
      </div>

      <div className="relative max-w-xl">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by plan name, number or UIN..."
          className="pl-9"
        />
      </div>

      {error ? <EmptyState>{error}</EmptyState> : null}

      {searching ? (
        <SearchResults q={q} hits={hits} />
      ) : (
        <>
          <p className="text-sm text-muted-foreground">{loading ? "Loading products..." : `${products.length} products`}</p>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {products.map((product) => {
              const Icon = productIcons[product.id] ?? Briefcase;
              return (
                <Link key={product.id} to={`/plans/${product.id}`} className="block">
                  <Card className="flex h-full items-start gap-4 p-5 transition hover:border-primary/40 hover:shadow-card">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted text-primary">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <h2 className="text-base font-semibold leading-snug">{product.name}</h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {product.plan_count} {product.plan_count === 1 ? "plan" : "plans"}
                      </p>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function SearchResults({ q, hits }: { q: string; hits: PlanSummary[] }) {
  if (hits.length === 0) {
    return <EmptyState>{`No plans match "${q}".`}</EmptyState>;
  }
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{hits.length} matching plans</p>
      <PlansTable plans={hits} showProduct />
    </div>
  );
}
