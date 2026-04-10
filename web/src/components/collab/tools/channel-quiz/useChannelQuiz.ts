import { useState } from "react";
import { logger } from "../../../../utils/logger";
import { useChannelToolStore } from "../../../../stores/channelToolStore";
import { channelToolApi } from "../../../../services/channelToolApi";
import { getCollabSocket } from "../../../../services/socket";
import type { ChannelQuizQuestion } from "../../../../types";

const EMPTY_Q: ChannelQuizQuestion[] = [];
const EMPTY_SCORES: Record<string, { correct: number; total: number; nickname: string }> = {};

export function useChannelQuiz(
  channelId: string,
  topic: string,
  serverName: string,
  userId: string,
  nickname: string
) {
  const questions = useChannelToolStore(s => s.dataByChannel[channelId]?.quiz?.questions ?? EMPTY_Q);
  const scores = useChannelToolStore(s => s.dataByChannel[channelId]?.quiz?.scores ?? EMPTY_SCORES);
  const loadToolData = useChannelToolStore(s => s.loadToolData);
  const updateQuiz = useChannelToolStore(s => s.updateQuiz);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [result, setResult] = useState<{ correct: boolean; correctIndex: number; explanation: string } | null>(null);
  const [generating, setGenerating] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [sourcesSummary, setSourcesSummary] = useState<string | null>(null);
  const [quizCount, setQuizCount] = useState(10);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [includeTF, setIncludeTF] = useState(true);

  async function handleGenerate() {
    if (generating) return;
    setGenerating(true);
    try {
      const res = await channelToolApi.generateQuiz(channelId, topic, serverName, quizCount, difficulty, includeTF);
      setSourcesSummary(res.sourcesSummary || null);
      await loadToolData(channelId);
      setCurrentIndex(0);
      setSelectedIndex(null);
      setAnswered(false);
      setResult(null);
      setShowResults(false);
    } catch (err) {
      logger.error("Failed to generate quiz:", err);
    } finally {
      setGenerating(false);
    }
  }

  async function handleSelectOption(optIndex: number) {
    if (answered || selectedIndex !== null) return;
    const question = questions[currentIndex];
    if (!question) return;
    setSelectedIndex(optIndex);

    try {
      const { result: answerResult } = await channelToolApi.answerQuiz(
        channelId, nickname, question.id, optIndex
      );
      setResult({
        correct: answerResult.correct,
        correctIndex: answerResult.correctIndex,
        explanation: answerResult.explanation,
      });
      setAnswered(true);

      if (answerResult.scores) {
        const existingQuiz = useChannelToolStore.getState().dataByChannel[channelId]?.quiz;
        if (existingQuiz) {
          updateQuiz(channelId, { ...existingQuiz, scores: answerResult.scores });
        }
      }

      getCollabSocket().emit("tool:quiz:answer", {
        channelId,
        result: { userId, nickname, questionId: question.id, correct: answerResult.correct, scores: answerResult.scores },
      });
    } catch (err) {
      logger.error("Failed to submit answer:", err);
      setSelectedIndex(null);
    }
  }

  function handlePrevious() {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setSelectedIndex(null);
      setAnswered(false);
      setResult(null);
    }
  }

  function handleNext() {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedIndex(null);
      setAnswered(false);
      setResult(null);
    } else {
      setShowResults(true);
    }
  }

  function getOptionClass(optIndex: number): string {
    let cls = "sh-quiz__option";
    if (!answered) return cls;
    if (optIndex === selectedIndex) cls += " sh-quiz__option--selected";
    if (optIndex === result?.correctIndex) cls += " sh-quiz__option--correct";
    else if (optIndex === selectedIndex && !result?.correct) cls += " sh-quiz__option--wrong";
    return cls;
  }

  function resetToReview() {
    setShowResults(false);
    setCurrentIndex(0);
    setSelectedIndex(null);
    setAnswered(false);
    setResult(null);
  }

  const scoreEntries = Object.entries(scores).sort(
    ([, a], [, b]) => b.correct - a.correct || a.total - b.total
  );
  const myScore = scores[userId];

  return {
    questions,
    scores,
    currentIndex,
    selectedIndex,
    answered,
    result,
    generating,
    showResults,
    setShowResults,
    sourcesSummary,
    quizCount,
    setQuizCount,
    difficulty,
    setDifficulty,
    includeTF,
    setIncludeTF,
    scoreEntries,
    myScore,
    handleGenerate,
    handleSelectOption,
    handlePrevious,
    handleNext,
    getOptionClass,
    resetToReview,
  };
}
