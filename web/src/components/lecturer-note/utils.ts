import { Emphasis } from "../../types";
import { EmphasisSource, Importance } from "./types";

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
        label: "Lecture only",
        icon: "",
        className: "ln-chip ln-chip--lecture",
        tooltip: "Emphasis mainly comes from the spoken transcript.",
      };
    case "slides":
      return {
        label: "Slide only",
        icon: "",
        className: "ln-chip ln-chip--slides",
        tooltip: "Emphasis mainly comes from the slide text.",
      };
    case "both":
      return {
        label: "Lecture + slides",
        icon: "",
        className: "ln-chip ln-chip--both",
        tooltip: "The same idea is stressed in both transcript and slides.",
      };
    default:
      return {
        label: "Unclassified",
        icon: "",
        className: "ln-chip ln-chip--neutral",
        tooltip: "Source not clearly classified.",
      };
  }
}

export function getImportanceChip(importance: Importance) {
  if (importance === "high") {
    return {
      label: "High exam risk",
      className: "ln-chip ln-chip--importance ln-chip--high",
    };
  }
  if (importance === "low") {
    return {
      label: "Nice to know",
      className: "ln-chip ln-chip--importance ln-chip--low",
    };
  }
  return {
    label: "Normal",
    className: "ln-chip ln-chip--importance ln-chip--medium",
  };
}

export function truncate(text: string, max: number): string {
  if (!text) return "";
  if (text.length <= max) return text;
  return text.slice(0, max - 1).trimEnd() + "\...";
}
