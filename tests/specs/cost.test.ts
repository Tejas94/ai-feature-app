import { describe, expect, it } from "vitest";
import { costUsd } from "@/lib/cost";

// Spec for P1-02 (src/lib/cost.ts). Red until you finish it; once green, move this file to tests/core so CI guards it from then on.
describe("costUsd", () => {
  it("prices input and output tokens per million", () => {
    // 1M input at $4 + 0.5M output at $20 = $14
    expect(costUsd("claude-opus-5-5", { input_tokens: 1_000_000, output_tokens: 500_000 })).toBeCloseTo(14);
  });

  it("handles a typical small call", () => {
    // 800 * $1/M + 120 * $5/M
    expect(costUsd("claude-haiku-4-5", { input_tokens: 800, output_tokens: 120 })).toBeCloseTo(0.0014, 6);
  });

  it("uses each model's own prices", () => {
    // A draft with two photos: 6,000 in at $2/M + 900 out at $10/M
    expect(costUsd("claude-sonnet-5-5", { input_tokens: 6_000, output_tokens: 900 })).toBeCloseTo(0.021, 6);
  });

  it("accepts the usage object the API returns, cache fields included", () => {
    const usage = { input_tokens: 1_000, output_tokens: 1_000, cache_creation_input_tokens: null, cache_read_input_tokens: 0 };
    expect(costUsd("claude-opus-5-5", usage)).toBeCloseTo(0.024, 6);
  });

  it("throws for an unknown model instead of returning 0, naming the model", () => {
    // A clear message ("No price for model gpt-imaginary") saves a debugging session later.
    expect(() => costUsd("gpt-imaginary", { input_tokens: 1, output_tokens: 1 })).toThrow(/gpt-imaginary/);
  });
});
