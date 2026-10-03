import { writeFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import { CASES_DIR, loadCases, readCasePhotos } from "./cases";
import { renderReport, rowsToRead, summarize, type CaseResult } from "./report";
import { estimateImageTokens, imageSize, toImageBlocks } from "../src/lib/images";
import { isTodoError } from "../src/lib/errors";
import { optional, type Pending } from "../src/lib/pending";

/**
 * Runs every case in evals/cases against the real model (it costs money) and
 * writes evals/results-<model>-<timestamp>.json plus evals/report.md.
 *
 *   npm run eval                                   all cases, ANTHROPIC_MODEL or the default
 *   npm run eval -- --model claude-haiku-4-5       another model
 *   npm run eval -- --case kettle,mug              only cases whose id contains a word
 *   npm run eval -- --max-photos 1                 send only the first photo of each case
 *   npm run eval -- --check                        check the case folders, no API calls
 *
 * Until scoreEntry() (P1-07) exists, cases are extracted but not scored, and the
 * runner prints each draft next to its gold label so you can judge by eye.
 *
 * EVAL_MIN_SCORE=0.8 makes it exit non-zero when the overall score is lower (for CI in week 9).
 */

const USAGE = `Usage: npm run eval -- [--model <id>] [--case <words>] [--max-photos <n>] [--check]`;

async function main() {
  const { values } = parseArgs({
    options: {
      model: { type: "string" },
      case: { type: "string" },
      "max-photos": { type: "string" },
      check: { type: "boolean", default: false },
      help: { type: "boolean", default: false },
    },
  });
  if (values.help) {
    console.log(USAGE);
    return;
  }
  // Set before the model modules load: src/lib/llm.ts reads it once at import.
  if (values.model) process.env.ANTHROPIC_MODEL = values.model;
  const maxPhotos = values["max-photos"] == null ? null : Number(values["max-photos"]);
  if (maxPhotos != null && !(Number.isInteger(maxPhotos) && maxPhotos >= 1)) {
    console.error(`--max-photos needs a whole number of at least 1.\n${USAGE}`);
    process.exitCode = 1;
    return;
  }

  const cases = await loadCases(CASES_DIR, values.case);
  if (cases.length === 0) {
    console.error(values.case ? `No case id contains "${values.case}".` : `No cases in ${CASES_DIR}.`);
    process.exitCode = 1;
    return;
  }

  if (values.check) {
    let tokens = 0;
    for (const c of cases) {
      const photos = (await readCasePhotos(c)).slice(0, maxPhotos ?? undefined);
      const sizes = photos.map((p) => imageSize(p.data));
      const caseTokens = sizes.reduce((sum, s) => sum + (s ? estimateImageTokens(s.width, s.height) : 0), 0);
      tokens += caseTokens;
      const dims = sizes.map((s) => (s ? `${s.width}x${s.height}` : "?")).join(", ");
      console.log(`OK  ${c.id}: ${photos.length} photos (${dims}), ~${caseTokens} image tokens, "${c.label.title}"`);
    }
    console.log(`\n${cases.length} cases look valid. About ${tokens.toLocaleString()} image tokens per full run.`);
    if (cases.length < 20) console.log("P1-08 asks for 20 real products; see evals/cases/README.md.");
    return;
  }

  const { extractDraft } = await import("../src/lib/extract");
  const { reviewFlags } = await import("../src/lib/confidence");
  const { costUsd } = await import("../src/lib/cost");
  const { MODEL } = await import("../src/lib/llm");
  const { scoreEntry } = await import("./score");

  const startedAt = new Date().toISOString();
  const photoNote = maxPhotos != null ? `, first ${maxPhotos} photo${maxPhotos === 1 ? "" : "s"} per case` : "";
  console.log(`Running ${cases.length} cases on ${MODEL}${photoNote}\n`);
  const results: CaseResult[] = [];
  const pending: Pending[] = [];
  const note = (p: Pending[]) => {
    for (const x of p) if (!pending.some((y) => y.step === x.step)) pending.push(x);
  };

  for (const c of cases) {
    const started = Date.now();
    const result: CaseResult = { id: c.id, ok: false, ms: 0 };
    try {
      const photos = (await readCasePhotos(c)).slice(0, maxPhotos ?? undefined);
      result.photos = photos.length;
      const { draft, usage, attempts } = await extractDraft(toImageBlocks(photos));
      result.ms = Date.now() - started;
      Object.assign(result, { draft, usage, attempts, modelConfidence: draft.confidence });
      result.ok = true;
      const steps: Pending[] = [];
      result.costUsd = optional("Cost (P1-02)", steps, () => costUsd(MODEL, usage));
      const review = optional("Review flags (P1-06)", steps, () => reviewFlags(draft));
      result.checkedConfidence = review ? Object.fromEntries(review.fields.map((f) => [f.field, f.confidence])) : null;
      note(steps);
      try {
        result.score = scoreEntry(draft, c.label);
      } catch (err) {
        // An open P1-07 is expected in week 2: keep the draft, skip the score.
        if (!isTodoError(err)) throw err;
        note([{ step: "Scoring (P1-07)", todo: "P1-07", message: (err as Error).message }]);
      }
    } catch (err) {
      result.ok = false;
      result.ms ||= Date.now() - started;
      result.error = err instanceof Error ? err.message : String(err);
    }
    results.push(result);
    const line = !result.ok ? "FAIL" : result.score ? `${Math.round(result.score.overall * 100)}%`.padStart(4) : "  --";
    const detail = result.error ?? (result.ok && !result.score ? "extracted, not scored" : "");
    console.log(`${line}  ${c.id}  (${(result.ms / 1000).toFixed(1)} s)${detail ? `  ${detail}` : ""}`);
    for (const row of rowsToRead(result, c.label)) {
      console.log(`      ${row.field.padEnd(12)} ${row.predicted}\n      ${"".padEnd(12)} gold: ${row.gold}`);
    }
  }

  const summary = summarize(MODEL, startedAt, results, pending, maxPhotos);
  const evalsDir = path.dirname(CASES_DIR);
  const stamp = startedAt.replace(/[:.]/g, "-");
  const resultsFile = path.join(evalsDir, `results-${MODEL.replace(/[^\w.-]/g, "_")}-${stamp}.json`);
  await writeFile(resultsFile, `${JSON.stringify({ summary, results }, null, 2)}\n`);
  const labels = Object.fromEntries(cases.map((c) => [c.id, c.label]));
  await writeFile(path.join(evalsDir, "report.md"), renderReport(summary, results, labels));

  const pct = (x: number | null) => (x == null ? "n/a" : `${Math.round(x * 100)}%`);
  console.log(
    [
      "",
      `Overall ${pct(summary.overall)} on ${summary.cases} cases (${summary.extracted} extracted, ${summary.scored} scored, ${summary.failed} failed) · model ${MODEL}`,
      `Category ${pct(summary.fields.category)} · brand ${pct(summary.fields.brand)} · identifiers ${pct(summary.fields.identifiers)} · condition ${pct(summary.fields.condition)} · tags F1 ${pct(summary.fields.tags)}`,
      `Cost per entry ${summary.costPerEntry == null ? "n/a" : `$${summary.costPerEntry.toFixed(4)}`} · p50 latency ${summary.p50LatencyMs == null ? "n/a" : `${(summary.p50LatencyMs / 1000).toFixed(1)} s`} · retries ${summary.retries}`,
      ...pending.map((p) => `Not measured: ${p.message}`),
      `Saved ${path.relative(process.cwd(), resultsFile)} and evals/report.md`,
    ].join("\n"),
  );
  if (cases.length < 20) console.log("P1-08 asks for 20 real products; see evals/cases/README.md.");

  const min = process.env.EVAL_MIN_SCORE ? Number(process.env.EVAL_MIN_SCORE) : undefined;
  if (summary.failed > 0) process.exitCode = 1;
  if (min != null && (summary.overall ?? 0) < min) {
    console.error(`Overall ${pct(summary.overall)} is below EVAL_MIN_SCORE ${min}.`);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
