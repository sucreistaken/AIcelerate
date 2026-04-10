import { useState } from "react";
import { motion } from "framer-motion";
import PaneInfoBanner from "./ui/PaneInfoBanner";
import { useDeepDive } from "../hooks/useDeepDive";
import { t } from "../utils/i18n";
import DeepDiveHeader from "./deepdive/DeepDiveHeader";
import DeepDiveWelcome from "./deepdive/DeepDiveWelcome";
import DeepDiveMessageList from "./deepdive/DeepDiveMessageList";
import DeepDiveSidebar from "./deepdive/DeepDiveSidebar";
import DeepDiveInputArea from "./deepdive/DeepDiveInputArea";
import { ThinkingIndicator, ScrollToBottomButton, SavedToast } from "./deepdive/DeepDiveOverlays";

export default function DeepDivePane() {
  const dd = useDeepDive();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  if (!dd.currentLessonId) return (
    <div className="dd-empty">
      <div className="dd-empty__icon">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
      </div>
      <p className="dd-empty__text">{t("deepDive.selectLesson") || "Select a lesson to start exploring"}</p>
    </div>
  );

  return (
    <motion.div
      className="dd"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
      <PaneInfoBanner
        id="deep-dive"
        title={t("deepDive.title")}
        description={t("deepDive.desc")}
        tips={[t("deepDive.tips1"), t("deepDive.tips2"), t("deepDive.tips3"), t("deepDive.tips4")]}
      />

      <div className="dd__layout">
        {/* ── Main Chat Panel ── */}
        <div className="dd__main">
          <DeepDiveHeader
            sessionName={dd.activeSession?.name || "Chat"}
            sidebarOpen={sidebarOpen}
            toggleSidebar={() => setSidebarOpen(p => !p)}
            showStarredOnly={dd.showStarredOnly}
            setShowStarredOnly={dd.setShowStarredOnly}
            exportToMarkdown={dd.exportToMarkdown}
            clearCurrentChat={dd.clearCurrentChat}
          />

          <div className="dd__messages" ref={dd.messagesRef}>
            {dd.isWelcome ? (
              <DeepDiveWelcome send={dd.send} />
            ) : (
              <DeepDiveMessageList
                displayMessages={dd.displayMessages}
                messages={dd.messages}
                showStarredOnly={dd.showStarredOnly}
                hoveredMsg={dd.hoveredMsg}
                setHoveredMsg={dd.setHoveredMsg}
                copiedMsgIdx={dd.copiedMsgIdx}
                savedMsgIdx={dd.savedMsgIdx}
                currentLessonId={dd.currentLessonId}
                copyMessage={dd.copyMessage}
                toggleBookmark={dd.toggleBookmark}
                saveToNotes={dd.saveToNotes}
                send={dd.send}
              />
            )}

            <ThinkingIndicator loading={dd.loading} />
            <div ref={dd.bottomRef} />
            <ScrollToBottomButton show={dd.showScrollBtn} onClick={dd.scrollToBottom} />
            <SavedToast savedMsgIdx={dd.savedMsgIdx} />
          </div>

          <DeepDiveInputArea
            input={dd.input}
            setInput={dd.setInput}
            loading={dd.loading}
            textareaRef={dd.textareaRef}
            send={() => dd.send()}
          />
        </div>

        {/* ── Session Sidebar (Right) ── */}
        <DeepDiveSidebar
          open={sidebarOpen}
          sessions={dd.sessions}
          activeSessionId={dd.activeSessionId}
          switchSession={dd.switchSession}
          deleteSession={dd.deleteSession}
          createNewChat={dd.createNewChat}
        />
      </div>
    </motion.div>
  );
}
