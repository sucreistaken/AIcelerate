import React, { useState, useEffect } from "react";

interface PaneInfoBannerProps {
  id: string;
  title: string;
  description: string;
  tips?: string[];
}

const DISMISSED_KEY = 'lc.info.dismissed';

function getDismissed(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(DISMISSED_KEY) || '[]')); } catch { return new Set(); }
}

function setDismissed(ids: Set<string>) {
  localStorage.setItem(DISMISSED_KEY, JSON.stringify([...ids]));
}

export default function PaneInfoBanner({ id, title, description, tips }: PaneInfoBannerProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = getDismissed();
    setVisible(!dismissed.has(id));
  }, [id]);

  const dismiss = () => {
    setVisible(false);
    const dismissed = getDismissed();
    dismissed.add(id);
    setDismissed(dismissed);
  };

  const show = () => {
    setVisible(true);
    const dismissed = getDismissed();
    dismissed.delete(id);
    setDismissed(dismissed);
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
    <div style={{
      padding: "12px 16px", borderRadius: 10, marginBottom: 12,
      background: "var(--accent-2)08", border: "1px solid var(--accent-2)22",
      position: "relative",
    }}>
      <button
        onClick={dismiss}
        style={{
          position: "absolute", top: 8, right: 10, background: "none",
          border: "none", cursor: "pointer", color: "var(--muted)", fontSize: 16, lineHeight: 1,
        }}
        title="Kapat"
      >
        &times;
      </button>
      <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text)", marginBottom: 4, paddingRight: 20 }}>
        {title}
      </div>
      <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.5, marginBottom: tips?.length ? 8 : 0 }}>
        {description}
      </div>
      {tips && tips.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {tips.map((tip, i) => (
            <span
              key={i}
              style={{
                fontSize: 11, padding: "2px 8px", borderRadius: 4,
                background: "var(--accent-2)12", color: "var(--accent-2)",
                fontWeight: 600,
              }}
            >
              {tip}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
