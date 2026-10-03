import type { CatalogDraft, CatalogEntry } from "./schema";
import { todo } from "./todo";

export interface DuplicateMatch {
  entryId: string;
  /** 0 to 1. 1 means "certainly the same product". */
  score: number;
  /** Short human-readable reasons, shown on the duplicate warning card. */
  reasons: string[];
}

export interface DuplicateOptions {
  /** Matches scoring below this are dropped. Default 0.6. */
  threshold?: number;
}

export const DEFAULT_DUPLICATE_THRESHOLD = 0.6;

/** Weights for the similarity score when no identifier matches. They add up to 1. */
export const SIMILARITY_WEIGHTS = { brand: 0.3, category: 0.2, title: 0.35, tags: 0.15 } as const;

/**
 * TODO(P1-05) Week 2: find catalogue entries that are probably the same product.
 *
 * Goal: before the user saves a draft, warn them when the catalogue already has
 * it. Return one DuplicateMatch per entry scoring at least the threshold,
 * highest score first. Plain code, no model: it must be fast, free and testable.
 *
 * Rules (tests/specs/duplicates.test.ts checks each one):
 * 1. Identifier match, score 1.0:
 *    - Barcodes: an identifier of kind gtin, upc, ean or isbn on the draft
 *      (draft.visibleText.identifiers) with the same normalized value as one of
 *      those kinds on the entry. Normalize by keeping digits only and dropping
 *      leading zeros, so UPC "012345678905", EAN "0012345678905" and
 *      "0 12345 67890 5" all match.
 *    - Or the same brand and the same model: the "brand" and "model" attributes
 *      (getAttribute in schema.ts) both present on both sides and equal after
 *      lowercasing and removing everything but letters and digits ("KT-200" equals
 *      "kt 200").
 *    Add a reason that says what matched, e.g. "same EAN 5012345678900".
 * 2. Otherwise a weighted similarity, using SIMILARITY_WEIGHTS:
 *      brand    1 if both have a brand and they are equal (normalized as above), else 0
 *      category 1 if the categories are equal, else 0
 *      title    Jaccard similarity of the two titles' token sets
 *      tags     Jaccard similarity of the two tag sets (whole tags, lowercased and trimmed)
 *    score = sum of weight * value. Jaccard is |A ∩ B| / |A ∪ B|, and 0 when both
 *    sets are empty. Title tokens: lowercase, split on anything that is not a
 *    letter or digit, drop empty strings.
 *    Add a reason per part that contributed, e.g. "same brand", "title overlap 0.71".
 * 3. Drop matches below options.threshold (default 0.6), then sort by score, highest first.
 *
 * Hints:
 * - Write the small helpers first: normalizeCode(), tokens(), jaccard(). You will
 *   reuse tokens() and jaccard() in P1-07.
 * - Build the draft's normalized barcodes and brand/model once, not per entry.
 *
 * Things to learn on the way:
 * - Why not ask the model "is this a duplicate?" What would it cost per save with
 *   a catalogue of 10,000 entries, and how would you test it?
 * - Which false positives do you see in the UI? Two sizes of the same mug share
 *   brand, category and most title words. What would fix that: a size attribute
 *   rule, a different weight, a higher threshold?
 * - Serial numbers identify one physical item, not a product. Should a matching
 *   serial count as a duplicate in a catalogue of second-hand goods?
 * - Stage 3 of the roadmap swaps this for image embeddings. What would they catch
 *   that text cannot?
 */
export function findDuplicates(
  draft: CatalogDraft,
  catalog: CatalogEntry[],
  options: DuplicateOptions = {},
): DuplicateMatch[] {
  void draft;
  void catalog;
  void options;
  todo("P1-05", "Implement findDuplicates() in src/lib/duplicates.ts");
}
