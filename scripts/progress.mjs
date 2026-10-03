#!/usr/bin/env node
/**
 * Learning progress for this project.
 *
 *   npm run progress                which TODOs are still open (reads the code)
 *   npm run progress -- --specs     also runs tests/specs and shows which pass
 *
 * A TODO counts as done when its TODO(P1-nn) marker is gone from src/ and evals/
 * (including evals/cases/README.md), so delete the marker when you finish one. CI
 * runs this with --specs on every push and shows the table in the run's summary.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const PROJECT = "Project 1: Product Catalog Builder (weeks 1-3)";
const SCAN_DIRS = ["src", "evals"];
/** In the suggested order. `spec` is the test file that checks it, if any. */
const TODOS = [
  { id: "P1-01", week: 1, what: "Stream a first look at the photos (vision + streaming)", check: "\"First look\" streams in the UI" },
  { id: "P1-02", week: 1, what: "Cost per call from usage", spec: "cost.test.ts" },
  { id: "P1-03", week: 2, what: "Extraction system prompt", check: "npm run eval" },
  { id: "P1-04", week: 2, what: "Structured extraction with Zod, validation, one retry", check: "npm run eval" },
  { id: "P1-05", week: 2, what: "Duplicate detection", spec: "duplicates.test.ts" },
  { id: "P1-06", week: 3, what: "Confidence scoring and review flags", spec: "confidence.test.ts" },
  { id: "P1-07", week: 3, what: "Field-level accuracy scoring", spec: "score.test.ts" },
  { id: "P1-08", week: 3, what: "20 real products photographed and labelled", check: "npm run eval" },
];

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === "node_modules" ? [] : walk(full);
    return /\.(ts|tsx|js|mjs|md|json|jsonl)$/.test(e.name) ? [full] : [];
  });
}

const open = new Set();
for (const file of SCAN_DIRS.flatMap(walk)) {
  for (const m of readFileSync(file, "utf8").matchAll(/TODO\((P\d+-\d+)\)/g)) open.add(m[1]);
}

function runSpecs() {
  const specDir = path.join("tests", "specs");
  if (!existsSync(specDir) || readdirSync(specDir).length === 0) return new Map();
  const out = path.join(tmpdir(), `specs-${process.pid}.json`);
  const vitest = path.join("node_modules", "vitest", "vitest.mjs");
  try {
    execFileSync(process.execPath, [vitest, "run", specDir, "--reporter=json", `--outputFile=${out}`], {
      stdio: "ignore",
    });
  } catch {
    // vitest exits 1 when a spec fails, which is expected while TODOs are open.
  }
  if (!existsSync(out)) return new Map();
  const report = JSON.parse(readFileSync(out, "utf8"));
  rmSync(out, { force: true });
  const byFile = new Map();
  for (const r of report.testResults ?? []) {
    const tests = r.assertionResults ?? [];
    byFile.set(path.basename(r.name), {
      passed: tests.filter((t) => t.status === "passed").length,
      total: tests.length,
    });
  }
  return byFile;
}

const withSpecs = process.argv.includes("--specs");
const specs = withSpecs ? runSpecs() : new Map();

function specCell(t) {
  if (!t.spec) return t.check ? `checked by: ${t.check}` : "";
  if (existsSync(path.join("tests", "core", t.spec))) return `tests/core/${t.spec} (guarded by CI)`;
  const r = specs.get(t.spec);
  if (!r) return withSpecs ? `tests/specs/${t.spec} (did not run)` : `tests/specs/${t.spec}`;
  const label = `tests/specs/${t.spec}: ${r.passed}/${r.total} passing`;
  return r.total > 0 && r.passed === r.total ? `${label}, move it to tests/core` : label;
}

/** "Stream text" -> "stream text", but "MCP tools" and "LLM-as-judge" keep their capitals. */
const lowerFirst = (s) => (/^[A-Z][a-z]/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s);

const done = TODOS.filter((t) => !open.has(t.id));
const next = TODOS.find((t) => open.has(t.id));
const lines = [
  `## Learning progress: ${done.length} of ${TODOS.length} TODOs done`,
  "",
  PROJECT,
  "",
  "| TODO | Week | What | Status | How it is checked |",
  "| --- | --- | --- | --- | --- |",
  ...TODOS.map((t) => `| ${t.id} | ${t.week} | ${t.what} | ${open.has(t.id) ? "open" : "done"} | ${specCell(t)} |`),
  "",
  next ? `Next up: **${next.id}**, ${lowerFirst(next.what)}.` : "All TODOs done. Time to ship it.",
];
console.log(lines.join("\n"));
