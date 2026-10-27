import { Calculator, IndianRupee, Landmark, PiggyBank, Wallet } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState, Tabs } from "../components/ui/Tabs";
import { Field, Input, Select } from "../components/ui/Field";
import { useStore } from "../data/store";
import { calculatePremium, solveSumAssuredFromBudget } from "../lib/calculator";
import { formatDate, formatInrCompact } from "../lib/format";
import type { QuoteStatus } from "../types/models";

export function QuotationsPage() {
  const store = useStore();
  const [tab, setTab] = useState("calc");
  const defaultPlan = store.plans[0];
  const [planCode, setPlanCode] = useState(defaultPlan.code);
  const plan = store.plans.find((p) => p.code === planCode) ?? defaultPlan;
  const [age, setAge] = useState(35);
  const [term, setTerm] = useState(plan.terms.includes(20) ? 20 : plan.terms[0]);
  const [sa, setSa] = useState(500000);
  const [budget, setBudget] = useState(0);
  const [clientId, setClientId] = useState("walkin");
  const [tpl, setTpl] = useState("");

  const result = useMemo(
    () =>
      calculatePremium({
        planCode,
        age,
        term,
        sumAssured: sa,
        rows: store.rates,
        plans: store.plans,
      }),
    [planCode, age, term, sa, store.rates, store.plans],
  );

  const tiles = [
    { label: "Yearly premium", value: result.yearly, icon: <Wallet className="h-4 w-4" /> },
    { label: "Half-yearly", value: result.halfYearly, icon: <Wallet className="h-4 w-4" /> },
    { label: "Quarterly", value: result.quarterly, icon: <PiggyBank className="h-4 w-4" /> },
    { label: "Monthly", value: result.monthly, icon: <PiggyBank className="h-4 w-4" /> },
    { label: "Total premiums paid", value: result.totalPaid, icon: <Landmark className="h-4 w-4" /> },
    { label: "Estimated bonus", value: result.bonus, icon: <Calculator className="h-4 w-4" />, gold: true },
    { label: "Maturity estimate", value: result.maturity, icon: <IndianRupee className="h-4 w-4" />, gold: true },
    { label: "Your 1st-year commission", value: result.commissionYear1, icon: <Wallet className="h-4 w-4" />, gold: true },
  ];

  const client = store.clients.find((c) => c.id === clientId);
  const totals = store.comboDraft.reduce(
    (a, l) => ({
      premium: a.premium + l.yearlyPremium,
      commission: a.commission + l.commission,
      maturity: a.maturity + l.maturity,
    }),
    { premium: 0, commission: 0, maturity: 0 },
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">Quotation & Calculator</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Estimate premiums, build multi-plan proposals and see your commission.
        </p>
      </div>
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "calc", label: "Calculator" },
          { id: "builder", label: "Quotation builder" },
          { id: "saved", label: `Saved ( ${store.quotations.length} )` },
        ]}
      />

      {tab === "calc" && (
        <>
          <Card className="space-y-4 p-5">
            <div className="grid gap-3 md:grid-cols-4">
              <Field label="Plan">
                <Select
                  value={planCode}
                  onChange={(e) => {
                    const code = e.target.value;
                    const next = store.plans.find((p) => p.code === code);
                    setPlanCode(code);
                    if (next) setTerm(next.terms[0]);
                  }}
                >
                  {store.plans.map((p) => (
                    <option key={p.code} value={p.code}>
                      {p.code} — {p.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Age at entry">
                <Input type="number" value={age} onChange={(e) => setAge(Number(e.target.value))} />
              </Field>
              <Field label="Policy term (years)">
                <Select value={term} onChange={(e) => setTerm(Number(e.target.value))}>
                  {plan.terms.map((t) => (
                    <option key={t} value={t}>
                      {t} years
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Sum assured">
                <Input type="number" value={sa} onChange={(e) => setSa(Number(e.target.value))} />
              </Field>
            </div>
            <p className="text-sm text-muted-foreground">{plan.blurb}</p>
            {result.missing && (
              <p className="text-sm text-destructive">No verified rate for this plan/age/term.</p>
            )}
            {result.interpolated && !result.missing && (
              <p className="text-sm text-gold-foreground">Approximate — interpolated between sample ages.</p>
            )}
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {tiles.map((t) => (
                <Card key={t.label} className="p-4">
                  <div className="flex items-start justify-between">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {t.label}
                    </p>
                    <span className={`rounded-md p-1.5 ${t.gold ? "bg-accent text-gold-foreground" : "bg-muted text-primary"}`}>
                      {t.icon}
                    </span>
                  </div>
                  <p className="mt-2 text-xl font-bold num">{formatInrCompact(t.value)}</p>
                </Card>
              ))}
            </div>
            <div className="rounded-xl border border-border p-4">
              <h2 className="mb-3 font-semibold">Reverse calculator</h2>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  type="number"
                  placeholder="e.g. 30000"
                  value={budget || ""}
                  onChange={(e) => setBudget(Number(e.target.value))}
                />
                <Button
                  className="shrink-0 whitespace-nowrap"
                  onClick={() =>
                    setSa(
                      solveSumAssuredFromBudget({
                        planCode,
                        age,
                        term,
                        budget,
                        rows: store.rates,
                        plans: store.plans,
                      }),
                    )
                  }
                >
                  Suggest sum assured
                </Button>
              </div>
            </div>
            <Button
              onClick={() =>
                store.addQuoteLine({
                  planCode,
                  planName: plan.name,
                  age,
                  term,
                  sumAssured: sa,
                  yearlyPremium: result.yearly,
                  commission: result.commissionYear1,
                  maturity: result.maturity,
                })
              }
              disabled={result.missing}
            >
              + Add this plan to quotation
            </Button>
          </Card>
        </>
      )}

      {tab === "builder" && (
        <Card className="space-y-4 p-5">
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Client">
              <Select value={clientId} onChange={(e) => setClientId(e.target.value)}>
                <option value="walkin">Walk-in prospect</option>
                {store.clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Combo templates">
              <Select
                value={tpl}
                onChange={(e) => {
                  setTpl(e.target.value);
                  const t = store.comboTemplates.find((x) => x.id === e.target.value);
                  if (!t) return;
                  store.clearDraft();
                  t.planCodes.forEach((code) => {
                    const p = store.plans.find((x) => x.code === code);
                    if (!p) return;
                    const r = calculatePremium({
                      planCode: code,
                      age,
                      term: p.terms[0],
                      sumAssured: sa,
                      rows: store.rates,
                      plans: store.plans,
                    });
                    store.addQuoteLine({
                      planCode: code,
                      planName: p.name,
                      age,
                      term: p.terms[0],
                      sumAssured: sa,
                      yearlyPremium: r.yearly,
                      commission: r.commissionYear1,
                      maturity: r.maturity,
                    });
                  });
                }}
              >
                <option value="">Load a saved combo</option>
                {store.comboTemplates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          {store.comboDraft.length === 0 ? (
            <EmptyState>No plans added yet. Use the calculator tab to add plans.</EmptyState>
          ) : (
            <>
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr>
                    <th className="py-2">Plan</th>
                    <th>SA</th>
                    <th>Yearly</th>
                    <th>Commission</th>
                  </tr>
                </thead>
                <tbody>
                  {store.comboDraft.map((l, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="py-2">
                        {l.planCode} — {l.planName}
                      </td>
                      <td className="num">{formatInrCompact(l.sumAssured)}</td>
                      <td className="num">{formatInrCompact(l.yearlyPremium)}</td>
                      <td className="num">{formatInrCompact(l.commission)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-sm">
                Combined yearly premium: <b className="num">{formatInrCompact(totals.premium)}</b>
              </p>
              <p className="text-sm">
                Your commission: <b className="num">{formatInrCompact(totals.commission)}</b>
              </p>
              <p className="text-sm">
                Maturity estimate: <b className="num">{formatInrCompact(totals.maturity)}</b>
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={() =>
                    store.saveQuotation({
                      id: `q${Date.now()}`,
                      clientId: clientId === "walkin" ? null : clientId,
                      clientName: client?.name ?? "Walk-in prospect",
                      created: new Date().toISOString().slice(0, 10),
                      validTill: new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10),
                      status: "Sent",
                      lines: store.comboDraft,
                    })
                  }
                >
                  Save & mark sent
                </Button>
                <Button variant="outline" onClick={() => store.clearDraft()}>
                  Clear
                </Button>
              </div>
            </>
          )}
        </Card>
      )}

      {tab === "saved" && (
        <div className="space-y-3">
          {store.quotations.map((q) => (
            <Card key={q.id} className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium">{q.clientName}</p>
                <p className="text-sm text-muted-foreground">
                  Created {formatDate(q.created)} · Valid till {formatDate(q.validTill)} · {q.lines.length} plan
                  {q.lines.length === 1 ? "" : "s"}
                </p>
              </div>
              <Badge tone={q.status as QuoteStatus}>{q.status}</Badge>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
