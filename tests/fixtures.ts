import type { CatalogDraft, CatalogEntry } from "../src/lib/schema";

/** A valid draft for a fictional product. Override any field. */
export function makeDraft(overrides: Partial<CatalogDraft> = {}): CatalogDraft {
  return {
    visibleText: {
      lines: ["KELVARO", "Insulated Travel Mug", "TM-350", "350 ml"],
      identifiers: [{ kind: "ean", value: "2004350135007" }],
    },
    title: "Kelvaro TM-350 Insulated Travel Mug, 350 ml",
    category: "kitchen_dining",
    attributes: [
      { name: "brand", value: "Kelvaro" },
      { name: "model", value: "TM-350" },
      { name: "capacity", value: "350 ml" },
    ],
    condition: { grade: "new", notes: "" },
    description: "Double-walled stainless steel travel mug with a leak-proof lid.",
    tags: ["travel mug", "insulated", "stainless steel"],
    confidence: { title: 0.9, category: 0.95, attributes: 0.9, condition: 0.85, description: 0.9 },
    ...overrides,
  };
}

/** A saved entry built from a draft. */
export function makeEntry(id: string, overrides: Partial<CatalogDraft> = {}, extra: Partial<CatalogEntry> = {}): CatalogEntry {
  return {
    ...makeDraft(overrides),
    id,
    photos: [],
    createdAt: "2026-09-01T00:00:00.000Z",
    model: null,
    usage: null,
    costUsd: null,
    draft: null,
    corrected: [],
    ...extra,
  };
}

/** The smallest valid JPEG header bytes that detectMediaType() recognises, plus padding. */
export function fakeJpeg(size = 64): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(size);
  bytes.set([0xff, 0xd8, 0xff, 0xe0]);
  return bytes;
}
