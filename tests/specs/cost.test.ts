import { describe, expect, it } from "vitest";
import { costUsd } from "@/lib/cost";

// Spec for P1-05 (src/lib/cost.ts). Red until you finish it; once green, move this
// file to tests/core so CI guards it from then on.
describe("costUsd", () => {
  it("prices input and output tokens per million", () => {
    // 1M input at $4 + 0.5M output at $20 = $14
    expect(costUsd("claude-opus-5-5", { input_tokens: 1_000_000, output_tokens: 500_000 })).toBeCloseTo(14);
  });

  it("handles a typical small call", () => {
    expect(costUsd("claude-haiku-4-5", { input_tokens: 800, output_tokens: 120 })).toBeCloseTo(0.0014, 6);
  });

  it("throws for an unknown model instead of returning 0, naming the model", () => {
    // A clear message ("No price for model gpt-imaginary") saves a debugging session later.
    expect(() => costUsd("gpt-imaginary", { input_tokens: 1, output_tokens: 1 })).toThrow(/gpt-imaginary/);
  });
});
