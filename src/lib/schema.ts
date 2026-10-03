import { z } from "zod";
import { CATEGORIES } from "./taxonomy";

/**
 * The contract between the model and your code. The model fills in CatalogDraft
 * from the photos (P1-04); everything after that (duplicates, review flags, the
 * form, the store, the eval) works on this type.
 *
 * Three things to know about this file:
 * - The .describe() text is sent to the model as part of the JSON schema, so it is
 *   prompt text too. Editing it is a legitimate way to fix extraction bugs.
 * - Structured outputs support a subset of JSON Schema. Number ranges (.min/.max
 *   on numbers), string lengths, array sizes above 1 and regex patterns are not
 *   enforced by the API. The SDK's zodOutputFormat() moves them into the field
 *   description and Zod checks them after the response arrives. That is one
 *   reason P1-04 still validates and retries. tests/core/schema.test.ts checks
 *   that the schema stays convertible.
 * - The model writes fields in schema order. visibleText comes first on purpose:
 *   reading the labels before naming the product grounds the title and brand in
 *   what is printed. Moving it last is an experiment worth running.
 */

export const ConditionGrade = z.enum(["new", "like_new", "good", "fair", "poor"]);
export type ConditionGrade = z.infer<typeof ConditionGrade>;

export const IdentifierKind = z.enum(["gtin", "upc", "ean", "isbn", "sku", "model", "serial", "other"]);
export type IdentifierKind = z.infer<typeof IdentifierKind>;

export const Identifier = z.object({
  kind: IdentifierKind,
  value: z.string().min(1).describe("Exactly as printed, e.g. the digits under a barcode"),
});
export type Identifier = z.infer<typeof Identifier>;

export const VisibleText = z.object({
  lines: z
    .array(z.string())
    .describe("Every readable line of text on the product or packaging, as printed, one entry per line"),
  identifiers: z
    .array(Identifier)
    .describe("Codes printed on the product: barcode digits, model numbers, SKUs, serials. Only what is legible; never guess"),
});
export type VisibleText = z.infer<typeof VisibleText>;

export const Attribute = z.object({
  name: z.string().min(1).describe("Lowercase attribute name, e.g. brand, model, colour, material, size, capacity"),
  value: z.string().min(1),
});
export type Attribute = z.infer<typeof Attribute>;

export const Condition = z.object({
  grade: ConditionGrade,
  notes: z.string().describe("Visible wear, damage or missing parts. Empty string if none"),
});
export type Condition = z.infer<typeof Condition>;

const Confidence = z.number().min(0).max(1);

export const FieldConfidence = z.object({
  title: Confidence,
  category: Confidence,
  attributes: Confidence,
  condition: Confidence,
  description: Confidence,
});
export type FieldConfidence = z.infer<typeof FieldConfidence>;

export const Tag = z.string().min(1).regex(/^[^A-Z]+$/, "Tags must be lowercase");

export const CatalogDraft = z.object({
  visibleText: VisibleText,
  title: z.string().min(1).describe("Short listing title: brand, product type, model and key variant"),
  category: z.enum(CATEGORIES),
  attributes: z
    .array(Attribute)
    .describe("Facts about the product. Use the names brand and model when they are known"),
  condition: Condition,
  description: z.string().min(1).describe("Two to four plain sentences a buyer would find useful"),
  tags: z.array(Tag).min(3).max(10).describe("3 to 10 lowercase search tags"),
  confidence: FieldConfidence.describe("Your honest confidence per field, from 0 to 1"),
});
export type CatalogDraft = z.infer<typeof CatalogDraft>;

/** Token counts as the API reports them. The cache fields only appear once you use prompt caching. */
export const Usage = z.object({
  input_tokens: z.number().int().nonnegative(),
  output_tokens: z.number().int().nonnegative(),
  cache_creation_input_tokens: z.number().int().nonnegative().nullish(),
  cache_read_input_tokens: z.number().int().nonnegative().nullish(),
});
export type Usage = z.infer<typeof Usage>;

/** A saved catalogue entry: what the human approved, plus where it came from. */
export const CatalogEntry = CatalogDraft.extend({
  id: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/),
  /** Paths relative to the data directory, e.g. "photos/<id>/1.jpg". */
  photos: z.array(z.string()),
  createdAt: z.string(),
  /** The model that wrote the draft, or null for an entry typed in by hand. */
  model: z.string().nullable(),
  usage: Usage.nullable(),
  costUsd: z.number().nullable(),
  /** The model's original output, before any human edits. Null for manual entries. */
  draft: CatalogDraft.nullable(),
  /** Fields the human changed before saving (see CORRECTION_FIELDS in corrections.ts). */
  corrected: z.array(z.string()),
});
export type CatalogEntry = z.infer<typeof CatalogEntry>;

/** The JSON part of POST /api/entries. Photos travel as files next to it. */
export const SaveEntryRequest = z.object({
  final: CatalogDraft,
  draft: CatalogDraft.nullable(),
  model: z.string().nullable(),
  usage: Usage.nullable(),
  costUsd: z.number().nullable(),
});
export type SaveEntryRequest = z.infer<typeof SaveEntryRequest>;

/** The value of the first attribute with this name (case-insensitive), trimmed. */
export function getAttribute(draft: Pick<CatalogDraft, "attributes">, name: string): string | undefined {
  const wanted = name.trim().toLowerCase();
  const hit = draft.attributes.find((a) => a.name.trim().toLowerCase() === wanted);
  const value = hit?.value.trim();
  return value ? value : undefined;
}
