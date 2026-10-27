import type { HTMLAttributes, ReactNode } from "react";

export function Card({
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-xl border border-border bg-card shadow-card ${className}`}
      {...props}
    />
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "default",
}: {
  label: string;
  value: string | number;
  hint: string;
  icon: ReactNode;
  tone?: "default" | "warning" | "gold" | "success";
}) {
  const iconWrap =
    tone === "warning"
      ? "bg-destructive/10 text-destructive"
      : tone === "gold"
        ? "bg-accent text-gold-foreground"
        : tone === "success"
          ? "bg-success/10 text-success"
          : "bg-muted text-primary";
  return (
    <Card className="relative overflow-hidden p-5">
      <div className={`absolute right-4 top-4 rounded-lg p-2 ${iconWrap}`}>{icon}</div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-3xl font-bold tracking-tight num">{value}</p>
      {hint ? <p className="mt-1 text-sm text-muted-foreground">{hint}</p> : null}
    </Card>
  );
}
