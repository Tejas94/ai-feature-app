"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { DraftResponse, ErrorBody, FirstLookEvent, SaveEntryResponse } from "@/lib/api-types";
import { CatalogDraft } from "@/lib/schema";
import { downscalePhoto } from "@/lib/client/downscale";
import { estimateImageTokens, MAX_PHOTOS } from "@/lib/photo-limits";
import { formatBytes, formatMs, formatPercent, formatUsd } from "@/lib/format";
import { ErrorNotice, PendingNotices } from "@/components/notices";
import { Placeholder } from "@/components/placeholder";
import { ReviewForm } from "@/components/review-form";

interface LocalPhoto {
  key: string;
  blob: Blob;
  url: string;
  width: number;
  height: number;
}

type FirstLookDone = Extract<FirstLookEvent, { type: "done" }>;

/** Reads a JSON error body, or makes one from the status line. */
async function readError(res: Response): Promise<ErrorBody> {
  try {
    const body = (await res.json()) as Partial<ErrorBody>;
    if (body.error) return { error: body.error, todo: body.todo };
  } catch {
    // Not JSON; fall through.
  }
  return { error: `Request failed: ${res.status} ${res.statusText}` };
}

function photoForm(photos: LocalPhoto[]): FormData {
  const form = new FormData();
  photos.forEach((p, i) => form.append("photos", p.blob, `photo-${i + 1}.jpg`));
  return form;
}

