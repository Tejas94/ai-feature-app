import { getAttribute, type CatalogDraft, type FieldConfidence, type Identifier } from "../src/lib/schema";
import type { TokenUsage } from "../src/lib/cost";
import type { ReviewField } from "../src/lib/confidence";
import type { Pending } from "../src/lib/pending";
import type { GoldLabel } from "./cases";
import { SCORE_FIELDS, type EntryScore, type ScoreField } from "./score";

/** What the runner records for one case. Written to evals/results-*.json as is. */
export interface CaseResult {
  id: string;
  /** True when the model returned a valid draft. False when extraction or scoring threw; see error. */
  ok: boolean;
  error?: string;
  ms: number;
  /** How many photos were sent (see --max-photos). */
  photos?: number;
  attempts?: number;
  usage?: TokenUsage;
  costUsd?: number | null;
  /** Missing while scoreEntry() (P1-07) is open: the case is extracted, not scored. */
  score?: EntryScore;
  /** The model's own confidence per field. */
  modelConfidence?: FieldConfidence;
  /** Confidence after reviewFlags() (P1-06), or null while it is open. */
  checkedConfidence?: Partial<Record<ReviewField, number>> | null;
  draft?: CatalogDraft;
}

export interface CalibrationRow {
  source: string;
  high: { n: number; accuracy: number | null };
  low: { n: number; accuracy: number | null };
}

export interface Summary {
  model: string;
  startedAt: string;
  /** Set when the run sent only the first n photos of each case. */
  maxPhotos: number | null;
  cases: number;
  /** Cases where the model returned a valid draft. */
  extracted: number;
  scored: number;
  failed: number;
  /** Mean per field over all cases; a failed case counts as 0. null when nothing was scored. */
  fields: Record<ScoreField, number | null>;
  overall: number | null;
  costPerEntry: number | null;
  p50LatencyMs: number | null;
  retries: number;
  calibration: CalibrationRow[];
  pending: Pending[];
}

/** Which confidence field speaks for which score field. Tags have no confidence. */
const CONFIDENCE_FOR: Partial<Record<ScoreField, ReviewField>> = {
  title: "title",
  category: "category",
  brand: "attributes",
  model: "attributes",
  condition: "condition",
  identifiers: "identifiers",
};

export const CALIBRATION_THRESHOLD = 0.7;

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

export function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function calibration(
  results: CaseResult[],
  source: string,
  pick: (r: CaseResult) => Partial<Record<ReviewField, number>> | null | undefined,
): CalibrationRow {
  const high: number[] = [];
  const low: number[] = [];
  for (const r of results) {
    const conf = pick(r);
    if (!r.score || !conf) continue;
    for (const field of SCORE_FIELDS) {
      const cf = CONFIDENCE_FOR[field];
      const c = cf ? conf[cf] : undefined;
      if (c == null) continue;
      (c >= CALIBRATION_THRESHOLD ? high : low).push(r.score.fields[field]);
    }
  }
  return {
    source,
    high: { n: high.length, accuracy: mean(high) },
    low: { n: low.length, accuracy: mean(low) },
  };
}

export function summarize(
  model: string,
  startedAt: string,
  results: CaseResult[],
  pending: Pending[] = [],
  maxPhotos: number | null = null,
): Summary {
  const extracted = results.filter((r) => r.ok);
  const scored = extracted.filter((r) => r.score);
  // Scores only mean something once scoring runs; until then they stay null, not 0.
  const fieldMean = (f: ScoreField) => (scored.length ? mean(results.map((r) => r.score?.fields[f] ?? 0)) : null);
  const priced = extracted.map((r) => r.costUsd).filter((c): c is number => c != null);
  return {
    model,
    startedAt,
    maxPhotos,
    cases: results.length,
    extracted: extracted.length,
    scored: scored.length,
    failed: results.length - extracted.length,
    fields: Object.fromEntries(SCORE_FIELDS.map((f) => [f, fieldMean(f)])) as Record<ScoreField, number | null>,
    overall: scored.length ? mean(results.map((r) => r.score?.overall ?? 0)) : null,
    costPerEntry: mean(priced),
    p50LatencyMs: median(extracted.map((r) => r.ms)),
    retries: extracted.reduce((sum, r) => sum + Math.max(0, (r.attempts ?? 1) - 1), 0),
    calibration: [
      calibration(results, "Model's own confidence", (r) => r.modelConfidence),
      calibration(results, "After reviewFlags() (P1-06)", (r) => r.checkedConfidence),
    ],
    pending,
  };
}

export interface SideBySide {
  field: ScoreField;
  predicted: string;
  gold: string;
}

const ids = (list: Identifier[]) => list.map((i) => `${i.kind} ${i.value}`).join(", ") || "(none)";
const tags = (list: string[]) => list.join(", ") || "(none)";

/**
 * The predicted and gold value of every scored field, as text, for reading drafts
 * by eye. No judging here: that is scoreEntry()'s job.
 */
