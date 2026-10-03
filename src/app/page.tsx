"use client";

import { useState } from "react";
import type { Job } from "@/lib/jobs";
import type { JobFilters } from "@/lib/filters";

interface SearchResponse {
  filters: JobFilters;
  jobs: Job[];
  attempts?: number;
  costUsd?: number | null;
  ms?: number;
  error?: string;
}

const EXAMPLES = [
  "senior React roles in London paying over 90k",
  "remote AI engineer jobs posted this week",
  "React Native in Manchester or remote",
];

export default function Home() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SearchResponse | null>(null);

  async function search(q: string) {
    setQuery(q);
    setLoading(true);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      setResult((await res.json()) as SearchResponse);
    } catch (err) {
      setResult({ filters: {}, jobs: [], error: String(err) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <h1>AI Job Search</h1>
      <p className="muted">Describe the job you want. The model turns it into filters; plain code does the filtering.</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void search(query);
        }}
      >
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={EXAMPLES[0]} />
        <button disabled={loading}>{loading ? "Thinking..." : "Search"}</button>
      </form>
      <div className="chips">
        {EXAMPLES.map((ex) => (
          <button key={ex} className="secondary" onClick={() => void search(ex)} disabled={loading}>
            {ex}
          </button>
        ))}
      </div>

      {result?.error && <p className="error">{result.error}</p>}
      {result && !result.error && (
        <>
          <div className="chips">
            {Object.entries(result.filters).map(([k, v]) => (
              <span key={k} className="chip">
                {k}: {JSON.stringify(v)}
              </span>
            ))}
          </div>
          <p className="muted">
            {result.jobs.length} jobs
            {result.ms != null && ` · ${result.ms} ms`}
            {result.attempts != null && ` · ${result.attempts} attempt(s)`}
            {result.costUsd != null && ` · $${result.costUsd.toFixed(5)}`}
          </p>
          {result.jobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </>
      )}
    </main>
  );
}

function JobCard({ job }: { job: Job }) {
  const [fit, setFit] = useState("");
  const [streaming, setStreaming] = useState(false);

  async function explainFit() {
    setFit("");
    setStreaming(true);
    try {
      const res = await fetch("/api/fit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: job.id }),
      });
      if (!res.body) throw new Error(`HTTP ${res.status}`);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        setFit((prev) => prev + decoder.decode(value, { stream: true }));
      }
    } catch (err) {
      setFit((prev) => `${prev}\n[error] ${String(err)}`);
    } finally {
      setStreaming(false);
    }
  }

  return (
    <div className="job">
      <h3>{job.title}</h3>
      <div className="muted">
        {job.company} · {job.location}
        {job.remote ? " · remote OK" : ""} · {job.seniority} · {job.currency} {job.salaryMin.toLocaleString()}-
        {job.salaryMax.toLocaleString()} · {job.postedDaysAgo}d ago
      </div>
      <p>{job.description}</p>
      <button className="secondary" onClick={() => void explainFit()} disabled={streaming}>
        {streaming ? "Writing..." : "Explain my fit"}
      </button>
      {fit && <div className="fit">{fit}</div>}
    </div>
  );
}
