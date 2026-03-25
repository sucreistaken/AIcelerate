import { useChannelFlashcards } from "../../../hooks/useChannelFlashcards";
import type { LessonContextInfo } from "../../../types";
import FlashcardsEmpty from "./flashcards/FlashcardsEmpty";
import FlashcardsReview from "./flashcards/FlashcardsReview";
import FlashcardsGrid from "./flashcards/FlashcardsGrid";

interface Props {
  channelId: string;
  topic: string;
  serverName: string;
  userId: string;
  nickname: string;
  lessonContext?: LessonContextInfo | null;
}

export default function ChannelFlashcards({ channelId, topic, serverName, userId, nickname, lessonContext }: Props) {
  const hasLesson = !!lessonContext?.linked;

  const hook = useChannelFlashcards({ channelId, topic, serverName, userId, nickname, hasLesson });

  if (hook.cards.length === 0 && !hook.showAddForm) {
    return (
      <FlashcardsEmpty
        topic={topic}
        hasLesson={hasLesson}
        generating={hook.generating}
        extracting={hook.extracting}
        onGenerate={hook.handleGenerate}
        onExtract={hook.handleExtract}
        onShowAddForm={() => hook.setShowAddForm(true)}
      />
    );
  }

  if ((hook.mode === "review" || hook.mode === "sm2-review") && hook.cards.length > 0) {
    return (
      <FlashcardsReview
        topic={topic}
        mode={hook.mode}
        cards={hook.cards}
        dueCards={hook.dueCards}
        reviewIndex={hook.reviewIndex}
        setReviewIndex={hook.setReviewIndex}
        flipped={hook.flipped}
        setFlipped={hook.setFlipped}
        showHint={hook.showHint}
        setShowHint={hook.setShowHint}
        reviewing={hook.reviewing}
        setMode={hook.setMode}
        handleSm2Rating={hook.handleSm2Rating}
      />
    );
  }

  return (
    <FlashcardsGrid
      topic={topic}
      userId={userId}
      cards={hook.cards}
      dueCards={hook.dueCards}
      hasLesson={hasLesson}
      generating={hook.generating}
      extracting={hook.extracting}
      showAddForm={hook.showAddForm}
      setShowAddForm={hook.setShowAddForm}
      front={hook.front}
      setFront={hook.setFront}
      back={hook.back}
      setBack={hook.setBack}
      cardTopic={hook.cardTopic}
      setCardTopic={hook.setCardTopic}
      revealedCards={hook.revealedCards}
      extractionResult={hook.extractionResult}
      setExtractionResult={hook.setExtractionResult}
      totalCards={hook.totalCards}
      duePercent={hook.duePercent}
      reviewedCount={hook.reviewedCount}
      reviewedPercent={hook.reviewedPercent}
      masteredCount={hook.masteredCount}
      masteredPercent={hook.masteredPercent}
      toggleReveal={hook.toggleReveal}
      handleVote={hook.handleVote}
      handleAddCard={hook.handleAddCard}
      handleGenerate={hook.handleGenerate}
      handleExtract={hook.handleExtract}
      startReview={hook.startReview}
    />
  );
}
