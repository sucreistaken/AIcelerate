import React, { Suspense, lazy } from "react";
import { motion, AnimatePresence } from "framer-motion";

import { useApp } from "./hooks/useApp";

import { MobileNav } from "./components/layout/MobileNav";
import ShareModal from "./components/ui/ShareModal";
import AuthGuard from "./components/auth/AuthGuard";
import AmbientBackground from "./components/ui/AmbientBackground";
import CursorGlow from "./components/ui/CursorGlow";
import { KeyboardShortcuts } from "./components/ui/KeyboardShortcuts";
import { OnboardingTour } from "./components/ui/OnboardingTour";

import PaneRouter from "./components/layout/PaneRouter";
import SchedulerWidget from "./components/SchedulerWidget";
import AppNavbar from "./components/layout/AppNavbar";
import AppSidebar from "./components/layout/AppSidebar";
import UploadDrawer from "./components/layout/UploadDrawer";

const SettingsPage = lazy(() => import("./components/settings/SettingsPage"));
const AdminApp = lazy(() => import("./admin/AdminApp"));

export default function App() {
  if (window.location.pathname.startsWith("/admin")) {
    return (
      <Suspense fallback={null}>
        <AdminApp />
      </Suspense>
    );
  }

  const {
    lesson,
    transcription,
    ui,
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

        <div className="app-layout">
          {!isMobile && (
            <AppSidebar onOpenUpload={ui.toggleUploadDrawer} />
          )}

          <main className="app-main" role="main" aria-label="Study content">
            {(ui.mode === "dashboard" || ui.mode === "plan") && (
              <SchedulerWidget />
            )}
            <PaneRouter mode={ui.mode} lesson={lesson} ui={ui} />
          </main>
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

        <UploadDrawer
          open={ui.showUploadDrawer}
          onClose={ui.toggleUploadDrawer}
          lesson={lesson}
          ui={ui}
          transcription={transcription}
          canSubmit={canSubmit}
          onSubmit={handleSubmit}
          onPdfUpload={handlePdfUpload}
          onAudioUpload={handleAudioUpload}
        />

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
