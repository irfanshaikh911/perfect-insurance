import { AlertTriangle, Cake, IndianRupee, Plus, Sparkles, UserPlus, FilePlus2, Check } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card, StatCard } from "../components/ui/Card";
import { useStore } from "../data/store";
import { birthdayThisYear, daysUntil, formatDate, formatInrCompact, todayIso } from "../lib/format";

export function DashboardPage() {
  const { agent, clients, policies, followUps, leads, quotations, markFollowUpDone } = useStore();
  const today = todayIso();
  const dues = policies.filter((p) => {
    if (p.status !== "Active") return false;
    const d = daysUntil(p.dueDate, today);
    return d >= 0 && d <= 7;
  });
  const dueTotal = dues.reduce((s, p) => s + p.premium, 0);
  const birthdays = clients.filter((c) => {
    const d = daysUntil(birthdayThisYear(c.dob, today), today);
    return d >= 0 && d <= 7;
  });
  const lapsed = policies.filter((p) => p.status === "Lapsed");
  const newLeads = leads.filter((l) => l.stage === "New" || l.stage === "Contacted");
  const recentClients = [...clients].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">Good day, {agent.firstName}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {agent.branch} · Agent code {agent.code}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Premiums due this week"
          value={dues.length}
          hint={`${formatInrCompact(dueTotal)} collectible`}
          icon={<IndianRupee className="h-4 w-4" />}
        />
        <StatCard
          label="Birthdays this week"
          value={birthdays.length}
          hint="Send greetings to build goodwill"
          icon={<Cake className="h-4 w-4" />}
          tone="gold"
        />
        <StatCard
          label="Policies lapsed"
          value={lapsed.length}
          hint="Revival reminders available"
          icon={<AlertTriangle className="h-4 w-4" />}
          tone="warning"
        />
        <StatCard
          label="New leads"
          value={newLeads.length}
          hint="In New / Contacted stage"
          icon={<Sparkles className="h-4 w-4" />}
          tone="success"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Link to="/clients">
          <Button icon={<UserPlus className="h-4 w-4" />}>New Client</Button>
        </Link>
        <Link to="/quotations">
          <Button variant="outline" icon={<FilePlus2 className="h-4 w-4" />}>
            New Quotation
          </Button>
        </Link>
        <Link to="/leads">
          <Button variant="outline" icon={<Plus className="h-4 w-4" />}>
            New Lead
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-4">
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Today's follow-ups</h2>
              <Link to="/reminders" className="text-sm text-muted-foreground hover:text-foreground">
                All reminders
              </Link>
            </div>
            <div className="divide-y divide-border">
              {followUps
                .filter((f) => !f.done)
                .map((f) => {
                  const c = clients.find((x) => x.id === f.clientId);
                  return (
                    <div key={f.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                      <div>
                        <Link to={`/clients/${f.clientId}`} className="font-medium hover:underline">
                          {c?.name}
                        </Link>
                        <p className="text-sm text-muted-foreground">{f.text}</p>
                      </div>
                      <Button variant="outline" size="sm" icon={<Check className="h-3.5 w-3.5" />} onClick={() => markFollowUpDone(f.id)}>
                        Mark done
                      </Button>
                    </div>
                  );
                })}
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="mb-4 text-lg font-semibold">Premiums due this week</h2>
            {dues.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
                No premiums due in the next 7 days.
              </p>
            ) : (
              <div className="divide-y divide-border">
                {dues.map((p) => {
                  const c = clients.find((x) => x.id === p.clientId);
                  return (
                    <div key={p.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                      <div>
                        <Link to={`/clients/${p.clientId}`} className="font-medium hover:underline">
                          {c?.name}
                        </Link>
                        <p className="text-sm text-muted-foreground">
                          {p.planName} · due {formatDate(p.dueDate)}
                        </p>
                      </div>
                      <p className="font-semibold num">{formatInrCompact(p.premium)}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-5">
            <h2 className="mb-4 text-lg font-semibold">Recent quotations</h2>
            <div className="space-y-3">
              {quotations.slice(0, 3).map((q) => (
                <div key={q.id} className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{q.clientName}</p>
                    <p className="text-sm text-muted-foreground num">
                      {formatInrCompact(q.lines.reduce((s, l) => s + l.yearlyPremium, 0))} · {formatDate(q.created)}
                    </p>
                  </div>
                  <Badge tone={q.status}>{q.status}</Badge>
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-5">
            <h2 className="mb-4 text-lg font-semibold">Recently added clients</h2>
            <div className="space-y-3">
              {recentClients.map((c) => (
                <Link key={c.id} to={`/clients/${c.id}`} className="block hover:underline">
                  <p className="font-medium">{c.name}</p>
                  <p className="text-sm text-muted-foreground num">{c.phone}</p>
                </Link>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
