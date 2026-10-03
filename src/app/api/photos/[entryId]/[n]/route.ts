import { errorResponse, RequestError } from "@/lib/errors";
import { ENTRY_ID, getStore } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Serves photo n (from 1) of an entry. Ids are checked against a strict pattern, so "../" never reaches the disk. */
export async function GET(_req: Request, { params }: { params: Promise<{ entryId: string; n: string }> }) {
  try {
    const { entryId, n } = await params;
    if (!ENTRY_ID.test(entryId) || !/^\d{1,2}$/.test(n)) throw new RequestError("Invalid photo path.");
    const photo = await getStore().readPhoto(entryId, Number(n));
    if (!photo) throw new RequestError("No such photo.", 404);
    return new Response(Buffer.from(photo.data), {
      headers: {
        "Content-Type": photo.mediaType,
        "Cache-Control": "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
