import { describe, expect, it } from "vitest";
import { SCORE_FIELDS, scoreEntry } from "../../evals/score";
import type { GoldLabel } from "../../evals/cases";
import type { Attribute } from "@/lib/schema";
import { makeDraft } from "../fixtures";

// Spec for P1-07 (evals/score.ts). Red until you finish it; once green, move this file to tests/core so CI guards it from then on.

// Matches makeDraft() exactly (see tests/fixtures.ts).
const gold: GoldLabel = {
  title: "Kelvaro TM-350 Insulated Travel Mug, 350 ml",
  category: "kitchen_dining",
  brand: "Kelvaro",
  model: "TM-350",
  condition: "new",
  identifiers: [{ kind: "ean", value: "2004350135007" }],
  tags: ["travel mug", "insulated", "stainless steel"],
};
const attrs = (brand?: string, model?: string): Attribute[] => [
  ...(brand !== undefined ? [{ name: "brand", value: brand }] : []),
  ...(model !== undefined ? [{ name: "model", value: model }] : []),
  { name: "colour", value: "sage green" },
];

describe("scoreEntry", () => {
  it("scores a perfect prediction 1 on every field", () => {
    const s = scoreEntry(makeDraft(), gold);
    expect(Object.keys(s.fields).sort()).toEqual([...SCORE_FIELDS].sort());
    for (const f of SCORE_FIELDS) expect(s.fields[f], f).toBe(1);
    expect(s.overall).toBe(1);
  });

  it("uses exact match for category and condition grade", () => {
    const s = scoreEntry(makeDraft({ category: "home_furniture", condition: { grade: "good", notes: "" } }), gold);
    expect(s.fields.category).toBe(0);
    expect(s.fields.condition).toBe(0);
  });

  it("compares brand and model after normalizing case and punctuation", () => {
    expect(scoreEntry(makeDraft({ attributes: attrs("KELVARO", "tm 350") }), gold).fields).toMatchObject({ brand: 1, model: 1 });
    expect(scoreEntry(makeDraft({ attributes: attrs("Kelvaro Co.") }), { ...gold, brand: "kelvaro co" }).fields.brand).toBe(1);
    expect(scoreEntry(makeDraft({ attributes: attrs("Kelvara", "TM-530") }), gold).fields).toMatchObject({ brand: 0, model: 0 });
  });

  it("scores a missing brand or model as 0 when gold has one", () => {
    expect(scoreEntry(makeDraft({ attributes: attrs() }), gold).fields).toMatchObject({ brand: 0, model: 0 });
  });

  it("rewards not inventing a brand when gold has none", () => {
    const noBrand: GoldLabel = { ...gold, brand: null, model: null };
    expect(scoreEntry(makeDraft({ attributes: attrs() }), noBrand).fields).toMatchObject({ brand: 1, model: 1 });
    expect(scoreEntry(makeDraft({ attributes: attrs("Unknown", "") }), noBrand).fields).toMatchObject({ brand: 1, model: 1 });
    expect(scoreEntry(makeDraft({ attributes: attrs("Kelvaro", "TM-350") }), noBrand).fields).toMatchObject({ brand: 0, model: 0 });
  });

  it("scores identifiers as recall of the gold values, ignoring kind and formatting", () => {
    const twoGold: GoldLabel = {
      ...gold,
      identifiers: [
        { kind: "ean", value: "2004350135007" },
        { kind: "sku", value: "KV-TM350" },
      ],
    };
    const predicted = makeDraft({
      visibleText: {
        lines: [],
        identifiers: [
          { kind: "gtin", value: "2004 350 135007" },
          { kind: "serial", value: "SN0042" },
        ],
      },
    });
    expect(scoreEntry(predicted, twoGold).fields.identifiers).toBeCloseTo(0.5);
    expect(scoreEntry(makeDraft({ visibleText: { lines: [], identifiers: [] } }), gold).fields.identifiers).toBe(0);
  });

  it("scores identifiers 1 when gold has none", () => {
    expect(scoreEntry(makeDraft(), { ...gold, identifiers: [] }).fields.identifiers).toBe(1);
  });

  it("scores tags with F1, ignoring case", () => {
    // 2 shared tags: precision 2/4, recall 2/3, F1 = 4/7
    const s = scoreEntry(makeDraft({ tags: ["Travel Mug", "insulated", "steel", "thermos"] }), gold);
    expect(s.fields.tags).toBeCloseTo(4 / 7, 3);
    expect(scoreEntry(makeDraft({ tags: ["flask", "bottle", "kitchen"] }), gold).fields.tags).toBe(0);
  });

  it("scores the title with token Jaccard", () => {
    // {kelvaro, travel, mug} vs {kelvaro, tm, 350, insulated, travel, mug, ml}: 3 / 7
    expect(scoreEntry(makeDraft({ title: "Kelvaro Travel Mug" }), gold).fields.title).toBeCloseTo(3 / 7, 3);
  });

  it("averages the seven fields into overall", () => {
    const s = scoreEntry(
      makeDraft({ category: "other", title: "Kelvaro Travel Mug", tags: ["Travel Mug", "insulated", "steel", "thermos"] }),
      gold,
    );
    // category 0, brand 1, model 1, identifiers 1, condition 1, tags 4/7, title 3/7 => 5 / 7
    expect(s.overall).toBeCloseTo(5 / 7, 3);
  });
});
