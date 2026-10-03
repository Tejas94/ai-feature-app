"use client";

import { useState, type ReactNode } from "react";
import type { CatalogDraft, FieldConfidence, IdentifierKind } from "@/lib/schema";
import { CATEGORIES, CATEGORY_INFO, type Category } from "@/lib/taxonomy";
import type { FieldReview, ReviewField, ReviewFlags } from "@/lib/confidence";
import { GRADE_LABELS } from "@/lib/format";
import { ConfidenceBadge } from "./confidence-badge";

const GRADES = ["new", "like_new", "good", "fair", "poor"] as const;
const ID_KINDS: IdentifierKind[] = ["gtin", "upc", "ean", "isbn", "sku", "model", "serial", "other"];

interface Props {
  value: CatalogDraft;
  onChange: (next: CatalogDraft) => void;
  /** Code-checked confidence (P1-06), or null while that TODO is open. */
  review: ReviewFlags | null;
  /** The model's own confidence, used when review is null. */
  modelConfidence: FieldConfidence;
}

/** Every field of the draft, editable, with confidence badges and the reasons a field was flagged. */
export function ReviewForm({ value, onChange, review, modelConfidence }: Props) {
  const set = (patch: Partial<CatalogDraft>) => onChange({ ...value, ...patch });

  const info = (field: ReviewField): { confidence?: number; review?: FieldReview } => {
    const r = review?.fields.find((f) => f.field === field);
    if (r) return { confidence: r.confidence, review: r };
    return { confidence: field === "identifiers" ? undefined : modelConfidence[field] };
  };

  const ids = value.visibleText.identifiers;
  const setIds = (identifiers: CatalogDraft["visibleText"]["identifiers"]) =>
    set({ visibleText: { ...value.visibleText, identifiers } });

  return (
    <div className="form-grid">
      {review && (
        <p className="muted">
          Overall confidence <ConfidenceBadge value={review.overall} source="after code checks" />. Highlighted fields need a
          look.
        </p>
      )}

      <Row label="Title" htmlFor="f-title" {...info("title")} source={review ? "checked" : "model"}>
        <input id="f-title" value={value.title} onChange={(e) => set({ title: e.target.value })} />
      </Row>

      <Row label="Category" htmlFor="f-category" {...info("category")} source={review ? "checked" : "model"}>
        <select id="f-category" value={value.category} onChange={(e) => set({ category: e.target.value as Category })}>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_INFO[c].label}
            </option>
          ))}
        </select>
      </Row>

      <Row label="Attributes" {...info("attributes")} source={review ? "checked" : "model"}>
        {value.attributes.map((a, i) => (
          <div className="pair" key={i}>
            <input
              aria-label="Attribute name"
              placeholder="name"
              value={a.name}
              onChange={(e) =>
                set({ attributes: value.attributes.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })
              }
            />
            <input
              aria-label="Attribute value"
              placeholder="value"
              value={a.value}
              onChange={(e) =>
                set({ attributes: value.attributes.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)) })
              }
            />
            <button
              type="button"
              className="secondary"
              aria-label={`Remove ${a.name || "attribute"}`}
              onClick={() => set({ attributes: value.attributes.filter((_, j) => j !== i) })}
            >
              ×
            </button>
          </div>
        ))}
        <button
          type="button"
          className="secondary"
          onClick={() => set({ attributes: [...value.attributes, { name: "", value: "" }] })}
        >
          Add attribute
        </button>
      </Row>

      <Row label="Condition" htmlFor="f-grade" {...info("condition")} source={review ? "checked" : "model"}>
        <div className="two">
          <select
            id="f-grade"
            value={value.condition.grade}
            onChange={(e) => set({ condition: { ...value.condition, grade: e.target.value as (typeof GRADES)[number] } })}
          >
            {GRADES.map((g) => (
              <option key={g} value={g}>
                {GRADE_LABELS[g]}
              </option>
            ))}
          </select>
          <input
            aria-label="Condition notes"
            placeholder="Visible wear, damage, missing parts"
            value={value.condition.notes}
            onChange={(e) => set({ condition: { ...value.condition, notes: e.target.value } })}
          />
        </div>
      </Row>

      <Row label="Description" htmlFor="f-description" {...info("description")} source={review ? "checked" : "model"}>
        <textarea
          id="f-description"
          value={value.description}
          onChange={(e) => set({ description: e.target.value })}
        />
      </Row>

      <Row label="Tags">
        <TagEditor tags={value.tags} onChange={(tags) => set({ tags })} />
      </Row>

      <Row label="Identifiers" {...info("identifiers")} source="checked">
        {ids.map((id, i) => (
          <div className="pair id" key={i}>
            <select
              aria-label="Identifier kind"
              value={id.kind}
              onChange={(e) => setIds(ids.map((x, j) => (j === i ? { ...x, kind: e.target.value as IdentifierKind } : x)))}
            >
              {ID_KINDS.map((k) => (
                <option key={k} value={k}>
                  {k.toUpperCase()}
                </option>
              ))}
            </select>
            <input
              aria-label="Identifier value"
              value={id.value}
              onChange={(e) => setIds(ids.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))}
            />
            <button
              type="button"
              className="secondary"
              aria-label="Remove identifier"
              onClick={() => setIds(ids.filter((_, j) => j !== i))}
            >
              ×
            </button>
          </div>
        ))}
        <button type="button" className="secondary" onClick={() => setIds([...ids, { kind: "ean", value: "" }])}>
          Add identifier
        </button>
      </Row>

      <details>
        <summary className="muted">Text read from the photos ({value.visibleText.lines.length} lines)</summary>
        <ul className="small">
          {value.visibleText.lines.map((l, i) => (
            <li key={i}>{l}</li>
          ))}
        </ul>
      </details>
    </div>
  );
}

function Row(props: {
  label: string;
  htmlFor?: string;
  confidence?: number;
  review?: FieldReview;
  source?: string;
  children: ReactNode;
}) {
  const flagged = props.review?.needsReview ?? false;
  return (
    <div className={`form-row${flagged ? " flagged" : ""}`}>
      <div className="row-head">
        <label className="field" htmlFor={props.htmlFor}>
          {props.label}
        </label>
        <ConfidenceBadge value={props.confidence} source={props.source} />
      </div>
      {props.children}
      {flagged && props.review && props.review.reasons.length > 0 && (
        <ul className="reasons">
          {props.review.reasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TagEditor({ tags, onChange }: { tags: string[]; onChange: (tags: string[]) => void }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const tag = draft.trim().toLowerCase();
    if (tag && !tags.includes(tag)) onChange([...tags, tag]);
    setDraft("");
  };
  return (
    <>
      <div className="chips">
        {tags.map((t) => (
          <span className="chip" key={t}>
            {t}
            <button type="button" aria-label={`Remove tag ${t}`} onClick={() => onChange(tags.filter((x) => x !== t))}>
              ×
            </button>
          </span>
        ))}
      </div>
      <input
        aria-label="Add a tag"
        placeholder="Add a tag and press Enter"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            add();
          }
        }}
        onBlur={add}
      />
      <p className="muted small">3 to 10 lowercase tags.</p>
    </>
  );
}
