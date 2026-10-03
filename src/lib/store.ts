import { randomUUID } from "node:crypto";
import { appendFile, copyFile, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { CatalogEntry, type CatalogDraft, type Usage } from "./schema";
import { diffDraft, type CorrectionRecord } from "./corrections";
import { MAX_PHOTOS, type MediaType, type Photo } from "./images";

/**
 * A file-backed catalogue: good enough for a demo on one machine, and small
 * enough to read in five minutes.
 *
 *   data/catalog.json         every entry (created from data/catalog.seed.json on first use)
 *   data/photos/<id>/<n>.jpg  the photos of each entry, n from 1
 *   data/corrections.jsonl    one line per entry saved from a model draft
 *
 * Everything else talks to the CatalogStore interface, so stage 2 of the roadmap
 * can swap this for Postgres plus object storage without touching the routes.
 * It needs a persistent disk: on serverless hosts the files vanish between requests.
 */

export interface NewEntry {
  /** What the human saved. */
  final: CatalogDraft;
  /** The model's original draft, or null for an entry typed in by hand. */
  draft: CatalogDraft | null;
  model: string | null;
  usage: Usage | null;
  costUsd: number | null;
  photos: Photo[];
}

export interface StoredPhoto {
  data: Uint8Array;
  mediaType: MediaType;
}

export interface CatalogStore {
  list(): Promise<CatalogEntry[]>;
  get(id: string): Promise<CatalogEntry | undefined>;
  save(input: NewEntry): Promise<CatalogEntry>;
  readPhoto(entryId: string, n: number): Promise<StoredPhoto | undefined>;
  corrections(): Promise<CorrectionRecord[]>;
  /** Deletes runtime data; the next read starts again from the seed. */
  reset(): Promise<void>;
}

export const ENTRY_ID = /^[A-Za-z0-9_-]{1,64}$/;

export const PHOTO_EXTENSIONS: Record<MediaType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};
const MEDIA_BY_EXTENSION = Object.fromEntries(Object.entries(PHOTO_EXTENSIONS).map(([m, e]) => [e, m])) as Record<
  string,
  MediaType
>;

export interface FileStoreOptions {
  /** Defaults to <dataDir>/catalog.seed.json. */
  seedFile?: string;
}

export function createFileStore(dataDir: string, options: FileStoreOptions = {}): CatalogStore {
  const catalogFile = path.join(dataDir, "catalog.json");
  const correctionsFile = path.join(dataDir, "corrections.jsonl");
  const photosDir = path.join(dataDir, "photos");
  const seedFile = options.seedFile ?? path.join(dataDir, "catalog.seed.json");

  // Writes run one at a time, so two saves never overwrite each other's catalog.json.
  let queue: Promise<unknown> = Promise.resolve();
  const serial = <T>(fn: () => Promise<T>): Promise<T> => {
    const run = queue.then(fn, fn);
    queue = run.catch(() => undefined);
    return run;
  };

  async function readAll(): Promise<CatalogEntry[]> {
    if (!existsSync(catalogFile)) {
      await mkdir(dataDir, { recursive: true });
      if (existsSync(/*turbopackIgnore: true*/ seedFile)) await copyFile(seedFile, catalogFile);
      else await writeFile(catalogFile, "[]\n");
    }
    const parsed = z.array(CatalogEntry).safeParse(JSON.parse(await readFile(catalogFile, "utf8")));
    if (!parsed.success) {
      throw new Error(`${catalogFile} does not match the CatalogEntry schema. Run \`npm run reset\`.\n${parsed.error.message}`);
    }
    return parsed.data;
  }

  async function writeAll(entries: CatalogEntry[]): Promise<void> {
    const tmp = `${catalogFile}.${process.pid}.${randomUUID()}.tmp`;
    await writeFile(tmp, `${JSON.stringify(entries, null, 2)}\n`);
    await rename(tmp, catalogFile);
  }

  const list = () => serial(readAll);
  const get = async (id: string) => (ENTRY_ID.test(id) ? (await list()).find((e) => e.id === id) : undefined);

  return {
    list,
    get,

    save: (input) =>
      serial(async () => {
        const entries = await readAll();
        const id = `e_${randomUUID().replace(/-/g, "").slice(0, 12)}`;
        const dir = path.join(photosDir, id);
        await mkdir(dir, { recursive: true });
        const photos: string[] = [];
        for (const [i, photo] of input.photos.entries()) {
          const name = `${i + 1}.${PHOTO_EXTENSIONS[photo.mediaType]}`;
          await writeFile(path.join(dir, name), photo.data);
          photos.push(`photos/${id}/${name}`);
        }
        const changes = input.draft ? diffDraft(input.draft, input.final) : [];
        const entry = CatalogEntry.parse({
          ...input.final,
          id,
          photos,
          createdAt: new Date().toISOString(),
          model: input.model,
          usage: input.usage,
          costUsd: input.costUsd,
          draft: input.draft,
          corrected: changes.map((c) => c.field),
        });
        await writeAll([...entries, entry]);
        if (input.draft) {
          const record: CorrectionRecord = { entryId: id, model: input.model, savedAt: entry.createdAt, changes };
          await appendFile(correctionsFile, `${JSON.stringify(record)}\n`);
        }
        return entry;
      }),

    async readPhoto(entryId, n) {
      if (!ENTRY_ID.test(entryId) || !Number.isInteger(n) || n < 1 || n > MAX_PHOTOS) return undefined;
      const entry = await get(entryId);
      const rel = entry?.photos[n - 1];
      if (!rel) return undefined;
      const file = path.resolve(dataDir, rel);
      // Only serve files inside data/photos, whatever catalog.json says.
      if (!file.startsWith(path.resolve(photosDir) + path.sep) || !existsSync(file)) return undefined;
      const mediaType = MEDIA_BY_EXTENSION[path.extname(file).slice(1).toLowerCase()];
      if (!mediaType) return undefined;
      return { data: new Uint8Array(await readFile(file)), mediaType };
    },

    async corrections() {
      if (!existsSync(correctionsFile)) return [];
      const lines = (await readFile(correctionsFile, "utf8")).split("\n").filter((l) => l.trim());
      return lines.map((l) => JSON.parse(l) as CorrectionRecord);
    },

    reset: () =>
      serial(async () => {
        await rm(catalogFile, { force: true });
        await rm(correctionsFile, { force: true });
        await rm(photosDir, { recursive: true, force: true });
      }),
  };
}

let shared: { dir: string; store: CatalogStore } | undefined;

/**
 * The app's store: CATALOG_DATA_DIR if set (tests use a temp dir), else ./data. Seeded from data/catalog.seed.json.
 * The turbopackIgnore comments stop `next build` from bundling the whole project because of these runtime paths.
 */
export function getStore(): CatalogStore {
  const dir = path.resolve(/*turbopackIgnore: true*/ process.env.CATALOG_DATA_DIR ?? path.join(process.cwd(), "data"));
  if (shared?.dir !== dir) {
    const seedFile = path.join(/*turbopackIgnore: true*/ process.cwd(), "data", "catalog.seed.json");
    shared = { dir, store: createFileStore(dir, { seedFile }) };
  }
  return shared.store;
}
