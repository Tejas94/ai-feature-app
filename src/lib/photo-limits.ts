/**
 * Photo limits and sizing maths with no server dependencies, so the browser code
 * (src/lib/client/downscale.ts) and the server share one source of truth.
 */

export const MEDIA_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
export type MediaType = (typeof MEDIA_TYPES)[number];

export const MAX_PHOTOS = 6;
/** The API rejects images over 5 MB. Base64 adds a third, so 3.5 MB of raw bytes stays under it. */
export const MAX_PHOTO_BYTES = 3.5 * 1024 * 1024;
/** Long edge the browser downscales to before upload. */
export const MAX_LONG_EDGE = 1568;

/** Width and height that fit inside maxEdge on the long side, keeping the aspect ratio. Never upscales. */
export function fitWithin(width: number, height: number, maxEdge = MAX_LONG_EDGE): { width: number; height: number } {
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

/** Rough image token count: width * height / 750. Check it against usage.input_tokens. */
export function estimateImageTokens(width: number, height: number): number {
  return Math.ceil((width * height) / 750);
}
