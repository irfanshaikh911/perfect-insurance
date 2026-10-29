import Papa from "papaparse";
import { Plus, Search, Upload, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Dialog } from "../components/ui/Tabs";
import { Field, Input, Select } from "../components/ui/Field";
import { useStore } from "../data/store";
import { formatDate } from "../lib/format";
import type { Client, Policy } from "../types/models";

const PAGE_SIZE = 50;

export function ClientsListPage() {
  const { clients, policies, addClient, importClients, isLoadingData, refreshAgentData } = useStore();
  const [q, setQ] = useState("");
  const [tag, setTag] = useState("all");
  const [sort, setSort] = useState("name");
  const [page, setPage] = useState(1);
  const [importOpen, setImportOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const tags = ["High Value", "New Lead", "Lapse Risk"];

  // Pre-calculate policy count & next due date in O(N) instead of O(N*M)
  const { policyCountMap, nextDueMap } = useMemo(() => {
    const pCount: Record<string, number> = {};
    const nDue: Record<string, string> = {};

    for (const p of policies) {
      pCount[p.clientId] = (pCount[p.clientId] || 0) + 1;
      if (p.status === "Active") {
        if (!nDue[p.clientId] || p.dueDate < nDue[p.clientId]) {
          nDue[p.clientId] = p.dueDate;
        }
      }
    }
    return { policyCountMap: pCount, nextDueMap: nDue };
  }, [policies]);

  const rows = useMemo(() => {
    let list = clients.filter(
      (c) =>
        `${c.name} ${c.phone}`.toLowerCase().includes(q.toLowerCase()) &&
        (tag === "all" || c.tags.includes(tag)),
    );
    list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    if (sort === "due") {
      list.sort((a, b) => (nextDueMap[a.id] ?? "9999").localeCompare(nextDueMap[b.id] ?? "9999"));
    }
    return list;
  }, [clients, q, tag, sort, nextDueMap]);

  // Reset page when filter changes
  useEffect(() => {
    setPage(1);
  }, [q, tag, sort]);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pagedRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">Clients</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isLoadingData ? (
              <span className="inline-flex items-center gap-1.5 text-primary">
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                Syncing clients from database…
              </span>
            ) : (
              <span>{clients.length.toLocaleString()} clients in your book</span>
            )}
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          icon={<RefreshCw className={`h-3.5 w-3.5 ${isLoadingData ? "animate-spin text-primary" : ""}`} />}
          onClick={() => refreshAgentData()}
          disabled={isLoadingData}
        >
          {isLoadingData ? "Syncing…" : "Refresh"}
        </Button>
      </div>

      <div className="filter-bar">
        {/* Search */}
        <div className="filter-search">
          <Search className="filter-search-icon" />
          <Input
            placeholder="Search by name or phone…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="filter-search-input"
            style={{ border: "none", background: "transparent", boxShadow: "none", outline: "none", paddingLeft: "2rem" }}
          />
        </div>
        {/* Filters */}
        <Select value={tag} onChange={(e) => setTag(e.target.value)} className="filter-select" style={{ border: "none", background: "transparent", boxShadow: "none", outline: "none" }}>
          <option value="all">All tags</option>
          {tags.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </Select>
        <Select value={sort} onChange={(e) => setSort(e.target.value)} className="filter-select" style={{ border: "none", background: "transparent", boxShadow: "none", outline: "none" }}>
          <option value="name">Sort: Name</option>
          <option value="due">Sort: Next due</option>
        </Select>
        {/* Divider */}
        <span className="filter-divider" />
        {/* Actions */}
        <Button variant="outline" icon={<Upload className="h-4 w-4" />} onClick={() => setImportOpen(true)}>
          Import
        </Button>
        <Button icon={<Plus className="h-4 w-4" />} onClick={() => setAddOpen(true)}>
          Add Client
        </Button>
      </div>

      <Card className="overflow-hidden">
        {isLoadingData && clients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <RefreshCw className="h-7 w-7 animate-spin text-primary" />
            <p className="text-sm font-medium">Fetching client book from database…</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border text-left text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Phone</th>
                    <th className="px-4 py-3 font-medium">Policies</th>
                    <th className="px-4 py-3 font-medium">Next premium due</th>
                    <th className="px-4 py-3 font-medium">Tags</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {pagedRows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                        {q ? "No clients match your search criteria." : "No clients found."}
                      </td>
                    </tr>
                  ) : (
                    pagedRows.map((c) => {
                      const count = policyCountMap[c.id] || 0;
                      const due = nextDueMap[c.id];
                      return (
                        <tr key={c.id} className="hover:bg-muted/50">
                          <td className="px-4 py-3">
                            <Link to={`/clients/${c.id}`} className="font-medium hover:underline text-foreground">
                              {c.name}
                            </Link>
                          </td>
                          <td className="px-4 py-3 num text-muted-foreground">{c.phone || "—"}</td>
                          <td className="px-4 py-3">{count}</td>
                          <td className="px-4 py-3">{due ? formatDate(due) : "—"}</td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              {c.tags.map((t) => (
                                <Badge key={t}>{t}</Badge>
                              ))}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted-foreground">
                <p>
                  Showing <span className="font-medium text-foreground">{(page - 1) * PAGE_SIZE + 1}</span> to{" "}
                  <span className="font-medium text-foreground">
                    {Math.min(page * PAGE_SIZE, rows.length)}
                  </span>{" "}
                  of <span className="font-medium text-foreground">{rows.length.toLocaleString()}</span> clients
                </p>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    Previous
                  </Button>
                  <span className="px-2">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Next
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
      <AddClientDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSave={(c) => {
          addClient(c);
          setAddOpen(false);
        }}
      />
      <ImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImport={(cs, ps) => {
          importClients(cs, ps);
          setImportOpen(false);
        }}
      />
    </div>
  );
}

function AddClientDialog({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (c: Client) => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [dob, setDob] = useState("");
  const [address, setAddress] = useState("");
  return (
    <Dialog
      open={open}
      title="Add client"
      onClose={onClose}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() =>
              onSave({
                id: `c${Date.now()}`,
                name,
                phone,
                email,
                dob: dob || "1990-01-01",
                address,
                tags: ["New Lead"],
                autoReminders: true,
                family: [],
                notes: [],
                documents: [],
                messages: [],
                createdAt: new Date().toISOString().slice(0, 10),
              })
            }
            disabled={!name || !phone}
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
        <Field label="Email">
          <Input value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Date of birth">
          <Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
        </Field>
        <Field label="Address">
          <Input value={address} onChange={(e) => setAddress(e.target.value)} />
        </Field>
      </div>
    </Dialog>
  );
}

function ImportDialog({
  open,
  onClose,
  onImport,
}: {
  open: boolean;
  onClose: () => void;
  onImport: (c: Client[], p: Policy[]) => void;
}) {
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [map, setMap] = useState<Record<string, string>>({});
  const fields = ["name", "phone", "email", "dob", "plan", "premium", "dueDate"];

  return (
    <Dialog
      open={open}
      title="Import clients from a file"
      onClose={onClose}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!rows.length || !map.name}
            onClick={() => {
              const clients: Client[] = [];
              const policies: Policy[] = [];
              rows.forEach((r, i) => {
                const get = (k: string) => {
                  const col = map[k];
                  const idx = headers.indexOf(col);
                  return idx >= 0 ? r[idx] ?? "" : "";
                };
                const id = `imp${Date.now()}${i}`;
                clients.push({
                  id,
                  name: get("name"),
                  phone: get("phone"),
                  email: get("email"),
                  dob: get("dob") || "1990-01-01",
                  address: "",
                  tags: ["New Lead"],
                  autoReminders: true,
                  family: [],
                  notes: [],
                  documents: [],
                  messages: [],
                  createdAt: new Date().toISOString().slice(0, 10),
                });
                if (get("plan")) {
                  policies.push({
                    id: `p${id}`,
                    clientId: id,
                    planCode: "",
                    planName: get("plan"),
                    sumAssured: 0,
                    premium: Number(get("premium") || 0),
                    mode: "Yearly",
                    dueDate: get("dueDate") || "2026-12-31",
                    status: "Active",
                  });
                }
              });
              onImport(clients, policies);
            }}
          >
            Confirm import
          </Button>
        </>
      }
    >
      <p className="mb-3 text-sm text-muted-foreground">
        Upload a CSV exported from Excel. Map each column, review the preview, then confirm.
      </p>
      <input
        type="file"
        accept=".csv,text/csv"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          Papa.parse<string[]>(file, {
            complete: (res) => {
              const data = res.data.filter((r) => r.some((c) => c));
              const hdr = (data[0] ?? []).map(String);
              setHeaders(hdr);
              setRows(data.slice(1, 11).map((r) => r.map(String)));
              setMap({ name: hdr[0] ?? "", phone: hdr[1] ?? "" });
            },
          });
        }}
      />
      {headers.length > 0 && (
        <div className="mt-4 space-y-2">
          {fields.map((f) => (
            <div key={f} className="flex items-center gap-2 text-sm">
              <span className="w-24 capitalize">{f}</span>
              <Select value={map[f] ?? ""} onChange={(e) => setMap({ ...map, [f]: e.target.value })}>
                <option value="">—</option>
                {headers.map((h) => (
                  <option key={h}>{h}</option>
                ))}
              </Select>
            </div>
          ))}
          <p className="pt-2 text-xs text-muted-foreground">Preview {rows.length} rows</p>
        </div>
      )}
    </Dialog>
  );
}
