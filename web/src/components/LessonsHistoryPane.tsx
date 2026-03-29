import { motion } from "framer-motion";
import { ModeId } from "../types";
import { ConfirmModal } from "./ui/ConfirmModal";
import { Input } from "./ui/Input";
import PaneInfoBanner from "./ui/PaneInfoBanner";
import { useLessonsHistory } from "../hooks/useLessonsHistory";
import { NoLessonsEmpty } from "./ui/EmptyState";
import { ListSkeleton } from "./ui/Skeleton";
import LessonCard from "./lessons-history/LessonCard";
import CourseGroup from "./lessons-history/CourseGroup";
import SharedLessons from "./lessons-history/SharedLessons";
import DeleteLessonModal from "./lessons-history/DeleteLessonModal";
import { tLang } from "../utils/i18n";

interface Props {
  setMode: (m: ModeId) => void;
  setQuiz: (q: string[]) => void;
  onSelectLesson: (id: string) => void;
  currentLessonId: string | null;
  onLessonDeleted?: () => void;
  lang?: 'tr' | 'en';
}

export default function LessonsHistoryPane({ setMode, setQuiz, onSelectLesson, currentLessonId, onLessonDeleted, lang = 'tr' }: Props) {
  const {
    t, lessons, search, setSearch, loading,
    deleteTarget, setDeleteTarget, deleting,
    shares, setShares,
    selectedIds, toggleSelect,
    bulkDeleting, handleBulkDelete,
    showBulkConfirm, setShowBulkConfirm, executeBulkDelete,
    collapsedCourses, toggleCourseCollapse,
    handleDelete, filtered, grouped, ungrouped,
    formatDate,
  } = useLessonsHistory({ currentLessonId, onLessonDeleted, lang });

  const searchIcon = <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;

  return (
    <motion.div
      className="history-pane"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
    >
      <ConfirmModal
        isOpen={showBulkConfirm}
        onConfirm={executeBulkDelete}
        onCancel={() => setShowBulkConfirm(false)}
        title={tLang("history.bulkDelete", lang)}
        message={tLang("history.bulkDeleteMsg", lang, { count: selectedIds.size })}
        confirmLabel={tLang("history.yesDelete", lang)}
        cancelLabel={tLang("common.cancel", lang)}
        variant="danger"
      />
      <PaneInfoBanner
        id="lessons-history"
        title={tLang("history.title", lang)}
        description={tLang("history.desc", lang)}
        tips={[tLang("history.tipSearch", lang), tLang("history.tipBulkDelete", lang), tLang("history.tipAssignCourse", lang), tLang("history.tipShares", lang)]}
      />
      <div className="flex-between mb-4 items-center">
        <h2 className="text-xl font-bold m-0">{t.myLessons}</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {selectedIds.size > 0 && (
            <button
              className="btn"
              style={{ background: 'var(--danger)', color: 'white', fontSize: 12, padding: '4px 12px' }}
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
            >
              {bulkDeleting ? '...' : `${tLang("common.delete", lang)} (${selectedIds.size})`}
            </button>
          )}
          <span className="badge badge-gray">{lessons.length} {t.lesson}</span>
        </div>
      </div>

      <div style={{ maxWidth: 320, marginBottom: "var(--space-4)" }}>
        <Input
          placeholder={t.searchPlaceholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={searchIcon}
          inputSize="sm"
        />
      </div>

      {loading && <ListSkeleton count={3} />}

      <div className="grid-gap-12">
        {filtered.length === 0 && !loading && (
          search
            ? <div className="p-4 border rounded text-center op-60">{t.noResults}</div>
            : <NoLessonsEmpty />
        )}

        {grouped.map((group) => (
          <CourseGroup
            key={group.courseId}
            group={group}
            isCollapsed={collapsedCourses.has(group.courseId)}
            onToggleCollapse={toggleCourseCollapse}
            currentLessonId={currentLessonId}
            selectedIds={selectedIds}
            t={t}
            onSelectLesson={onSelectLesson}
            toggleSelect={toggleSelect}
            setDeleteTarget={setDeleteTarget}
            formatDate={formatDate}
          />
        ))}

        {ungrouped.length > 0 && grouped.length > 0 && (
          <div style={{ padding: "6px 10px", fontSize: 13, fontWeight: 600, color: "var(--muted)", marginTop: 4 }}>
            {tLang("history.otherLessons", lang)}
          </div>
        )}
        {ungrouped.map((l: any) => (
          <LessonCard
            key={l.id}
            lesson={l}
            isActive={l.id === currentLessonId}
            isSelected={selectedIds.has(l.id)}
            t={t}
            onSelect={onSelectLesson}
            onToggleCheck={toggleSelect}
            onDeleteClick={(id, title) => setDeleteTarget({ id, title })}
            formatDate={formatDate}
          />
        ))}
      </div>

      <SharedLessons shares={shares} setShares={setShares} formatDate={formatDate} />

      {deleteTarget && (
        <DeleteLessonModal
          deleteTarget={deleteTarget}
          deleting={deleting}
          t={t}
          onDelete={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </motion.div>
  );
}
