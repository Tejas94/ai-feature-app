import { fitWithin, MAX_LONG_EDGE } from "../photo-limits";

export interface PreparedPhoto {
  blob: Blob;
  width: number;
  height: number;
}

/**
 * Shrinks a photo in the browser before upload: at most MAX_LONG_EDGE (1568 px)
 * on the long edge, re-encoded as JPEG at quality 0.85.
 *
 * Why bother:
 * - The API bills an image by pixel area (about width * height / 750 tokens) and
 *   scales large images down anyway. A 12-megapixel phone photo is several MB of
 *   upload for no extra accuracy at this size.
 * - Small JPEGs upload quickly on mobile data, which is where the camera is.
 * - Drawing onto a canvas and re-encoding drops the EXIF metadata, including the
 *   GPS location most phones write into photos.
 *
 * Week 1 experiment: change maxEdge, then compare usage.input_tokens and the
 * quality of the first look.
 */
export async function downscalePhoto(file: Blob, maxEdge = MAX_LONG_EDGE, quality = 0.85): Promise<PreparedPhoto> {
  let bitmap: ImageBitmap;
  try {
    // from-image applies the EXIF rotation, so portrait phone photos stay upright.
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("This browser cannot read that image format. Try a JPEG or PNG.");
  }
  try {
    const { width, height } = fitWithin(bitmap.width, bitmap.height, maxEdge);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is not available in this browser.");
    ctx.drawImage(bitmap, 0, 0, width, height);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not encode the photo."))), "image/jpeg", quality),
    );
    return { blob, width, height };
  } finally {
    bitmap.close();
  }
}
