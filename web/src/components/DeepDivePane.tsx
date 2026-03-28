import { motion } from "framer-motion";
import PaneInfoBanner from "./ui/PaneInfoBanner";
import { useDeepDive } from "../hooks/useDeepDive";
import { t } from "../utils/i18n";
import DeepDiveHeader from "./deepdive/DeepDiveHeader";
import DeepDiveWelcome from "./deepdive/DeepDiveWelcome";
import DeepDiveMessageList from "./deepdive/DeepDiveMessageList";
import DeepDiveInputArea from "./deepdive/DeepDiveInputArea";
import { ThinkingIndicator, ScrollToBottomButton, SavedToast } from "./deepdive/DeepDiveOverlays";

export default function DeepDivePane() {
  const dd = useDeepDive();

  if (!dd.currentLessonId) return (
    <div className="dd-no-lesson">
      <div className="dd-no-lesson-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg></div>
      <div>Select a lesson to start a conversation</div>
    </div>
  );

  return (
    <motion.div
      className="dd-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <PaneInfoBanner
        id="deep-dive"
        title={t("deepDive.title")}
        description={t("deepDive.desc")}
        tips={[t("deepDive.tips1"), t("deepDive.tips2"), t("deepDive.tips3"), t("deepDive.tips4")]}
      />

      <DeepDiveHeader
        sessions={dd.sessions}
        activeSessionId={dd.activeSessionId}
        activeSession={dd.activeSession}
        showSessionMenu={dd.showSessionMenu}
        setShowSessionMenu={dd.setShowSessionMenu}
        showStarredOnly={dd.showStarredOnly}
        setShowStarredOnly={dd.setShowStarredOnly}
        messages={dd.messages}
        menuRef={dd.menuRef}
        switchSession={dd.switchSession}
        deleteSession={dd.deleteSession}
        createNewChat={dd.createNewChat}
        exportToMarkdown={dd.exportToMarkdown}
        clearCurrentChat={dd.clearCurrentChat}
      />

      <div className="dd-messages" ref={dd.messagesRef}>
        {dd.isWelcome && <DeepDiveWelcome send={dd.send} />}

        {!dd.isWelcome && (
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
    </motion.div>
  );
}
