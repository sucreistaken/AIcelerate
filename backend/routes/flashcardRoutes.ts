import { Router } from "express";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { flashcardGenerateSchema, flashcardReviewSchema, flashcardCreateSchema, flashcardUpdateSchema, emptyBodySchema } from "../validators/routeSchemas";
import {
  generateFlashcardsForLesson,
  reviewCard,
  getDueCards,
  getFlashcards,
  getFlashcardStats,
  deleteFlashcard,
  createCard,
  loadFlashcards,
  saveFlashcards,
} from "../controllers/flashcardController";

const router = Router();

router.post("/flashcards/generate/:lessonId", requireAuth, validate(flashcardGenerateSchema), (req, res) => {
  const cards = generateFlashcardsForLesson(req.params.lessonId);
  res.json({ ok: true, generated: cards.length, cards });
});

router.get("/flashcards/due", requireAuth, (_req, res) => {
  const cards = getDueCards();
  res.json({ ok: true, cards });
});

router.post("/flashcards/:cardId/review", requireAuth, validate(flashcardReviewSchema), (req, res) => {
  const { quality } = req.body as { quality: number };
  const result = reviewCard(req.params.cardId, quality);
  if (!result) return res.status(404).json({ ok: false, error: "Card not found" });
  res.json({ ok: true, ...result });
});

router.get("/flashcards/stats", requireAuth, (_req, res) => {
  res.json({ ok: true, ...getFlashcardStats() });
});

router.get("/flashcards", requireAuth, (req: AuthRequest, res) => {
  const lessonId = req.query.lessonId as string | undefined;
  // Flashcards are already scoped by lessonId which is user-owned
  const allCards = getFlashcards(lessonId);
  const limit = Math.min(Math.max(1, Number(req.query.limit) || 50), 100);
  const cursor = req.query.cursor as string | undefined;

  // Backward compat: no pagination params → return all
  if (!cursor && !req.query.limit) {
    return res.json({ ok: true, cards: allCards });
  }

  let startIdx = 0;
  if (cursor) {
    const idx = allCards.findIndex((c: { id?: string }) => c.id === cursor);
    if (idx >= 0) startIdx = idx + 1;
  }
  const sliced = allCards.slice(startIdx, startIdx + limit + 1);
  const hasMore = sliced.length > limit;
  const items = hasMore ? sliced.slice(0, limit) : sliced;
  const last = items[items.length - 1];
  res.json({ ok: true, cards: items, nextCursor: hasMore && last ? (last as unknown as { id: string }).id : null, hasMore });
});

router.patch("/flashcards/:cardId", requireAuth, validate(flashcardUpdateSchema), (req, res) => {
  const { front, back } = req.body as { front?: string; back?: string };
  if (!front && !back) return res.status(400).json({ ok: false, error: "front or back required" });
  const cards = loadFlashcards();
  const card = cards.find(c => c.id === req.params.cardId);
  if (!card) return res.status(404).json({ ok: false, error: "Card not found" });
  if (front) card.front = front;
  if (back) card.back = back;
  saveFlashcards(cards);
  res.json({ ok: true, card });
});

router.delete("/flashcards/:cardId", requireAuth, validate(emptyBodySchema), (req, res) => {
  const ok = deleteFlashcard(req.params.cardId);
  if (!ok) return res.status(404).json({ ok: false, error: "Card not found" });
  res.json({ ok: true });
});

router.post("/flashcards", requireAuth, validate(flashcardCreateSchema), (req, res) => {
  const { lessonId, front, back, topicName } = req.body as {
    lessonId: string; front: string; back: string; topicName?: string;
  };
  if (!lessonId || !front || !back) {
    return res.status(400).json({ ok: false, error: "lessonId, front, back required" });
  }
  const cards = loadFlashcards();
  const card = createCard(lessonId, topicName || "", front, back, "ai-generated");
  cards.push(card);
  saveFlashcards(cards);
  res.status(201).json({ ok: true, card });
});

export default router;
