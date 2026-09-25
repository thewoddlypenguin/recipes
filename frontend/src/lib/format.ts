/** Small shared formatting/date helpers. */

export function slugify(text: string): string {
  return (text || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function fmtMinutes(mins?: number | null): string {
  if (mins === null || mins === undefined) return "—";
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}

export function fmtDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function mondayOf(d: Date): Date {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  copy.setDate(copy.getDate() - copy.getDay() + 1);
  return copy;
}

export function addDays(d: Date, days: number): Date {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  copy.setDate(copy.getDate() + days);
  return copy;
}

export function weekRangeLabel(weekStart: Date): string {
  const end = addDays(weekStart, 6);
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const startLabel = weekStart.toLocaleDateString(undefined, opts);
  const endLabel = end.toLocaleDateString(undefined, {
    ...opts,
    year: end.getFullYear() !== weekStart.getFullYear() ? "numeric" : undefined,
  });
  return `${startLabel} – ${endLabel}`;
}

export function dayDateLabel(weekStart: Date, dayIndex: number): string {
  return addDays(weekStart, dayIndex).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}