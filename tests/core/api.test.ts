import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { todo } from "@/lib/todo";
import type { CatalogEntry, SaveEntryRequest } from "@/lib/schema";
import type { DraftResponse, FirstLookEvent } from "@/lib/api-types";
import { makeDraft } from "../fixtures";

// The model modules are mocked: these tests cover the routes, not your TODOs, and
// they must never call the real API.
const mocks = vi.hoisted(() => ({
  streamFirstLook: vi.fn(),
  extractDraft: vi.fn(),
  findDuplicates: vi.fn(),
  reviewFlags: vi.fn(),
  costUsd: vi.fn(),
}));
vi.mock("@/lib/llm", () => ({ MODEL: "claude-opus-5-5", streamFirstLook: mocks.streamFirstLook }));
vi.mock("@/lib/extract", () => ({ extractDraft: mocks.extractDraft }));
vi.mock("@/lib/duplicates", () => ({ findDuplicates: mocks.findDuplicates }));
vi.mock("@/lib/confidence", () => ({ reviewFlags: mocks.reviewFlags }));
vi.mock("@/lib/cost", () => ({ costUsd: mocks.costUsd }));

const { POST: firstLook } = await import("@/app/api/first-look/route");
const { POST: draftRoute } = await import("@/app/api/draft/route");
const { GET: listEntries, POST: saveEntry } = await import("@/app/api/entries/route");
const { GET: getEntry } = await import("@/app/api/entries/[id]/route");
const { GET: getPhoto } = await import("@/app/api/photos/[entryId]/[n]/route");

const JPEG = new Uint8Array(readFileSync("evals/cases/kelvaro-travel-mug/1.jpg"));
const usage = { input_tokens: 3000, output_tokens: 400 };

function photoForm(n = 1, bytes: Uint8Array<ArrayBuffer> = JPEG): FormData {
  const form = new FormData();
  for (let i = 0; i < n; i++) form.append("photos", new Blob([bytes], { type: "image/jpeg" }), `${i + 1}.jpg`);
  return form;
}
const post = (url: string, body: FormData) => new Request(`http://localhost${url}`, { method: "POST", body });
const params = <T>(p: T) => ({ params: Promise.resolve(p) });

let dataDir: string;
beforeAll(() => {
  dataDir = mkdtempSync(path.join(tmpdir(), "api-data-"));
  process.env.CATALOG_DATA_DIR = dataDir;
});
afterAll(() => {
  delete process.env.CATALOG_DATA_DIR;
  rmSync(dataDir, { recursive: true, force: true });
});
beforeEach(() => {
  vi.resetAllMocks();
  mocks.findDuplicates.mockReturnValue([]);
  mocks.reviewFlags.mockReturnValue({ overall: 0.9, fields: [] });
  mocks.costUsd.mockReturnValue(0.02);
});

