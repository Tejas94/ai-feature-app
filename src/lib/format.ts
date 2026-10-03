/** Display helpers shared by the pages. */

export function formatUsd(usd: number | null | undefined): string {
  if (usd == null) return "n/a";
  return usd < 0.01 ? `$${usd.toFixed(4)}` : `$${usd.toFixed(3)}`;
}

export function formatMs(ms: number | null | undefined): string {
  if (ms == null) return "n/a";
  return ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(1)} s`;
}

export function formatPercent(x: number | null | undefined): string {
  return x == null ? "n/a" : `${Math.round(x * 100)}%`;
}

export function formatBytes(bytes: number): string {
  return bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toISOString().slice(0, 10);
}

export const GRADE_LABELS: Record<string, string> = {
  new: "New",
  like_new: "Like new",
  good: "Good",
  fair: "Fair",
  poor: "Poor",
};

/** One field value as short text, for the "draft vs final" table. */
export function formatFieldValue(value: unknown): string {
  if (value == null || value === "") return "(empty)";
  if (Array.isArray(value)) {
    if (value.length === 0) return "(none)";
    return value
      .map((v) => {
        if (typeof v === "string") return v;
        if (v && typeof v === "object" && "name" in v && "value" in v) return `${v.name}: ${v.value}`;
        if (v && typeof v === "object" && "kind" in v && "value" in v) return `${String(v.kind).toUpperCase()} ${v.value}`;
        return JSON.stringify(v);
      })
      .join(", ");
  }
  if (typeof value === "string") return GRADE_LABELS[value] ?? value;
  return JSON.stringify(value);
}
