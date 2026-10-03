import type { CatalogDraft, CatalogEntry, Usage } from "./schema";
import type { DuplicateMatch } from "./duplicates";
import type { ReviewFlags } from "./confidence";
import type { Pending } from "./pending";
import type { ErrorBody } from "./errors";

/** Shapes the API routes return, shared with the browser code. Type imports only, so no server code reaches the browser bundle. */

export type { ErrorBody, Pending };

/** One line of the /api/first-look stream (newline-delimited JSON). */
export type FirstLookEvent =
  | { type: "text"; text: string }
  | {
      type: "done";
      model: string;
      usage: Usage;
      stopReason: string | null;
      costUsd: number | null;
      /** From the request arriving to the first text chunk. */
      ttftMs: number;
      ms: number;
      /** width * height / 750, summed over the photos. Compare with usage.input_tokens. */
      estimatedImageTokens: number | null;
      pending: Pending[];
    }
  | ({ type: "error" } & ErrorBody);

export interface DuplicateCandidate extends DuplicateMatch {
  title: string;
  category: string;
  /** URL of the entry's first photo, or null. */
  thumbnail: string | null;
}

export interface DraftResponse {
  draft: CatalogDraft;
  model: string;
  usage: Usage;
  attempts: number;
  costUsd: number | null;
  ms: number;
  /** Null while P1-05 is open. */
  duplicates: DuplicateCandidate[] | null;
  /** Null while P1-06 is open. */
  review: ReviewFlags | null;
  /** Steps that could not run, usually open TODOs. */
  pending: Pending[];
}

export interface SaveEntryResponse {
  entry: CatalogEntry;
}

export function photoUrl(entryId: string, n: number): string {
  return `/api/photos/${encodeURIComponent(entryId)}/${n}`;
}
