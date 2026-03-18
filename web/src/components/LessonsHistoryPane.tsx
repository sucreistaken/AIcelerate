import { logger } from "../utils/logger";
// src/components/LessonsHistoryPane.tsx

import React, { useEffect, useState, useMemo } from "react";
import toast from "react-hot-toast";
import { API_BASE } from "../config";
import { ModeId, SharedBundle } from "../types";
import { lessonsApi, sharesApi } from "../services/api";
import { useCourseStore } from "../stores/courseStore";
import { ConfirmModal } from "./ui/ConfirmModal";
import PaneInfoBanner from "./ui/PaneInfoBanner";

// Tarih formatlayıcı (Örn: "2 Ara 2025, 14:30")
const formatDate = (d?: string, locale: string = "tr-TR") => {
  if (!d) return "";
  return new Date(d).toLocaleDateString(locale, {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
  });
};

const labels = {
  tr: {
    myLessons: "Kayıtlı Derslerim",
    lesson: "Ders",
    searchPlaceholder: "Ders ara...",
    loading: "Dersler yükleniyor...",
    noResults: "Ders bulunamadı.",
    noLessons: "Henüz hiç dersin yok.",
    currentlyOpen: "Şu an açık",
    deleteLesson: "Dersi Sil",
    concepts: "Kavram",
    open: "Açık",
    explore: "İncele →",
    deleteTitle: "Dersi Sil",
    deleteConfirm: "dersini silmek istediğinize emin misiniz? Bu işlem geri alınamaz.",
    cancel: "İptal",
    deleting: "Siliniyor...",
    yesDelete: "Evet, Sil",
    deleteFailed: "Silme işlemi başarısız oldu.",
  },
  en: {
    myLessons: "My Lessons",
    lesson: "Lesson",
    searchPlaceholder: "Search lessons...",
    loading: "Loading lessons...",
    noResults: "No lessons found.",
    noLessons: "You don't have any lessons yet.",
    currentlyOpen: "Currently open",
    deleteLesson: "Delete Lesson",
    concepts: "Concepts",
    open: "Open",
    explore: "Explore →",
    deleteTitle: "Delete Lesson",
    deleteConfirm: "are you sure you want to delete this lesson? This action cannot be undone.",
    cancel: "Cancel",
    deleting: "Deleting...",
    yesDelete: "Yes, Delete",
    deleteFailed: "Deletion failed.",
  },
};

interface Props {
  setMode: (m: ModeId) => void;
  setQuiz: (q: string[]) => void;
  onSelectLesson: (id: string) => void;
  currentLessonId: string | null;
  onLessonDeleted?: () => void;
  lang?: 'tr' | 'en';
}

