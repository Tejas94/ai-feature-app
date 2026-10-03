import Anthropic from "@anthropic-ai/sdk";
import { todo } from "./todo";

/** Reads ANTHROPIC_API_KEY from the environment (.env.local in dev). */
export const anthropic = new Anthropic();

export const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-opus-5-5";

/**
 * TODO(P1-01) Week 1: stream a completion as plain text chunks.
 *
 * Use the raw SDK, no framework:
 *   const stream = anthropic.messages.stream({ model: MODEL, max_tokens, system, messages })
 *   for await (const event of stream) { ... }
 * Yield the text of every `content_block_delta` event whose delta.type is "text_delta".
 *
 * Things to notice while you build it:
 * - What other event types arrive? Log them once and read them.
 * - Check `stop_reason` on the final message (stream.finalMessage()). What happens
 *   when it is "max_tokens"? What about "refusal"?
 * - Return the usage from the final message too (you will need it in P1-05).
 *
 * Docs: https://docs.anthropic.com (Streaming Messages)
 */
export async function* streamText(opts: {
  system: string;
  user: string;
  maxTokens?: number;
}): AsyncGenerator<string, Anthropic.Usage | undefined> {
  void opts;
  todo("P1-01", "Implement streamText() in src/lib/llm.ts");
}
