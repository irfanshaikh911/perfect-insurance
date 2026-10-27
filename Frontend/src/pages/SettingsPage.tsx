import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Camera,
  Check,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  HardDrive,
  Loader2,
  RefreshCw,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Field, Input } from "../components/ui/Field";
import { Switch } from "../components/ui/Tabs";
import { cloneSeed } from "../data/seed";
import { useStore } from "../data/store";
import { initials } from "../lib/format";
import {
  getUploadHistoryApi,
  uploadPolicyBookApi,
  type UploadHistoryItem,
  type UploadResult,
} from "../lib/agentApi";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatUploadTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function SettingsPage() {
  const { agent, saveAgent, reset, refreshAgentData } = useStore();
  const [form, setForm] = useState(agent);
  const [saved, setSaved] = useState(false);
  const set = (k: keyof typeof form, v: string | number | boolean) => setForm({ ...form, [k]: v });

  // Upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [history, setHistory] = useState<UploadHistoryItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync form when store agent changes
  useEffect(() => {
    setForm(agent);
  }, [agent]);

  // Load upload history
  const loadHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const data = await getUploadHistoryApi();
      setHistory(data);
    } catch {
      /* ignore */
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxDim = 256;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.88);
          setForm((prev) => ({ ...prev, avatar: dataUrl }));
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setForm((prev) => {
      const next = { ...prev };
      delete next.avatar;
      return next;
    });
  };

  const handleSave = () => {
    saveAgent({
      ...form,
      firstName: form.name.trim().split(/\s+/)[0] ?? form.name,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const download = () => {
    const blob = new Blob([JSON.stringify(cloneSeed(), null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "lic-workspace-backup.json";
    a.click();
  };

  const handleFileSelect = (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["xlsx", "xls", "pdf"].includes(ext || "")) {
      setUploadError("Unsupported format. Please select an Excel (.xlsx, .xls) or PDF file.");
      setSelectedFile(null);
      return;
    }
    setUploadError(null);
    setUploadResult(null);
    setSelectedFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleUploadSubmit = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    setUploadError(null);
    setUploadResult(null);

    try {
      const res = await uploadPolicyBookApi(selectedFile);
      setUploadResult(res);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      // Refresh upload history and agent's active store
      await Promise.all([loadHistory(), refreshAgentData()]);
    } catch (err: any) {
      setUploadError(err.message || "Failed to process policy file.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">Settings & Data Management</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your personal agent profile, upload and sync your policy book, and configure reminders.
        </p>
      </div>

      {/* POLICY BOOK IMPORT SECTION */}
      <Card className="overflow-hidden border border-primary/20 shadow-sm">
        <div className="border-b border-border/70 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                <HardDrive className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold">Policy Book Import (Excel / PDF)</h2>
                <p className="text-xs text-muted-foreground">
                  Upload your LIC agency register. Data is parsed, stored in your server folder, and isolated to your account.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" /> Multi-Tenant Isolation
              </span>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Dropzone Area */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-all ${
              isDragging
                ? "border-primary bg-primary/10"
                : "border-border/80 hover:border-primary/50 hover:bg-muted/30"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.pdf"
              className="hidden"
              id="policy-book-input"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelect(file);
              }}
            />

            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-3">
              <Upload className="h-7 w-7" />
            </div>

            <p className="text-sm font-semibold">
              Drop your LIC Policy Book here, or{" "}
              <label
                htmlFor="policy-book-input"
                className="cursor-pointer text-primary underline underline-offset-2 hover:text-primary/80 font-medium"
              >
                browse files
              </label>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Supports Excel spreadsheets (.xlsx, .xls) and LIC PDF registers (.pdf)
            </p>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-foreground">
                <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> Excel (.xlsx, .xls)
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-foreground">
                <FileText className="h-3.5 w-3.5 text-red-600 dark:text-red-400" /> PDF Register (.pdf)
              </span>
            </div>
          </div>

          {/* Selected File Card */}
          {selectedFile && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-xl border border-primary/30 bg-primary/5 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-background shadow-xs">
                  {selectedFile.name.endsWith(".pdf") ? (
                    <FileText className="h-5 w-5 text-red-600 dark:text-red-400" />
                  ) : (
                    <FileSpreadsheet className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold truncate max-w-xs sm:max-w-md">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatBytes(selectedFile.size)} · Ready to import
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isUploading}
                  onClick={() => {
                    setSelectedFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="flex-1 sm:flex-none"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={isUploading}
                  onClick={handleUploadSubmit}
                  className="flex-1 sm:flex-none gap-1.5"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Parsing & Ingesting…
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Import Policy Book
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Upload Success Alert */}
          {uploadResult && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
                    {uploadResult.message}
                  </p>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300">
                    File <span className="font-medium">{uploadResult.filename}</span> was saved to the server and all records have been synchronized with your personal database.
                  </p>
                  <div className="flex flex-wrap gap-3 pt-2 text-xs font-medium text-emerald-800 dark:text-emerald-300">
                    <span>Policies: {uploadResult.total_policies}</span>
                    <span>•</span>
                    <span>New Clients: {uploadResult.clients_created}</span>
                    <span>•</span>
                    <span>New Policies Added: {uploadResult.policies_created}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Upload Error Alert */}
          {uploadError && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 shrink-0 text-destructive mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-destructive">Import Failed</p>
                  <p className="text-xs text-destructive/90 mt-0.5">{uploadError}</p>
                </div>
              </div>
            </div>
          )}

          {/* Upload History Table */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Upload History</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={loadHistory}
                disabled={isLoadingHistory}
                className="h-7 text-xs gap-1"
              >
                <RefreshCw className={`h-3 w-3 ${isLoadingHistory ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>

            {history.length === 0 ? (
              <div className="rounded-xl border border-border/70 bg-muted/20 p-6 text-center text-xs text-muted-foreground">
                No policy books uploaded yet. Upload your first Excel or PDF file above to see it recorded here.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border/80">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-border bg-muted/50 font-medium text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2.5">File Name</th>
                      <th className="px-4 py-2.5">Type</th>
                      <th className="px-4 py-2.5">Size</th>
                      <th className="px-4 py-2.5">Records</th>
                      <th className="px-4 py-2.5">Uploaded At</th>
                      <th className="px-4 py-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {history.map((item) => (
                      <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-medium flex items-center gap-2">
                          {item.file_type === "pdf" ? (
                            <FileText className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" />
                          ) : (
                            <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          )}
                          <span className="truncate max-w-xs">{item.filename}</span>
                        </td>
                        <td className="px-4 py-3 uppercase text-[11px] font-semibold text-muted-foreground">
                          {item.file_type}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{formatBytes(item.file_size)}</td>
                        <td className="px-4 py-3 font-semibold">{item.records_count}</td>
                        <td className="px-4 py-3 text-muted-foreground">{formatUploadTime(item.created_at)}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${
                              item.status === "completed"
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : item.status === "processing"
                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                : "bg-destructive/10 text-destructive"
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* PROFILE AND PREFERENCES GRID */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-4 font-semibold">Agent Profile Details</h2>

          {/* Profile Photo Upload Section */}
          <div className="mb-6 flex flex-col sm:flex-row items-center gap-4 rounded-xl border border-border/70 bg-muted/20 p-4">
            <div className="relative group shrink-0">
              {form.avatar ? (
                <img
                  src={form.avatar}
                  alt={form.name}
                  className="h-20 w-20 rounded-full object-cover ring-2 ring-primary/40 shadow-sm"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-xl font-bold tracking-wider text-primary-foreground shadow-sm">
                  {initials(form.name || "Agent")}
                </div>
              )}
            </div>

            <div className="flex-1 text-center sm:text-left space-y-1.5">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <p className="text-sm font-semibold">Profile Photo</p>
                {!form.avatar && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                    Initials: {initials(form.name || "Agent")}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Appears in the top Navbar profile icon. If no photo is uploaded, your initials ({initials(form.name || "Agent")}) will be shown.
              </p>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors shadow-2xs">
                  <Camera className="h-3.5 w-3.5" />
                  Upload Photo
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                </label>
                {form.avatar && (
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-destructive/30 px-3 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name">
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} />
            </Field>
            <Field label="Agent code">
              <Input value={form.code} disabled className="opacity-75 cursor-not-allowed" />
            </Field>
            <Field label="Branch">
              <Input value={form.branch} onChange={(e) => set("branch", e.target.value)} />
            </Field>
            <Field label="Phone">
              <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            </Field>
            <Field label="Email">
              <Input value={form.email} onChange={(e) => set("email", e.target.value)} />
            </Field>
            <Field label="Yearly premium target (₹)">
              <Input
                type="number"
                value={form.yearlyTarget}
                onChange={(e) => set("yearlyTarget", Number(e.target.value))}
              />
            </Field>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <Button onClick={handleSave}>
              Save profile
            </Button>
            {saved && (
              <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <Check className="h-4 w-4" /> Profile saved!
              </span>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 font-semibold">Reminder Preferences</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span>Email reminders</span>
              <Switch checked={form.emailReminders} onChange={(v) => set("emailReminders", v)} />
            </div>
            <div className="flex items-center justify-between">
              <span>WhatsApp reminders</span>
              <Switch checked={form.whatsappReminders} onChange={(v) => set("whatsappReminders", v)} />
            </div>
            <div className="flex items-center justify-between">
              <span>Browser notifications</span>
              <Switch checked={form.browserNotifications} onChange={(v) => set("browserNotifications", v)} />
            </div>
          </div>

          <h2 className="mb-3 mt-6 font-semibold">Local Backup & Reset</h2>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={download}>
              Download JSON backup
            </Button>
            <label className="inline-flex h-9 cursor-pointer items-center rounded-lg border border-border px-4 text-sm">
              Restore JSON backup
              <input
                type="file"
                accept="application/json"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const text = await file.text();
                  localStorage.setItem("lic-buddy-hub-state-v2", text);
                  window.location.reload();
                }}
              />
            </label>
            <Button variant="outline" onClick={reset}>
              Reset to sample data
            </Button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            All policy registers uploaded above are securely stored in your personal Supabase cloud database.
          </p>
        </Card>
      </div>
    </div>
  );
}
