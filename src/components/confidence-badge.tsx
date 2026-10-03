import { REVIEW_THRESHOLD } from "@/lib/confidence";

export function ConfidenceBadge({ value, source }: { value: number | undefined; source?: string }) {
  if (value == null) return null;
  const level = value >= REVIEW_THRESHOLD ? "ok" : value >= 0.4 ? "warn" : "bad";
  return (
    <span className={`badge ${level}`} title={source ? `Confidence (${source})` : "Confidence"}>
      {Math.round(value * 100)}%
    </span>
  );
}
