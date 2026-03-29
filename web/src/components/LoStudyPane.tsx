import { motion } from "framer-motion";
import { LoStudyModule } from "../types";
import { useLoStudy } from "../hooks/useLoStudy";
import PaneInfoBanner from "./ui/PaneInfoBanner";
import { EmptyState } from "./ui/EmptyState";
import { t } from "../utils/i18n";
import LoProgressSidebar from "./lo-study/LoProgressSidebar";
import LoModuleList from "./lo-study/LoModuleList";
import LoModuleDetail from "./lo-study/LoModuleDetail";

type Props = {
  modules: LoStudyModule[];
};

export default function LoStudyPane({ modules }: Props) {
  const {
    loContentRef,
    active,
    activeLoId,
    completedSet,
    expandedSections,
    quizRevealed,
    pdfLoading,
    progress,
    completedCount,
    totalCount,
    completedTime,
    totalTime,
    handleExportPdf,
    handleToggleComplete,
    handleSelectModule,
    toggleSection,
    toggleQuizAnswer,
  } = useLoStudy(modules);

  if (!modules || !modules.length) {
    return (
      <motion.div
        className="lc-section"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      >
        <EmptyState
          title={t("loStudy.noModules")}
          description={t("loStudy.noModulesDesc")}
        />
      </motion.div>
    );
  }

  return (
    <motion.div
      ref={loContentRef}
      className="lo-study-grid"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="lo-study-grid__banner">
        <PaneInfoBanner
          id="lo-study"
          title={t("loStudy.title")}
          description={t("loStudy.desc")}
          tips={[t("loStudy.tips1"), t("loStudy.tips2"), t("loStudy.tips3"), t("loStudy.tips4")]}
        />
      </div>

      <aside className="lo-study-grid__sidebar">
        <LoProgressSidebar
          progress={progress}
          completedCount={completedCount}
          totalCount={totalCount}
          completedTime={completedTime}
          totalTime={totalTime}
          pdfLoading={pdfLoading}
          onExportPdf={handleExportPdf}
        />
        <LoModuleList
          modules={modules}
          activeLoId={activeLoId}
          completedSet={completedSet}
          onSelectModule={handleSelectModule}
        />
      </aside>

      {active && (
        <LoModuleDetail
          module={active}
          isCompleted={completedSet.has(active.loId)}
          expandedSections={expandedSections}
          quizRevealed={quizRevealed}
          onToggleComplete={handleToggleComplete}
          onToggleSection={toggleSection}
          onToggleQuizAnswer={toggleQuizAnswer}
        />
      )}
    </motion.div>
  );
}
