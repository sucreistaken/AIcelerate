import { Emphasis } from "../../types";
import { EmphasisSource, Importance } from "./types";
import { t } from "../../utils/i18n";

export function normalizeSource(e: Emphasis): EmphasisSource {
  const raw = (e as any).source as string | undefined;
  if (raw === "lecture" || raw === "slides" || raw === "both") return raw;

  if ((e as any).in_slides === true) return "both";
  return "lecture";
}

export function getImportance(e: Emphasis): Importance {
  const raw =
    ((e as any).importance ||
      (e as any).importance_level ||
      (e as any).exam_risk ||
      "") +
    "";
  const v = raw.toLowerCase();
  if (v === "high") return "high";
  if (v === "low") return "low";
  return "medium";
}

export function getSourceChip(e: Emphasis) {
  const src = normalizeSource(e);
  switch (src) {
    case "lecture":
      return {
        label: t("lecturerNote.chipLectureOnly"),
        icon: "",
        className: "ln-chip ln-chip--lecture",
        tooltip: "",
      };
    case "slides":
      return {
        label: t("lecturerNote.chipSlideOnly"),
        icon: "",
        className: "ln-chip ln-chip--slides",
        tooltip: "",
      };
    case "both":
      return {
        label: t("lecturerNote.chipBoth"),
        icon: "",
        className: "ln-chip ln-chip--both",
        tooltip: "",
      };
    default:
      return {
        label: t("lecturerNote.chipUnclassified"),
        icon: "",
        className: "ln-chip ln-chip--neutral",
        tooltip: "",
      };
  }
}

export function getImportanceChip(importance: Importance) {
  if (importance === "high") {
    return {
      label: t("lecturerNote.chipHighExam"),
      className: "ln-chip ln-chip--importance ln-chip--high",
    };
  }
  if (importance === "low") {
    return {
      label: t("lecturerNote.chipNiceToKnow"),
      className: "ln-chip ln-chip--importance ln-chip--low",
    };
  }
  return {
    label: t("lecturerNote.chipNormal"),
    className: "ln-chip ln-chip--importance ln-chip--medium",
  };
}

export function truncate(text: string, max: number): string {
  if (!text) return "";
  if (text.length <= max) return text;
  return text.slice(0, max - 1).trimEnd() + "\...";
}
