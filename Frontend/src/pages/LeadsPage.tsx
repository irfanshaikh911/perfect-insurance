import { ChevronLeft, ChevronRight, Phone, Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Dialog } from "../components/ui/Tabs";
import { Field, Input, Select } from "../components/ui/Field";
import { STAGES, useStore } from "../data/store";
import { formatDate, telLink } from "../lib/format";
import type { LeadSource } from "../types/models";

export function LeadsPage() {
  const { leads, addLead, moveLead } = useStore();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [source, setSource] = useState<LeadSource>("Referral");

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">Leads / Pipeline</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Move each prospect forward one stage at a time. Converted leads become clients.
          </p>
        </div>
        <Button icon={<Plus className="h-4 w-4" />} onClick={() => setOpen(true)}>
          Add lead
        </Button>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {STAGES.map((stage) => {
          const items = leads.filter((l) => l.stage === stage);
          return (
            <div key={stage} className="w-56 shrink-0">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-semibold">{stage}</h2>
                <span className="rounded-full bg-muted px-2 text-xs">{items.length}</span>
              </div>
              {items.length === 0 ? (
                <Card className="px-3 py-8 text-center text-sm text-muted-foreground">Empty</Card>
              ) : (
                <div className="space-y-2">
                  {items.map((l) => (
                    <Card key={l.id} className="p-3">
                      <p className="font-medium">{l.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {l.source} · follow-up {formatDate(l.followUp)}
                      </p>
                      <div className="mt-2 flex items-center justify-between">
                        <button type="button" aria-label="Move back" onClick={() => moveLead(l.id, -1)}>
                          <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                        </button>
                        <a href={telLink(l.phone)} aria-label="Call lead" className="text-muted-foreground">
                          <Phone className="h-4 w-4" />
                        </a>
                        <button type="button" aria-label="Move forward" onClick={() => moveLead(l.id, 1)}>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <Dialog
        open={open}
        title="Add lead"
        onClose={() => setOpen(false)}
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!name}
              onClick={() => {
                addLead({
                  id: `l${Date.now()}`,
                  name,
                  phone,
                  source,
                  stage: "New",
                  followUp: new Date().toISOString().slice(0, 10),
                  note: "",
                });
                setOpen(false);
                setName("");
                setPhone("");
              }}
            >
              Save
            </Button>
          </>
        }
      >
        <div className="grid gap-3">
          <Field label="Name">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Phone">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
          <Field label="Source">
            <Select value={source} onChange={(e) => setSource(e.target.value as LeadSource)}>
              <option>Referral</option>
              <option>Campaign</option>
              <option>Cold</option>
            </Select>
          </Field>
        </div>
      </Dialog>
    </div>
  );
}
