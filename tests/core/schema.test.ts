import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { CatalogDraft, CatalogEntry, getAttribute } from "@/lib/schema";
import { makeDraft } from "../fixtures";

describe("CatalogDraft", () => {
  it("accepts a valid draft", () => {
    expect(CatalogDraft.safeParse(makeDraft()).success).toBe(true);
  });

  it.each([
    ["an unknown category", { category: "gadgets" }],
    ["an unknown condition grade", { condition: { grade: "mint", notes: "" } }],
    ["fewer than 3 tags", { tags: ["mug", "steel"] }],
    ["more than 10 tags", { tags: Array.from({ length: 11 }, (_, i) => `tag ${i}`) }],
    ["an uppercase tag", { tags: ["Travel Mug", "insulated", "steel"] }],
    ["confidence above 1", { confidence: { title: 1.2, category: 1, attributes: 1, condition: 1, description: 1 } }],
    ["an unknown identifier kind", { visibleText: { lines: [], identifiers: [{ kind: "barcode", value: "123" }] } }],
    ["an empty title", { title: "" }],
  ])("rejects %s", (_name, patch) => {
    expect(CatalogDraft.safeParse({ ...makeDraft(), ...patch }).success).toBe(false);
  });
});

describe("structured outputs compatibility", () => {
  // The API supports a subset of JSON Schema. zodOutputFormat() moves the rest into
  // descriptions and Zod checks it client-side. This guards against schema changes
  // that the helper cannot convert.
  const schema = zodOutputFormat(CatalogDraft).schema as Record<string, unknown>;

  function walk(node: unknown, visit: (n: Record<string, unknown>) => void) {
    if (Array.isArray(node)) node.forEach((n) => walk(n, visit));
    else if (node && typeof node === "object") {
      visit(node as Record<string, unknown>);
      Object.values(node).forEach((n) => walk(n, visit));
    }
  }

  it("closes every object with additionalProperties: false", () => {
    const objects: Record<string, unknown>[] = [];
    walk(schema, (n) => n.type === "object" && objects.push(n));
    expect(objects.length).toBeGreaterThan(3);
    for (const o of objects) expect(o.additionalProperties).toBe(false);
  });

  it("sends no unsupported constraints to the API", () => {
    const bad = ["minimum", "maximum", "exclusiveMinimum", "exclusiveMaximum", "minLength", "maxLength", "pattern", "maxItems"];
    walk(schema, (n) => {
      for (const key of bad) {
        if (typeof n.type === "string") expect(n, key).not.toHaveProperty(key);
      }
    });
  });

  it("still enforces the moved rules when parsing", () => {
    const format = zodOutputFormat(CatalogDraft);
    expect(() => format.parse(JSON.stringify(makeDraft({ tags: ["a", "b"] })))).toThrow(/tags/);
    expect(format.parse(JSON.stringify(makeDraft()))).toEqual(makeDraft());
  });
});

describe("seed catalogue", () => {
  const seed = JSON.parse(readFileSync("data/catalog.seed.json", "utf8"));

  it("matches the CatalogEntry schema", () => {
    const parsed = z.array(CatalogEntry).safeParse(seed);
    expect(parsed.error?.message).toBeUndefined();
  });

  it("has unique ids", () => {
    const ids = (seed as { id: string }[]).map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("getAttribute", () => {
  it("finds an attribute by name, ignoring case, and trims the value", () => {
    const d = makeDraft({ attributes: [{ name: "Brand", value: " Kelvaro " }] });
    expect(getAttribute(d, "brand")).toBe("Kelvaro");
    expect(getAttribute(d, "model")).toBeUndefined();
  });
});
