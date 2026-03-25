export default function NotesNoResults() {
  return (
    <div className="sh-notes__no-results">
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <circle cx="22" cy="22" r="14" stroke="var(--muted)" strokeWidth="2" opacity="0.5" />
        <path d="M32 32l8 8" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
        <path d="M17 22h10" stroke="var(--muted)" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
      </svg>
      <h3 className="sh-notes__no-results-title">Sonu{"\ç"} bulunamad{"\ı"}</h3>
      <p className="sh-notes__no-results-desc">
        Farkl{"\ı"} bir filtre veya arama terimi deneyin.
      </p>
    </div>
  );
}
