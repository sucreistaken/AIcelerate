/**
 * Sanitizes user-supplied text before embedding in AI prompts.
 * Removes common prompt injection patterns and escapes control sequences.
 */
export function sanitizeForPrompt(input: string): string {
  if (!input) return "";
  return input
    // Remove potential system/instruction override patterns
    .replace(/\b(SYSTEM|INSTRUCTION|IGNORE\s+ABOVE|IGNORE\s+PREVIOUS|FORGET\s+EVERYTHING)\b/gi, "[FILTERED]")
    // Remove markdown-style code blocks that could contain instructions
    .replace(/```[\s\S]*?```/g, "[CODE_BLOCK]")
    // Collapse excessive newlines (prevent injection via whitespace separation)
    .replace(/\n{4,}/g, "\n\n\n")
    // Trim to reasonable length
    .trim();
}

/**
 * Sanitizes a user nickname for safe embedding in prompts.
 */
export function sanitizeNickname(nickname: string): string {
  if (!nickname) return "User";
  // Only allow alphanumeric, spaces, hyphens, underscores, Turkish chars
  return nickname
    .replace(/[^\w\s\-çÇğĞıİöÖşŞüÜ]/g, "")
    .slice(0, 32)
    .trim() || "User";
}
