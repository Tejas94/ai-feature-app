import { describe, expect, it } from "vitest";
import { scoreCase } from "../../evals/score";

describe("scoreCase", () => {
  it("compares arrays as case-insensitive sets", () => {
    const s = scoreCase({ query: "", expect: { skills: ["React", "TypeScript"] } }, { skills: ["typescript", "react"] });
    expect(s.pass).toBe(true);
  });

  it("flags invented filters", () => {
    const s = scoreCase({ query: "", expect: {}, absent: ["locations"] }, { locations: ["London"] });
    expect(s.pass).toBe(false);
  });
});
