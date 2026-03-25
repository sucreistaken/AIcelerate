import { useState, useMemo } from "react";
import { logger } from "../utils/logger";
import { useChannelToolStore } from "../stores/channelToolStore";
import { channelToolApi } from "../services/channelToolApi";
import { getCollabSocket } from "../services/socket";
import type { ChannelFlashcardItem, ExtractionSummary } from "../types";
import {
  EMPTY_CARDS,
  isDueForReview,
  type FlashcardMode,
} from "../components/collab/tools/flashcards/constants";

interface UseChannelFlashcardsParams {
  channelId: string;
  topic: string;
  serverName: string;
  userId: string;
  nickname: string;
  hasLesson: boolean;
}

export function useChannelFlashcards({
  channelId,
  topic,
  serverName,
  userId,
  nickname,
  hasLesson,
}: UseChannelFlashcardsParams) {
  const cards = useChannelToolStore(
    (s) => s.dataByChannel[channelId]?.flashcards?.cards ?? EMPTY_CARDS
  );
  const addFlashcardToStore = useChannelToolStore((s) => s.addFlashcardToStore);
  const loadToolData = useChannelToolStore((s) => s.loadToolData);

  const [mode, setMode] = useState<FlashcardMode>("grid");
  const [showAddForm, setShowAddForm] = useState(false);
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [cardTopic, setCardTopic] = useState("");
  const [reviewIndex, setReviewIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [revealedCards, setRevealedCards] = useState<Set<string>>(new Set());
  const [extractionResult, setExtractionResult] =
    useState<ExtractionSummary | null>(null);

  const dueCards = useMemo(
    () => cards.filter((c) => isDueForReview(c, userId)),
    [cards, userId]
  );

  const reviewedCount = useMemo(
    () => cards.filter((c) => c.sm2?.[userId]).length,
    [cards, userId]
  );

  const totalCards = cards.length;
  const duePercent =
    totalCards > 0 ? (dueCards.length / totalCards) * 100 : 0;
  const reviewedPercent =
    totalCards > 0 ? (reviewedCount / totalCards) * 100 : 0;
  const masteredCount = totalCards - dueCards.length;
  const masteredPercent =
    totalCards > 0 ? (masteredCount / totalCards) * 100 : 0;

  function toggleReveal(cardId: string) {
    setRevealedCards((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) next.delete(cardId);
      else next.add(cardId);
      return next;
    });
  }

  function handleVote(card: ChannelFlashcardItem, vote: "up" | "down") {
    const currentVote = card.votes.find((v) => v.userId === userId)?.vote ?? null;
    const newVote = currentVote === vote ? null : vote;
    const updatedVotes = card.votes.filter((v) => v.userId !== userId);
    if (newVote) updatedVotes.push({ userId, vote: newVote });

    const store = useChannelToolStore.getState();
    const existing = store.dataByChannel[channelId];
    if (existing?.flashcards) {
      const updatedCards = existing.flashcards.cards.map((c) =>
        c.id === card.id ? { ...c, votes: updatedVotes } : c
      );
      store.setToolData(channelId, {
        ...existing,
        flashcards: { cards: updatedCards },
      });
    }
  }

  async function handleAddCard(e: React.FormEvent) {
    e.preventDefault();
    if (!front.trim() || !back.trim()) return;
    try {
      const { card } = await channelToolApi.addFlashcard(
        channelId,
        front.trim(),
        back.trim(),
        cardTopic.trim() || topic,
        userId,
        nickname
      );
      addFlashcardToStore(channelId, card);
      getCollabSocket().emit("tool:flashcard:add", { channelId, card });
      setFront("");
      setBack("");
      setCardTopic("");
      setShowAddForm(false);
    } catch (err) {
      logger.error("Failed to add flashcard:", err);
    }
  }

  async function handleGenerate() {
    if (generating) return;
    setGenerating(true);
    try {
      await channelToolApi.generateFlashcards(channelId, topic, serverName);
      await loadToolData(channelId);
      getCollabSocket().emit("tool:data:update", { channelId });
    } catch (err) {
      logger.error("Failed to generate flashcards:", err);
    } finally {
      setGenerating(false);
    }
  }

  async function handleExtract() {
    if (extracting || !hasLesson) return;
    setExtracting(true);
    setExtractionResult(null);
    try {
      const { summary } = await channelToolApi.extractFlashcardsFromLesson(
        channelId
      );
      setExtractionResult(summary);
      await loadToolData(channelId);
      getCollabSocket().emit("tool:data:update", { channelId });
    } catch (err) {
      logger.error("Failed to extract flashcards:", err);
    } finally {
      setExtracting(false);
    }
  }

  async function handleSm2Rating(quality: number) {
    const reviewCards = mode === "sm2-review" ? dueCards : cards;
    const currentCard = reviewCards[reviewIndex];
    if (!currentCard || reviewing) return;

    setReviewing(true);
    try {
      const { card: updatedCard } = await channelToolApi.reviewFlashcard(
        channelId,
        currentCard.id,
        userId,
        quality
      );
      const store = useChannelToolStore.getState();
      const existing = store.dataByChannel[channelId];
      if (existing?.flashcards) {
        const updatedCards = existing.flashcards.cards.map((c) =>
          c.id === updatedCard.id ? updatedCard : c
        );
        store.setToolData(channelId, {
          ...existing,
          flashcards: { cards: updatedCards },
        });
      }

      if (reviewIndex < reviewCards.length - 1) {
        setReviewIndex(reviewIndex + 1);
        setFlipped(false);
        setShowHint(false);
      } else {
        setMode("grid");
        setReviewIndex(0);
        setFlipped(false);
        setShowHint(false);
      }
    } catch (err) {
      logger.error("Failed to review flashcard:", err);
    } finally {
      setReviewing(false);
    }
  }

  function startReview(reviewMode: FlashcardMode) {
    setMode(reviewMode);
    setReviewIndex(0);
    setFlipped(false);
    setShowHint(false);
  }

  return {
    cards,
    dueCards,
    reviewedCount,
    mode,
    setMode,
    showAddForm,
    setShowAddForm,
    front,
    setFront,
    back,
    setBack,
    cardTopic,
    setCardTopic,
    reviewIndex,
    setReviewIndex,
    flipped,
    setFlipped,
    showHint,
    setShowHint,
    generating,
    extracting,
    reviewing,
    revealedCards,
    extractionResult,
    setExtractionResult,
    totalCards,
    duePercent,
    reviewedPercent,
    masteredCount,
    masteredPercent,
    toggleReveal,
    handleVote,
    handleAddCard,
    handleGenerate,
    handleExtract,
    handleSm2Rating,
    startReview,
  };
}

export type UseChannelFlashcardsReturn = ReturnType<typeof useChannelFlashcards>;
