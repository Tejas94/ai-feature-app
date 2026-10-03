import type { CatalogDraft } from "./schema";

/**
 * Human corrections are the live accuracy signal: every field a person changes
 * before saving is a field the model got wrong (or not quite right). /stats shows
 * the rate per field, and `npm run eval:import-corrections` turns corrected
 * entries into new eval cases.
 */

export const CORRECTION_FIELDS = [
  "title",
  "category",
  "attributes",
  "condition.grade",
  "condition.notes",
  "description",
  "tags",
  "identifiers",
] as const;
export type CorrectionField = (typeof CORRECTION_FIELDS)[number];

export interface FieldChange {
  field: CorrectionField;
  before: unknown;
  after: unknown;
}

/** One line of data/corrections.jsonl, written when an entry made from a model draft is saved. */
export interface CorrectionRecord {
  entryId: string;
  model: string | null;
  savedAt: string;
  changes: FieldChange[];
}

const text = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();
const code = (s: string) => s.replace(/[\s-]+/g, "").toLowerCase();
const sameSet = (a: string[], b: string[]) => {
  const sa = new Set(a);
  const sb = new Set(b);
  return sa.size === sb.size && [...sa].every((x) => sb.has(x));
};

function value(d: CatalogDraft, field: CorrectionField): unknown {
  switch (field) {
    case "condition.grade":
      return d.condition.grade;
    case "condition.notes":
      return d.condition.notes;
    case "identifiers":
      return d.visibleText.identifiers;
    default:
      return d[field];
  }
}

function same(a: CatalogDraft, b: CatalogDraft, field: CorrectionField): boolean {
  switch (field) {
    case "attributes": {
      const pairs = (d: CatalogDraft) => d.attributes.map((x) => `${text(x.name)}=${text(x.value)}`);
      return sameSet(pairs(a), pairs(b));
    }
    case "tags":
      return sameSet(a.tags.map(text), b.tags.map(text));
    case "identifiers": {
      const ids = (d: CatalogDraft) => d.visibleText.identifiers.map((x) => `${x.kind}:${code(x.value)}`);
      return sameSet(ids(a), ids(b));
    }
    default:
      return text(String(value(a, field))) === text(String(value(b, field)));
  }
}

/**
 * The fields a human changed between the model's draft and what they saved.
 * Order, case and extra spaces do not count as changes.
 */
export function diffDraft(draft: CatalogDraft, final: CatalogDraft): FieldChange[] {
  return CORRECTION_FIELDS.filter((f) => !same(draft, final, f)).map((field) => ({
    field,
    before: value(draft, field),
    after: value(final, field),
  }));
}

export interface CorrectionRate {
  field: CorrectionField;
  changed: number;
  total: number;
  /** changed / total, or null with no saved drafts yet. */
  rate: number | null;
}

/** Share of saved model drafts where the human changed each field. */
export function correctionRates(records: CorrectionRecord[]): CorrectionRate[] {
  return CORRECTION_FIELDS.map((field) => {
    const changed = records.filter((r) => r.changes.some((c) => c.field === field)).length;
    return { field, changed, total: records.length, rate: records.length ? changed / records.length : null };
  });
}
