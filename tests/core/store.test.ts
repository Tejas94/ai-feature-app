import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createFileStore, type CatalogStore, type NewEntry } from "@/lib/store";
import { makeDraft, fakeJpeg } from "../fixtures";

const SEED = path.resolve("data/catalog.seed.json");
const seedCount = JSON.parse(readFileSync(SEED, "utf8")).length;

let dir: string;
let store: CatalogStore;

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "catalog-store-"));
  store = createFileStore(dir, { seedFile: SEED });
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

const save = (overrides: Partial<NewEntry> = {}) =>
  store.save({
    final: makeDraft(),
    draft: makeDraft(),
    model: "claude-opus-5-5",
    usage: { input_tokens: 5000, output_tokens: 800 },
    costUsd: 0.036,
    photos: [{ mediaType: "image/jpeg", data: fakeJpeg() }],
    ...overrides,
  });

describe("file store", () => {
  it("seeds data/catalog.json from the seed file on first read", async () => {
    expect(existsSync(path.join(dir, "catalog.json"))).toBe(false);
    expect(await store.list()).toHaveLength(seedCount);
    expect(existsSync(path.join(dir, "catalog.json"))).toBe(true);
  });

  it("saves an entry with its photos and finds it again", async () => {
    const entry = await save();
    expect(entry.id).toMatch(/^e_[a-z0-9]{12}$/);
    expect(entry.photos).toEqual([`photos/${entry.id}/1.jpg`]);
    expect(await store.get(entry.id)).toEqual(entry);
    expect(await store.list()).toHaveLength(seedCount + 1);
    const photo = await store.readPhoto(entry.id, 1);
    expect(photo?.mediaType).toBe("image/jpeg");
    expect(photo?.data).toEqual(fakeJpeg());
  });

  it("records which fields the human corrected", async () => {
    const final = makeDraft({ title: "Kelvaro TM-350 Travel Mug, Sage Green", tags: ["mug", "insulated", "green"] });
    const entry = await save({ final });
    expect(entry.corrected).toEqual(["title", "tags"]);
    expect(entry.draft?.title).toBe(makeDraft().title);
    const [record] = await store.corrections();
    expect(record.entryId).toBe(entry.id);
    expect(record.changes.map((c) => c.field)).toEqual(["title", "tags"]);
  });

  it("writes no corrections record for an entry typed in by hand", async () => {
    const entry = await save({ draft: null, model: null, usage: null, costUsd: null, photos: [] });
    expect(entry.corrected).toEqual([]);
    expect(await store.corrections()).toEqual([]);
  });

  it("keeps every entry when saves run at the same time", async () => {
    await Promise.all([save(), save(), save()]);
    expect(await store.list()).toHaveLength(seedCount + 3);
  });

  it("serves only photos it stored", async () => {
    const entry = await save();
    expect(await store.readPhoto(entry.id, 2)).toBeUndefined();
    expect(await store.readPhoto("../etc", 1)).toBeUndefined();
    expect(await store.readPhoto("seed-01", 1)).toBeUndefined();
    // Even a tampered catalog.json cannot point outside data/photos.
    const entries = JSON.parse(readFileSync(path.join(dir, "catalog.json"), "utf8"));
    entries[entries.length - 1].photos = ["../catalog.json"];
    writeFileSync(path.join(dir, "catalog.json"), JSON.stringify(entries));
    expect(await store.readPhoto(entry.id, 1)).toBeUndefined();
  });

  it("returns undefined for unknown or malformed ids", async () => {
    expect(await store.get("nope")).toBeUndefined();
    expect(await store.get("../../x")).toBeUndefined();
  });

  it("reset() deletes runtime data so the seed loads again", async () => {
    await save();
    await store.reset();
    expect(existsSync(path.join(dir, "photos"))).toBe(false);
    expect(await store.corrections()).toEqual([]);
    expect(await store.list()).toHaveLength(seedCount);
  });

  it("explains a corrupted catalog.json", async () => {
    writeFileSync(path.join(dir, "catalog.json"), JSON.stringify([{ id: 1 }]));
    await expect(store.list()).rejects.toThrow(/npm run reset/);
  });
});
