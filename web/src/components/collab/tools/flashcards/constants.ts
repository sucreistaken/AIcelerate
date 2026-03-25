import type { ChannelFlashcardItem } from "../../../../types";

export type FlashcardMode = "grid" | "review" | "sm2-review";

export const EMPTY_CARDS: ChannelFlashcardItem[] = [];

export const SM2_RATINGS = [
  { quality: 0, label: "Tekrar", desc: "Hi\ç hat\ırlamad\ım", color: "var(--danger)" },
  { quality: 1, label: "Zor", desc: "\Çok zorland\ım", color: "#e67e22" },
  { quality: 2, label: "Orta", desc: "Biraz hat\ırlad\ım", color: "#f39c12" },
  { quality: 3, label: "\İyi", desc: "Do\ğru hat\ırlad\ım", color: "#27ae60" },
  { quality: 4, label: "Kolay", desc: "Kolayca hat\ırlad\ım", color: "#2ecc71" },
  { quality: 5, label: "M\ükemmel", desc: "An\ında bildim", color: "var(--accent-2)" },
] as const;

export const SOURCE_LABELS: Record<string, string> = {
  "lesson-emphasis": "Emphasis",
  "lesson-cheatsheet": "Cheat Sheet",
  "lesson-miniQuiz": "Mini Quiz",
  "lesson-loModule": "Key Fact",
  "ai-generated": "AI",
  manual: "Manual",
};

export function isDueForReview(card: ChannelFlashcardItem, userId: string): boolean {
  const sm2 = card.sm2?.[userId];
  if (!sm2) return true;
  return new Date(sm2.nextReview) <= new Date();
}

export function getDaysUntilReview(card: ChannelFlashcardItem, userId: string): number | null {
  const sm2 = card.sm2?.[userId];
  if (!sm2) return null;
  const diff = new Date(sm2.nextReview).getTime() - Date.now();
  return Math.ceil(diff / (24 * 60 * 60 * 1000));
}

export function getSourceTag(source: string): string | null {
  return SOURCE_LABELS[source] || null;
}

export function getVoteScore(card: ChannelFlashcardItem): number {
  return card.votes.reduce((sum, v) => sum + (v.vote === "up" ? 1 : -1), 0);
}

export function getUserVote(card: ChannelFlashcardItem, userId: string): "up" | "down" | null {
  return card.votes.find(v => v.userId === userId)?.vote ?? null;
}
