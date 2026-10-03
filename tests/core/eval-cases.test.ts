import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { CASES_DIR, loadCases, readCasePhotos } from "../../evals/cases";
import { median, renderReport, rowsToRead, sideBySide, summarize, type CaseResult } from "../../evals/report";
import { SCORE_FIELDS, type EntryScore } from "../../evals/score";
import type { GoldLabel } from "../../evals/cases";
import { fakeJpeg, makeDraft } from "../fixtures";

describe("the committed eval cases", () => {
  it("load, with valid labels and photos", async () => {
    const cases = await loadCases();
    expect(cases.length).toBeGreaterThanOrEqual(3);
    for (const c of cases) {
      const photos = await readCasePhotos(c);
      expect(photos.length, c.id).toBeGreaterThanOrEqual(1);
      // Keeps the repo small: evals/cases/README.md says how to shrink a phone photo.
      for (const p of photos) expect(p.data.length, `${c.id}: photo over 1 MB`).toBeLessThan(1024 * 1024);
    }
  });

  it("can be filtered by id", async () => {
    const [mug, ...rest] = await loadCases(CASES_DIR, "travel-mug");
    expect(rest).toEqual([]);
    expect(mug.label.brand).toBe("Kelvaro");
  });
});

describe("loadCases errors", () => {
  let dir: string;
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  const caseDir = (id: string, label: unknown, photos = 1) => {
    const d = path.join(dir, id);
    mkdirSync(d, { recursive: true });
    if (label !== undefined) writeFileSync(path.join(d, "label.json"), typeof label === "string" ? label : JSON.stringify(label));
    for (let i = 1; i <= photos; i++) writeFileSync(path.join(d, `${i}.jpg`), fakeJpeg());
  };

  it("names the case and the problem", async () => {
    dir = mkdtempSync(path.join(tmpdir(), "cases-"));
    caseDir("no-label", undefined);
    await expect(loadCases(dir)).rejects.toThrow(/no-label: missing label.json/);
  });

  it("checks labels against the GoldLabel schema", async () => {
    dir = mkdtempSync(path.join(tmpdir(), "cases-"));
    caseDir("bad-label", { title: "x", category: "gadgets" });
    await expect(loadCases(dir)).rejects.toThrow(/bad-label: label.json does not match/);
  });

  it("needs at least one photo", async () => {
    dir = mkdtempSync(path.join(tmpdir(), "cases-"));
    caseDir(
      "no-photos",
      { title: "x", category: "other", brand: null, model: null, condition: "good", identifiers: [], tags: ["x"] },
      0,
    );
    await expect(loadCases(dir)).rejects.toThrow(/no-photos: no photos/);
  });
});

