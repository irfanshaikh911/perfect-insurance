import type { ReactNode } from "react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Switch } from "../components/ui/Tabs";
import { Textarea } from "../components/ui/Field";
import { useStore } from "../data/store";
import {
  ageFromDob,
  fillTemplate,
  formatDate,
  formatInrCompact,
  telLink,
  waLink,
} from "../lib/format";

export function ClientProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { clients, policies, templates, agent, addNote, toggleReminders, logMessage } = useStore();
  const client = clients.find((c) => c.id === id);
  const [note, setNote] = useState("");
  if (!client) {
    return (
      <p className="text-sm text-muted-foreground">
        Client not found. <Link to="/clients">All clients</Link>
      </p>
    );
  }
  const list = policies.filter((p) => p.clientId === client.id);
  const birthdayTpl = templates.find((t) => t.category === "Birthday");
  const reminderTpl = templates.find((t) => t.category === "Premium Due");
  const due = list.find((p) => p.status === "Active");

  const send = (title: string, body: string) => {
    window.open(waLink(client.phone, body), "_blank");
    logMessage({
      id: `m${Date.now()}`,
      title,
      channel: "WhatsApp",
      date: new Date().toISOString().slice(0, 10),
      clientId: client.id,
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">{client.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Age {ageFromDob(client.dob)} · {client.phone || "No phone on file"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/clients" className="text-sm text-muted-foreground hover:text-foreground">
            ← All clients
          </Link>
          <Button size="sm" onClick={() => navigate("/quotations")}>
            Create quotation
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              birthdayTpl &&
              send(
                "Birthday greeting",
                fillTemplate(birthdayTpl.body, { client_name: client.name, agent_name: agent.name }),
              )
            }
          >
            Birthday greeting
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              reminderTpl &&
              send(
                "Premium due reminder",
                fillTemplate(reminderTpl.body, {
                  client_name: client.name,
                  agent_name: agent.name,
                  amount: due ? String(due.premium) : "",
                  due_date: due ? formatDate(due.dueDate) : "",
                }),
              )
            }
          >
            Send reminder
          </Button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-4">
          <Card className="overflow-hidden p-5">
            <h2 className="mb-3 text-lg font-semibold">Policies</h2>
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="py-2 font-medium">Plan</th>
                  <th className="py-2 font-medium">Sum assured</th>
                  <th className="py-2 font-medium">Premium</th>
                  <th className="py-2 font-medium">Mode</th>
                  <th className="py-2 font-medium">Due date</th>
                  <th className="py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {list.map((p) => (
                  <tr key={p.id}>
                    <td className="py-3">
                      <p className="font-medium">{p.planName}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.policyNumber ? `Policy ${p.policyNumber} · ` : ""}
                        Plan {p.planCode || "—"}
                      </p>
                    </td>
                    <td className="num">{formatInrCompact(p.sumAssured)}</td>
                    <td className="num">{formatInrCompact(p.premium)}</td>
                    <td>{p.mode}</td>
                    <td>{formatDate(p.dueDate)}</td>
                    <td>
                      <Badge tone={p.status}>{p.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <Card className="p-5">
            <h2 className="mb-3 text-lg font-semibold">Notes & meeting log</h2>
            <Textarea placeholder="What was discussed?" value={note} onChange={(e) => setNote(e.target.value)} />
            <Button
              className="mt-3"
              size="sm"
              onClick={() => {
                if (!note.trim()) return;
                addNote(client.id, note.trim());
                setNote("");
              }}
            >
              + Add note
            </Button>
            <div className="mt-4 space-y-3">
              {client.notes.length === 0 && <p className="text-sm text-muted-foreground">No notes yet.</p>}
              {client.notes.map((n) => (
                <div key={n.id}>
                  <p className="text-xs text-muted-foreground">{formatDate(n.date)}</p>
                  <p className="text-sm">{n.text}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
        <div className="space-y-4">
          <Card className="p-5">
            <h2 className="mb-3 text-lg font-semibold">Contact</h2>
            <dl className="space-y-2 text-sm">
              <Row
                k="Phone"
                v={
                  client.phone ? (
                    <a href={telLink(client.phone)}>{client.phone}</a>
                  ) : (
                    "—"
                  )
                }
              />
              <Row k="Email" v={client.email || "—"} />
              <Row k="Date of birth" v={formatDate(client.dob)} />
              <Row k="Address" v={client.address || "—"} />
            </dl>
            <div className="mt-3 flex flex-wrap gap-1">
              {client.tags.map((t) => (
                <Badge key={t}>{t}</Badge>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm">Automatic reminders</span>
              <Switch checked={client.autoReminders} onChange={() => toggleReminders(client.id)} label="Automatic reminders" />
            </div>
          </Card>
          <Card className="p-5">
            <h2 className="mb-3 text-lg font-semibold">Family members</h2>
            {client.family.length === 0 && <p className="text-sm text-muted-foreground">No family members recorded.</p>}
            {client.family.map((f) => (
              <div key={f.name} className="mb-2">
                <p className="font-medium">{f.name}</p>
                <p className="text-sm text-muted-foreground">
                  {f.relation}
                  {f.dob ? ` · ${formatDate(f.dob)}` : ""}
                </p>
              </div>
            ))}
          </Card>
          <Card className="p-5">
            <h2 className="mb-3 text-lg font-semibold">Documents</h2>
            <div className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
              Upload a scanned file
            </div>
            {client.documents.length === 0 && <p className="mt-3 text-sm text-muted-foreground">No documents yet.</p>}
            {client.documents.map((d) => (
              <div key={d.id} className="mt-2 flex justify-between text-sm">
                <span>{d.name}</span>
                <span className="text-muted-foreground">{d.sizeLabel}</span>
              </div>
            ))}
          </Card>
          <Card className="p-5">
            <h2 className="mb-3 text-lg font-semibold">Message history</h2>
            {client.messages.length === 0 && <p className="text-sm text-muted-foreground">No messages sent yet.</p>}
            {client.messages.map((m) => (
              <div key={m.id} className="mb-2">
                <p className="font-medium">{m.title}</p>
                <p className="text-sm text-muted-foreground">
                  {m.channel} · {formatDate(m.date)}
                </p>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="text-right">{v}</dd>
    </div>
  );
}
