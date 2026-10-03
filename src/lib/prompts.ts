/**
 * Prompts live in code, under version control, next to the evals that test them.
 */

/**
 * TODO(P1-02) Week 2: write the system prompt for filter extraction.
 *
 * Start with one sentence, run `npm run eval`, read the failures, then improve.
 * Ideas to try one at a time (and measure each):
 * - Today's context: the job board is UK/EU, salaries are annual, "k" means thousands.
 * - Rules for ambiguity: "senior" means minSeniority "senior"; "remote or London"
 *   means locations ["London"] + includeRemoteWithLocation.
 * - Few-shot examples: 2-3 query -> JSON pairs. Do they help or make it copy them?
 * - What should happen for "show me something fun"? (Empty filters are a valid answer.)
 */
export const FILTER_SYSTEM_PROMPT = `TODO(P1-02): write me`;

/**
 * TODO(P1-04) Week 3: system prompt for "Explain my fit for this job".
 *
 * Inputs: the user's CV (data/cv.md) and one job. Output is streamed to the UI.
 * Decide the format: a match score? Strengths, gaps, and one suggested talking point?
 * Ask for something short; long answers cost more and nobody reads them.
 */
export const FIT_SYSTEM_PROMPT = `TODO(P1-04): write me`;
