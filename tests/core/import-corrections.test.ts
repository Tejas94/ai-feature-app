import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { entryToLabel, importCorrections } from "../../evals/import-corrections";
import { loadCases } from "../../evals/cases";
import { createFileStore, type CatalogStore } from "@/lib/store";
import { fakeJpeg, makeDraft, makeEntry } from "../fixtures";

let dataDir: string;
let casesDir: string;
let store: CatalogStore;

beforeEach(() => {
  dataDir = mkdtempSync(path.join(tmpdir(), "import-data-"));
  casesDir = mkdtempSync(path.join(tmpdir(), "import-cases-"));
  store = createFileStore(dataDir, { seedFile: path.resolve("data/catalog.seed.json") });
});
afterEach(() => {
  rmSync(dataDir, { recursive: true, force: true });
  rmSync(casesDir, { recursive: true, force: true });
});

const photo = { mediaType: "image/jpeg" as const, data: fakeJpeg() };

describe("entryToLabel", () => {
  it("turns a saved entry into a gold label", () => {
    const label = entryToLabel(makeEntry("e_1", {}, { corrected: ["title"] }), "2026-10-01T00:00:00Z");
    expect(label).toMatchObject({
      title: makeDraft().title,
      category: "kitchen_dining",
      brand: "Kelvaro",
      model: "TM-350",
      condition: "new",
      identifiers: [{ kind: "ean", value: "2004350135007" }],
      source: { entryId: "e_1", importedAt: "2026-10-01T00:00:00Z", correctedFields: ["title"] },
    });
  });

  it("uses null for a missing brand or model", () => {
    const label = entryToLabel(makeEntry("e_2", { attributes: [{ name: "colour", value: "red" }] }));
    expect(label.brand).toBeNull();
    expect(label.model).toBeNull();
  });
});

describe("importCorrections", () => {
  it("copies corrected entries and their photos into new case folders", async () => {
    const corrected = await store.save({
      final: makeDraft({ title: "Kelvaro TM-350 Travel Mug, Sage Green" }),
      draft: makeDraft(),
      model: "claude-opus-5-5",
      usage: null,
      costUsd: null,
      photos: [photo, photo],
    });
    const result = await importCorrections({ store, casesDir });
    expect(result.imported).toEqual([`saved-${corrected.id}`]);
    const dir = path.join(casesDir, `saved-${corrected.id}`);
    expect(readdirSync(dir).sort()).toEqual(["1.jpg", "2.jpg", "label.json"]);
    expect(JSON.parse(readFileSync(path.join(dir, "label.json"), "utf8")).title).toBe("Kelvaro TM-350 Travel Mug, Sage Green");
    // The new case loads like any other.
    expect((await loadCases(casesDir)).map((c) => c.id)).toEqual([`saved-${corrected.id}`]);
  });

  it("skips uncorrected entries unless all is set, and never imports the seed", async () => {
    const clean = await store.save({ final: makeDraft(), draft: makeDraft(), model: "m", usage: null, costUsd: null, photos: [photo] });
    const first = await importCorrections({ store, casesDir });
    expect(first.imported).toEqual([]);
    expect(first.skipped.map((s) => s.entryId)).toEqual([clean.id]);
    const second = await importCorrections({ store, casesDir, all: true });
    expect(second.imported).toEqual([`saved-${clean.id}`]);
  });

  it("never overwrites an existing case", async () => {
    await store.save({ final: makeDraft({ title: "Changed" }), draft: makeDraft(), model: "m", usage: null, costUsd: null, photos: [photo] });
    await importCorrections({ store, casesDir });
    const again = await importCorrections({ store, casesDir });
    expect(again.imported).toEqual([]);
    expect(again.skipped[0].reason).toMatch(/already exists/);
  });

  it("skips corrected entries without photos", async () => {
    await store.save({ final: makeDraft({ title: "Changed" }), draft: makeDraft(), model: "m", usage: null, costUsd: null, photos: [] });
    const result = await importCorrections({ store, casesDir });
    expect(result.imported).toEqual([]);
    expect(result.skipped[0].reason).toBe("no photos");
    expect(existsSync(path.join(casesDir, "saved-"))).toBe(false);
  });
});