export default function LessonsHistoryPane({ setMode, setQuiz, onSelectLesson, currentLessonId, onLessonDeleted, lang = 'tr' }: Props) {
  const t = labels[lang];
  const [lessons, setLessons] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [shares, setShares] = useState<SharedBundle[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.size) return;
    setShowBulkConfirm(true);
  };

  const executeBulkDelete = async () => {
    setShowBulkConfirm(false);
    setBulkDeleting(true);
    for (const id of selectedIds) {
      await lessonsApi.delete(id);
      if (id === currentLessonId) onLessonDeleted?.();
    }
    setLessons(prev => prev.filter(l => !selectedIds.has(l.id)));
    setSelectedIds(new Set());
    setBulkDeleting(false);
    toast.success(lang === 'tr' ? 'Dersler silindi' : 'Lessons deleted');
  };

  // Load shares
  useEffect(() => {
    sharesApi.list().then((res) => {
      if (res.ok && res.shares) setShares(res.shares);
    }).catch(() => {});
  }, []);

  // Dersleri yükle
  const loadLessons = () => {
    setLoading(true);
    fetch(`${API_BASE}/api/lessons`)
      .then((r) => r.json())
      .then((j) => {
        if (Array.isArray(j)) {
          const sorted = j.sort((a, b) => (new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()));
          setLessons(sorted);
        }
      })
      .catch((e) => logger.warn(e))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadLessons();
  }, []);

  // Ders silme
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const result = await lessonsApi.delete(deleteTarget.id);
    setDeleting(false);
    if (result.ok) {
      setLessons(prev => prev.filter(l => l.id !== deleteTarget.id));
      setDeleteTarget(null);
      if (deleteTarget.id === currentLessonId) {
        onLessonDeleted?.();
      }
    } else {
      toast.error(result.error || t.deleteFailed);
    }
  };

  const courses = useCourseStore((s) => s.courses);

  // Arama filtresi
  const filtered = lessons.filter(l =>
    l.title.toLowerCase().includes(search.toLowerCase())
  );

  // Group lessons by course
  const { grouped, ungrouped } = useMemo(() => {
    const courseGroups: Array<{ courseId: string; code: string; name: string; lessons: any[] }> = [];
    const assignedIds = new Set<string>();

    for (const course of courses) {
      const courseLessons = filtered.filter((l) => course.lessonIds.includes(l.id));
      if (courseLessons.length > 0) {
        courseGroups.push({ courseId: course.id, code: course.code, name: course.name, lessons: courseLessons });
        courseLessons.forEach((l) => assignedIds.add(l.id));
      }
    }

    const ungroupedLessons = filtered.filter((l) => !assignedIds.has(l.id));
    return { grouped: courseGroups, ungrouped: ungroupedLessons };
  }, [filtered, courses]);

  const [collapsedCourses, setCollapsedCourses] = useState<Set<string>>(new Set());
  const toggleCourseCollapse = (courseId: string) => {
    setCollapsedCourses((prev) => {
      const next = new Set(prev);
      if (next.has(courseId)) next.delete(courseId);
      else next.add(courseId);
      return next;
    });
  };

  const renderLessonCard = (l: any) => {
    const isActive = l.id === currentLessonId;
    const hasTranscript = !!l.transcript;
    const quizCount = l.plan?.seed_quiz?.length || 0;
    return (
      <div
        key={l.id}
        className={`lesson-card ${isActive ? "lesson-card--active" : ""}`}
      >
        <div className="flex-between">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
            <input
              type="checkbox"
              checked={selectedIds.has(l.id)}
              onChange={() => toggleSelect(l.id)}
              onClick={e => e.stopPropagation()}
              style={{ cursor: 'pointer', accentColor: 'var(--accent-2)' }}
            />
            <div
              className="font-bold text-lg truncate pr-2 cursor-pointer flex-1"
              title={l.title}
              onClick={() => onSelectLesson(l.id)}
            >
              {l.title}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {isActive && <div className="active-dot" title={t.currentlyOpen}></div>}
            <button
              className="btn-icon-danger"
              title={t.deleteLesson}
              onClick={(e) => {
                e.stopPropagation();
                setDeleteTarget({ id: l.id, title: l.title });
              }}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                opacity: 0.6,
                transition: 'opacity 0.2s',
                fontSize: 16,
                padding: 4,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.6')}
            >
              🗑️
            </button>
          </div>
        </div>
        <div className="text-xs op-60 mt-1 flex-between" onClick={() => onSelectLesson(l.id)}>
          <span>📅 {formatDate(l.date)}</span>
        </div>
        <div className="mt-3 flex gap-2" style={{ flexWrap: 'wrap' }} onClick={() => onSelectLesson(l.id)}>
          {l.highlights?.length > 0 && (
            <span className="text-xs lh-badge-concept">
              {l.highlights.length} {t.concepts}
            </span>
          )}
          {hasTranscript && (
            <span className="text-xs" style={{ padding: '2px 6px', borderRadius: 4, background: 'rgba(0,184,148,0.15)', color: '#00b894', fontWeight: 600 }}>
              Transcript
            </span>
          )}
          {quizCount > 0 && (
            <span className="text-xs" style={{ padding: '2px 6px', borderRadius: 4, background: 'rgba(253,203,110,0.2)', color: '#e17055', fontWeight: 600 }}>
              {quizCount} Quiz
            </span>
          )}
          <span className="text-xs lh-badge-action">
            {isActive ? t.open : t.explore}
          </span>
        </div>
      </div>
    );
  };

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
      {/* Header */}
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

      {/* Search Bar */}
      <div className="mb-4 relative">
        <input
          className="lc-textarea input w-full pl-8"
          placeholder={t.searchPlaceholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <span className="absolute left-2 top-2 opacity-50">🔍</span>
      </div>

      {/* Loading State */}
      {loading && <div className="p-4 text-center op-60">{t.loading}</div>}

      {/* Liste */}
      <div className="grid-gap-12">
        {filtered.length === 0 && !loading && (
          <div className="p-4 border rounded text-center op-60 lh-empty">
            {search ? t.noResults : t.noLessons}
          </div>
        )}

        {/* Grouped by course */}
        {grouped.map((group) => (
          <div key={group.courseId} style={{ marginBottom: 8 }}>
            <div
              className="lh-course-header"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 10px",
                cursor: "pointer",
                borderRadius: 8,
                background: "var(--card-hover, rgba(0,0,0,0.03))",
                marginBottom: 6,
              }}
              onClick={() => toggleCourseCollapse(group.courseId)}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 16 16"
                fill="currentColor"
                style={{
                  transform: collapsedCourses.has(group.courseId) ? "rotate(-90deg)" : "rotate(0deg)",
                  transition: "transform 0.2s",
                }}
              >
                <path d="M4 4l4 4-4 4" />
              </svg>
              <span style={{ fontWeight: 600, color: "var(--accent-2)", fontSize: 13 }}>{group.code}</span>
              <span style={{ fontWeight: 500, fontSize: 13 }}>{group.name}</span>
              <span className="muted small" style={{ marginLeft: "auto" }}>{group.lessons.length}</span>
            </div>
            {!collapsedCourses.has(group.courseId) && group.lessons.map((l) => renderLessonCard(l))}
          </div>
        ))}

        {/* Ungrouped lessons */}
        {ungrouped.length > 0 && grouped.length > 0 && (
          <div style={{ padding: "6px 10px", fontSize: 13, fontWeight: 600, color: "var(--muted)", marginTop: 4 }}>
            Other Lessons
          </div>
        )}
        {ungrouped.map((l) => renderLessonCard(l))}
      </div>

      {/* Shared Lessons Section */}
      {shares.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <div className="shared-section-title">
            Shared Lessons ({shares.length})
          </div>
          <div className="grid-gap-10">
            {shares.map((share) => (
              <div key={share.shareId} className="shared-lesson-card">
                <div className="shared-lesson-header">
                  <span className="shared-lesson-title">{share.bundle.title}</span>
                  <span className="status-badge status-badge--info">
                    {share.accessCount} views
                  </span>
                </div>
                <div className="shared-lesson-meta">
                  <span>{formatDate(share.createdAt)}</span>
                  <span>Expires: {formatDate(share.expiresAt)}</span>
                </div>
                <div className="shared-lesson-actions">
                  <button
                    className="btn-small"
                    onClick={() => {
                      const url = `${window.location.origin}?share=${share.shareId}`;
                      navigator.clipboard.writeText(url).then(() => toast.success("Link copied!"));
                    }}
                  >
                    Copy Link
                  </button>
                  <button
                    className="fc-delete-btn"
                    onClick={async () => {
                      await sharesApi.delete(share.shareId);
                      setShares((s) => s.filter((sh) => sh.shareId !== share.shareId));
                      toast.success("Share deleted");
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
          onClick={() => setDeleteTarget(null)}
        >
          <div
            style={{
              background: 'var(--card)',
              padding: 24,
              borderRadius: 16,
              maxWidth: 400,
              width: '90%',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 40, textAlign: 'center', marginBottom: 16 }}>⚠️</div>
            <h3 style={{ textAlign: 'center', marginBottom: 8, fontWeight: 700 }}>{t.deleteTitle}</h3>
            <p style={{ textAlign: 'center', color: 'var(--muted)', marginBottom: 24 }}>
              "<strong>{deleteTarget.title}</strong>" — {t.deleteConfirm}
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                className="btn btn-ghost"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
              >
                {t.cancel}
              </button>
              <button
                className="btn"
                style={{ background: 'var(--danger)', color: 'white' }}
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? t.deleting : t.yesDelete}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
