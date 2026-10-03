import { describe, expect, it } from "vitest";
import { applyFilters, jobs } from "@/lib/jobs";

describe("applyFilters", () => {
  it("returns everything for empty filters", () => {
    expect(applyFilters(jobs, {})).toHaveLength(jobs.length);
  });

  it("filters remote only", () => {
    const out = applyFilters(jobs, { remoteOnly: true });
    expect(out.length).toBeGreaterThan(0);
    expect(out.every((j) => j.remote)).toBe(true);
  });

  it("treats minSalary as overlapping the salary band", () => {
    const out = applyFilters(jobs, { minSalary: 100000 });
    expect(out.every((j) => j.salaryMax >= 100000)).toBe(true);
  });

  it("matches skills case-insensitively", () => {
    const a = applyFilters(jobs, { skills: ["react"] });
    const b = applyFilters(jobs, { skills: ["React"] });
    expect(a.map((j) => j.id)).toEqual(b.map((j) => j.id));
  });
});
