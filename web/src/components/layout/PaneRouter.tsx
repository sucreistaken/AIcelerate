// src/components/layout/PaneRouter.tsx
import React, { Suspense, lazy } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PaneErrorBoundary } from "../ui/ErrorBoundary";
import { NoPlanEmpty } from "../ui/EmptyState";
import MultiSelectionBanner from "../ui/MultiSelectionBanner";
import PaneLoading from "./PaneLoading";
import type { ModeId } from "../../types";

// Lazy loaded panes
const PlanPane = lazy(() => import("../PlanPane"));
const AlignmentPane = lazy(() => import("../AlignmentPane"));
const LecturerNotePane = lazy(() => import("../LecturerNotePane"));
const QuizPane = lazy(() => import("../QuizPane"));
const LoStudyPane = lazy(() => import("../LoStudyPane"));
const CheatSheetPane = lazy(() => import("../CheatSheetPane"));
const LessonsHistoryPane = lazy(() => import("../LessonsHistoryPane"));
const DeepDivePane = lazy(() => import("../DeepDivePane"));
const DeviationPane = lazy(() => import("../DeviationPane"));
const MindMapPane = lazy(() => import("../MindMapPane"));
const NotesPane = lazy(() => import("../NotesPane"));
const FlashcardPane = lazy(() => import("../FlashcardPane"));
const ConnectionsPane = lazy(() => import("../ConnectionsPane"));
const CourseDashboard = lazy(() => import("../CourseDashboard"));
const StudyHub = lazy(() => import("../collab/layout/StudyHub"));
const WelcomeGuide = lazy(() => import("../ui/WelcomeGuide"));
const LessonWizard = lazy(() => import("../lesson-wizard/LessonWizard"));

interface PaneRouterProps {
  mode: ModeId;
  lesson: {
    plan: any;
    deviation: any;
    lectureText: string;
    slidesText: string;
    learningOutcomes: string[];
    loAlignment: any;
    quiz: any;
    setQuiz: (q: any) => void;
    loModules: any;
    cheatSheet: any;
    currentLessonId: string | null;
    setCurrentLessonId: (id: string | null) => void;
    analyzeDeviation: () => void;
    reanalyzeDeviation: () => void;
    generateCheatSheet: () => void;
  };
  ui: {
    mode: ModeId;
    setMode: (m: ModeId) => void;
    devLoading: boolean;
    devErr: string | null;
    cheatLoading: boolean;
    cheatErr: string | null;
  };
}

function PaneRouter({ mode, lesson, ui }: PaneRouterProps) {
  return (
    <PaneErrorBoundary key={`eb-${mode}`}>
      <MultiSelectionBanner />
      <Suspense fallback={<PaneLoading />}>
        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {mode === "plan" && (
              lesson.plan ? <PlanPane plan={lesson.plan} /> : (lesson.currentLessonId ? <NoPlanEmpty /> : <WelcomeGuide />)
            )}

            {mode === "alignment" && (
              lesson.plan ? (
                <AlignmentPane plan={lesson.plan} deviation={lesson.deviation} />
              ) : (
                <NoPlanEmpty />
              )
            )}

            {mode === "deviation" && (
              <DeviationPane
                deviation={lesson.deviation as any}
                loading={ui.devLoading}
                error={ui.devErr}
                onGenerate={lesson.analyzeDeviation}
                onReanalyze={lesson.reanalyzeDeviation}
              />
            )}

            {mode === "lecturer-note" && (
              <LecturerNotePane
                lectureText={lesson.lectureText}
                slidesText={lesson.slidesText}
                emphases={lesson.plan?.emphases || []}
                learningOutcomes={lesson.learningOutcomes}
                loAlignment={lesson.loAlignment}
              />
            )}

            {mode === "quiz" && (
              <QuizPane
                quiz={lesson.quiz}
                setQuiz={lesson.setQuiz}
                hasPlan={!!lesson.plan}
                plan={lesson.plan}
              />
            )}

            {mode === "lo-study" && <LoStudyPane modules={lesson.loModules || []} />}

            {mode === "cheat-sheet" && (
              <CheatSheetPane
                cheatSheet={lesson.cheatSheet}
                loading={ui.cheatLoading}
                error={ui.cheatErr}
                onGenerate={lesson.generateCheatSheet}
              />
            )}

            {mode === "history" && (
              <LessonsHistoryPane
                currentLessonId={lesson.currentLessonId}
                setMode={ui.setMode}
                setQuiz={lesson.setQuiz}
                onSelectLesson={(id: string) => {
                  lesson.setCurrentLessonId(id);
                  ui.setMode("plan");
                }}
              />
            )}

            {mode === "deep-dive" && <DeepDivePane />}
            {mode === "mindmap" && <MindMapPane />}

            {mode === "flashcards" && <FlashcardPane />}
            {mode === "connections" && <ConnectionsPane />}
            {mode === "notes" && <NotesPane />}

            {mode === "study-hub" && <StudyHub />}
            {mode === "course-dashboard" && <CourseDashboard />}
            {mode === "create-lesson" && <LessonWizard />}
          </motion.div>
        </AnimatePresence>
      </Suspense>
    </PaneErrorBoundary>
  );
}

export default PaneRouter;
