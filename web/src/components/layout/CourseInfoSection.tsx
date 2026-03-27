import React from "react";
import CollapsibleSection from "./CollapsibleSection";
import { t } from "../../utils/i18n";

interface CourseInfoSectionProps {
  lesson: {
    currentLessonId: string | null;
    courseCode: string;
    setCourseCode: (v: string) => void;
    learningOutcomes: string[];
    fetchLearningOutcomes: () => void;
    analyzeDeviation: () => void;
    alignWithLO: () => void;
    generateLoModules: () => void;
  };
  ui: {
    isLoading: boolean;
    loLoading: boolean;
    devLoading: boolean;
    devErr: string | null;
    loModulesLoading: boolean;
  };
}

export default function CourseInfoSection({ lesson, ui }: CourseInfoSectionProps) {
  return (
    <CollapsibleSection
      title={t("courseInfo.title")}
      summary={
        lesson.courseCode.trim()
          ? `${lesson.courseCode}${lesson.learningOutcomes.length ? ` · ${lesson.learningOutcomes.length} LOs` : ""}`
          : t("courseInfo.noCode")
      }
      defaultOpen={!lesson.courseCode.trim()}
    >
      <label className="label" htmlFor="course-code" style={{ marginTop: 8 }}>
        {t("courseInfo.syllabus")}
      </label>
      <div className="flex-between mb-2" style={{ gap: 8 }}>
        <input
          id="course-code"
          className="lc-textarea input"
          placeholder={t("course.codePlaceholder")}
          value={lesson.courseCode}
          onChange={(e) => lesson.setCourseCode(e.target.value)}
          aria-label="Course code"
        />
        <button
          type="button"
          className="btn btn-ghost"
          onClick={lesson.fetchLearningOutcomes}
          disabled={!lesson.courseCode.trim() || ui.loLoading}
          aria-busy={ui.loLoading}
        >
          {ui.loLoading ? t("courseInfo.fetchingLOs") : t("courseInfo.fetchLOs")}
        </button>
      </div>

      {lesson.learningOutcomes.length > 0 && (
        <div
          className="muted-block small mb-3"
          role="region"
          aria-label={t("courseInfo.learningOutcomes")}
        >
          <div style={{ fontWeight: 600, marginBottom: 4 }}>
            {t("courseInfo.learningOutcomes")}
          </div>
          <ol className="ol">
            {lesson.learningOutcomes.map((lo, i) => (
              <li key={i} className="small">
                {`LO${i + 1}`} – {lo}
              </li>
            ))}
          </ol>
          <button
            type="button"
            className="btn btn-ghost mt-2"
            onClick={lesson.analyzeDeviation}
            disabled={!lesson.currentLessonId || ui.devLoading}
          >
            {ui.devLoading ? t("courseInfo.analyzingDeviation") : t("courseInfo.slideDeviation")}
          </button>

          {ui.devErr && (
            <div className="error mt-2 text-red-500 text-sm">{ui.devErr}</div>
          )}

          <button
            type="button"
            className="btn btn-ghost mt-2"
            onClick={lesson.alignWithLO}
            disabled={!lesson.currentLessonId || ui.isLoading}
          >
            {ui.isLoading ? t("courseInfo.aligning") : t("courseInfo.alignTranscript")}
          </button>

          <button
            type="button"
            className="btn btn-ghost mt-2"
            onClick={lesson.generateLoModules}
            disabled={
              !lesson.currentLessonId ||
              ui.loModulesLoading ||
              !lesson.learningOutcomes.length
            }
          >
            {ui.loModulesLoading ? t("courseInfo.generatingLo") : t("courseInfo.createLoStudy")}
          </button>
        </div>
      )}
    </CollapsibleSection>
  );
}
