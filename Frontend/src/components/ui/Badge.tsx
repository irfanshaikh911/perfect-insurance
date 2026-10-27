import type { ReactNode } from "react";
const tones: Record<string, string> = {
  Sent: "bg-primary/10 text-primary",
  Viewed: "bg-muted text-foreground",
  Accepted: "bg-success/15 text-success",
  Rejected: "bg-destructive/10 text-destructive",
  Draft: "bg-muted text-muted-foreground",
  Active: "bg-success/15 text-success",
  Lapsed: "bg-destructive/10 text-destructive",
  Matured: "bg-gold/20 text-gold-foreground",
  tag: "bg-secondary text-secondary-foreground",
};

export function Badge({
  children,
  tone = "tag",
}: {
  children: ReactNode;
  tone?: keyof typeof tones | string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${tones[tone] ?? tones.tag}`}
    >
      {children}
    </span>
  );
}
