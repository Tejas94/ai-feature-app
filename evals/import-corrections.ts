import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { getAttribute, type CatalogEntry } from "../src/lib/schema";
import { getStore, PHOTO_EXTENSIONS, type CatalogStore } from "../src/lib/store";
import { CASES_DIR, GoldLabel } from "./cases";

/**
 * Corrections become evals: copies saved entries that a human corrected, with
 * their photos, into evals/cases/saved-<entryId>/ as new gold cases.
 *
 *   npm run eval:import-corrections            entries with at least one corrected field
 *   npm run eval:import-corrections -- --all   every saved entry that came from a model draft
 *
 * Existing case folders are never overwritten. Read each new label.json before you
 * commit it: the saved entry is what a person accepted, which is not always perfect.
 */

/** The gold label a saved entry stands for. */
export function entryToLabel(entry: CatalogEntry, importedAt = new Date().toISOString()): GoldLabel {
  return GoldLabel.parse({
    title: entry.title,
    category: entry.category,
    brand: getAttribute(entry, "brand") ?? null,
    model: getAttribute(entry, "model") ?? null,
    condition: entry.condition.grade,
    identifiers: entry.visibleText.identifiers,
    tags: entry.tags,
    notes: `Imported from saved entry ${entry.id}.${entry.corrected.length ? ` Corrected: ${entry.corrected.join(", ")}.` : ""}`,
    source: { entryId: entry.id, importedAt, correctedFields: entry.corrected },
  });
}

export interface ImportResult {
  imported: string[];
  skipped: { entryId: string; reason: string }[];
}

export async function importCorrections(options: {
  store: CatalogStore;
  casesDir?: string;
  /** Also import entries saved without any correction. */
  all?: boolean;
}): Promise<ImportResult> {
  const casesDir = options.casesDir ?? CASES_DIR;
  const result: ImportResult = { imported: [], skipped: [] };
  for (const entry of await options.store.list()) {
    const skip = (reason: string) => result.skipped.push({ entryId: entry.id, reason });
    if (!entry.draft) continue; // typed in by hand (the seed data): nothing to learn from
    if (!options.all && entry.corrected.length === 0) {
      skip("saved without corrections (use --all to include it)");
      continue;
    }
    if (entry.photos.length === 0) {
      skip("no photos");
      continue;
    }
    const caseId = `saved-${entry.id}`;
    const dir = path.join(casesDir, caseId);
    if (existsSync(dir)) {
      skip(`${caseId} already exists`);
      continue;
    }
    const photos = [];
    for (let n = 1; n <= entry.photos.length; n++) {
      const photo = await options.store.readPhoto(entry.id, n);
      if (photo) photos.push(photo);
    }
    if (photos.length === 0) {
      skip("photo files are missing");
      continue;
    }
    await mkdir(dir, { recursive: true });
    for (const [i, photo] of photos.entries()) {
      await writeFile(path.join(dir, `${i + 1}.${PHOTO_EXTENSIONS[photo.mediaType]}`), photo.data);
    }
    await writeFile(path.join(dir, "label.json"), `${JSON.stringify(entryToLabel(entry), null, 2)}\n`);
    result.imported.push(caseId);
  }
  return result;
}

async function main() {
  const { values } = parseArgs({ options: { all: { type: "boolean", default: false } } });
  const { imported, skipped } = await importCorrections({ store: getStore(), all: values.all });
  for (const id of imported) console.log(`Imported evals/cases/${id}`);
  for (const s of skipped) console.log(`Skipped ${s.entryId}: ${s.reason}`);
  console.log(
    imported.length
      ? `\n${imported.length} new cases. Check each label.json, then run \`npm run eval\`.`
      : "\nNothing new to import. Save a few corrected entries in the app first.",
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  });
}
