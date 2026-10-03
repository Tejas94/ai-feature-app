import { getAttribute, type CatalogEntry } from "./schema";

export interface CatalogFilter {
  /** Free text, matched against title, brand, model, description, tags and identifiers. */
  q?: string;
  category?: string;
  tag?: string;
}

const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "");

function haystack(e: CatalogEntry): string {
  return norm(
    [
      e.title,
      getAttribute(e, "brand") ?? "",
      getAttribute(e, "model") ?? "",
      e.description,
      e.tags.join(" "),
      e.visibleText.identifiers.map((i) => i.value).join(" "),
    ].join(" "),
  );
}

/** Plain text search and filters, newest first. Every word of q must appear somewhere. */
export function filterEntries(entries: CatalogEntry[], filter: CatalogFilter): CatalogEntry[] {
  const words = norm(filter.q ?? "")
    .split(/\s+/)
    .filter(Boolean);
  const tag = filter.tag ? norm(filter.tag.trim()) : "";
  return entries
    .filter((e) => !filter.category || e.category === filter.category)
    .filter((e) => !tag || e.tags.some((t) => norm(t) === tag))
    .filter((e) => {
      if (words.length === 0) return true;
      const text = haystack(e);
      return words.every((w) => text.includes(w));
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Every tag in use, most used first, for the filter dropdown. */
export function tagCounts(entries: CatalogEntry[]): { tag: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const e of entries) for (const t of new Set(e.tags)) counts.set(t, (counts.get(t) ?? 0) + 1);
  return [...counts].map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

export interface ModelCost {
  model: string;
  entries: number;
  totalUsd: number;
  /** Entries without a cost (P1-02 was open when they were saved) are left out of the average. */
  pricedEntries: number;
  averageUsd: number | null;
}

/** Total and average cost per saved entry, by the model that drafted it. Manual entries are skipped. */
export function costByModel(entries: CatalogEntry[]): ModelCost[] {
  const byModel = new Map<string, CatalogEntry[]>();
  for (const e of entries) {
    if (!e.model) continue;
    byModel.set(e.model, [...(byModel.get(e.model) ?? []), e]);
  }
  return [...byModel].map(([model, list]) => {
    const priced = list.filter((e) => e.costUsd != null);
    const totalUsd = priced.reduce((sum, e) => sum + (e.costUsd ?? 0), 0);
    return {
      model,
      entries: list.length,
      totalUsd,
      pricedEntries: priced.length,
      averageUsd: priced.length ? totalUsd / priced.length : null,
    };
  });
}
