import type { LessonContextInfo } from "../../../../types";
import { useChannelQuiz } from "./useChannelQuiz";
import QuizEmptyState from "./QuizEmptyState";
import QuizResultsView from "./QuizResultsView";
import QuizQuestionView from "./QuizQuestionView";

interface Props {
  channelId: string;
  topic: string;
  serverName: string;
  userId: string;
  nickname: string;
  lessonContext?: LessonContextInfo | null;
}

export default function ChannelQuiz({ channelId, topic, serverName, userId, nickname }: Props) {
  const {
    questions,
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
  } = useChannelQuiz(channelId, topic, serverName, userId, nickname);

  if (questions.length === 0 && !showResults) {
    return (
      <QuizEmptyState
        topic={topic}
        generating={generating}
        quizCount={quizCount}
        setQuizCount={setQuizCount}
        difficulty={difficulty}
        setDifficulty={setDifficulty}
        includeTF={includeTF}
        setIncludeTF={setIncludeTF}
        handleGenerate={handleGenerate}
      />
    );
  }

  if (showResults) {
    return (
      <QuizResultsView
        topic={topic}
        userId={userId}
        myScore={myScore}
        scoreEntries={scoreEntries}
        generating={generating}
        handleGenerate={handleGenerate}
        resetToReview={resetToReview}
      />
    );
  }

  return (
    <QuizQuestionView
      topic={topic}
      questions={questions}
      currentIndex={currentIndex}
      selectedIndex={selectedIndex}
      answered={answered}
      result={result}
      sourcesSummary={sourcesSummary}
      myScore={myScore}
      getOptionClass={getOptionClass}
      handleSelectOption={handleSelectOption}
      handlePrevious={handlePrevious}
      handleNext={handleNext}
      setShowResults={setShowResults}
    />
  );
}
