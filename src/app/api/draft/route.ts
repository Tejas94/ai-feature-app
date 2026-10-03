import { MODEL } from "@/lib/llm";
import { extractDraft } from "@/lib/extract";
import { findDuplicates } from "@/lib/duplicates";
import { reviewFlags } from "@/lib/confidence";
import { costUsd } from "@/lib/cost";
import { readForm, readPhotos, toImageBlocks } from "@/lib/images";
import { errorResponse } from "@/lib/errors";
import { optional, type Pending } from "@/lib/pending";
import { getStore } from "@/lib/store";
import { photoUrl, type DraftResponse } from "@/lib/api-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Photos in, a reviewable draft out: the structured draft (P1-04), duplicate
 * candidates (P1-05), review flags (P1-06), and usage, cost (P1-02) and latency.
 * The extraction is required; the other steps are optional, so an open TODO there
 * shows up as a notice in the form instead of failing the whole request.
 */
export async function POST(req: Request) {
  const started = Date.now();
  try {
    const photos = await readPhotos(await readForm(req));
    const { draft, usage, attempts } = await extractDraft(toImageBlocks(photos));
    const ms = Date.now() - started;

    const pending: Pending[] = [];
    const catalog = await getStore().list();
    const matches = optional("Duplicate check", pending, () => findDuplicates(draft, catalog));
    const byId = new Map(catalog.map((e) => [e.id, e]));
    const duplicates =
      matches?.flatMap((m) => {
        const entry = byId.get(m.entryId);
        if (!entry) return [];
        const thumbnail = entry.photos.length ? photoUrl(entry.id, 1) : null;
        return [{ ...m, title: entry.title, category: entry.category, thumbnail }];
      }) ?? null;
    const review = optional("Review flags", pending, () => reviewFlags(draft));
    const cost = optional("Cost", pending, () => costUsd(MODEL, usage));

    const body: DraftResponse = { draft, model: MODEL, usage, attempts, costUsd: cost, ms, duplicates, review, pending };
    return Response.json(body);
  } catch (err) {
    return errorResponse(err);
  }
}