describe("eval report", () => {
  const score = (value: number): EntryScore => ({
    fields: Object.fromEntries(SCORE_FIELDS.map((f) => [f, value])) as EntryScore["fields"],
    overall: value,
  });
  const results: CaseResult[] = [
    {
      id: "a",
      ok: true,
      ms: 4000,
      attempts: 1,
      costUsd: 0.02,
      score: score(1),
      modelConfidence: { title: 0.9, category: 0.9, attributes: 0.9, condition: 0.9, description: 0.9 },
      checkedConfidence: null,
    },
    {
      id: "b",
      ok: true,
      ms: 6000,
      attempts: 2,
      costUsd: 0.04,
      score: score(0.5),
      modelConfidence: { title: 0.5, category: 0.5, attributes: 0.5, condition: 0.5, description: 0.5 },
      checkedConfidence: null,
    },
    { id: "c", ok: false, ms: 100, error: "Not implemented yet: P1-04. Implement extractDraft() in src/lib/extract.ts" },
  ];

  it("counts a failed case as 0 and averages the rest", () => {
    const s = summarize("claude-opus-5-5", "2026-10-01T10:00:00.000Z", results);
    expect(s).toMatchObject({ cases: 3, extracted: 2, scored: 2, failed: 1, retries: 1, p50LatencyMs: 5000 });
    expect(s.overall).toBeCloseTo(0.5);
    expect(s.costPerEntry).toBeCloseTo(0.03);
  });

  it("splits field accuracy by confidence for the calibration table", () => {
    const [model, checked] = summarize("m", "2026-10-01T10:00:00.000Z", results).calibration;
    // Case a: 5 fields with a confidence of 0.9, all right. Case b: 5 fields at 0.5, half right.
    expect(model.high).toEqual({ n: 5, accuracy: 1 });
    expect(model.low).toEqual({ n: 5, accuracy: 0.5 });
    expect(checked.high.n + checked.low.n).toBe(0);
  });

  it("renders markdown with the summary table and every case", () => {
    const md = renderReport(summarize("claude-opus-5-5", "2026-10-01T10:00:00.000Z", results), results);
    expect(md).toContain("# Eval report");
    expect(md).toContain("| Category | Brand | Model | Identifiers | Condition | Tags F1 | Title | Overall |");
    expect(md).toMatch(/\| c \|.*Not implemented yet: P1-04/);
  });

  it("leaves scores empty, not zero, while scoring is not written yet", () => {
    const unscored: CaseResult[] = [
      { id: "a", ok: true, ms: 3000, attempts: 1, costUsd: 0.02, draft: makeDraft() },
      { id: "b", ok: true, ms: 5000, attempts: 1, costUsd: null, draft: makeDraft() },
    ];
    const s = summarize("m", "2026-10-01T10:00:00.000Z", unscored, [], 1);
    expect(s).toMatchObject({ cases: 2, extracted: 2, scored: 0, failed: 0, overall: null, p50LatencyMs: 4000, maxPhotos: 1 });
    expect(Object.values(s.fields).every((v) => v === null)).toBe(true);
    expect(s.costPerEntry).toBeCloseTo(0.02);
    const md = renderReport(s, unscored, { a: gold });
    expect(md).toContain("2 extracted, 0 scored");
    expect(md).toContain("Only the first 1 photo of each case were sent.");
    expect(md).toContain("## Drafts versus gold");
    expect(md).toContain("| brand | Kelvaro | Kelvaro |");
  });

  it("finds the median", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 2, 3])).toBe(2.5);
    expect(median([])).toBeNull();
  });
});

const gold: GoldLabel = {
  title: "Kelvaro TM-350 Insulated Travel Mug, 350 ml",
  category: "kitchen_dining",
  brand: "Kelvaro",
  model: "TM-350",
  condition: "new",
  identifiers: [{ kind: "ean", value: "2004350135007" }],
  tags: ["travel mug", "insulated", "stainless steel"],
};

describe("drafts versus gold", () => {
  it("lines up every scored field as text", () => {
    const rows = sideBySide(makeDraft({ attributes: [] }), { ...gold, brand: null });
    expect(rows.map((r) => r.field)).toEqual([...SCORE_FIELDS]);
    expect(rows.find((r) => r.field === "brand")).toEqual({ field: "brand", predicted: "(none)", gold: "(none)" });
    expect(rows.find((r) => r.field === "identifiers")?.gold).toBe("ean 2004350135007");
  });

  it("shows every field before scoring, then only the fields that lost points", () => {
    const draft = makeDraft();
    expect(rowsToRead({ id: "a", ok: true, ms: 1, draft }, gold)).toHaveLength(SCORE_FIELDS.length);
    const score: EntryScore = {
      fields: { category: 1, brand: 1, model: 1, identifiers: 1, condition: 1, tags: 0.5, title: 1 },
      overall: 0.93,
    };
    expect(rowsToRead({ id: "a", ok: true, ms: 1, draft, score }, gold).map((r) => r.field)).toEqual(["tags"]);
    expect(rowsToRead({ id: "a", ok: false, ms: 1, error: "x" }, gold)).toEqual([]);
  });
});
