import { describe, expect, it } from "vitest";
import { correctionRates, diffDraft, type CorrectionRecord } from "@/lib/corrections";
import { makeDraft } from "../fixtures";

describe("diffDraft", () => {
  it("finds no changes when the human saved the draft as is", () => {
    expect(diffDraft(makeDraft(), makeDraft())).toEqual([]);
  });

  it("ignores order, case and extra spaces", () => {
    const draft = makeDraft();
    const final = makeDraft({
      title: "  kelvaro tm-350 insulated  travel mug, 350 ml ",
      tags: ["stainless steel", "Travel Mug", "insulated"],
      attributes: [...draft.attributes].reverse(),
      visibleText: { lines: [], identifiers: [{ kind: "ean", value: "2004350 135007" }] },
    });
    expect(diffDraft(draft, final)).toEqual([]);
  });

  it("reports each changed field with before and after", () => {
    const draft = makeDraft();
    const final = makeDraft({
      category: "home_furniture",
      condition: { grade: "good", notes: "Scratch on the lid" },
      attributes: [...draft.attributes, { name: "colour", value: "sage green" }],
      visibleText: { lines: draft.visibleText.lines, identifiers: [] },
    });
    const changes = diffDraft(draft, final);
    expect(changes.map((c) => c.field)).toEqual(["category", "attributes", "condition.grade", "condition.notes", "identifiers"]);
    expect(changes[0]).toEqual({ field: "category", before: "kitchen_dining", after: "home_furniture" });
  });

  it("ignores changes to the OCR lines and confidence, which the form does not edit", () => {
    const final = makeDraft({ visibleText: { lines: ["other"], identifiers: makeDraft().visibleText.identifiers } });
    final.confidence.title = 0.1;
    expect(diffDraft(makeDraft(), final)).toEqual([]);
  });
});

describe("correctionRates", () => {
  const record = (fields: string[]): CorrectionRecord => ({
    entryId: "x",
    model: "claude-opus-5-5",
    savedAt: "2026-09-01T00:00:00Z",
    changes: fields.map((field) => ({ field: field as CorrectionRecord["changes"][number]["field"], before: "", after: "" })),
  });

  it("is the share of saved drafts where each field changed", () => {
    const rates = correctionRates([record(["title", "tags"]), record(["tags"]), record([]), record([])]);
    expect(rates.find((r) => r.field === "tags")).toEqual({ field: "tags", changed: 2, total: 4, rate: 0.5 });
    expect(rates.find((r) => r.field === "title")?.rate).toBe(0.25);
    expect(rates.find((r) => r.field === "category")?.rate).toBe(0);
  });

  it("has no rate before anything is saved", () => {
    expect(correctionRates([]).every((r) => r.rate === null)).toBe(true);
  });
});
