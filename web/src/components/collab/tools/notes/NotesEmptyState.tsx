interface Props {
  onAddNote: () => void;
}

export default function NotesEmptyState({ onAddNote }: Props) {
  return (
    <div className="sh-notes__empty-state">
      <div className="sh-notes__empty-illustration">
        <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="25" y="15" width="70" height="90" rx="8" fill="var(--card)" stroke="var(--border)" strokeWidth="2" />
          <rect x="25" y="15" width="70" height="90" rx="8" fill="color-mix(in srgb, var(--accent-2) 5%, var(--card))" />
          <rect x="35" y="35" width="40" height="4" rx="2" fill="var(--border)" />
          <rect x="35" y="47" width="50" height="3" rx="1.5" fill="var(--border)" opacity="0.6" />
          <rect x="35" y="56" width="45" height="3" rx="1.5" fill="var(--border)" opacity="0.6" />
          <rect x="35" y="65" width="35" height="3" rx="1.5" fill="var(--border)" opacity="0.6" />
          <rect x="35" y="80" width="20" height="8" rx="4" fill="color-mix(in srgb, var(--accent-2) 20%, transparent)" />
          <circle cx="82" cy="88" r="18" fill="var(--accent-2)" opacity="0.15" />
          <path d="M76 88L80 92L88 84" stroke="var(--accent-2)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h3 className="sh-notes__empty-title">Hen{"\ü"}z not yok</h3>
      <p className="sh-notes__empty-desc">
        Notlar ekleyerek bilgi birikiminizi organize edin. Kavramlar, form{"\ü"}ller, {"\ö"}rnekler ve daha fazlas{"\ı"}n{"\ı"} kategorize edebilirsiniz.
      </p>
      <button
        className="sh-notes__empty-cta"
        onClick={onAddNote}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        {"\İ"}lk Notunu Ekle
      </button>
    </div>
  );
}
