import type { JobFilters } from "../src/lib/filters";
import type { EvalCase } from "./cases";

export interface CaseScore {
  pass: boolean;
  problems: string[];
}

const norm = (v: unknown) => (typeof v === "string" ? v.toLowerCase().trim() : v);

function sameValue(a: unknown, b: unknown): boolean {
  if (Array.isArray(a) && Array.isArray(b)) {
    const sa = new Set(a.map(norm));
    const sb = new Set(b.map(norm));
    return sa.size === sb.size && [...sa].every((x) => sb.has(x));
  }
  return norm(a) === norm(b);
}

/** Code-based check: exact, cheap, deterministic. Prefer these over LLM judges when you can. */
export function scoreCase(c: EvalCase, got: JobFilters): CaseScore {
  const problems: string[] = [];
  for (const [key, want] of Object.entries(c.expect)) {
    const have = got[key as keyof JobFilters];
    if (!sameValue(have, want)) {
      problems.push(`${key}: expected ${JSON.stringify(want)}, got ${JSON.stringify(have)}`);
    }
  }
  for (const key of c.absent ?? []) {
    const have = got[key];
    const empty = have == null || (Array.isArray(have) && have.length === 0) || have === false;
    if (!empty) problems.push(`${key}: should be unset, got ${JSON.stringify(have)}`);
  }
  return { pass: problems.length === 0, problems };
}
