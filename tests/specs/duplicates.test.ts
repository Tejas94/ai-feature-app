import { describe, expect, it } from "vitest";
import { findDuplicates } from "@/lib/duplicates";
import { makeDraft, makeEntry } from "../fixtures";

// Spec for P1-05 (src/lib/duplicates.ts). Red until you finish it; once green, move this file to tests/core so CI guards it from then on.

// The draft is a Kelvaro TM-350 mug with EAN 2004350135007 (see tests/fixtures.ts).
const draft = makeDraft();
const noIds = (lines: string[] = []) => ({ lines, identifiers: [] });

/** An entry that shares nothing with the draft unless overridden. */
const unrelated = (id: string, overrides: Parameters<typeof makeEntry>[1] = {}) =>
  makeEntry(id, {
    title: "Pinewick Wooden Building Blocks",
    category: "toys_games",
    attributes: [{ name: "brand", value: "Pinewick" }],
    tags: ["wooden toys", "blocks", "kids"],
    visibleText: noIds(),
    ...overrides,
  });

describe("findDuplicates: identifier matches score 1.0", () => {
  it("matches the same barcode written with spaces and a leading zero", () => {
    const entry = unrelated("barcode", {
      visibleText: { lines: [], identifiers: [{ kind: "gtin", value: "0 2004350 135007" }] },
    });
    const [match] = findDuplicates(draft, [entry]);
    expect(match.entryId).toBe("barcode");
    expect(match.score).toBe(1);
    expect(match.reasons.length).toBeGreaterThan(0);
  });

  it("matches a UPC-A against the same number as an EAN-13", () => {
    const upcDraft = makeDraft({ visibleText: { lines: [], identifiers: [{ kind: "ean", value: "0012345678905" }] } });
    const entry = unrelated("upc", { visibleText: { lines: [], identifiers: [{ kind: "upc", value: "012345678905" }] } });
    expect(findDuplicates(upcDraft, [entry])).toEqual([expect.objectContaining({ entryId: "upc", score: 1 })]);
  });

  it("only compares barcode kinds (gtin, upc, ean, isbn)", () => {
    const entry = unrelated("sku", { visibleText: { lines: [], identifiers: [{ kind: "sku", value: "2004350135007" }] } });
    expect(findDuplicates(draft, [entry])).toEqual([]);
  });

  it("matches the same brand and model, ignoring case and punctuation", () => {
    const entry = unrelated("brand-model", {
      attributes: [
        { name: "Brand", value: "KELVARO" },
        { name: "model", value: "tm 350" },
      ],
    });
    const [match] = findDuplicates(draft, [entry]);
    expect(match).toMatchObject({ entryId: "brand-model", score: 1 });
    expect(match.reasons.length).toBeGreaterThan(0);
  });

  it("needs both brand and model: a different model is not an identifier match", () => {
    const entry = unrelated("other-model", {
      attributes: [
        { name: "brand", value: "Kelvaro" },
        { name: "model", value: "TM-500" },
      ],
    });
    // Same brand only: 0.3, below the default threshold.
    expect(findDuplicates(draft, [entry])).toEqual([]);
  });
});

describe("findDuplicates: weighted similarity", () => {
  // Same brand and category, a near-identical title and half the tags.
  const sibling = makeEntry("tm-500", {
    title: "Kelvaro TM-500 Insulated Travel Mug, 500 ml",
    attributes: [
      { name: "brand", value: "Kelvaro" },
      { name: "model", value: "TM-500" },
    ],
    tags: ["travel mug", "insulated", "500 ml"],
    visibleText: noIds(),
  });

  it("adds up brand, category, title Jaccard and tag Jaccard with the documented weights", () => {
    // brand 1 * 0.3 + category 1 * 0.2 + title 6/8 * 0.35 + tags 2/4 * 0.15 = 0.8375
    const [match] = findDuplicates(makeDraft({ visibleText: noIds() }), [sibling]);
    expect(match.entryId).toBe("tm-500");
    expect(match.score).toBeCloseTo(0.8375, 3);
    expect(match.reasons.length).toBeGreaterThan(0);
  });

  it("counts brand only when both sides have one", () => {
    const noBrand = makeDraft({ attributes: [], visibleText: noIds() });
    const twin = makeEntry("twin", { visibleText: noIds() });
    // category 0.2 + title 1 * 0.35 + tags 1 * 0.15 = 0.7
    const [match] = findDuplicates(noBrand, [twin]);
    expect(match.score).toBeCloseTo(0.7, 3);
  });

  it("drops matches below the default threshold of 0.6", () => {
    const sameCategoryOnly = unrelated("category-only", { category: "kitchen_dining" }); // 0.2
    expect(findDuplicates(draft, [unrelated("nothing"), sameCategoryOnly])).toEqual([]);
  });

  it("respects a custom threshold", () => {
    const d = makeDraft({ visibleText: noIds() });
    expect(findDuplicates(d, [sibling], { threshold: 0.9 })).toEqual([]);
    const sameCategoryOnly = unrelated("category-only", { category: "kitchen_dining" });
    expect(findDuplicates(d, [sameCategoryOnly], { threshold: 0.15 }).map((m) => m.entryId)).toEqual(["category-only"]);
  });
});

describe("findDuplicates: result list", () => {
  it("returns an empty list for an empty catalogue", () => {
    expect(findDuplicates(draft, [])).toEqual([]);
  });

  it("sorts matches by score, highest first", () => {
    const sibling = makeEntry("tm-500", {
      title: "Kelvaro TM-500 Insulated Travel Mug, 500 ml",
      attributes: [
        { name: "brand", value: "Kelvaro" },
        { name: "model", value: "TM-500" },
      ],
      tags: ["travel mug", "insulated", "500 ml"],
      visibleText: noIds(),
    });
    const exact = unrelated("exact", { visibleText: { lines: [], identifiers: [{ kind: "ean", value: "2004350135007" }] } });
    const matches = findDuplicates(draft, [unrelated("nothing"), sibling, exact]);
    expect(matches.map((m) => m.entryId)).toEqual(["exact", "tm-500"]);
    expect(matches[0].score).toBeGreaterThan(matches[1].score);
  });
});
