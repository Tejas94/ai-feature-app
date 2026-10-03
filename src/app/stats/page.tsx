import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { costByModel } from "@/lib/catalog";
import { correctionRates } from "@/lib/corrections";
import { getStore } from "@/lib/store";
import { formatPercent, formatUsd } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function StatsPage() {
  const store = getStore();
  const entries = await store.list();
  const costs = costByModel(entries);
  const rates = correctionRates(await store.corrections());
  const reportFile = path.join(process.cwd(), "evals", "report.md");
  const report = existsSync(reportFile) ? await readFile(reportFile, "utf8") : null;

  return (
    <main>
      <h1>Stats</h1>
      <p className="muted">
        {entries.length} entries, {entries.filter((e) => e.model).length} of them drafted by a model.
      </p>

      <h2>Cost per entry</h2>
      {costs.length === 0 ? (
        <p className="muted">No entries saved from a model draft yet.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Model</th>
                <th>Entries</th>
                <th>Total</th>
                <th>Average per entry</th>
              </tr>
            </thead>
            <tbody>
              {costs.map((c) => (
                <tr key={c.model}>
                  <td>{c.model}</td>
                  <td>{c.entries}</td>
                  <td>{formatUsd(c.totalUsd)}</td>
                  <td>
                    {formatUsd(c.averageUsd)}
                    {c.pricedEntries < c.entries && <span className="muted small"> ({c.entries - c.pricedEntries} without a cost)</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2>Correction rate per field</h2>
      <p className="muted">
        The share of saved model drafts where a person changed the field before saving. This is the live accuracy
        signal: it comes from real use, not from the eval set, so watch it after every prompt or model change.
      </p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Field</th>
              <th>Corrected</th>
              <th>Rate</th>
            </tr>
          </thead>
          <tbody>
            {rates.map((r) => (
              <tr key={r.field}>
                <td>{r.field}</td>
                <td>
                  {r.changed} of {r.total}
                </td>
                <td>{formatPercent(r.rate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Latest offline eval</h2>
      {report ? (
        <pre className="report">{report}</pre>
      ) : (
        <p className="muted">
          No eval report yet. Run <code>npm run eval</code> to write evals/report.md.
        </p>
      )}
    </main>
  );
}
