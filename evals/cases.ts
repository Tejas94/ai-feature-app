import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { ConditionGrade, Identifier } from "../src/lib/schema";
import { CATEGORIES } from "../src/lib/taxonomy";
import { toPhoto, type Photo } from "../src/lib/images";

/**
 * Eval cases live in folders: evals/cases/<id>/ holds the photos (1.jpg, 2.jpg,
 * ...) and label.json, the gold answer a careful human would give. See
 * evals/cases/README.md for the format and how to add real products.
 */

export const CASES_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "cases");

export const GoldLabel = z.object({
  title: z.string().min(1),
  category: z.enum(CATEGORIES),
  /** null when the product shows no brand. */
  brand: z.string().min(1).nullable(),
  /** null when no model name or number is visible. */
  model: z.string().min(1).nullable(),
  condition: ConditionGrade,
  /** Every identifier legible in the photos, as printed. */
  identifiers: z.array(Identifier),
  tags: z.array(z.string().min(1)).min(1),
  /** Anything a reader of the eval should know, e.g. "the barcode is half covered". */
  notes: z.string().optional(),
  /** Set by `npm run eval:import-corrections`. */
  source: z
    .object({ entryId: z.string(), importedAt: z.string(), correctedFields: z.array(z.string()) })
    .optional(),
});
export type GoldLabel = z.infer<typeof GoldLabel>;

export interface EvalCase {
  id: string;
  dir: string;
  /** Absolute paths, in name order. */
  photoFiles: string[];
  label: GoldLabel;
}

const PHOTO_FILE = /\.(jpe?g|png|webp|gif)$/i;

/**
 * Loads every case folder, checking each label against GoldLabel. `only` keeps the
 * cases whose id contains any of the comma-separated words.
 */
export async function loadCases(dir = CASES_DIR, only?: string): Promise<EvalCase[]> {
  if (!existsSync(dir)) return [];
  const folders = (await readdir(dir, { withFileTypes: true }))
    .filter((d) => d.isDirectory() && !d.name.startsWith("."))
    .map((d) => d.name)
    .sort();
  const wanted = only
    ?.split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const cases: EvalCase[] = [];
  for (const id of folders) {
    if (wanted?.length && !wanted.some((w) => id.includes(w))) continue;
    const caseDir = path.join(dir, id);
    const labelFile = path.join(caseDir, "label.json");
    if (!existsSync(labelFile)) throw new Error(`Case ${id}: missing label.json`);
    let json: unknown;
    try {
      json = JSON.parse(await readFile(labelFile, "utf8"));
    } catch (err) {
      throw new Error(`Case ${id}: label.json is not valid JSON (${(err as Error).message})`);
    }
    const parsed = GoldLabel.safeParse(json);
    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
      throw new Error(`Case ${id}: label.json does not match GoldLabel. ${issues}`);
    }
    const photoFiles = (await readdir(caseDir))
      .filter((f) => PHOTO_FILE.test(f))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
      .map((f) => path.join(caseDir, f));
    if (photoFiles.length === 0) throw new Error(`Case ${id}: no photos (expected 1.jpg, 2.jpg, ...)`);
    cases.push({ id, dir: caseDir, photoFiles, label: parsed.data });
  }
  return cases;
}

/** Reads and checks a case's photos with the same rules as uploads. */
export async function readCasePhotos(c: EvalCase): Promise<Photo[]> {
  return Promise.all(c.photoFiles.map(async (f) => toPhoto(`${c.id}/${path.basename(f)}`, new Uint8Array(await readFile(f)))));
}
