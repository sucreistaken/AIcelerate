export type SupportedLang = "tr" | "en";

/**
 * Tüm AI prompt'larında tutarlı dil yönergesi sağlar.
 * Varsayılan Türkçe — platform İEÜ öğrencilerine yönelik.
 */
export function getLangDirective(lang: SupportedLang = "tr"): string {
  return lang === "tr"
    ? "ÖNEMLİ: Tüm içeriği TÜRKÇE yaz. Başlıklar, açıklamalar, sorular — her şey Türkçe olmalı."
    : "IMPORTANT: Write ALL content in ENGLISH. Use English language only.";
}
