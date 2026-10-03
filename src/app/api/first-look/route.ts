import { MODEL, streamFirstLook } from "@/lib/llm";
import { estimateImageTokens, imageSize, readForm, readPhotos, toImageBlocks } from "@/lib/images";
import { costUsd } from "@/lib/cost";
import { describeError, errorResponse } from "@/lib/errors";
import { optional, type Pending } from "@/lib/pending";
import type { FirstLookEvent } from "@/lib/api-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Streams a first description of the photos (P1-01) as newline-delimited JSON:
 * {"type":"text"} lines while the model writes, then one {"type":"done"} line with
 * usage, cost and timings, or an {"type":"error"} line if it fails mid-stream.
 */
export async function POST(req: Request) {
  const started = Date.now();
  try {
    const photos = await readPhotos(await readForm(req));
    const sizes = photos.map((p) => imageSize(p.data));
    const estimatedImageTokens = sizes.every(Boolean)
      ? sizes.reduce((sum, s) => sum + estimateImageTokens(s!.width, s!.height), 0)
      : null;

    const stream = streamFirstLook(toImageBlocks(photos));
    // Wait for the first chunk before answering, so an unfinished TODO or a bad API
    // key becomes a JSON error with the right status code instead of a broken stream.
    let result = await stream.next();
    const ttftMs = Date.now() - started;

    const encoder = new TextEncoder();
    let closed = false;
    const body = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (event: FirstLookEvent) => {
          if (!closed) controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        };
        try {
          while (!result.done) {
            send({ type: "text", text: result.value });
            if (closed) return;
            result = await stream.next();
          }
          const { usage, stopReason } = result.value;
          const pending: Pending[] = [];
          const cost = optional("Cost", pending, () => costUsd(MODEL, usage));
          send({
            type: "done",
            model: MODEL,
            usage,
            stopReason,
            costUsd: cost,
            ttftMs,
            ms: Date.now() - started,
            estimatedImageTokens,
            pending,
          });
        } catch (err) {
          send({ type: "error", ...describeError(err).body });
        } finally {
          if (!closed) {
            closed = true;
            controller.close();
          }
        }
      },
      // The browser pressed Stop or went away: end the generator so it stops
      // reading from the API instead of paying for tokens nobody sees.
      cancel() {
        closed = true;
        // The return value is never read, hence the cast.
        stream.return(undefined as never).catch(() => undefined);
      },
    });
    return new Response(body, {
      headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
