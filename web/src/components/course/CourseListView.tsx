import type { Course } from "../../types";
import { CreateCourseModal } from "./CreateCourseModal";
import PaneInfoBanner from "../ui/PaneInfoBanner";
import { EmptyState } from "../ui/EmptyState";
import { t } from "../../utils/i18n";

const ChevronIcon = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" opacity={0.4}>
    <path d="M6 3l5 5-5 5" />
  </svg>
);

const BookIcon = (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
    <line x1="9" y1="7" x2="16" y2="7" />
    <line x1="9" y1="11" x2="13" y2="11" />
  </svg>
);

interface CourseListViewProps {
  courses: Course[];
  showCreateModal: boolean;
  onShowCreateModal: (show: boolean) => void;
  onSelectCourse: (id: string) => void;
}

export function CourseListView({ courses, showCreateModal, onShowCreateModal, onSelectCourse }: CourseListViewProps) {
  return (
    <div className="lc-section" style={{ padding: 24 }}>
      <PaneInfoBanner
        id="course-dashboard"
        title={t("course.dashboardTitle")}
        description={t("course.dashboardDesc")}
        tips={[t("course.dashboardTip1"), t("course.dashboardTip2"), t("course.dashboardTip3"), t("course.dashboardTip4")]}
      />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 className="h2">{t("course.title")}</h2>
        <button className="btn btn-primary" onClick={() => onShowCreateModal(true)}>{t("course.newCourse")}</button>
      </div>

      {courses.length === 0 ? (
        <EmptyState
          icon={BookIcon}
          title={t("course.noCourses")}
          description={t("course.noCoursesDesc")}
          hint={t("course.noCoursesHint")}
          action={{ label: t("course.createFirst"), onClick: () => onShowCreateModal(true) }}
        />
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {courses.map((c) => (
            <div
              key={c.id}
              className="card"
              style={{ padding: "12px 16px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
              onClick={() => onSelectCourse(c.id)}
            >
              <div>
                <div style={{ fontWeight: 600 }}>
                  <span style={{ color: "var(--accent-2)", marginRight: 8 }}>{c.code}</span>
                  {c.name}
                </div>
                <div className="muted small">
                  {c.lessonIds.length} {c.lessonIds.length !== 1 ? t("course.lessons") : t("course.lesson")}
                  {c.settings?.examDate ? ` | ${t("course.exam")}: ${c.settings.examDate}` : ""}
                </div>
              </div>
              {ChevronIcon}
            </div>
          ))}
        </div>
      )}

      {showCreateModal && <CreateCourseModal onClose={() => onShowCreateModal(false)} />}
    </div>
  );
}
