/**
 * Prompts live in code, under version control, next to the evals that test them.
 * When you change one, run `npm run eval` and log the before and after in
 * docs/EXPERIMENTS.md.
 */

/**
 * Used by the "First look" button (P1-01). Written for you, so week 1 is about
 * the API, images and streaming rather than prompt wording.
 */
export const FIRST_LOOK_PROMPT = `These photos all show one product from different angles.
Describe what you see in plain sentences for a person cataloguing it: what the product is,
any brand, model or size you can read on it, its colour and material, and its visible condition.
Mention text you can read exactly as printed. If something is unclear, say so instead of guessing.
Keep it under 120 words.`;

/**
 * TODO(P1-03) Week 2: write the system prompt for catalogue extraction.
 *
 * Goal: a prompt that turns 1 to 6 photos of one product into a CatalogDraft
 * (src/lib/schema.ts) a human only needs to skim. extractDraft() (P1-04) sends
 * it as the system prompt; the schema already fixes the output shape, so this
 * prompt is about judgement, not JSON.
 *
 * A good prompt covers:
 * - The job and the reader: who uses the entry, and why accuracy beats flair.
 * - Use every photo. The front shows the brand; the back often holds the model
 *   number, barcode, size and materials.
 * - Read labels before naming things: brand and model come from printed text
 *   where possible. Copy identifiers digit for digit.
 * - Never invent identifiers. A wrong barcode is worse than none; leave the list
 *   empty when nothing is legible.
 * - Condition from visible wear only: what "new", "like_new", "good", "fair" and
 *   "poor" mean for this catalogue, and what to write in notes.
 * - Category: the taxonomy (src/lib/taxonomy.ts has descriptions you can paste),
 *   and when "other" is the honest answer.
 * - Honest per-field confidence: what 0.9 means versus 0.5. Lower it when a
 *   value is inferred rather than read.
 *
 * Hints:
 * - Start with two or three sentences, run `npm run eval`, read the failures,
 *   then add one rule at a time and re-run. Keep the rules that move the score.
 * - XML-style tags (<rules>, <taxonomy>) keep sections easy to edit.
 * - Say why a rule exists ("buyers search by model number"); models follow
 *   reasons better than bare commands.
 *
 * Things to learn on the way:
 * - Which mistakes does the prompt fix, and which need a schema description
 *   change instead (the .describe() text in schema.ts)?
 * - Does a few-shot example help with images, or does the model copy it?
 * - How long can the prompt get before the cost per entry moves? (Images
 *   dominate input tokens; check usage before and after.)
 */
export const EXTRACTION_SYSTEM_PROMPT = `TODO(P1-03): write me`;
