import type { CatalogDraft } from "../src/lib/schema";
import type { GoldLabel } from "./cases";
import { todo } from "../src/lib/todo";

/** The fields the eval scores, in the order the report prints them. */
export const SCORE_FIELDS = ["category", "brand", "model", "identifiers", "condition", "tags", "title"] as const;
export type ScoreField = (typeof SCORE_FIELDS)[number];

export interface EntryScore {
  /** Each field from 0 (wrong) to 1 (right). */
  fields: Record<ScoreField, number>;
  /** The plain mean of the seven field scores. */
  overall: number;
}

/**
 * TODO(P1-07) Week 3: score one predicted draft against its gold label.
 *
 * Goal: field-level accuracy, so the eval tells you *what* got better or worse
 * after a prompt or model change, not just a single pass rate. Code-based checks
 * like these are exact, cheap and repeatable; prefer them to an LLM judge
 * whenever the right answer is known.
 *
 * Definitions (tests/specs/score.test.ts checks each one):
 * - category:    1 if predicted.category equals gold.category, else 0.
 * - condition:   1 if predicted.condition.grade equals gold.condition, else 0.
 * - brand, model: compare the "brand" / "model" attribute (getAttribute in
 *   src/lib/schema.ts) with gold.brand / gold.model after normalizing both:
 *   lowercase, keep letters and digits only ("ACME Co." equals "acme co").
 *   1 if equal, else 0. When gold is null (nothing visible), the prediction is
 *   right only if it has no such attribute, or the value is empty or "unknown".
 * - identifiers: recall, the share of gold.identifiers whose value appears among
 *   the predicted visibleText.identifiers. Compare values lowercased with
 *   everything but letters and digits removed; ignore the kind. 1 when gold has
 *   no identifiers (nothing to find).
 * - tags:        F1 of the two tag sets (lowercased and trimmed). Precision is the
 *   share of predicted tags in gold, recall the share of gold tags predicted,
 *   F1 = 2PR / (P + R), and 0 when P + R is 0.
 * - title:       Jaccard similarity of the token sets (the tokens() and jaccard()
 *   helpers you wrote in P1-05 fit here).
 * - overall:     the mean of the seven field scores.
 *
 * Things to learn on the way:
 * - Why recall for identifiers and not precision? What does an invented barcode
 *   cost you, and which part of the system catches it (hint: P1-06)?
 * - Tag F1 punishes reasonable synonyms ("flask" vs "bottle"). Is that a problem
 *   with the metric or with the gold labels? When would an LLM judge be worth its cost?
 * - A mean of seven fields hides which ones matter. Would a weighted overall
 *   change any decision you make?
 */
export function scoreEntry(predicted: CatalogDraft, gold: GoldLabel): EntryScore {
  void predicted;
  void gold;
  todo("P1-07", "Implement scoreEntry() in evals/score.ts");
}
