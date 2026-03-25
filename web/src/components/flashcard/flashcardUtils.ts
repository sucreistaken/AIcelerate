export function getDifficultyFromEF(ef: number): { label: string; color: string; bg: string } {
  if (ef >= 2.5) return { label: "Kolay", color: "var(--easy)", bg: "var(--easy-bg)" };
  if (ef >= 1.8) return { label: "Orta", color: "var(--medium)", bg: "var(--medium-bg)" };
  return { label: "Zor", color: "var(--hard)", bg: "var(--hard-bg)" };
}
