import Anthropic from "@anthropic-ai/sdk";
import { FIRST_LOOK_PROMPT } from "./prompts";
import { todo } from "./todo";

/**
 * Reads ANTHROPIC_API_KEY from the environment (.env.local in dev). Constructing
 * the client never calls the network; a missing key only fails on the first request.
 */
export const anthropic = new Anthropic();

/** Compare claude-opus-5-5 (default), claude-sonnet-5-5 and claude-haiku-4-5 in week 3. */
export const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-opus-5-5";

export interface StreamResult {
  usage: Anthropic.Usage;
  stopReason: Anthropic.StopReason | null;
}

/**
 * TODO(P1-01) Week 1: stream a first look at the photos.
 *
 * Goal: send every photo plus FIRST_LOOK_PROMPT in one user turn, yield the
 * answer's text as it arrives, and return the usage and stop reason of the final
 * message. /api/first-look forwards each chunk to the browser and shows the cost
 * (P1-02), time to first token and total time when the stream ends.
 *
 * Constraints:
 * - Use the raw SDK, no framework: anthropic.messages.stream({ model: MODEL, ... }).
 * - `images` are ready-made base64 image blocks (see src/lib/images.ts). Put
 *   them before the text block in the content array; that is the order the
 *   vision docs recommend.
 * - Yield text only. Current models think before they answer and stream
 *   `thinking` blocks first (with empty text unless you ask for a summary).
 * - Return { usage, stopReason } from the final message.
 *
 * Hints:
 * - `for await (const event of stream)` gives you the raw server-sent events. The
 *   text is in content_block_delta events whose delta.type is "text_delta".
 * - stream.finalMessage() resolves with the complete message once the stream ends.
 * - Thinking tokens count toward max_tokens. Leave room (several thousand) and
 *   keep the answer short through the prompt, not through max_tokens.
 *
 * Things to learn on the way:
 * - Log each event type once. What arrives before the first text_delta, and how long does it take?
 * - How many input tokens do 1, 3 and 6 photos cost? Compare with estimateImageTokens().
 * - Set max_tokens to 300. What is the stop reason now, and what should the UI say about it?
 * - claude-opus-5-5 defaults to effort "medium". Try output_config: { effort: "low" } for a
 *   quick look and compare latency and output tokens. claude-haiku-4-5 does not accept
 *   effort at all; what does the API say if you send it?
 *
 * Docs: https://platform.claude.com/docs/en/build-with-claude/streaming
 * and https://platform.claude.com/docs/en/build-with-claude/vision
 */
export async function* streamFirstLook(images: Anthropic.ImageBlockParam[]): AsyncGenerator<string, StreamResult> {
  void images;
  void FIRST_LOOK_PROMPT;
  todo("P1-01", "Implement streamFirstLook() in src/lib/llm.ts");
}
