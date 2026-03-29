import React, { Suspense, lazy } from "react";
import { motion, AnimatePresence } from "framer-motion";

import { useApp } from "./hooks/useApp";

import ModeRibbon from "./components/ModeRibbon";
import { MobileNav } from "./components/layout/MobileNav";
import ShareModal from "./components/ui/ShareModal";
import AuthGuard from "./components/auth/AuthGuard";
import AmbientBackground from "./components/ui/AmbientBackground";
import CursorGlow from "./components/ui/CursorGlow";
import { KeyboardShortcuts } from "./components/ui/KeyboardShortcuts";
import { OnboardingTour } from "./components/ui/OnboardingTour";

import NavigationChip from "./components/layout/NavigationChip";
import PaneRouter from "./components/layout/PaneRouter";
import SchedulerWidget from "./components/SchedulerWidget";
import AppNavbar from "./components/layout/AppNavbar";
import AppLeftPanel from "./components/layout/AppLeftPanel";

const SettingsPage = lazy(() => import("./components/settings/SettingsPage"));

export default function App() {
  const {
    lesson,
    transcription,
    ui,
    leftPanelCollapsed,
    toggleLeftPanel,
    authUser,
    currentCourse,
    showSettings,
    setShowSettings,
    showShortcuts,
    openShortcuts,
    closeShortcuts,
    shareId,
    isMobile,
    canSubmit,
    handleAudioUpload,
    handlePdfUpload,
    handleSubmit,
    handleShareClose,
    handleShareImport,
  } = useApp();

  return (
    <AuthGuard>
      <div className="page" style={{ position: "relative" }}>
        <AmbientBackground />
        <CursorGlow />
        <AppNavbar
          language={ui.language}
          onToggleLanguage={() =>
            ui.setLanguage(ui.language === "tr" ? "en" : "tr")
          }
          onOpenSettings={() => setShowSettings(true)}
          onOpenShortcuts={openShortcuts}
        />

        <div className="lc-container">
          <header className="hero">
            <h1 className="h1">
              {lesson.lessons.find((l) => l.id === lesson.currentLessonId)
                ?.title || "AIcelerate"}
            </h1>
            <div className="hero-breadcrumb">
              {currentCourse && (
                <>
                  <span className="hero-breadcrumb__sep">/</span>
                  <span style={{ color: "var(--accent-2)" }}>
                    {currentCourse.code}
                  </span>
                </>
              )}
              <span className="hero-breadcrumb__sep">/</span>
              <span>
                {ui.mode
                  .replace(/-/g, " ")
                  .replace(/\b\w/g, (c) => c.toUpperCase())}
              </span>
            </div>
          </header>

          <NavigationChip />

          <div
            className={`lc-shell${ui.mode === "study-hub" ? " lc-shell--room" : ""}`}
          >
            {ui.mode !== "study-hub" && ui.mode !== "create-lesson" && (
              <AppLeftPanel
                collapsed={leftPanelCollapsed}
                onToggle={toggleLeftPanel}
                lesson={lesson}
                ui={ui}
                transcription={transcription}
                canSubmit={canSubmit}
                onSubmit={handleSubmit}
                onPdfUpload={handlePdfUpload}
                onAudioUpload={handleAudioUpload}
              />
            )}

            <main className="lc-plan-pane" role="main" aria-label="Study content">
              <ModeRibbon mode={ui.mode} setMode={ui.setMode} />
              {(ui.mode === "plan" || ui.mode === "course-dashboard") && (
                <SchedulerWidget />
              )}
              <PaneRouter mode={ui.mode} lesson={lesson} ui={ui} />
            </main>
          </div>
        </div>

        <AnimatePresence>
          {transcription.stt.toast && (
            <motion.div
              className="stt-toast"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
            >
              {transcription.stt.toast}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {shareId && (
            <ShareModal
              shareId={shareId}
              onClose={handleShareClose}
              onImport={handleShareImport}
            />
          )}
        </AnimatePresence>

        {isMobile && <MobileNav />}

        {/* Quick create modal removed - lessons are now created via Wizard only */}

        {showSettings && (
          <Suspense fallback={null}>
            <SettingsPage onClose={() => setShowSettings(false)} />
          </Suspense>
        )}

        <KeyboardShortcuts isOpen={showShortcuts} onClose={closeShortcuts} />
        <OnboardingTour />
      </div>
    </AuthGuard>
  );
}
