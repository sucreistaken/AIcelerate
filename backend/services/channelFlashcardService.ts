import { logger } from "../utils/logger";
import {
  channelToolRepo,
  FlashcardItem,
} from "../repositories/channelToolRepo";
import { safeGenerate, stripCodeFences, getTemperature } from "./aiService";
import { SCHEMAS } from "../prompts/schemas";
import { channelService } from "./channelService";
import { getLesson } from "../controllers/lessonControllers";
import { generateId } from "../utils/idGenerator";
import { buildToolContext } from "./channelContextBuilder";
import { getLangDirective, type SupportedLang } from "../utils/langDirective";
export { extractFlashcardsFromLesson } from "./channelFlashcardExtractor";

// ── Flashcards: add manually ────────────────────────────────────────────────
export async function addFlashcard(
  channelId: string,
  front: string,
  back: string,
  topic: string,
  userId: string,
  nickname: string
): Promise<FlashcardItem> {
  const data = await channelToolRepo.load(channelId);

  if (!data.flashcards) {
    data.flashcards = { cards: [] };
  }

  const card: FlashcardItem = {
    id: generateId(),
    front,
    back,
    topic,
    createdBy: userId,
    createdByNickname: nickname,
    createdAt: new Date().toISOString(),
    votes: [],
    source: "manual",
  };

  data.flashcards.cards.push(card);
  await channelToolRepo.save(channelId, data);

  return card;
}

// ── Flashcards: generate with AI ────────────────────────────────────────────
export async function generateFlashcards(
  channelId: string,
  topic: string,
  serverName: string,
  count: number = 8,
  lang?: SupportedLang
): Promise<{ cards: FlashcardItem[]; sourcesSummary: string | null }> {
  const data = await channelToolRepo.load(channelId);

  if (!data.flashcards) {
    data.flashcards = { cards: [] };
  }

  try {
    const toolCtx = await buildToolContext(channelId, "flashcards");

    const contextBlock = toolCtx
      ? `Based on the following lecture material, generate flashcards that cover the actual content:\n\n${toolCtx.context}\n\n`
      : '';

    const prompt = `${getLangDirective(lang)}\n\n${contextBlock}Generate ${count} high-quality flashcards about '${topic}' for a university study group '${serverName}'.

Return ONLY a JSON array with this schema:
[{
  "front": "Clear, concise question or concept",
  "back": "Detailed answer or explanation",
  "hint": "A brief visual or mnemonic hint to help recall (1 short sentence)",
  "topic": "Sub-topic category"
}]

RULES:
- Each card should test a different concept
- Hints should use analogies, mnemonics, or visual imagery
- Back should be educational, not just a one-word answer
${toolCtx ? `- Flashcards MUST be based on the provided lecture material
- Cover professor emphases, formulas, and mustRemember facts
- Use cheat sheet pitfalls for misconception-awareness cards
- Include cards that test understanding of common traps and errors` : ''}
- Return ONLY valid JSON array`;

    const result = await safeGenerate({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 2000, temperature: getTemperature("balanced"), responseMimeType: "application/json", responseSchema: SCHEMAS.CHANNEL_FLASHCARDS } as any,
    }, { label: "channel_flashcards", timeoutMs: 30_000 });
    const text = result.response.text();
    logger.info(`[AI] CHANNEL_FLASHCARDS | ~${Math.ceil(prompt.length / 4)} in, ~${Math.ceil(text.length / 4)} out | max=2000`);
    const parsed = JSON.parse(text) as Array<{
      front: string;
      back: string;
      hint?: string;
      topic: string;
    }>;

    const newCards: FlashcardItem[] = parsed.map((c) => ({
      id: generateId(),
      front: c.front,
      back: c.back,
      hint: c.hint || undefined,
      topic: c.topic || topic,
      createdBy: "ai",
      createdByNickname: "Study AI",
      createdAt: new Date().toISOString(),
      votes: [],
      source: "ai-generated" as const,
    }));

    data.flashcards.cards.push(...newCards);
    await channelToolRepo.save(channelId, data);

    return { cards: newCards, sourcesSummary: toolCtx?.meta.sourcesSummary || null };
  } catch (err) {
    logger.error("channelToolService.generateFlashcards error:", err);
    throw new Error("Failed to generate flashcards");
  }
}

// ── Flashcards: SM-2 review ─────────────────────────────────────────────────
export async function reviewFlashcard(
  channelId: string,
  cardId: string,
  userId: string,
  quality: number // 0-5 SM-2 quality rating
): Promise<FlashcardItem | null> {
  const data = await channelToolRepo.load(channelId);
  if (!data.flashcards) return null;

  const card = data.flashcards.cards.find(c => c.id === cardId);
  if (!card) return null;

  if (!card.sm2) card.sm2 = {};

  const prev = card.sm2[userId] || {
    easeFactor: 2.5,
    interval: 0,
    repetitions: 0,
    nextReview: new Date().toISOString(),
    lastReview: new Date().toISOString(),
  };

  // SM-2 algorithm
  let { easeFactor, interval, repetitions } = prev;

  if (quality >= 3) {
    // Correct response
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    repetitions += 1;
  } else {
    // Incorrect - reset
    repetitions = 0;
    interval = 1;
  }

  // Update ease factor
  easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (easeFactor < 1.3) easeFactor = 1.3;

  const now = new Date();
  const nextReview = new Date(now.getTime() + interval * 24 * 60 * 60 * 1000);

  card.sm2[userId] = {
    easeFactor: Math.round(easeFactor * 100) / 100,
    interval,
    repetitions,
    nextReview: nextReview.toISOString(),
    lastReview: now.toISOString(),
  };

  await channelToolRepo.save(channelId, data);
  return card;
}
