const AVATAR_COLORS = ["#6366f1", "#ec4899", "#f59e0b", "#22c55e", "#06b6d4", "#8b5cf6"];

export function hashAuthorColor(authorId: string): string {
  let hash = 0;
  for (let i = 0; i < authorId.length; i++) {
    hash = (hash * 31 + authorId.charCodeAt(i)) | 0;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export const QUICK_ACTION_META: Record<string, { icon: string; desc: string }> = {
  "\Özetle": { icon: "S", desc: "Konunun k\ısa ve net \özeti" },
  "Soru sor": { icon: "?", desc: "Anlama seviyeni test et" },
  "\Örnekler": { icon: "E", desc: "Ger\çek hayattan \örnekler" },
  "Ba\ğlant\ılar": { icon: "L", desc: "Di\ğer konularla ili\şkiler" },
  "Hocan\ın Vurgular\ı": { icon: "V", desc: "Derste vurgulanan noktalar" },
  "Yayg\ın Hatalar": { icon: "!", desc: "S\ık yap\ılan yan\ılg\ılar" },
  "Temel Fikirler": { icon: "T", desc: "\Çekirdek kavramlar ve fikirler" },
};

export function renderFormattedText(text: string) {
  const codeBlockRegex = /```(\w*)\n?([\s\S]*?)```/g;
  const parts: Array<{ type: "text"; value: string } | { type: "code"; lang: string; value: string }> = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: "text", value: text.slice(lastIndex, match.index) });
    }
    parts.push({ type: "code", lang: match[1] || "", value: match[2].trim() });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push({ type: "text", value: text.slice(lastIndex) });
  }

  return parts.map((part, i) => {
    if (part.type === "code") {
      return (
        <pre key={i} className="sh-dive__code-block">
          <code>{part.value}</code>
        </pre>
      );
    }
    const paragraphs = part.value.split(/\n{2,}/);
    return paragraphs.map((para, j) => {
      const trimmed = para.trim();
      if (!trimmed) return null;
      const inlineParts = trimmed.split(/(`[^`]+`)/g);
      return (
        <p key={`${i}-${j}`} className="sh-dive__paragraph">
          {inlineParts.map((seg, k) => {
            if (seg.startsWith("`") && seg.endsWith("`")) {
              return (
                <code key={k} className="sh-dive__inline-code">
                  {seg.slice(1, -1)}
                </code>
              );
            }
            return <span key={k}>{seg}</span>;
          })}
        </p>
      );
    });
  });
}
