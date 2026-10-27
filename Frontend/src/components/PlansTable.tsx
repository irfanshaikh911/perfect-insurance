import { Link } from "react-router-dom";
import { planPath, type PlanSummary } from "../lib/api";

export function PlansTable({
  plans,
  showProduct = false,
  framed = true,
}: {
  plans: PlanSummary[];
  showProduct?: boolean;
  framed?: boolean;
  onOpen?: (plan: PlanSummary) => void;
}) {
  return (
    <div className={`overflow-x-auto ${framed ? "rounded-xl border border-border bg-card shadow-card" : ""}`}>
      <table className="w-full min-w-[36rem] text-left text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/70 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <th className="w-16 px-4 py-3">Sr. No.</th>
            <th className="px-4 py-3">Product Name</th>
            {showProduct ? <th className="px-4 py-3">Type</th> : null}
            <th className="w-28 px-4 py-3">Plan No.</th>
            <th className="w-40 px-4 py-3">UIN No.</th>
          </tr>
        </thead>
        <tbody>
          {plans.map((plan, index) => (
            <tr key={plan.id} className="border-b border-border last:border-0 hover:bg-muted/60">
              <td className="num px-4 py-3 text-muted-foreground">{index + 1}</td>
              <td className="px-4 py-3">
                <Link to={planPath(plan.product_id, plan.id)} className="font-medium text-primary hover:underline">
                  {plan.plan_name}
                </Link>
              </td>
              {showProduct ? <td className="px-4 py-3 text-muted-foreground">{plan.product_name}</td> : null}
              <td className="num px-4 py-3">{plan.plan_number ?? "-"}</td>
              <td className="num px-4 py-3">{plan.uin ?? "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
