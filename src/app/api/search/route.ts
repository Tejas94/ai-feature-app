import { NextResponse } from "next/server";
import { applyFilters, jobs } from "@/lib/jobs";
import { extractFilters } from "@/lib/extract-filters";
import { costUsd } from "@/lib/cost";
import { MODEL } from "@/lib/llm";

export async function POST(req: Request) {
  const { query } = (await req.json()) as { query?: string };
  if (!query?.trim()) {
    return NextResponse.json({ filters: {}, jobs, costUsd: 0 });
  }
  try {
    const started = Date.now();
    const { filters, usage, attempts } = await extractFilters(query);
    const matches = applyFilters(jobs, filters);
    let cost: number | null = null;
    try {
      cost = costUsd(MODEL, usage);
    } catch {
      cost = null; // P1-05 not done yet; the search still works.
    }
    return NextResponse.json({
      filters,
      jobs: matches,
      usage,
      attempts,
      costUsd: cost,
      ms: Date.now() - started,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
