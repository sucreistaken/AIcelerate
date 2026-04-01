/**
 * Akıllı metin kesme: Metnin başı, ortası ve sonunu koruyarak keser.
 * Kör .slice(0, N) yerine kullanılır — uzun derslerin sonundaki
 * önemli özetleri kaybetmeyi önler.
 */
export function smartTruncate(text: string, maxChars: number): string {
  if (!text || text.length <= maxChars) return text || "";
  if (maxChars < 200) return text.slice(0, maxChars);

  const first = Math.floor(maxChars * 0.4);
  const last = Math.floor(maxChars * 0.2);
  const middle = maxChars - first - last - 30; // 30 chars for separators
  const midStart = Math.floor((text.length - middle) / 2);

  return [
    text.slice(0, first),
    "\n[... content trimmed ...]\n",
    text.slice(midStart, midStart + middle),
    "\n[... trimmed ...]\n",
    text.slice(-last),
  ].join("");
}
