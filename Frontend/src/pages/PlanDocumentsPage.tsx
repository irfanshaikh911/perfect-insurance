import { ChevronLeft, FileText } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { PdfViewer } from "../components/PdfViewer";
import { Badge } from "../components/ui/Badge";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/Tabs";
import { fetchPlan, type CatalogPlan } from "../lib/api";

const docOrder = ["Brochure", "Policy", "CIS"];

export function PlanDocumentsPage() {
  const { productId = "", planId = "" } = useParams();
  const [plan, setPlan] = useState<CatalogPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchPlan(planId)
      .then((row) => {
        if (!cancelled) {
          setPlan(row);
          setError(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPlan(null);
          setError("Could not load this plan.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [planId]);

  const docs = [...(plan?.docs ?? [])].sort(
    (a, b) =>
      (docOrder.indexOf(a.type) === -1 ? 9 : docOrder.indexOf(a.type)) -
      (docOrder.indexOf(b.type) === -1 ? 9 : docOrder.indexOf(b.type)),
  );

  return (
    <div className="space-y-5">
      <Link
        to={`/plans/${encodeURIComponent(productId)}`}
        className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        {plan?.product_name || "Back to plans"}
      </Link>

      {error ? <EmptyState>{error}</EmptyState> : null}

      {plan ? (
        <Card className="p-5 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {plan.product_name}
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">
            {plan.plan_number ? `LIC's ${plan.plan_name}` : plan.plan_name}
          </h1>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {plan.plan_number ? <Badge>Plan {plan.plan_number}</Badge> : null}
            {plan.uin ? <Badge>UIN {plan.uin}</Badge> : null}
          </div>
          <ul className="mt-6 space-y-2">
            {docs.map((doc) => (
              <li key={doc.url}>
                <button
                  type="button"
                  onClick={() => setPreviewUrl(doc.url)}
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-muted"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-primary">
                    <FileText className="h-4 w-4" />
                  </span>
                  <span>
                    <span className="block text-sm font-medium">{doc.label}</span>
                    <span className="text-xs text-muted-foreground">PDF</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {docs.length === 0 ? <EmptyState>No documents for this plan.</EmptyState> : null}
        </Card>
      ) : !error ? (
        <p className="text-sm text-muted-foreground">Loading documents...</p>
      ) : null}

      {plan && previewUrl ? (
        <PdfViewer
          planName={plan.plan_name}
          planNumber={plan.plan_number}
          docs={plan.docs}
          activeUrl={previewUrl}
          onChangeDoc={setPreviewUrl}
          onClose={() => setPreviewUrl(null)}
        />
      ) : null}
    </div>
  );
}
