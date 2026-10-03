import { todo } from "./todo";

/**
 * USD per million tokens. Prices change; check https://www.anthropic.com/pricing
 * and update this table when you switch models.
 */
export const PRICES: Record<string, { input: number; output: number }> = {
  "claude-opus-5-5": { input: 4, output: 20 },
  "claude-sonnet-5-5": { input: 2, output: 10 },
  "claude-haiku-4-5": { input: 1, output: 5 },
};

export interface TokenUsage {
  input_tokens: number;
  output_tokens: number;
}

/**
 * TODO(P1-05) Week 3: return the cost of one call in USD.
 * - Throw a clear error for a model missing from PRICES (silent $0 hides bugs).
 * - tests/specs/cost.test.ts describes the expected behaviour; make it pass.
 * Stretch: prompt caching bills cache reads and writes differently. Add
 * cache_read_input_tokens / cache_creation_input_tokens once you turn caching on.
 */
export function costUsd(model: string, usage: TokenUsage): number {
  void model;
  void usage;
  todo("P1-05", "Implement costUsd() in src/lib/cost.ts");
}

/** Adds up several usages, e.g. a first attempt plus a retry. */
export function addUsage(a: TokenUsage, b: TokenUsage): TokenUsage {
  return {
    input_tokens: a.input_tokens + b.input_tokens,
    output_tokens: a.output_tokens + b.output_tokens,
  };
}
