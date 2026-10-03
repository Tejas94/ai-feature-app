import { anthropic, MODEL } from "./llm";
import { JobFiltersSchema, type JobFilters } from "./filters";
import { FILTER_SYSTEM_PROMPT } from "./prompts";
import type { TokenUsage } from "./cost";
import { todo } from "./todo";

export interface ExtractResult {
  filters: JobFilters;
  usage: TokenUsage;
  attempts: number;
}

/**
 * TODO(P1-03) Week 2: turn a natural-language query into JobFilters.
 *
 * Step 1: structured output. Call
 *   anthropic.messages.parse({
 *     model: MODEL, max_tokens, system: FILTER_SYSTEM_PROMPT,
 *     messages: [{ role: "user", content: query }],
 *     output_config: { format: zodOutputFormat(JobFiltersSchema) },
 *   })
 * (import zodOutputFormat from "@anthropic-ai/sdk/helpers/zod") and read `parsed_output`.
 *
 * Step 2: validate anyway. Run JobFiltersSchema.safeParse() on what came back. If it
 * fails or parsed_output is null, retry once with the validation error in the
 * conversation, then give up with a clear error. Count attempts and sum usage.
 *
 * Step 3 (to understand what step 1 does for you): write a version WITHOUT
 * output_config that asks for JSON in the prompt and parses the text yourself.
 * Run the eval against both. Which fails more, and how?
 */
export async function extractFilters(query: string): Promise<ExtractResult> {
  void anthropic;
  void MODEL;
  void JobFiltersSchema;
  void FILTER_SYSTEM_PROMPT;
  void query;
  todo("P1-03", "Implement extractFilters() in src/lib/extract-filters.ts");
}
