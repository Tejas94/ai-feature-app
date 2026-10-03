import type Anthropic from "@anthropic-ai/sdk";
import { anthropic, MODEL } from "./llm";
import { CatalogDraft } from "./schema";
import { EXTRACTION_SYSTEM_PROMPT } from "./prompts";
import type { TokenUsage } from "./cost";
import { todo } from "./todo";

export interface ExtractResult {
  draft: CatalogDraft;
  /** Summed over every attempt. */
  usage: TokenUsage;
  /** 1 when the first answer was valid, 2 after a retry. */
  attempts: number;
}

/**
 * TODO(P1-04) Week 2: turn the photos into a validated CatalogDraft.
 *
 * Goal: one call that returns a CatalogDraft checked by Zod, with one retry when
 * the answer is unusable. /api/draft and the eval runner both call this.
 *
 * Constraints:
 * - Use structured outputs:
 *     anthropic.messages.parse({
 *       model: MODEL, max_tokens, system: EXTRACTION_SYSTEM_PROMPT, messages,
 *       output_config: { format: zodOutputFormat(CatalogDraft) },
 *     })
 *   with zodOutputFormat from "@anthropic-ai/sdk/helpers/zod", and read `parsed_output`.
 * - The user turn holds every image block first, then a short text instruction.
 * - Retry once, and only once, when the answer fails validation, is missing, or
 *   the model stopped early (stop_reason "refusal" or "max_tokens"). Tell the
 *   model what was wrong in the retry. After a second failure, throw an error that
 *   says what failed.
 * - Return { draft, usage, attempts }, with usage summed over both attempts
 *   (addUsage in cost.ts).
 *
 * Hints:
 * - parse() throws when the answer does not match the Zod schema (the message
 *   lists the issues), and parsed_output is null when there was no text to parse.
 *   Both should lead to the retry.
 * - The API does not enforce every rule in the schema: 3 to 10 tags, lowercase
 *   tags and confidence between 0 and 1 are checked by Zod after the answer
 *   arrives. Structured outputs guarantee the shape, not the rules.
 * - When parse() throws you never see the bad answer. If you want to show the
 *   model its own output in the retry, call messages.create() with the same
 *   output_config and run CatalogDraft.safeParse(JSON.parse(text)) yourself.
 * - If you send the model's answer back, append response.content unchanged
 *   (thinking blocks included) as the assistant turn, then a user turn with the
 *   error. Do not edit or trim earlier turns; current models can reject an
 *   edited history.
 * - Thinking counts toward max_tokens, and a JSON object cut off halfway is
 *   useless. Give it room (16000 is a safe start) and watch output_tokens.
 *
 * Things to learn on the way:
 * - How often does the first attempt fail? The eval reports attempts per case.
 * - Prompt-only JSON: write a second version without output_config that asks for
 *   JSON in the prompt and parses the text yourself. Run the eval on both. Which
 *   fails more often, and how? Log it in docs/EXPERIMENTS.md.
 * - One photo versus all angles: how much do identifiers and brand accuracy change?
 *   `npm run eval -- --max-photos 1` sends only the first photo of each case.
 * - Why validate at all when the API constrains the output? (Shape versus
 *   meaning, refusals, truncation, and your own schema rules.)
 *
 * Docs: https://platform.claude.com/docs/en/build-with-claude/structured-outputs
 */
export async function extractDraft(images: Anthropic.ImageBlockParam[]): Promise<ExtractResult> {
  void images;
  void anthropic;
  void MODEL;
  void CatalogDraft;
  void EXTRACTION_SYSTEM_PROMPT;
  todo("P1-04", "Implement extractDraft() in src/lib/extract.ts");
}
