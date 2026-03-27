import { useState, useEffect } from "react";

interface PaneInfoBannerProps {
  id: string;
  title: string;
  description: string;
  tips?: string[];
}

const DISMISSED_KEY = 'lc.info.dismissed';

function getDismissed(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(DISMISSED_KEY) || '[]'));
  } catch {
    return new Set();
  }
}

function persistDismissed(ids: Set<string>) {
  localStorage.setItem(DISMISSED_KEY, JSON.stringify([...ids]));
}

export default function PaneInfoBanner({ id, title, description, tips }: PaneInfoBannerProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(!getDismissed().has(id));
  }, [id]);

  const dismiss = () => {
    setVisible(false);
    const d = getDismissed();
    d.add(id);
    persistDismissed(d);
  };

  const show = () => {
    setVisible(true);
    const d = getDismissed();
    d.delete(id);
    persistDismissed(d);
  };

  if (!visible) {
    return (
      <button
        onClick={show}
        style={{
          background: "none", border: "none", cursor: "pointer",
          fontSize: 11, color: "var(--accent-2)", padding: "4px 0", marginBottom: 4,
          display: "flex", alignItems: "center", gap: 4, opacity: 0.7,
        }}
        title="Bilgi bannerini goster"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
        Bu mod ne ise yarar?
      </button>
    );
  }

  return (
    <div role="status" style={{
      display: "flex", alignItems: "flex-start", gap: 12,
      padding: "14px 18px", borderRadius: "var(--radius-md)", marginBottom: 12,
      background: "linear-gradient(135deg, var(--accent-soft) 0%, transparent 60%)",
      border: "1px solid var(--accent-ring)",
      position: "relative",
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: "var(--radius-md)",
        background: "var(--accent-soft-2)",
        display: "grid", placeItems: "center", flexShrink: 0, color: "var(--accent-2)",
      }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text)", marginBottom: 2 }}>{title}</div>
        <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.5, marginBottom: tips?.length ? 8 : 0 }}>{description}</div>
        {!!tips?.length && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {tips.map((tip, i) => (
              <span key={i} style={{ fontSize: 12, fontWeight: 600, color: "var(--accent-2)" }}>{tip} →</span>
            ))}
          </div>
        )}
      </div>
      <button onClick={dismiss} style={{
        background: "none", border: "none", cursor: "pointer",
        color: "var(--muted)", padding: 4, fontSize: 16, lineHeight: 1,
      }} title="Kapat">&times;</button>
    </div>
  );
}
