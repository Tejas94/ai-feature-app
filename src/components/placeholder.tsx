/** Shown instead of a photo for entries without one (the seed data has none). */
export function Placeholder({ label = "No photo" }: { label?: string }) {
  return (
    <div className="placeholder" role="img" aria-label={label}>
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <circle cx="12" cy="12" r="3.5" />
        <path d="M8 5l1.5-2h5L16 5" />
      </svg>
    </div>
  );
}
