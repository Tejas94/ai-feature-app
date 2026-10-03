import type { CatalogDraft } from "./schema";
import { todo } from "./todo";

/** The fields the review form badges. The first five come with a model confidence. */
export const REVIEW_FIELDS = ["title", "category", "attributes", "condition", "description", "identifiers"] as const;
export type ReviewField = (typeof REVIEW_FIELDS)[number];

export interface FieldReview {
  field: ReviewField;
  /** 0 to 1, after the code checks below. */
  confidence: number;
  /** Why the field needs a look. Never empty when needsReview is true. */
  reasons: string[];
  needsReview: boolean;
}

export interface ReviewFlags {
  /** The lowest confidence of all fields: one bad field makes the entry need review. */
  overall: number;
  fields: FieldReview[];
}

/** A field below this needs a human look. */
export const REVIEW_THRESHOLD = 0.7;

/**
 * TODO(P1-06) Week 3: score how much to trust each field, and say why.
 *
 * Goal: the review form highlights the fields a human should check, with a
 * reason, so they skim the rest. Combine the model's own confidence with checks
 * in code that do not depend on the model being honest about itself.
 *
 * Why not trust the model's numbers alone? Self-reported confidence is poorly
 * calibrated: models tend to say 0.9 for answers that are right far less than
 * 90% of the time, and the numbers shift with prompt wording. The eval runner
 * prints a calibration table (accuracy of fields at 0.7 or above versus below),
 * so in week 3 you can measure how much these checks help.
 *
 * Rules (tests/specs/confidence.test.ts checks each one):
 * 1. Start from draft.confidence for title, category, attributes, condition and
 *    description. identifiers starts at 1 (the model gives no number for it).
 * 2. Brand not in the visible text: if a "brand" attribute exists and its
 *    letters and digits do not appear in the visible text lines (compare both
 *    lowercased with everything but letters and digits removed), cap attributes
 *    at 0.5, with a reason such as 'brand "Orvane" is not in the visible text'.
 *    The brand may have been guessed from the product's shape.
 * 3. Bad barcode: any identifier of kind gtin, upc or ean whose value, with
 *    spaces and dashes removed, is not 8, 12, 13 or 14 digits (a letter O read
 *    for a zero counts as wrong), or fails the GS1 mod-10 check digit, caps
 *    identifiers at 0.3, with a reason that quotes the
 *    value ("EAN 2004350135008 fails the check digit"). A misread digit is the
 *    most common OCR error, and the check digit catches most of them.
 * 4. Empty or unknown values: a title, description, attribute value or
 *    identifier value that is empty, "unknown", "n/a" or "none" (ignoring case and
 *    surrounding spaces) caps its field (title, description, attributes or
 *    identifiers) at 0.3. For an attribute, name it in the reason
 *    ('colour is "unknown"').
 * 5. needsReview is confidence < REVIEW_THRESHOLD (0.7 itself passes). Every
 *    rule that lowers a field adds a reason, and a field below the threshold
 *    only because of the model's own number gets a reason too (for example
 *    "model confidence 0.55").
 * 6. overall is the minimum confidence over all six fields.
 *
 * The GS1 check digit (EAN-13, UPC-A, EAN-8, GTIN-14): drop the last digit (the
 * check digit). Going from the right, multiply the remaining digits by 3, 1, 3, 1
 * and so on, and add them up. The check digit is (10 - sum % 10) % 10.
 * Try it by hand on 4006381333931 before you code it.
 *
 * Things to learn on the way:
 * - Which of these checks fires most on the eval set, and is it right when it does?
 * - Does the code-adjusted confidence separate right from wrong fields better than
 *   the raw model confidence? Compare the two rows of the calibration table.
 * - ISBN-10 uses a different checksum (mod 11, and the last character can be X).
 *   Worth adding?
 * - Should category "other" always need review?
 */
export function reviewFlags(draft: CatalogDraft): ReviewFlags {
  void draft;
  todo("P1-06", "Implement reviewFlags() in src/lib/confidence.ts");
}
