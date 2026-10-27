import { Download, TrendingUp, AlertTriangle, Percent, IndianRupee } from "lucide-react";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card, StatCard } from "../components/ui/Card";
import { useStore } from "../data/store";
import { formatDate, formatInrCompact } from "../lib/format";

export function ReportsPage() {
  const { policies, clients, leads, agent } = useStore();
  const active = policies.filter((p) => p.status === "Active");
  const yearly = active.reduce((s, p) => s + p.premium, 0);
  const commission = Math.round(yearly * 0.07);
  const converted = leads.filter((l) => l.stage === "Converted").length;
  const conversion = leads.length ? Math.round((converted / leads.length) * 100) : 0;
  const lapsed = policies.filter((p) => p.status === "Lapsed");
  const mix = new Map<string, { n: number; prem: number }>();
  policies.forEach((p) => {
    const cur = mix.get(p.planName) ?? { n: 0, prem: 0 };
    mix.set(p.planName, { n: cur.n + 1, prem: cur.prem + p.premium });
  });
  const mixRows = [...mix.entries()].sort((a, b) => b[1].prem - a[1].prem);
  const max = mixRows[0]?.[1].prem || 1;
  const pct = Math.round((yearly / agent.yearlyTarget) * 100);

  const exportCsv = () => {
    const lines = ["Plan,Count,Premium", ...mixRows.map(([n, v]) => `${n},${v.n},${v.prem}`)];
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "business-summary.csv";
    a.click();
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">Reports</h1>
        <p className="mt-1 text-sm text-muted-foreground">Your business summary based on the data you have entered.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Yearly premium (active)" value={formatInrCompact(yearly)} hint={`${active.length} active policies`} icon={<IndianRupee className="h-4 w-4" />} />
        <StatCard label="Estimated commission" value={formatInrCompact(commission)} hint="" icon={<TrendingUp className="h-4 w-4" />} />
        <StatCard label="Lead conversion" value={`${conversion}%`} hint="" icon={<Percent className="h-4 w-4" />} tone="success" />
        <StatCard label="Lapsed policies" value={lapsed.length} hint="" icon={<AlertTriangle className="h-4 w-4" />} tone="warning" />
      </div>
      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Target progress</h2>
            <p className="text-sm text-muted-foreground">
              {formatInrCompact(yearly)} of {formatInrCompact(agent.yearlyTarget)} target
            </p>
          </div>
          <Button variant="outline" size="sm" icon={<Download className="h-4 w-4" />} onClick={exportCsv}>
            Export CSV
          </Button>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-primary" style={{ width: `${Math.min(pct, 100)}%` }} />
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{pct} % achieved</p>
      </Card>
      <Card className="p-5">
        <h2 className="mb-4 font-semibold">Plan mix by premium</h2>
        <div className="space-y-3">
          {mixRows.map(([name, v]) => (
            <div key={name}>
              <div className="mb-1 flex justify-between text-sm">
                <span>{name}</span>
                <span className="text-muted-foreground">
                  {v.n} · {formatInrCompact(v.prem)}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-primary" style={{ width: `${(v.prem / max) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </Card>
      <Card className="p-5">
        <h2 className="mb-3 font-semibold">Lapsed policy watchlist</h2>
        {lapsed.map((p) => {
          const c = clients.find((x) => x.id === p.clientId);
          return (
            <div key={p.id} className="flex items-center justify-between border-b border-border py-3 last:border-0">
              <div>
                <p className="font-medium">{c?.name}</p>
                <p className="text-sm text-muted-foreground">
                  {p.planName} · {formatInrCompact(p.premium)} · last due {formatDate(p.dueDate)}
                </p>
              </div>
              <Badge tone="Lapsed">Lapsed</Badge>
            </div>
          );
        })}
      </Card>
    </div>
  );
}
