import Link from "next/link";
import { filterEntries, tagCounts } from "@/lib/catalog";
import { getStore } from "@/lib/store";
import { CATEGORIES, CATEGORY_INFO, categoryLabel } from "@/lib/taxonomy";
import { getAttribute } from "@/lib/schema";
import { photoUrl } from "@/lib/api-types";
import { Placeholder } from "@/components/placeholder";

export const dynamic = "force-dynamic";

type Search = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;

export default async function CatalogPage({ searchParams }: { searchParams: Search }) {
  const params = await searchParams;
  const filter = { q: one(params.q), category: one(params.category), tag: one(params.tag) };
  const all = await getStore().list();
  const entries = filterEntries(all, filter);
  const tags = tagCounts(all);

  return (
    <main>
      <h1>Catalogue</h1>
      <p className="muted">
        {entries.length} of {all.length} entries
      </p>

      <form className="filters" method="get">
        <input type="search" name="q" placeholder="Search title, brand, model, barcode" defaultValue={filter.q} />
        <select name="category" defaultValue={filter.category ?? ""} aria-label="Category">
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_INFO[c].label}
            </option>
          ))}
        </select>
        <select name="tag" defaultValue={filter.tag ?? ""} aria-label="Tag">
          <option value="">All tags</option>
          {tags.map((t) => (
            <option key={t.tag} value={t.tag}>
              {t.tag} ({t.count})
            </option>
          ))}
        </select>
        <button type="submit">Filter</button>
      </form>

      {entries.length === 0 ? (
        <p>
          Nothing matches. <Link href="/catalog">Clear the filters</Link> or <Link href="/">add an entry</Link>.
        </p>
      ) : (
        <div className="grid">
          {entries.map((e) => (
            <Link key={e.id} href={`/catalog/${e.id}`} className="tile">
              {e.photos.length ? <img src={photoUrl(e.id, 1)} alt="" loading="lazy" /> : <Placeholder />}
              <div className="body">
                <h3>{e.title}</h3>
                <div className="muted small">
                  {categoryLabel(e.category)}
                  {getAttribute(e, "brand") ? ` · ${getAttribute(e, "brand")}` : ""}
                </div>
                <div className="chips">
                  {e.tags.slice(0, 4).map((t) => (
                    <span key={t} className="chip">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
