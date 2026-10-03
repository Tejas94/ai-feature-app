import type Anthropic from "@anthropic-ai/sdk";
import { RequestError } from "./errors";
import { MAX_PHOTOS, MAX_PHOTO_BYTES, type MediaType } from "./photo-limits";

/**
 * Photo handling for the API routes and the eval runner (the browser uses
 * photo-limits.ts, which has no server dependencies).
 *
 * How images cost tokens: the API bills an image by its pixel area, roughly
 * width * height / 750 tokens (the docs describe it as about one token per 28x28
 * pixel patch, which is close). A 1568 x 1176 photo is about 2,500 tokens, so six
 * angles cost more than the whole system prompt. Larger images are scaled down by
 * the API anyway; models with high-resolution vision accept up to 2576 px on the
 * long edge and up to about 4,800 tokens per image. That is why the browser
 * downscales to 1568 px before upload (src/lib/client/downscale.ts). Compare
 * estimateImageTokens() with the input_tokens the API reports in week 1.
 */

export { MAX_LONG_EDGE, MAX_PHOTOS, MAX_PHOTO_BYTES, MEDIA_TYPES, estimateImageTokens, fitWithin } from "./photo-limits";
export type { MediaType } from "./photo-limits";

export interface Photo {
  mediaType: MediaType;
  data: Uint8Array;
}

/**
 * Reads the media type from the file's first bytes. The type the browser claims
 * is not trusted: a wrong media_type makes the API reject the whole request.
 */
export function detectMediaType(bytes: Uint8Array): MediaType | undefined {
  const b = bytes;
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b.length >= 6 && ascii(b, 0, 4) === "GIF8") return "image/gif";
  if (b.length >= 12 && ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 12) === "WEBP") return "image/webp";
  return undefined;
}

/** Checks one uploaded file and returns it as a Photo, or throws a RequestError the route turns into a 4xx. */
export function toPhoto(name: string, bytes: Uint8Array): Photo {
  if (bytes.length === 0) throw new RequestError(`${name} is empty.`);
  if (bytes.length > MAX_PHOTO_BYTES) {
    const mb = (bytes.length / 1024 / 1024).toFixed(1);
    throw new RequestError(`${name} is ${mb} MB; the limit is ${MAX_PHOTO_BYTES / 1024 / 1024} MB per photo.`, 413);
  }
  const mediaType = detectMediaType(bytes);
  if (!mediaType) throw new RequestError(`${name} is not a JPEG, PNG, WebP or GIF image.`, 415);
  return { mediaType, data: bytes };
}

/** Reads the photo files from a multipart form: at least `min` (default 1), at most MAX_PHOTOS. */
export async function readPhotos(form: FormData, { field = "photos", min = 1 } = {}): Promise<Photo[]> {
  const files = form.getAll(field).filter((v): v is File => typeof v !== "string");
  if (files.length < min) throw new RequestError(min === 1 ? "Add at least one photo." : `Add at least ${min} photos.`);
  if (files.length > MAX_PHOTOS) throw new RequestError(`Use at most ${MAX_PHOTOS} photos.`);
  return Promise.all(files.map(async (f, i) => toPhoto(f.name || `Photo ${i + 1}`, new Uint8Array(await f.arrayBuffer()))));
}

/** Most a multipart upload may be: every photo at the limit plus room for the form fields. */
export const MAX_UPLOAD_BYTES = MAX_PHOTOS * MAX_PHOTO_BYTES + 1024 * 1024;

/** Parses a multipart request, rejecting oversized bodies before reading them. */
export async function readForm(req: Request): Promise<FormData> {
  const length = Number(req.headers.get("content-length") ?? 0);
  if (length > MAX_UPLOAD_BYTES) throw new RequestError("The upload is too large.", 413);
  if (!(req.headers.get("content-type") ?? "").includes("multipart/form-data")) {
    throw new RequestError("Send the photos as multipart/form-data.", 415);
  }
  try {
    return await req.formData();
  } catch {
    throw new RequestError("Could not read the upload.");
  }
}

/** A base64 image content block for the Messages API. */
export function toImageBlock(photo: Photo): Anthropic.ImageBlockParam {
  return {
    type: "image",
    source: { type: "base64", media_type: photo.mediaType, data: Buffer.from(photo.data).toString("base64") },
  };
}

export function toImageBlocks(photos: Photo[]): Anthropic.ImageBlockParam[] {
  return photos.map(toImageBlock);
}

/** Pixel size read from the file header, for JPEG, PNG, GIF and WebP. Undefined if it cannot tell. */
export function imageSize(bytes: Uint8Array): { width: number; height: number } | undefined {
  const type = detectMediaType(bytes);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (type === "image/png" && bytes.length >= 24) {
    return { width: view.getUint32(16), height: view.getUint32(20) };
  }
  if (type === "image/gif" && bytes.length >= 10) {
    return { width: view.getUint16(6, true), height: view.getUint16(8, true) };
  }
  if (type === "image/webp" && bytes.length >= 30) {
    const chunk = ascii(bytes, 12, 16);
    if (chunk === "VP8X") return { width: 1 + uint24(bytes, 24), height: 1 + uint24(bytes, 27) };
    if (chunk === "VP8 ") return { width: view.getUint16(26, true) & 0x3fff, height: view.getUint16(28, true) & 0x3fff };
    if (chunk === "VP8L") {
      const bits = view.getUint32(21, true);
      return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
    }
    return undefined;
  }
  if (type === "image/jpeg") {
    let i = 2;
    while (i + 9 < bytes.length) {
      if (bytes[i] !== 0xff) return undefined;
      const marker = bytes[i + 1];
      const length = view.getUint16(i + 2);
      // SOF0-SOF15 hold the frame size, except DHT (C4), JPG (C8) and DAC (CC).
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return { width: view.getUint16(i + 7), height: view.getUint16(i + 5) };
      }
      i += 2 + length;
    }
  }
  return undefined;
}

function ascii(bytes: Uint8Array, start: number, end: number): string {
  return String.fromCharCode(...bytes.subarray(start, end));
}

function uint24(bytes: Uint8Array, at: number): number {
  return bytes[at] | (bytes[at + 1] << 8) | (bytes[at + 2] << 16);
}
