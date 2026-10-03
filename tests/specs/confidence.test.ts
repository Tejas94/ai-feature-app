import { describe, expect, it } from "vitest";
import { REVIEW_FIELDS, reviewFlags, type ReviewFlags } from "@/lib/confidence";
import type { Identifier } from "@/lib/schema";
import { makeDraft } from "../fixtures";

// Spec for P1-06 (src/lib/confidence.ts). Red until you finish it; once green, move this file to tests/core so CI guards it from then on.

const field = (r: ReviewFlags, name: (typeof REVIEW_FIELDS)[number]) => {
  const f = r.fields.find((x) => x.field === name);
  if (!f) throw new Error(`reviewFlags() returned no "${name}" field`);
  return f;
};
const withIds = (identifiers: Identifier[]) =>
  makeDraft({ visibleText: { lines: ["KELVARO", "Insulated Travel Mug", "TM-350"], identifiers } });

describe("reviewFlags: model confidence", () => {
  it("returns one entry per review field", () => {
    const r = reviewFlags(makeDraft());
    expect(r.fields.map((f) => f.field).sort()).toEqual([...REVIEW_FIELDS].sort());
  });

  it("keeps the model's numbers when every check passes, and identifiers start at 1", () => {
    const r = reviewFlags(makeDraft());
    expect(field(r, "title").confidence).toBeCloseTo(0.9);
    expect(field(r, "category").confidence).toBeCloseTo(0.95);
    expect(field(r, "attributes").confidence).toBeCloseTo(0.9);
    expect(field(r, "condition").confidence).toBeCloseTo(0.85);
    expect(field(r, "description").confidence).toBeCloseTo(0.9);
    expect(field(r, "identifiers").confidence).toBe(1);
    expect(r.fields.every((f) => !f.needsReview)).toBe(true);
  });

  it("flags a field below 0.7 and says why", () => {
    const draft = makeDraft();
    draft.confidence.condition = 0.55;
    const condition = field(reviewFlags(draft), "condition");
    expect(condition.needsReview).toBe(true);
    expect(condition.confidence).toBeCloseTo(0.55);
    expect(condition.reasons.length).toBeGreaterThan(0);
  });

  it("does not flag a field at exactly 0.7", () => {
    const draft = makeDraft();
    draft.confidence.title = 0.7;
    expect(field(reviewFlags(draft), "title").needsReview).toBe(false);
  });
});

describe("reviewFlags: brand check", () => {
  it("caps attributes at 0.5 when the brand is not in the visible text", () => {
    const draft = makeDraft({
      attributes: [
        { name: "brand", value: "Orvane" },
        { name: "model", value: "TM-350" },
      ],
    });
    const attributes = field(reviewFlags(draft), "attributes");
    expect(attributes.confidence).toBeLessThanOrEqual(0.5);
    expect(attributes.needsReview).toBe(true);
    expect(attributes.reasons.join(" ")).toMatch(/brand/i);
  });

  it("finds the brand ignoring case and punctuation", () => {
    const draft = makeDraft({
      visibleText: { lines: ["KEL-VARO®", "Travel Mug"], identifiers: [] },
      attributes: [{ name: "brand", value: "Kelvaro" }],
    });
    expect(field(reviewFlags(draft), "attributes").confidence).toBeCloseTo(0.9);
  });

  it("skips the check when there is no brand attribute", () => {
    const draft = makeDraft({
      visibleText: { lines: [], identifiers: [] },
      attributes: [{ name: "colour", value: "sage green" }],
    });
    expect(field(reviewFlags(draft), "attributes").confidence).toBeCloseTo(0.9);
  });
});

describe("reviewFlags: barcode check digits", () => {
  it("accepts valid EAN-13, UPC-A, EAN-8 and GTIN-14 values, with spaces or dashes", () => {
    const r = reviewFlags(
      withIds([
        { kind: "ean", value: "4006381333931" },
        { kind: "upc", value: "0 36000 29145 2" },
        { kind: "ean", value: "9638-5074" },
        { kind: "gtin", value: "10012345678902" },
      ]),
    );
    expect(field(r, "identifiers")).toMatchObject({ confidence: 1, needsReview: false });
  });

  it("caps identifiers at 0.3 for a wrong check digit and quotes the value", () => {
    const identifiers = field(reviewFlags(withIds([{ kind: "ean", value: "2004350135008" }])), "identifiers");
    expect(identifiers.confidence).toBeLessThanOrEqual(0.3);
    expect(identifiers.needsReview).toBe(true);
    expect(identifiers.reasons.join(" ")).toContain("2004350135008");
  });

  it("flags a barcode with the wrong length or a letter in it", () => {
    expect(field(reviewFlags(withIds([{ kind: "upc", value: "12345" }])), "identifiers").confidence).toBeLessThanOrEqual(0.3);
    expect(field(reviewFlags(withIds([{ kind: "ean", value: "20O4350135007" }])), "identifiers").confidence).toBeLessThanOrEqual(
      0.3,
    );
  });

  it("does not run the check on other identifier kinds", () => {
    const r = reviewFlags(
      withIds([
        { kind: "sku", value: "KV-TM350-SG" },
        { kind: "model", value: "TM-350" },
        { kind: "serial", value: "SN 0042" },
      ]),
    );
    expect(field(r, "identifiers").confidence).toBe(1);
  });
});

describe("reviewFlags: empty and unknown values", () => {
  it("caps attributes at 0.3 for an unknown attribute value and names the attribute", () => {
    const draft = makeDraft({
      attributes: [
        { name: "brand", value: "Kelvaro" },
        { name: "colour", value: " Unknown " },
      ],
    });
    const attributes = field(reviewFlags(draft), "attributes");
    expect(attributes.confidence).toBeLessThanOrEqual(0.3);
    expect(attributes.reasons.join(" ")).toMatch(/colour/i);
  });

  it("treats n/a and none like unknown", () => {
    const na = makeDraft({ attributes: [{ name: "material", value: "N/A" }] });
    const none = makeDraft({ attributes: [{ name: "size", value: "none" }] });
    expect(field(reviewFlags(na), "attributes").confidence).toBeLessThanOrEqual(0.3);
    expect(field(reviewFlags(none), "attributes").confidence).toBeLessThanOrEqual(0.3);
  });

  it("caps an unknown title, a blank description and an unknown identifier", () => {
    const r = reviewFlags(
      makeDraft({
        title: "unknown",
        description: "   ",
        visibleText: { lines: ["KELVARO"], identifiers: [{ kind: "serial", value: "n/a" }] },
      }),
    );
    expect(field(r, "title").confidence).toBeLessThanOrEqual(0.3);
    expect(field(r, "description").confidence).toBeLessThanOrEqual(0.3);
    expect(field(r, "identifiers").confidence).toBeLessThanOrEqual(0.3);
  });
});

describe("reviewFlags: overall", () => {
  it("is the lowest field confidence, and every flagged field has a reason", () => {
    const draft = withIds([{ kind: "ean", value: "2004350135008" }]);
    draft.confidence.condition = 0.6;
    const r = reviewFlags(draft);
    expect(r.overall).toBeCloseTo(Math.min(...r.fields.map((f) => f.confidence)));
    expect(r.overall).toBeLessThanOrEqual(0.3);
    for (const f of r.fields.filter((x) => x.needsReview)) expect(f.reasons.length, f.field).toBeGreaterThan(0);
  });

  it("equals the weakest model confidence when no check fires", () => {
    const draft = makeDraft();
    draft.confidence.description = 0.72;
    expect(reviewFlags(draft).overall).toBeCloseTo(0.72);
  });
});
