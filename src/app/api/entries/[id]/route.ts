import { errorResponse, RequestError } from "@/lib/errors";
import { ENTRY_ID, getStore } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!ENTRY_ID.test(id)) throw new RequestError("Invalid entry id.");
    const entry = await getStore().get(id);
    if (!entry) throw new RequestError(`No entry ${id}.`, 404);
    return Response.json({ entry });
  } catch (err) {
    return errorResponse(err);
  }
}
