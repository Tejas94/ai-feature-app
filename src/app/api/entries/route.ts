import { filterEntries } from "@/lib/catalog";
import { readForm, readPhotos } from "@/lib/images";
import { errorResponse, RequestError } from "@/lib/errors";
import { SaveEntryRequest } from "@/lib/schema";
import { getStore } from "@/lib/store";
import type { SaveEntryResponse } from "@/lib/api-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The catalogue, newest first. Optional query parameters: q, category, tag. */
export async function GET(req: Request) {
  try {
    const params = new URL(req.url).searchParams;
    const entries = filterEntries(await getStore().list(), {
      q: params.get("q") ?? undefined,
      category: params.get("category") ?? undefined,
      tag: params.get("tag") ?? undefined,
    });
    return Response.json({ entries });
  } catch (err) {
    return errorResponse(err);
  }
}

/**
 * Saves an entry. Multipart form: an "entry" field with SaveEntryRequest JSON
 * (what the human approved plus the model's original draft) and 0 to 6 "photos".
 * The store also writes the corrections record: which fields the human changed.
 */
export async function POST(req: Request) {
  try {
    const form = await readForm(req);
    const raw = form.get("entry");
    if (typeof raw !== "string") throw new RequestError('Missing the "entry" field.');
    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      throw new RequestError('The "entry" field is not valid JSON.');
    }
    const parsed = SaveEntryRequest.safeParse(json);
    if (!parsed.success) {
      const issues = parsed.error.issues.slice(0, 5).map((i) => `${i.path.join(".") || "entry"}: ${i.message}`);
      throw new RequestError(`The entry is not valid. ${issues.join("; ")}`);
    }
    const photos = await readPhotos(form, { min: 0 });
    const entry = await getStore().save({ ...parsed.data, photos });
    const body: SaveEntryResponse = { entry };
    return Response.json(body, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
