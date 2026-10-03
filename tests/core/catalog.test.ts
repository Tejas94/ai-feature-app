import { describe, expect, it } from "vitest";
import { costByModel, filterEntries, tagCounts } from "@/lib/catalog";
import { makeEntry } from "../fixtures";

const mug = makeEntry("mug", {}, { createdAt: "2026-09-01T00:00:00Z" });
const drill = makeEntry(
  "drill",
  {
    title: "Drevtek CD-18 Cordless Drill",
    category: "tools_diy",
    attributes: [{ name: "brand", value: "Drevtek" }],
    description: "18 V drill driver with one battery.",
    tags: ["cordless drill", "power tool", "18v"],
    visibleText: { lines: [], identifiers: [{ kind: "ean", value: "2209310180046" }] },
  },
  { createdAt: "2026-09-02T00:00:00Z", model: "claude-haiku-4-5", costUsd: 0.01 },
);
const lamp = makeEntry(
  "lamp",
  {
    title: "Lumetta Desk Lamp",
    category: "electronics",
    attributes: [{ name: "brand", value: "Lumetta" }],
    description: "Dimmable LED desk lamp.",
    tags: ["desk lamp", "led", "insulated"],
    visibleText: { lines: [], identifiers: [] },
  },
  { createdAt: "2026-09-03T00:00:00Z", model: "claude-haiku-4-5", costUsd: 0.03 },
);
const all = [mug, drill, lamp];

describe("filterEntries", () => {
  it("returns everything newest first without filters", () => {
    expect(filterEntries(all, {}).map((e) => e.id)).toEqual(["lamp", "drill", "mug"]);
  });

  it("filters by category and tag", () => {
    expect(filterEntries(all, { category: "tools_diy" }).map((e) => e.id)).toEqual(["drill"]);
    expect(filterEntries(all, { tag: "Insulated" }).map((e) => e.id)).toEqual(["lamp", "mug"]);
  });

  it("searches title, brand and barcode, every word must match", () => {
    expect(filterEntries(all, { q: "drevtek" }).map((e) => e.id)).toEqual(["drill"]);
    expect(filterEntries(all, { q: "2209310180046" }).map((e) => e.id)).toEqual(["drill"]);
    expect(filterEntries(all, { q: "kelvaro mug" }).map((e) => e.id)).toEqual(["mug"]);
    expect(filterEntries(all, { q: "kelvaro drill" })).toEqual([]);
  });
});

describe("tagCounts", () => {
  it("counts tags across entries, most used first", () => {
    expect(tagCounts(all)[0]).toEqual({ tag: "insulated", count: 2 });
  });
});

describe("costByModel", () => {
  it("totals and averages cost per model, skipping manual entries", () => {
    const [haiku, ...rest] = costByModel(all);
    expect(rest).toEqual([]);
    expect(haiku).toMatchObject({ model: "claude-haiku-4-5", entries: 2, pricedEntries: 2 });
    expect(haiku.totalUsd).toBeCloseTo(0.04);
    expect(haiku.averageUsd).toBeCloseTo(0.02);
  });
});