export function NewEntry() {
  const router = useRouter();
  const [photos, setPhotos] = useState<LocalPhoto[]>([]);
  const [preparing, setPreparing] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const [lookText, setLookText] = useState("");
  const [lookDone, setLookDone] = useState<FirstLookDone | null>(null);
  const [lookError, setLookError] = useState<ErrorBody | null>(null);
  const [looking, setLooking] = useState(false);
  const lookAbort = useRef<AbortController | null>(null);

  const [drafting, setDrafting] = useState(false);
  const [draftError, setDraftError] = useState<ErrorBody | null>(null);
  const [result, setResult] = useState<DraftResponse | null>(null);
  const [form, setForm] = useState<CatalogDraft | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<ErrorBody | null>(null);

  // Free the preview URLs when the page goes away.
  const urls = useRef<string[]>([]);
  useEffect(() => () => urls.current.forEach((u) => URL.revokeObjectURL(u)), []);

  async function addFiles(files: FileList | null) {
    if (!files?.length) return;
    setPhotoError(null);
    const room = MAX_PHOTOS - photos.length;
    const picked = Array.from(files).slice(0, Math.max(0, room));
    if (files.length > room) setPhotoError(`Up to ${MAX_PHOTOS} photos; the extra ones were skipped.`);
    setPreparing(true);
    try {
      const prepared: LocalPhoto[] = [];
      for (const file of picked) {
        const { blob, width, height } = await downscalePhoto(file);
        const url = URL.createObjectURL(blob);
        urls.current.push(url);
        prepared.push({ key: `${Date.now()}-${Math.random()}`, blob, url, width, height });
      }
      setPhotos((prev) => [...prev, ...prepared].slice(0, MAX_PHOTOS));
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : String(err));
    } finally {
      setPreparing(false);
    }
  }

  function removePhoto(key: string) {
    setPhotos((prev) => prev.filter((p) => p.key !== key));
  }

  async function firstLook() {
    lookAbort.current?.abort();
    const abort = new AbortController();
    lookAbort.current = abort;
    setLookText("");
    setLookDone(null);
    setLookError(null);
    setLooking(true);
    try {
      const res = await fetch("/api/first-look", { method: "POST", body: photoForm(photos), signal: abort.signal });
      if (!res.ok || !res.body) {
        setLookError(await readError(res));
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as FirstLookEvent;
          if (event.type === "text") setLookText((prev) => prev + event.text);
          else if (event.type === "done") setLookDone(event);
          else setLookError({ error: event.error, todo: event.todo });
        }
      }
    } catch (err) {
      if (!abort.signal.aborted) setLookError({ error: err instanceof Error ? err.message : String(err) });
    } finally {
      setLooking(false);
    }
  }

  async function createDraft() {
    setDrafting(true);
    setDraftError(null);
    setResult(null);
    setForm(null);
    setSaveError(null);
    try {
      const res = await fetch("/api/draft", { method: "POST", body: photoForm(photos) });
      if (!res.ok) {
        setDraftError(await readError(res));
        return;
      }
      const data = (await res.json()) as DraftResponse;
      setResult(data);
      setForm(structuredClone(data.draft));
    } catch (err) {
      setDraftError({ error: err instanceof Error ? err.message : String(err) });
    } finally {
      setDrafting(false);
    }
  }

  async function save() {
    if (!result || !form) return;
    setSaveError(null);
    const parsed = CatalogDraft.safeParse(form);
    if (!parsed.success) {
      const issues = parsed.error.issues.slice(0, 4).map((i) => `${i.path.join(".")}: ${i.message}`);
      setSaveError({ error: `Fix these before saving:\n${issues.join("\n")}` });
      return;
    }
    setSaving(true);
    try {
      const body = photoForm(photos);
      body.append(
        "entry",
        JSON.stringify({
          final: parsed.data,
          draft: result.draft,
          model: result.model,
          usage: result.usage,
          costUsd: result.costUsd,
        }),
      );
      const res = await fetch("/api/entries", { method: "POST", body });
      if (!res.ok) {
        setSaveError(await readError(res));
        return;
      }
      const { entry } = (await res.json()) as SaveEntryResponse;
      router.push(`/catalog/${entry.id}`);
    } catch (err) {
      setSaveError({ error: err instanceof Error ? err.message : String(err) });
    } finally {
      setSaving(false);
    }
  }

  const busy = preparing || looking || drafting || saving;
  const tokens = photos.reduce((sum, p) => sum + estimateImageTokens(p.width, p.height), 0);
  const duplicates = result?.duplicates ?? [];

  return (
    <main>
      <h1>New entry</h1>
      <p className="muted">
        Photograph one product from 1 to {MAX_PHOTOS} angles: the front, the back with the barcode, and any label or wear.
      </p>

      <div className="actions">
        <label className="button">
          Take photo
          <input
            className="file-input"
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            disabled={busy || photos.length >= MAX_PHOTOS}
            onChange={(e) => {
              void addFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
        <label className="button secondary">
          Choose photos
          <input
            className="file-input"
            type="file"
            accept="image/*"
            multiple
            disabled={busy || photos.length >= MAX_PHOTOS}
            onChange={(e) => {
              void addFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
      </div>
      {preparing && <p className="muted">Preparing photos...</p>}
      {photoError && <div className="notice warn">{photoError}</div>}

      {photos.length > 0 && (
        <>
          <div className="thumbs">
            {photos.map((p, i) => (
              <div className="thumb" key={p.key}>
                <img src={p.url} alt={`Photo ${i + 1}`} />
                <div className="meta">
                  {p.width}×{p.height} · {formatBytes(p.blob.size)}
                </div>
                <button type="button" className="remove" aria-label={`Remove photo ${i + 1}`} onClick={() => removePhoto(p.key)}>
                  ×
                </button>
              </div>
            ))}
          </div>
          <p className="muted small">
            About {tokens.toLocaleString()} image tokens (width × height / 750 per photo).
          </p>
          <div className="actions">
            <button type="button" className="secondary" onClick={() => void firstLook()} disabled={busy || photos.length === 0}>
              {looking ? "Looking..." : "First look"}
            </button>
            {looking && (
              <button type="button" className="secondary" onClick={() => lookAbort.current?.abort()}>
                Stop
              </button>
            )}
            <button type="button" onClick={() => void createDraft()} disabled={busy || photos.length === 0}>
              {drafting ? "Creating entry..." : "Create entry"}
            </button>
          </div>
        </>
      )}

      {(lookText || lookDone || lookError || looking) && (
        <section className="card">
          <h3>First look</h3>
          {lookText && <div className="stream">{lookText}</div>}
          {looking && !lookText && <p className="muted">Waiting for the first words...</p>}
          <ErrorNotice error={lookError} />
          {lookDone && (
            <>
              {lookDone.stopReason && lookDone.stopReason !== "end_turn" && (
                <div className="notice warn">The answer stopped early (stop reason: {lookDone.stopReason}).</div>
              )}
              <p className="muted small">
                {lookDone.model} · first text after {formatMs(lookDone.ttftMs)} · total {formatMs(lookDone.ms)} ·{" "}
                {lookDone.usage.input_tokens.toLocaleString()} in / {lookDone.usage.output_tokens.toLocaleString()} out tokens
                {lookDone.estimatedImageTokens != null && ` (photos estimated at ${lookDone.estimatedImageTokens.toLocaleString()})`}{" "}
                · {formatUsd(lookDone.costUsd)}
              </p>
              <PendingNotices pending={lookDone.pending} />
            </>
          )}
        </section>
      )}

      <ErrorNotice error={draftError} />

      {result && form && (
        <section>
          <h2>Review the entry</h2>
          <p className="muted small">
            {result.model} · {result.attempts} attempt{result.attempts === 1 ? "" : "s"} ·{" "}
            {result.usage.input_tokens.toLocaleString()} in / {result.usage.output_tokens.toLocaleString()} out tokens ·{" "}
            {formatUsd(result.costUsd)} · {formatMs(result.ms)}
          </p>
          <PendingNotices pending={result.pending} />

          {duplicates.length > 0 && (
            <div className="card notice warn">
              <h3>This may already be in the catalogue</h3>
              {duplicates.map((d) => (
                <div className="dupe" key={d.entryId}>
                  {d.thumbnail ? (
                    <img src={d.thumbnail} alt="" />
                  ) : (
                    <Placeholder />
                  )}
                  <div>
                    <strong>{d.title}</strong> <span className="muted">· match {formatPercent(d.score)}</span>
                    <div className="small">{d.reasons.join(" · ")}</div>
                    <Link href={`/catalog/${d.entryId}`} target="_blank">
                      Open existing
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="card">
            <ReviewForm value={form} onChange={setForm} review={result.review} modelConfidence={result.draft.confidence} />
          </div>

          <ErrorNotice error={saveError} />
          <div className="actions">
            <button type="button" onClick={() => void save()} disabled={busy}>
              {saving ? "Saving..." : duplicates.length > 0 ? "Save anyway" : "Save to catalogue"}
            </button>
            {duplicates.length > 0 && (
              <Link className="button secondary" href={`/catalog/${duplicates[0].entryId}`}>
                Open existing
              </Link>
            )}
          </div>
        </section>
      )}
    </main>
  );
}