export function sideBySide(draft: CatalogDraft, gold: GoldLabel): SideBySide[] {
  const values: Record<ScoreField, [string, string]> = {
    category: [draft.category, gold.category],
    brand: [getAttribute(draft, "brand") ?? "(none)", gold.brand ?? "(none)"],
    model: [getAttribute(draft, "model") ?? "(none)", gold.model ?? "(none)"],
    identifiers: [ids(draft.visibleText.identifiers), ids(gold.identifiers)],
    condition: [draft.condition.grade, gold.condition],
    tags: [tags(draft.tags), tags(gold.tags)],
    title: [draft.title, gold.title],
  };
  return SCORE_FIELDS.map((field) => ({ field, predicted: values[field][0], gold: values[field][1] }));
}

/** The rows worth reading: all of them before scoring exists, then only fields that lost points. */
export function rowsToRead(r: CaseResult, gold: GoldLabel): SideBySide[] {
  if (!r.draft) return [];
  const rows = sideBySide(r.draft, gold);
  return r.score ? rows.filter((row) => r.score!.fields[row.field] < 1) : rows;
}

const pct = (x: number | null | undefined) => (x == null ? "n/a" : `${Math.round(x * 100)}%`);
const usd = (x: number | null | undefined) => (x == null ? "n/a" : `$${x.toFixed(4)}`);
const secs = (ms: number | null | undefined) => (ms == null ? "n/a" : `${(ms / 1000).toFixed(1)} s`);
const cell = (s: string) => s.replace(/\|/g, "\\|").replace(/\s*\n\s*/g, " ");

/**
 * The markdown written to evals/report.md (and shown on /stats). Pass the gold
 * labels to add a "Drafts versus gold" section for reading the misses.
 */
export function renderReport(s: Summary, results: CaseResult[], labels: Record<string, GoldLabel> = {}): string {
  const lines = [
    "# Eval report",
    "",
    `Model \`${s.model}\`, run ${s.startedAt.slice(0, 16).replace("T", " ")} UTC. ${s.cases} cases: ${s.extracted} extracted, ${s.scored} scored, ${s.failed} failed (a failed case scores 0).`,
    ...(s.maxPhotos != null ? ["", `Only the first ${s.maxPhotos} photo${s.maxPhotos === 1 ? "" : "s"} of each case were sent.`] : []),
    "",
    "| Category | Brand | Model | Identifiers | Condition | Tags F1 | Title | Overall | Cost per entry | p50 latency |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    `| ${SCORE_FIELDS.map((f) => pct(s.fields[f])).join(" | ")} | ${pct(s.overall)} | ${usd(s.costPerEntry)} | ${secs(s.p50LatencyMs)} |`,
    "",
    `Retries: ${s.retries}.`,
    "",
    "## Calibration",
    "",
    `Mean field score for fields with confidence at or above ${CALIBRATION_THRESHOLD} versus below. Well calibrated means the`,
    "high row is clearly more accurate than the low row.",
    "",
    `| Confidence | Fields ≥ ${CALIBRATION_THRESHOLD} | Accuracy | Fields < ${CALIBRATION_THRESHOLD} | Accuracy |`,
    "| --- | --- | --- | --- | --- |",
    ...s.calibration.map((c) => `| ${c.source} | ${c.high.n} | ${pct(c.high.accuracy)} | ${c.low.n} | ${pct(c.low.accuracy)} |`),
    "",
    "## Cases",
    "",
    "| Case | Overall | Category | Brand | Model | Identifiers | Condition | Tags | Title | Attempts | Cost | Latency | Error |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    ...results.map((r) =>
      [
        r.id,
        pct(r.score?.overall),
        ...SCORE_FIELDS.map((f) => pct(r.score?.fields[f])),
        r.attempts ?? "",
        usd(r.costUsd),
        secs(r.ms),
        r.error ? cell(r.error) : "",
      ].join(" | "),
    ).map((row) => `| ${row} |`),
  ];
  if (s.pending.length) {
    lines.push("", "## Not measured", "");
    for (const p of s.pending) lines.push(`- ${p.step}: ${cell(p.message)}`);
  }
  const toRead = results
    .map((r) => ({ id: r.id, rows: labels[r.id] ? rowsToRead(r, labels[r.id]) : [] }))
    .filter((x) => x.rows.length);
  if (toRead.length) {
    lines.push("", "## Drafts versus gold", "", s.scored ? "Fields that scored below 100%." : "Every field, until scoring runs.");
    for (const { id, rows } of toRead) {
      lines.push("", `### ${id}`, "", "| Field | Predicted | Gold |", "| --- | --- | --- |");
      for (const row of rows) lines.push(`| ${row.field} | ${cell(row.predicted)} | ${cell(row.gold)} |`);
    }
  }
  return `${lines.join("\n")}\n`;
}
