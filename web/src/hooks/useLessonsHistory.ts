import { useEffect, useState, useMemo } from "react";
import toast from "react-hot-toast";
import { API_BASE } from "../config";
import { SharedBundle } from "../types";
import { lessonsApi, sharesApi } from "../services/api";
import { useCourseStore } from "../stores/courseStore";
import { logger } from "../utils/logger";
import { t as i18nt } from "../utils/i18n";

const formatDate = (d?: string, locale: string = "tr-TR") => {
  if (!d) return "";
  return new Date(d).toLocaleDateString(locale, {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
  });
};

export const labels = {
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
    transcript: "Transkript",
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
    transcript: "Transcript",
    deleteTitle: "Delete Lesson",
    deleteConfirm: "are you sure you want to delete this lesson? This action cannot be undone.",
    cancel: "Cancel",
    deleting: "Deleting...",
    yesDelete: "Yes, Delete",
    deleteFailed: "Deletion failed.",
  },
};

export { formatDate };

interface UseLessonsHistoryArgs {
  currentLessonId: string | null;
  onLessonDeleted?: () => void;
  lang: 'tr' | 'en';
}

export function useLessonsHistory({ currentLessonId, onLessonDeleted, lang }: UseLessonsHistoryArgs) {
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
  const [collapsedCourses, setCollapsedCourses] = useState<Set<string>>(new Set());

  const courses = useCourseStore((s) => s.courses);

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
    const deletedIds = new Set<string>();
    let failCount = 0;
    for (const id of selectedIds) {
      const result = await lessonsApi.delete(id);
      if (result.ok) {
        deletedIds.add(id);
        if (id === currentLessonId) onLessonDeleted?.();
      } else {
        failCount++;
      }
    }
    setLessons(prev => prev.filter(l => !deletedIds.has(l.id)));
    setSelectedIds(new Set());
    setBulkDeleting(false);
    if (failCount > 0) {
      toast.error(i18nt("error.lessonDeleteFailed", { count: failCount }));
    }
    if (deletedIds.size > 0) {
      toast.success(i18nt("error.lessonsDeleted", { count: deletedIds.size }));
    }
  };

  useEffect(() => {
    sharesApi.list().then((res) => {
      if (res.ok && res.shares) setShares(res.shares);
    }).catch(() => {});
  }, []);

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

  const filtered = lessons.filter(l =>
    l.title.toLowerCase().includes(search.toLowerCase())
  );

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

  const toggleCourseCollapse = (courseId: string) => {
    setCollapsedCourses((prev) => {
      const next = new Set(prev);
      if (next.has(courseId)) next.delete(courseId);
      else next.add(courseId);
      return next;
    });
  };

  return {
    t, lessons, search, setSearch, loading,
    deleteTarget, setDeleteTarget, deleting,
    shares, setShares,
    selectedIds, toggleSelect,
    bulkDeleting, handleBulkDelete,
    showBulkConfirm, setShowBulkConfirm, executeBulkDelete,
    collapsedCourses, toggleCourseCollapse,
    handleDelete, filtered, grouped, ungrouped,
    formatDate,
  };
}
