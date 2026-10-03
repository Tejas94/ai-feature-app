import { writeFile } from "node:fs/promises";
import { cases } from "./cases";
import { scoreCase } from "./score";
import { extractFilters } from "../src/lib/extract-filters";
import { addUsage, costUsd, type TokenUsage } from "../src/lib/cost";
import { MODEL } from "../src/lib/llm";

/**
 * Runs every case against the real model and prints a scorecard.
 * Results are saved to evals/results-<timestamp>.json so you can diff runs.
 */
async function main() {
  let total: TokenUsage = { input_tokens: 0, output_tokens: 0 };
  const rows: { query: string; pass: boolean; problems: string[]; ms: number }[] = [];

  for (const c of cases) {
    const started = Date.now();
    try {
      const { filters, usage } = await extractFilters(c.query);
      total = addUsage(total, usage);
      const s = scoreCase(c, filters);
      rows.push({ query: c.query, ...s, ms: Date.now() - started });
    } catch (err) {
      rows.push({ query: c.query, pass: false, problems: [String(err)], ms: Date.now() - started });
    }
    const r = rows[rows.length - 1];
    console.log(`${r.pass ? "PASS" : "FAIL"}  ${r.query}`);
    for (const p of r.problems) console.log(`      ${p}`);
  }

  const passed = rows.filter((r) => r.pass).length;
  let cost = "n/a (finish P1-05)";
  try {
    cost = `$${costUsd(MODEL, total).toFixed(4)}`;
  } catch {}
  console.log(`\n${passed}/${rows.length} passed · model ${MODEL} · cost ${cost}`);

  const file = `evals/results-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  await writeFile(file, JSON.stringify({ model: MODEL, passed, total: rows.length, usage: total, rows }, null, 2));
  console.log(`Saved ${file}`);
  process.exitCode = passed === rows.length ? 0 : 1;
}

void main();
