const IST = "Asia/Kolkata";

export function todayIso(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: IST }).format(new Date());
}

export function parseIso(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1, 0, 0, 0));
}

function parts(iso: string) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: IST,
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).formatToParts(parseIso(iso));
}

export function formatDate(iso: string): string {
  const p = Object.fromEntries(parts(iso).map((x) => [x.type, x.value]));
  const month = (p.month ?? "").replace(".", "");
  return `${String(p.day).padStart(2, "0")} ${month} ${p.year}`;
}

export function formatInrCompact(n: number): string {
  return `₹${new Intl.NumberFormat("en-IN").format(Math.round(n))}`;
}

export function ageFromDob(dob: string, on = todayIso()): number {
  const [y, m, d] = dob.split("-").map(Number);
  const [Y, M, D] = on.split("-").map(Number);
  let age = Y - y;
  if (M < m || (M === m && D < d)) age -= 1;
  return age;
}

export function daysUntil(iso: string, from = todayIso()): number {
  const a = parseIso(from).getTime();
  const b = parseIso(iso).getTime();
  return Math.round((b - a) / 86400000);
}

export function birthdayThisYear(dob: string, from = todayIso()): string {
  const [, m, d] = dob.split("-");
  const year = from.slice(0, 4);
  let next = `${year}-${m}-${d}`;
  if (next < from) next = `${Number(year) + 1}-${m}-${d}`;
  return next;
}

export function initials(name: string): string {
  if (!name) return "";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function waLink(phone: string, text: string): string {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export function telLink(phone: string): string {
  return `tel:+${phone.replace(/\D/g, "")}`;
}

export function fillTemplate(body: string, vars: Record<string, string>): string {
  return body.replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? "");
}
