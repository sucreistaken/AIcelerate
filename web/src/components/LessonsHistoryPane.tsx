import { ModeId } from "../types";
import { ConfirmModal } from "./ui/ConfirmModal";
import PaneInfoBanner from "./ui/PaneInfoBanner";
import { useLessonsHistory } from "../hooks/useLessonsHistory";
import { NoLessonsEmpty } from "./ui/EmptyState";
import LessonCard from "./lessons-history/LessonCard";
import CourseGroup from "./lessons-history/CourseGroup";
import SharedLessons from "./lessons-history/SharedLessons";
import DeleteLessonModal from "./lessons-history/DeleteLessonModal";

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

  return (
    <div className="history-pane">
      <ConfirmModal
        isOpen={showBulkConfirm}
        onConfirm={executeBulkDelete}
        onCancel={() => setShowBulkConfirm(false)}
        title={lang === 'tr' ? 'Toplu Silme' : 'Bulk Delete'}
        message={lang === 'tr'
          ? `${selectedIds.size} ders silinecek. Emin misiniz?`
          : `Delete ${selectedIds.size} lessons. Are you sure?`}
        confirmLabel={lang === 'tr' ? 'Evet, Sil' : 'Yes, Delete'}
        cancelLabel={lang === 'tr' ? 'İptal' : 'Cancel'}
        variant="danger"
      />
      <PaneInfoBanner
        id="lessons-history"
        title="Ders Geçmişi"
        description="Tüm derslerinizi görüntüleyin, arayın ve yönetin."
        tips={["Ders ara", "Toplu silme", "Kurs atama", "Paylaşımlar"]}
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
              {bulkDeleting ? '...' : `${lang === 'tr' ? 'Sil' : 'Delete'} (${selectedIds.size})`}
            </button>
          )}
          <span className="badge badge-gray">{lessons.length} {t.lesson}</span>
        </div>
      </div>

      <div style={{ position: "relative", marginBottom: "var(--space-4)" }}>
        <input
          style={{
            width: "100%",
            maxWidth: 320,
            padding: "6px 10px 6px 32px",
            fontSize: 13,
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            background: "var(--input-bg)",
            color: "var(--text)",
            outline: "none",
            transition: "border-color 0.15s, box-shadow 0.15s",
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = "var(--accent-2)"; e.currentTarget.style.boxShadow = "0 0 0 3px var(--accent-ring)"; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "none"; }}
          placeholder={t.searchPlaceholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", opacity: 0.4, display: "flex" }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        </span>
      </div>

      {loading && <div className="p-4 text-center op-60">{t.loading}</div>}

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
            {lang === 'tr' ? 'Diğer Dersler' : 'Other Lessons'}
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
    </div>
  );
}
