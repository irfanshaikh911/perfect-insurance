import { Cake, MessageSquare, Search, Send, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "../components/ui/Button";
import { Card, StatCard } from "../components/ui/Card";
import { Tabs } from "../components/ui/Tabs";
import { Field, Input, Select, Textarea } from "../components/ui/Field";
import { Badge } from "../components/ui/Badge";
import { useStore } from "../data/store";
import {
  birthdayThisYear,
  daysUntil,
  fillTemplate,
  formatDate,
  formatInrCompact,
  todayIso,
  waLink,
} from "../lib/format";
import type { MessageChannel, Policy, PremiumMode, TemplateCategory } from "../types/models";

type DatePreset = "7" | "30" | "60" | "overdue" | "custom";
type SortKey = "dueDate" | "premium" | "name";

function addDaysIso(from: string, days: number): string {
  const [y, m, d] = from.split("-").map(Number);
  const dt = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

export function RemindersPage() {
  const { clients, policies, templates, messages, agent, addTemplate, logMessage } = useStore();
  const [tab, setTab] = useState("cal");
  const today = todayIso();
  const [name, setName] = useState("");
  const [cat, setCat] = useState<TemplateCategory>("Follow-up");
  const [body, setBody] = useState("");
  const [bulkTpl, setBulkTpl] = useState(templates[0]?.id ?? "");

  const [search, setSearch] = useState("");
  const [datePreset, setDatePreset] = useState<DatePreset>("30");
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(addDaysIso(today, 30));
  const [premiumMin, setPremiumMin] = useState("");
  const [premiumMax, setPremiumMax] = useState("");
  const [mode, setMode] = useState<"all" | PremiumMode>("all");
  const [status, setStatus] = useState<"all" | "Active" | "Lapsed" | "Matured">("Active");
  const [sortBy, setSortBy] = useState<SortKey>("dueDate");
  const [logSearch, setLogSearch] = useState("");
  const [logFrom, setLogFrom] = useState("");
  const [logTo, setLogTo] = useState("");
  const [logChannel, setLogChannel] = useState<"all" | MessageChannel>("all");

  const clientById = useMemo(() => new Map(clients.map((c) => [c.id, c])), [clients]);

  const dateWindow = useMemo(() => {
    if (datePreset === "overdue") {
      return { from: "1900-01-01", to: addDaysIso(today, -1), overdue: true as const };
    }
    if (datePreset === "custom") {
      return { from: dateFrom || today, to: dateTo || today, overdue: false as const };
    }
    const days = Number(datePreset);
    return { from: today, to: addDaysIso(today, days), overdue: false as const };
  }, [datePreset, dateFrom, dateTo, today]);

  const filteredDues = useMemo(() => {
    const q = search.trim().toLowerCase();
    const min = premiumMin ? Number(premiumMin) : null;
    const max = premiumMax ? Number(premiumMax) : null;

    let list = policies.filter((p) => {
      if (status !== "all" && p.status !== status) return false;
      if (mode !== "all" && p.mode !== mode) return false;
      if (min != null && !Number.isNaN(min) && p.premium < min) return false;
      if (max != null && !Number.isNaN(max) && p.premium > max) return false;
      if (p.dueDate < dateWindow.from || p.dueDate > dateWindow.to) return false;

      if (q) {
        const c = clientById.get(p.clientId);
        const hay = `${c?.name ?? ""} ${p.planName} ${p.planCode} ${p.policyNumber ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    list = [...list].sort((a, b) => {
      if (sortBy === "premium") return b.premium - a.premium;
      if (sortBy === "name") {
        const na = clientById.get(a.clientId)?.name ?? "";
        const nb = clientById.get(b.clientId)?.name ?? "";
        return na.localeCompare(nb);
      }
      return a.dueDate.localeCompare(b.dueDate);
    });
    return list;
  }, [policies, status, mode, premiumMin, premiumMax, dateWindow, search, sortBy, clientById]);

  const filteredBirthdays = useMemo(() => {
    const q = search.trim().toLowerCase();
    return clients
      .map((c) => ({ c, next: birthdayThisYear(c.dob, today) }))
      .filter((x) => {
        if (datePreset === "overdue") return false;
        if (x.next < dateWindow.from || x.next > dateWindow.to) return false;
        if (q && !`${x.c.name} ${x.c.phone}`.toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => a.next.localeCompare(b.next));
  }, [clients, today, dateWindow, datePreset, search]);

  const filteredMessages = useMemo(() => {
    const q = logSearch.trim().toLowerCase();
    return messages.filter((m) => {
      if (logChannel !== "all" && m.channel !== logChannel) return false;
      if (logFrom && m.date < logFrom) return false;
      if (logTo && m.date > logTo) return false;
      if (q) {
        const c = m.clientId ? clientById.get(m.clientId) : undefined;
        const hay = `${m.title} ${m.channel} ${c?.name ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [messages, logSearch, logFrom, logTo, logChannel, clientById]);

  const statsDues30 = useMemo(
    () =>
      policies.filter((p) => {
        if (p.status !== "Active") return false;
        const d = daysUntil(p.dueDate, today);
        return d >= 0 && d <= 30;
      }).length,
    [policies, today],
  );
  const statsBirthdays30 = useMemo(
    () =>
      clients.filter((c) => {
        const d = daysUntil(birthdayThisYear(c.dob, today), today);
        return d >= 0 && d <= 30;
      }).length,
    [clients, today],
  );

  const clearPremiumFilters = () => {
    setSearch("");
    setDatePreset("30");
    setDateFrom(today);
    setDateTo(addDaysIso(today, 30));
    setPremiumMin("");
    setPremiumMax("");
    setMode("all");
    setStatus("Active");
    setSortBy("dueDate");
  };

  const sendTpl = (tplId: string, clientName: string, phone: string, extra: Record<string, string>, title: string, clientId?: string) => {
    const t = templates.find((x) => x.id === tplId) ?? templates[0];
    if (!t) return;
    if (!phone) return;
    const text = fillTemplate(t.body, { client_name: clientName, agent_name: agent.name, ...extra });
    window.open(waLink(phone, text), "_blank");
    logMessage({
      id: `m${Date.now()}`,
      title,
      channel: "WhatsApp",
      date: today,
      clientId,
    });
  };

  const dueBadge = (p: Policy) => {
    const d = daysUntil(p.dueDate, today);
    if (d < 0) return <Badge tone="Lapsed">{Math.abs(d)}d overdue</Badge>;
    if (d === 0) return <Badge tone="Lapsed">Due today</Badge>;
    return <Badge>in {d} d</Badge>;
  };

  const showPremiumFilters = tab === "cal" || tab === "bulk";
  const showLogFilters = tab === "log";

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">Reminders & Messages</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upcoming premium dates, birthdays, and ready-made WhatsApp messages.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Premiums due (30 days)" value={statsDues30} hint="" icon={<Send className="h-4 w-4" />} />
        <StatCard
          label="Birthdays (30 days)"
          value={statsBirthdays30}
          hint=""
          icon={<Cake className="h-4 w-4" />}
          tone="gold"
        />
        <StatCard
          label="Messages logged"
          value={messages.length}
          hint=""
          icon={<MessageSquare className="h-4 w-4" />}
          tone="success"
        />
      </div>
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "cal", label: "Calendar" },
          { id: "tpl", label: "Templates" },
          { id: "bulk", label: "Bulk send" },
          { id: "log", label: "Message log" },
        ]}
      />

      {showPremiumFilters && (
        <div className="filter-bar">
          {/* Search */}
          <div className="filter-search">
            <Search className="filter-search-icon" />
            <Input
              placeholder="Search name, plan, or policy…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="filter-search-input"
              style={{ border: "none", background: "transparent", boxShadow: "none", outline: "none", paddingLeft: "2rem" }}
            />
          </div>

          {/* Date presets */}
          <span className="filter-divider" />
          <div className="filter-date-presets">
            {(
              [
                ["7", "7d"],
                ["30", "30d"],
                ["60", "60d"],
                ["overdue", "Overdue"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={`filter-preset-btn${datePreset === id ? " active" : ""}`}
                onClick={() => setDatePreset(id)}
              >
                {label}
              </button>
            ))}
          </div>

          <span className="filter-divider" />

          {/* Mode */}
          <Select
            value={mode}
            onChange={(e) => setMode(e.target.value as "all" | PremiumMode)}
            className="filter-select"
            style={{ border: "none", background: "transparent", boxShadow: "none", outline: "none" }}
          >
            <option value="all">All modes</option>
            <option value="Yearly">Yearly</option>
            <option value="Half-Yearly">Half-Yearly</option>
            <option value="Quarterly">Quarterly</option>
            <option value="Monthly">Monthly</option>
          </Select>

          {/* Status */}
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value as "all" | "Active" | "Lapsed" | "Matured")}
            className="filter-select"
            style={{ border: "none", background: "transparent", boxShadow: "none", outline: "none" }}
          >
            <option value="Active">Active</option>
            <option value="Lapsed">Lapsed</option>
            <option value="Matured">Matured</option>
            <option value="all">All statuses</option>
          </Select>

          {/* Sort */}
          <Select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortKey)}
            className="filter-select"
            style={{ border: "none", background: "transparent", boxShadow: "none", outline: "none" }}
          >
            <option value="dueDate">Due date</option>
            <option value="premium">Premium ↓</option>
            <option value="name">Name A–Z</option>
          </Select>

          <span className="filter-divider" />

          <Button variant="outline" size="sm" icon={<X className="h-3.5 w-3.5" />} onClick={clearPremiumFilters}>
            Clear
          </Button>
        </div>
      )}

      {showLogFilters && (
        <Card className="space-y-3 p-4">
          <p className="text-sm font-medium">Message filters</p>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search title or client"
              value={logSearch}
              onChange={(e) => setLogSearch(e.target.value)}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="From">
              <Input type="date" value={logFrom} onChange={(e) => setLogFrom(e.target.value)} />
            </Field>
            <Field label="To">
              <Input type="date" value={logTo} onChange={(e) => setLogTo(e.target.value)} />
            </Field>
            <Field label="Channel">
              <Select
                value={logChannel}
                onChange={(e) => setLogChannel(e.target.value as "all" | MessageChannel)}
              >
                <option value="all">All channels</option>
                <option value="WhatsApp">WhatsApp</option>
                <option value="SMS">SMS</option>
                <option value="Email">Email</option>
              </Select>
            </Field>
          </div>
          <p className="text-xs text-muted-foreground">
            Showing {filteredMessages.length} of {messages.length} messages
          </p>
        </Card>
      )}

      {tab === "cal" && (
        <div className="space-y-4">
          <Card className="p-5">
            <h2 className="mb-3 font-semibold">Premium due dates</h2>
            {filteredDues.length === 0 && (
              <p className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
                No premiums match these filters.
              </p>
            )}
            <div className="divide-y divide-border">
              {filteredDues.map((p) => {
                const c = clientById.get(p.clientId);
                const tpl = templates.find((t) => t.category === "Premium Due");
                return (
                  <div key={p.id} className="flex items-center justify-between gap-3 py-3">
                    <div>
                      <p className="font-medium">{c?.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {p.planName}
                        {p.policyNumber ? ` · #${p.policyNumber}` : ""} · {formatInrCompact(p.premium)} {p.mode} · due{" "}
                        {formatDate(p.dueDate)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {dueBadge(p)}
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!c?.phone}
                        onClick={() =>
                          c &&
                          tpl &&
                          sendTpl(
                            tpl.id,
                            c.name,
                            c.phone,
                            { amount: String(p.premium), due_date: formatDate(p.dueDate) },
                            "Premium due reminder",
                            c.id,
                          )
                        }
                      >
                        Remind
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
          <Card className="p-5">
            <h2 className="mb-3 font-semibold">Birthdays</h2>
            {filteredBirthdays.length === 0 && (
              <p className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
                No birthdays match these filters.
              </p>
            )}
            {filteredBirthdays.map(({ c, next }) => {
              const d = daysUntil(next, today);
              const tpl = templates.find((t) => t.category === "Birthday");
              return (
                <div key={c.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium">{c.name}</p>
                    <p className="text-sm text-muted-foreground">
                      in {d} day{d === 1 ? "" : "s"} · {formatDate(next)}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!c.phone}
                    onClick={() => tpl && sendTpl(tpl.id, c.name, c.phone, {}, "Birthday greeting", c.id)}
                  >
                    Wish
                  </Button>
                </div>
              );
            })}
          </Card>
        </div>
      )}

      {tab === "tpl" && (
        <div className="space-y-4">
          <Card className="space-y-3 p-5">
            <h2 className="font-semibold">New template</h2>
            <Field label="Name">
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="Category">
              <Select value={cat} onChange={(e) => setCat(e.target.value as TemplateCategory)}>
                <option>Follow-up</option>
                <option>Birthday</option>
                <option>Premium Due</option>
                <option>Festival</option>
                <option>Revival</option>
              </Select>
            </Field>
            <Field label="Message body">
              <Textarea
                placeholder="Use {client_name}, {agent_name}, {amount}, {due_date}"
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
            </Field>
            <Button
              onClick={() => {
                if (!name || !body) return;
                addTemplate({ id: `tm${Date.now()}`, name, category: cat, body });
                setName("");
                setBody("");
              }}
            >
              + Save template
            </Button>
          </Card>
          {templates.map((t) => (
            <Card key={t.id} className="p-4">
              <div className="mb-1 flex items-center gap-2">
                <p className="font-medium">{t.name}</p>
                <Badge>{t.category}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{t.body}</p>
            </Card>
          ))}
        </div>
      )}

      {tab === "bulk" && (
        <Card className="space-y-3 p-5">
          <Field label="Template">
            <Select value={bulkTpl} onChange={(e) => setBulkTpl(e.target.value)}>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </Field>
          <p className="text-sm text-muted-foreground">
            Opens WhatsApp for each filtered client who has a phone number. Uses the same filters as Calendar.
          </p>
          <Button
            disabled={filteredDues.filter((p) => clientById.get(p.clientId)?.phone).length === 0}
            onClick={() => {
              const withPhone = filteredDues.filter((p) => clientById.get(p.clientId)?.phone);
              withPhone.forEach((p, i) => {
                const c = clientById.get(p.clientId);
                if (!c?.phone) return;
                setTimeout(
                  () =>
                    sendTpl(
                      bulkTpl,
                      c.name,
                      c.phone,
                      { amount: String(p.premium), due_date: formatDate(p.dueDate) },
                      "Bulk reminder",
                      c.id,
                    ),
                  i * 400,
                );
              });
            }}
          >
            Send to {filteredDues.filter((p) => clientById.get(p.clientId)?.phone).length} filtered clients
          </Button>
        </Card>
      )}

      {tab === "log" && (
        <Card className="p-5">
          {filteredMessages.length === 0 && (
            <p className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
              No messages match these filters.
            </p>
          )}
          {filteredMessages.map((m) => {
            const c = m.clientId ? clientById.get(m.clientId) : undefined;
            return (
              <div key={m.id} className="border-b border-border py-3 last:border-0">
                <p className="font-medium">{m.title}</p>
                <p className="text-sm text-muted-foreground">
                  {m.channel} · {formatDate(m.date)}
                  {c ? ` · ${c.name}` : ""}
                </p>
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}
