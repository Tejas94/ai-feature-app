import type { JobFilters } from "../src/lib/filters";

export interface EvalCase {
  query: string;
  /** Fields that must be present with these values. Arrays compare as case-insensitive sets. */
  expect: Partial<JobFilters>;
  /** Fields that must NOT be set (guards against the model inventing filters). */
  absent?: (keyof JobFilters)[];
  note?: string;
}

/**
 * Your first eval set. Five examples to show the shape.
 *
 * TODO(P1-06) Week 3: grow this to at least 20 cases.
 * - Write them from real queries you would type, not from what the prompt handles well.
 * - Include tricky ones: typos ("Reakt"), currencies ("€70k"), vague asks ("something chill"),
 *   contradictions ("junior staff engineer"), and queries that should produce NO filters.
 * - Every time a search in the UI does something wrong, add it here before fixing it.
 * Run with `npm run eval`. Re-run after every prompt or model change.
 */
export const cases: EvalCase[] = [
  {
    query: "senior React roles in London paying over 90k",
    expect: { skills: ["React"], locations: ["London"], minSeniority: "senior", minSalary: 90000 },
    absent: ["remoteOnly"],
  },
  {
    query: "remote AI engineer jobs",
    expect: { remoteOnly: true, titleKeywords: ["AI"] },
    absent: ["locations"],
  },
  {
    query: "React Native in Manchester or remote",
    expect: { skills: ["React Native"], locations: ["Manchester"], includeRemoteWithLocation: true },
    absent: ["remoteOnly"],
  },
  {
    query: "anything posted in the last 3 days",
    expect: { postedWithinDays: 3 },
    absent: ["skills", "locations", "minSalary"],
  },
  {
    query: "Berlin jobs above €80k",
    expect: { locations: ["Berlin"], minSalary: 80000, currency: "EUR" },
  },
];
