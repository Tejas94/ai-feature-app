import type { ErrorBody, Pending } from "@/lib/api-types";

/** An API error. Unfinished TODOs get their own calm style, since they are expected. */
export function ErrorNotice({ error }: { error: ErrorBody | null | undefined }) {
  if (!error) return null;
  return <div className={`notice ${error.todo ? "todo" : "error"}`}>{error.error}</div>;
}

/** Optional steps that did not run, usually open TODOs. */
export function PendingNotices({ pending }: { pending: Pending[] | undefined }) {
  if (!pending?.length) return null;
  return (
    <>
      {pending.map((p) => (
        <div key={p.step} className={`notice ${p.todo ? "todo" : "warn"}`}>
          {p.step}: {p.message}
        </div>
      ))}
    </>
  );
}
