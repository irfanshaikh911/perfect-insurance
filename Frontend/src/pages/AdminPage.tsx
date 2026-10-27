import { useMemo, useState } from "react";
import { Card } from "../components/ui/Card";
import { Tabs } from "../components/ui/Tabs";
import { Field, Input, Select } from "../components/ui/Field";
import { useStore } from "../data/store";
import { seedPlans } from "../data/seed";

export function AdminPage() {
  const { rates, commission } = useStore();
  const [tab, setTab] = useState("rates");
  const [plan, setPlan] = useState("all");
  const [age, setAge] = useState("");
  const filtered = useMemo(
    () =>
      rates.filter(
        (r) => (plan === "all" || r.planCode === plan) && (!age || String(r.age) === age),
      ),
    [rates, plan, age],
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">Rate & Commission Tables</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Admin reference only — kept separate from day-to-day agent screens.
        </p>
      </div>
      <div className="rounded-xl border border-gold/40 bg-accent px-4 py-3 text-sm text-gold-foreground">
        These figures are placeholder sample data used to demo the calculator. Replace them with verified numbers from
        official LIC plan brochures and rate circulars before quoting real clients.
      </div>
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "rates", label: "Premium rates" },
          { id: "comm", label: "Commission" },
          { id: "plans", label: "Plans" },
        ]}
      />
      {tab === "rates" && (
        <Card className="overflow-hidden p-5">
          <div className="mb-4 grid gap-3 md:grid-cols-2">
            <Field label="Plan">
              <Select value={plan} onChange={(e) => setPlan(e.target.value)}>
                <option value="all">All plans</option>
                {seedPlans.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.code} — {p.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Entry age">
              <Input placeholder="e.g. 30" value={age} onChange={(e) => setAge(e.target.value)} />
            </Field>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="py-2">Plan</th>
                  <th>Entry age</th>
                  <th>Term</th>
                  <th>Rate / 1,000 SA</th>
                  <th>Effective</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="py-2">{r.planCode}</td>
                    <td>{r.age}</td>
                    <td>{r.term}</td>
                    <td className="num">{r.ratePerThousand.toFixed(2)}</td>
                    <td>{r.effectiveDate}</td>
                    <td className="text-muted-foreground">{r.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      {tab === "comm" && (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Plan</th>
                <th>Policy year</th>
                <th>Commission %</th>
                <th>Effective</th>
              </tr>
            </thead>
            <tbody>
              {commission.map((r, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="px-4 py-2">{r.planName}</td>
                  <td>{r.years}</td>
                  <td>{r.ratePct}%</td>
                  <td>{r.effectiveDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      {tab === "plans" && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Plan master</h2>
          {seedPlans.map((p) => (
            <Card key={p.code} className="p-4">
              <p className="font-semibold">
                {p.code} — {p.name}
              </p>
              <p className="text-sm text-muted-foreground">
                {p.category} · age {p.minAge} – {p.maxAge} · terms {p.terms.join(", ")}
              </p>
              <p className="mt-1 text-sm">{p.blurb.replace(" Entry age 8 – 55 . Figures are indicative sample values, not official LIC quotes.", "")}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
