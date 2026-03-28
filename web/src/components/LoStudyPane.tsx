import { LoStudyModule } from "../types";
import { useLoStudy } from "../hooks/useLoStudy";
import PaneInfoBanner from "./ui/PaneInfoBanner";
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
      <div className="lc-section" style={{ textAlign: "center", padding: 60 }}>
        <div style={{ marginBottom: 16, opacity: 0.5 }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
        </div>
        <p className="fw-600 fs-16">{t("loStudy.noModules")}</p>
        <p className="text-muted fs-12">{t("loStudy.noModulesDesc")}</p>
      </div>
    );
  }

  return (
    <div
      ref={loContentRef}
      style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 16, minHeight: 500 }}
    >
      <div style={{ gridColumn: "1 / -1" }}>
        <PaneInfoBanner
          id="lo-study"
          title={t("loStudy.title")}
          description={t("loStudy.desc")}
          tips={[t("loStudy.tips1"), t("loStudy.tips2"), t("loStudy.tips3"), t("loStudy.tips4")]}
        />
      </div>

      <aside style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
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
    </div>
  );
}
