import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  detectMediaType,
  estimateImageTokens,
  fitWithin,
  imageSize,
  MAX_PHOTO_BYTES,
  readPhotos,
  toImageBlock,
  toPhoto,
} from "@/lib/images";
import { RequestError } from "@/lib/errors";
import { fakeJpeg } from "../fixtures";

const realJpeg = new Uint8Array(readFileSync("evals/cases/kelvaro-travel-mug/1.jpg"));

describe("detectMediaType", () => {
  it("reads the type from the first bytes", () => {
    expect(detectMediaType(fakeJpeg())).toBe("image/jpeg");
    expect(detectMediaType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe("image/png");
    expect(detectMediaType(new TextEncoder().encode("GIF89a......"))).toBe("image/gif");
    expect(detectMediaType(new TextEncoder().encode("RIFF\0\0\0\0WEBPVP8 "))).toBe("image/webp");
    expect(detectMediaType(new TextEncoder().encode("hello world"))).toBeUndefined();
  });
});

describe("toPhoto", () => {
  it("accepts an image", () => {
    expect(toPhoto("a.jpg", fakeJpeg()).mediaType).toBe("image/jpeg");
  });

  it("rejects text pretending to be an image", () => {
    expect(() => toPhoto("a.jpg", new TextEncoder().encode("not an image"))).toThrow(/not a JPEG/);
  });

  it("rejects empty and oversized files with a clear status", () => {
    expect(() => toPhoto("a.jpg", new Uint8Array())).toThrow(/empty/);
    try {
      toPhoto("big.jpg", fakeJpeg(MAX_PHOTO_BYTES + 1));
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(RequestError);
      expect((err as RequestError).status).toBe(413);
    }
  });
});

describe("readPhotos", () => {
  const form = (n: number) => {
    const f = new FormData();
    for (let i = 0; i < n; i++) f.append("photos", new Blob([fakeJpeg()], { type: "image/jpeg" }), `${i}.jpg`);
    return f;
  };

  it("reads 1 to 6 photos", async () => {
    expect(await readPhotos(form(2))).toHaveLength(2);
  });

  it("rejects no photos and more than 6", async () => {
    await expect(readPhotos(form(0))).rejects.toThrow(/at least one/);
    await expect(readPhotos(form(7))).rejects.toThrow(/at most 6/);
    expect(await readPhotos(form(0), { min: 0 })).toEqual([]);
  });
});

describe("image blocks and sizes", () => {
  it("builds a base64 image block", () => {
    const block = toImageBlock({ mediaType: "image/jpeg", data: new Uint8Array([1, 2, 3]) });
    expect(block).toEqual({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: "AQID" } });
  });

  it("fits a photo inside the long edge without upscaling", () => {
    expect(fitWithin(4032, 3024, 1568)).toEqual({ width: 1568, height: 1176 });
    expect(fitWithin(3024, 4032, 1568)).toEqual({ width: 1176, height: 1568 });
    expect(fitWithin(800, 600, 1568)).toEqual({ width: 800, height: 600 });
  });

  it("estimates image tokens as width * height / 750", () => {
    expect(estimateImageTokens(1568, 1176)).toBe(2459);
  });

  it("reads the pixel size from a JPEG header", () => {
    expect(imageSize(realJpeg)).toEqual({ width: 1200, height: 900 });
  });
});