describe("POST /api/draft", () => {
  it("rejects a request without photos or with a non-image", async () => {
    expect((await draftRoute(post("/api/draft", new FormData()))).status).toBe(400);
    const res = await draftRoute(post("/api/draft", photoForm(1, new TextEncoder().encode("hello"))));
    expect(res.status).toBe(415);
    expect((await res.json()).error).toMatch(/not a JPEG/);
  });

  it("rejects a JSON body", async () => {
    const res = await draftRoute(new Request("http://localhost/api/draft", { method: "POST", body: "{}" }));
    expect(res.status).toBe(415);
  });

  it("answers 501 with the TODO id while extraction is not implemented", async () => {
    mocks.extractDraft.mockImplementation(() => todo("P1-04", "Implement extractDraft() in src/lib/extract.ts"));
    const res = await draftRoute(post("/api/draft", photoForm()));
    expect(res.status).toBe(501);
    expect(await res.json()).toEqual({
      error: "Not implemented yet: P1-04. Implement extractDraft() in src/lib/extract.ts",
      todo: "P1-04",
    });
  });

  it("returns the draft with duplicates, review flags, cost and timing", async () => {
    mocks.extractDraft.mockResolvedValue({ draft: makeDraft(), usage, attempts: 1 });
    mocks.findDuplicates.mockReturnValue([{ entryId: "seed-01", score: 1, reasons: ["same brand and model"] }]);
    const res = await draftRoute(post("/api/draft", photoForm(2)));
    expect(res.status).toBe(200);
    const body = (await res.json()) as DraftResponse;
    expect(mocks.extractDraft.mock.calls[0][0]).toHaveLength(2);
    expect(mocks.extractDraft.mock.calls[0][0][0]).toMatchObject({ type: "image", source: { media_type: "image/jpeg" } });
    expect(body).toMatchObject({ draft: makeDraft(), model: "claude-opus-5-5", usage, attempts: 1, costUsd: 0.02, pending: [] });
    expect(body.duplicates).toEqual([
      expect.objectContaining({ entryId: "seed-01", title: "Kelvaro TM-350 Insulated Travel Mug, 350 ml, Slate Grey", thumbnail: null }),
    ]);
    expect(body.review).toEqual({ overall: 0.9, fields: [] });
    expect(body.ms).toBeGreaterThanOrEqual(0);
  });

  it("still returns the draft when later steps are open TODOs", async () => {
    mocks.extractDraft.mockResolvedValue({ draft: makeDraft(), usage, attempts: 2 });
    mocks.findDuplicates.mockImplementation(() => todo("P1-05", "Implement findDuplicates() in src/lib/duplicates.ts"));
    mocks.reviewFlags.mockImplementation(() => todo("P1-06", "Implement reviewFlags() in src/lib/confidence.ts"));
    mocks.costUsd.mockImplementation(() => todo("P1-02", "Implement costUsd() in src/lib/cost.ts"));
    const body = (await (await draftRoute(post("/api/draft", photoForm()))).json()) as DraftResponse;
    expect(body).toMatchObject({ duplicates: null, review: null, costUsd: null });
    expect(body.pending.map((p) => p.todo)).toEqual(["P1-05", "P1-06", "P1-02"]);
  });

  it("maps API errors to a status and a readable message", async () => {
    mocks.extractDraft.mockRejectedValue(new Anthropic.RateLimitError(429, {}, "rate limited", new Headers()));
    const res = await draftRoute(post("/api/draft", photoForm()));
    expect(res.status).toBe(429);
    expect((await res.json()).error).toMatch(/Rate limited/);
  });
});

async function readEvents(res: Response): Promise<FirstLookEvent[]> {
  return (await res.text())
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l) as FirstLookEvent);
}

describe("POST /api/first-look", () => {
  it("answers 501 JSON when the stream fails before the first chunk", async () => {
    mocks.streamFirstLook.mockImplementation(async function* () {
      todo("P1-01", "Implement streamFirstLook() in src/lib/llm.ts");
    });
    const res = await firstLook(post("/api/first-look", photoForm()));
    expect(res.status).toBe(501);
    expect((await res.json()).todo).toBe("P1-01");
  });

  it("streams text lines, then usage, cost and timings", async () => {
    mocks.streamFirstLook.mockImplementation(async function* () {
      yield "A green travel mug";
      yield " in its box.";
      return { usage, stopReason: "end_turn" };
    });
    const res = await firstLook(post("/api/first-look", photoForm()));
    expect(res.headers.get("content-type")).toMatch(/ndjson/);
    const events = await readEvents(res);
    expect(events.slice(0, 2)).toEqual([
      { type: "text", text: "A green travel mug" },
      { type: "text", text: " in its box." },
    ]);
    const done = events[2];
    expect(done).toMatchObject({ type: "done", usage, stopReason: "end_turn", costUsd: 0.02, estimatedImageTokens: 1440 });
    expect(mocks.costUsd).toHaveBeenCalledWith("claude-opus-5-5", usage);
  });

  it("reports an error that happens mid-stream as the last line", async () => {
    mocks.streamFirstLook.mockImplementation(async function* () {
      yield "A green";
      throw new Error("connection reset");
    });
    const events = await readEvents(await firstLook(post("/api/first-look", photoForm())));
    expect(events.at(-1)).toEqual({ type: "error", error: "connection reset" });
  });

  it("lists cost as pending while P1-02 is open", async () => {
    mocks.streamFirstLook.mockImplementation(async function* () {
      yield "Hi";
      return { usage, stopReason: "end_turn" };
    });
    mocks.costUsd.mockImplementation(() => todo("P1-02", "Implement costUsd() in src/lib/cost.ts"));
    const done = (await readEvents(await firstLook(post("/api/first-look", photoForm())))).at(-1);
    expect(done).toMatchObject({ type: "done", costUsd: null, pending: [expect.objectContaining({ todo: "P1-02" })] });
  });
});

