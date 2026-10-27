import { useState } from "react";
import { Camera, Check, Trash2, Upload } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Field, Input } from "../components/ui/Field";
import { Switch } from "../components/ui/Tabs";
import { cloneSeed } from "../data/seed";
import { useStore } from "../data/store";
import { initials } from "../lib/format";

export function SettingsPage() {
  const { agent, saveAgent, reset } = useStore();
  const [form, setForm] = useState(agent);
  const [saved, setSaved] = useState(false);
  const set = (k: keyof typeof form, v: string | number | boolean) => setForm({ ...form, [k]: v });

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

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Your profile, reminders and data backup.</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-4 font-semibold">Agent profile</h2>

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
              <Input value={form.code} onChange={(e) => set("code", e.target.value)} />
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
          <h2 className="mb-4 font-semibold">Reminder preferences</h2>
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
          <h2 className="mb-3 mt-6 font-semibold">Data backup</h2>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={download}>
              Download backup
            </Button>
            <label className="inline-flex h-9 cursor-pointer items-center rounded-lg border border-border px-4 text-sm">
              Restore backup
              <input
                type="file"
                accept="application/json"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const text = await file.text();
                  localStorage.setItem("lic-buddy-hub-state", text);
                  window.location.reload();
                }}
              />
            </label>
            <Button variant="outline" onClick={reset}>
              Reset to sample data
            </Button>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            All data stays in this browser. Download a backup regularly, or ask to move everything to a secure cloud
            database.
          </p>
        </Card>
      </div>
    </div>
  );
}
