import { Emphasis, LoAlignment } from "../../types";

export type EmphasisSource = "lecture" | "slides" | "both" | undefined;
export type Importance = "high" | "medium" | "low";

export type EnrichedEmphasis = Emphasis & {
  __index: number;
};

export type LecturerNoteProps = {
  lectureText: string;
  slidesText: string;
  emphases: Emphasis[];
  learningOutcomes: string[];
  loAlignment: LoAlignment | null;
};

export type LoInfo = { id: string; title: string; index: number };
export type LoMap = Record<string, LoInfo>;
