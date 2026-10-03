import { getJob } from "@/lib/jobs";
import { explainFit } from "@/lib/fit";

/** Streams plain text back to the browser as the model writes it. */
export async function POST(req: Request) {
  const { jobId } = (await req.json()) as { jobId: string };
  const job = getJob(jobId);
  if (!job) return new Response("Unknown job", { status: 404 });

  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of explainFit(job)) {
          controller.enqueue(encoder.encode(chunk));
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        controller.enqueue(encoder.encode(`\n\n[error] ${message}`));
      } finally {
        controller.close();
      }
    },
  });
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
