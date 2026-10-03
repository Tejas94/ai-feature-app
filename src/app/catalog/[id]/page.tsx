import Link from "next/link";
import { notFound } from "next/navigation";
import { getStore } from "@/lib/store";
import { categoryLabel } from "@/lib/taxonomy";
import { diffDraft } from "@/lib/corrections";
import { photoUrl } from "@/lib/api-types";
import { formatDate, formatFieldValue, formatUsd, GRADE_LABELS } from "@/lib/format";
import { Placeholder } from "@/components/placeholder";

export const dynamic = "force-dynamic";

export default async function EntryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const entry = await getStore().get(id);
  if (!entry) notFound();
  const changes = entry.draft ? diffDraft(entry.draft, entry) : [];

  return (
    <main>
      <p className="small">
        <Link href="/catalog">Back to the catalogue</Link>
      </p>
      <h1>{entry.title}</h1>
      <p className="muted">
        {categoryLabel(entry.category)} · {GRADE_LABELS[entry.condition.grade]} · added {formatDate(entry.createdAt)}
      </p>

      {entry.photos.length ? (
        <div className="gallery">
          {entry.photos.map((_, i) => (
            <a key={i} href={photoUrl(entry.id, i + 1)}>
              <img src={photoUrl(entry.id, i + 1)} alt={`Photo ${i + 1}`} />
            </a>
          ))}
        </div>
      ) : (
        <div style={{ maxWidth: 240 }}>
          <Placeholder />
        </div>
      )}

      <div className="card">
        <p>{entry.description}</p>
        <dl className="facts">
          {entry.attributes.map((a, i) => (
            <div key={i} style={{ display: "contents" }}>
              <dt>{a.name}</dt>
              <dd>{a.value}</dd>
            </div>
          ))}
          <dt>condition</dt>
          <dd>
            {GRADE_LABELS[entry.condition.grade]}
            {entry.condition.notes ? `: ${entry.condition.notes}` : ""}
          </dd>
          {entry.visibleText.identifiers.map((x, i) => (
            <div key={`id-${i}`} style={{ display: "contents" }}>
              <dt>{x.kind.toUpperCase()}</dt>
              <dd>{x.value}</dd>
            </div>
          ))}
        </dl>
        <div className="chips">
          {entry.tags.map((t) => (
            <Link key={t} className="chip" href={`/catalog?tag=${encodeURIComponent(t)}`}>
              {t}
            </Link>
          ))}
        </div>
      </div>

      <h2>Where it came from</h2>
      {entry.model ? (
        <p className="muted">
          Drafted by {entry.model}
          {entry.usage &&
            ` · ${entry.usage.input_tokens.toLocaleString()} in / ${entry.usage.output_tokens.toLocaleString()} out tokens`}{" "}
          · {formatUsd(entry.costUsd)}
        </p>
      ) : (
        <p className="muted">Entered by hand (seed data).</p>
      )}

      {entry.draft &&
        (changes.length === 0 ? (
          <p>Saved exactly as the model drafted it.</p>
        ) : (
          <>
            <p>The model draft was corrected in {changes.length} field{changes.length === 1 ? "" : "s"} before saving.</p>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Field</th>
                    <th>Model draft</th>
                    <th>Saved</th>
                  </tr>
                </thead>
                <tbody>
                  {changes.map((c) => (
                    <tr key={c.field}>
                      <td>{c.field}</td>
                      <td>{formatFieldValue(c.before)}</td>
                      <td>{formatFieldValue(c.after)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ))}

      {entry.visibleText.lines.length > 0 && (
        <details>
          <summary className="muted">Text read from the photos</summary>
          <ul className="small">
            {entry.visibleText.lines.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        </details>
      )}
    </main>
  );
}
