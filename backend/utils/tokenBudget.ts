import { smartTruncate } from "./smartTruncate";

/** Rough token estimation (~4 chars per token) */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/** Trim text to fit within a token budget, using smart truncation */
export function trimToTokenBudget(text: string, budget: number): string {
  const charBudget = budget * 4;
  if (text.length <= charBudget) return text;
  return smartTruncate(text, charBudget);
}
