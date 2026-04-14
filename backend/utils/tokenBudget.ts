import { smartTruncate } from "./smartTruncate";
import { getModel } from "../services/aiService";
import { withAiResilience } from "./aiResilience";
import { logger } from "./logger";

/**
 * Fast synchronous token estimation (~4 chars per token for English, ~3 for Turkish).
 * Use this for non-critical budget checks where speed matters.
 */
export function estimateTokens(text: string): number {
  // Turkish/mixed content tends to be ~3 chars per token
  const avgCharsPerToken = /[\u00C0-\u024F\u0100-\u017F\u011E\u011F\u0130\u0131\u015E\u015F\u00D6\u00F6\u00DC\u00FC\u00C7\u00E7]/.test(text) ? 3 : 4;
  return Math.ceil(text.length / avgCharsPerToken);
}

/**
 * Accurate async token counting via Gemini API.
 * Falls back to estimation if API call fails.
 */
export async function countTokensAccurate(text: string): Promise<number> {
  try {
    const result = await withAiResilience(
      async (signal) => getModel().countTokens({
        contents: [{ role: "user", parts: [{ text }] }],
      }, { signal }),
      { timeoutMs: 5_000, maxRetries: 1, label: "countTokens", breakerKey: "gemini-2.5-flash" }
    );
    return result.totalTokens;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.warn({ err: message }, "Accurate token count failed, using estimation");
    return estimateTokens(text);
  }
}

/** Trim text to fit within a token budget, using smart truncation */
export function trimToTokenBudget(text: string, budget: number): string {
  const charsPerToken = /[\u00C0-\u024F]/.test(text) ? 3 : 4;
  const charBudget = budget * charsPerToken;
  if (text.length <= charBudget) return text;
  return smartTruncate(text, charBudget);
}
