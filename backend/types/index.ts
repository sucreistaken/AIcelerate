// ---- Quiz Types ----
export type QuizPackT = { id: string; items: any[]; createdAt?: string };

export function isQuizPack(x: any): x is QuizPackT {
  return !!x && typeof x.id === "string" && Array.isArray(x.items);
}

// ---- Learning Outcome Alignment Types ----
export type LoLink = {
  lo_id: string;
  lo_title: string;
  confidence: number;
};

export type LoAlignedSegment = {
  index: number;
  text: string;
  lo_links: LoLink[];
};

export type LoAlignment = {
  segments: LoAlignedSegment[];
};

// ---- Lesson Plan Types ----
export interface PlanEmphasis {
  statement: string;
  why: string;
  in_slides?: boolean;
  evidence?: string;
  confidence?: number;
}

export interface PlanModule {
  title: string;
  name?: string;
  goal?: string;
  topics?: Array<string | { title?: string; name?: string; description?: string }>;
  content?: Array<string | { title?: string; name?: string; description?: string }>;
}

export interface AlignmentItem {
  topic: string;
  concepts: string[];
  in_both: boolean;
  emphasis_level: "high" | "medium" | "low";
  lecture_quotes: string[];
  slide_refs: string[];
  duration_min: number;
  confidence: number;
}

export interface PlanAlignment {
  summary_chatty?: string;
  average_duration_min?: number;
  items: AlignmentItem[];
}

export interface LessonPlan {
  topic?: string;
  title?: string;
  summary?: string;
  key_concepts?: string[];
  modules?: PlanModule[];
  emphases?: PlanEmphasis[];
  alignment?: PlanAlignment;
  learning_outcomes?: string[];
  [key: string]: any; // Allow additional AI-generated fields
}

// ---- Cheat Sheet Types ----
export interface CheatSheetSection {
  heading: string;
  bullets: string[];
}

export interface QuickQuizItem {
  q: string;
  a: string;
}

export interface CheatSheet {
  title: string;
  updatedAt: string;
  sections: CheatSheetSection[];
  formulas: string[];
  pitfalls: string[];
  quickQuiz: QuickQuizItem[];
  language?: "tr" | "en";
}

// ---- Deviation Types ----
export interface DeviationSegment {
  topic?: string;
  summary?: string;
  deviation_type: string;
  lecture_evidence?: string;
  slide_evidence?: string;
}

export interface DeviationResult {
  ok: boolean;
  segments?: DeviationSegment[];
  overall_score?: number;
  missed_topics?: string[];
  extra_topics?: string[];
  error?: string;
}

// ---- AI Quiz Evaluation Types ----
export interface QuizEvalResult {
  grade: "correct" | "partial" | "incorrect";
  feedback: string;
  missing_points?: string[];
  confidence?: number;
  evidence?: string;
}

export interface QuizEvalBatchResult {
  index: number;
  grade: "correct" | "partial" | "incorrect";
  feedback: string;
  missing_points?: string[];
  confidence?: number;
}

export interface QuizAnswer {
  question: string;
  answer: string;
  evidence?: string;
}

// ---- Chat Types ----
export interface ChatMessage {
  role: "user" | "model" | "assistant";
  content: string;
}

// ---- Mindmap Types ----
export interface MindmapCache {
  code: string;
  generatedAt: string;
}

export interface MindmapModuleCacheEntry {
  code: string;
  generatedAt: string;
  moduleTitle?: string;
}

export interface NodeDetailResult {
  action: "explain" | "example" | "quiz" | "all";
  title?: string;
  explanation?: string;
  keyPoints?: string[];
  relatedConcepts?: string[];
  example?: { scenario: string; explanation: string; takeaway: string };
  quiz?: { question: string; options: string[]; correctAnswer: string; explanation: string };
}
