import { todo } from "./todo";

/**
 * USD per million tokens. Prices change; check https://platform.claude.com/docs/en/about-claude/pricing
 * and update this table when you add or switch models.
 */
export const PRICES: Record<string, { input: number; output: number }> = {
  "claude-opus-5-5": { input: 4, output: 20 },
  "claude-sonnet-5-5": { input: 2, output: 10 },
  "claude-haiku-4-5": { input: 1, output: 5 },
};

/** The usage fields the API returns. The cache fields appear once you turn on prompt caching. */
export interface TokenUsage {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number | null;
  cache_read_input_tokens?: number | null;
}

/**
 * TODO(P1-02) Week 1: return the cost of one call in USD.
 *
 * Goal: turn the usage the API returns into dollars, so every first look, draft
 * and eval run shows what it cost. tests/specs/cost.test.ts describes the
 * expected behaviour; make it pass, then move it to tests/core.
 *
 * Constraints:
 * - Prices in PRICES are per million tokens.
 * - Throw a clear error naming the model when it is missing from PRICES. A silent
 *   $0 hides bugs, for example a typo in ANTHROPIC_MODEL.
 *
 * Things to learn on the way:
 * - Why are output tokens priced higher than input tokens?
 * - Thinking tokens are billed as output tokens. Look at output_tokens for a
 *   first look: how much of it is the visible answer?
 * - For one draft, which costs more: the photos or the answer?
 *
 * Stretch: prompt caching bills cache writes and cache reads at different rates.
 * Add cache_creation_input_tokens and cache_read_input_tokens once you turn
 * caching on in week 10, with a test for each.
 */
export function costUsd(model: string, usage: TokenUsage): number {
  void model;
  void usage;
  todo("P1-02", "Implement costUsd() in src/lib/cost.ts");
}

/** Adds up several usages, e.g. a first attempt plus a retry. */
export function addUsage(a: TokenUsage, b: TokenUsage): TokenUsage {
  return {
    input_tokens: a.input_tokens + b.input_tokens,
    output_tokens: a.output_tokens + b.output_tokens,
    cache_creation_input_tokens: (a.cache_creation_input_tokens ?? 0) + (b.cache_creation_input_tokens ?? 0),
    cache_read_input_tokens: (a.cache_read_input_tokens ?? 0) + (b.cache_read_input_tokens ?? 0),
  };
}