describe("entries and photos", () => {
  function saveForm(request: SaveEntryRequest, photos = 1): FormData {
    const form = photoForm(photos);
    form.append("entry", JSON.stringify(request));
    return form;
  }
  const valid: SaveEntryRequest = {
    final: makeDraft({ title: "Kelvaro TM-350 Travel Mug, Sage Green" }),
    draft: makeDraft(),
    model: "claude-opus-5-5",
    usage,
    costUsd: 0.02,
  };

  it("saves an entry with photos, lists it, and serves its photo", async () => {
    const res = await saveEntry(post("/api/entries", saveForm(valid, 2)));
    expect(res.status).toBe(201);
    const { entry } = (await res.json()) as { entry: CatalogEntry };
    expect(entry.corrected).toEqual(["title"]);
    expect(entry.photos).toHaveLength(2);

    const list = (await (await listEntries(new Request("http://localhost/api/entries"))).json()) as { entries: CatalogEntry[] };
    expect(list.entries[0].id).toBe(entry.id);

    const one = await getEntry(new Request("http://localhost"), params({ id: entry.id }));
    expect(((await one.json()) as { entry: CatalogEntry }).entry.title).toBe(valid.final.title);

    const photo = await getPhoto(new Request("http://localhost"), params({ entryId: entry.id, n: "2" }));
    expect(photo.status).toBe(200);
    expect(photo.headers.get("content-type")).toBe("image/jpeg");
    expect(new Uint8Array(await photo.arrayBuffer())).toEqual(JPEG);
  });

  it("filters the list with query parameters", async () => {
    const res = await listEntries(new Request("http://localhost/api/entries?category=audio"));
    const { entries } = (await res.json()) as { entries: CatalogEntry[] };
    expect(entries.length).toBeGreaterThan(0);
    expect(entries.every((e) => e.category === "audio")).toBe(true);
  });

  it("rejects an invalid entry with the reason", async () => {
    const bad = { ...valid, final: { ...valid.final, tags: ["only one"] } };
    const res = await saveEntry(post("/api/entries", saveForm(bad)));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/tags/);
    const form = photoForm();
    form.append("entry", "{not json");
    expect((await saveEntry(post("/api/entries", form))).status).toBe(400);
  });

  it("answers 404 for an unknown entry and 400 for a malformed id", async () => {
    expect((await getEntry(new Request("http://localhost"), params({ id: "e_missing" }))).status).toBe(404);
    expect((await getEntry(new Request("http://localhost"), params({ id: "../catalog" }))).status).toBe(400);
  });

  it("guards the photo route against path tricks", async () => {
    expect((await getPhoto(new Request("http://localhost"), params({ entryId: "..", n: "1" }))).status).toBe(400);
    expect((await getPhoto(new Request("http://localhost"), params({ entryId: "seed-01", n: "1/../../x" }))).status).toBe(400);
    expect((await getPhoto(new Request("http://localhost"), params({ entryId: "seed-01", n: "1" }))).status).toBe(404);
  });
});
