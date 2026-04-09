// Lesson domain types

export type Activity = { type: string; prompt: string; expected_outcome?: string };

export type Lesson = {
  title: string;
  objective: string;
  study_time_min: number;
  activities: Activity[];
  mini_quiz?: string[];
};

export type ModuleT = { title: string; goal: string; lessons: Lesson[] };

export type Emphasis = {
  statement: string;
  why: string;
  in_slides: boolean;
  evidence: string;
  confidence: number;
};
export type LoLink = {
  lo_id: string;      // "LO1"
  lo_title: string;   // "classify functions"
  confidence: number; // 0-1
};

export type LoAlignedSegment = {
  index: number;      // 0,1,2...
  text: string;       // transcript segmenti
  lo_links: LoLink[];
};

export type LoAlignment = {
  segments: LoAlignedSegment[];
};
export type AlignItem = {
  topic: string;
  concepts: string[];
  in_both: boolean;
  emphasis_level: "high" | "medium" | "low";
  lecture_quotes: string[];
  slide_refs: string[];
  duration_min: number;
  confidence: number;
};

export type Alignment = {
  summary_chatty?: string;
  average_duration_min?: number;
  items?: AlignItem[];
};
// varsa diger tiplerin yanina
export interface LearningOutcome {
  code: string;
  description: string;
  covered?: boolean;
  covered_by_lessons?: string[];
}
export type LoStudyModule = {
  loId: string;             // "LO2"
  loTitle: string;          // resmi LO metni

  // 1) Cekirdek bilgi
  oneLineGist: string;      // 1 cumlede oz
  coreIdeas: string[];      // 3-6 madde, en onemli kavramlar
  mustRemember: string[];   // "unutursan kalirsin" tipinde 3-5 kritik gercek

  // 2) Baglam ve ornek
  intuitiveExplanation: string; // ogrenciye anlatir gibi aciklama (max 6-7 cumle)
  examples: {
    label: string;
    description: string;
  }[];

  // 3) Test odakli kisim
  typicalQuestions: string[];   // bu LO'dan gelen tipik soru kokleri
  commonTraps: string[];        // ogrencinin en sik dustugu hatalar
  miniQuiz: {
    question: string;
    answer: string;
    why: string;
  }[];

  // 4) Calisma zaman tahmini
  recommended_study_time_min: number;  // bu LO icin onerilen sure
};

export type Plan = {
  topic?: string;
  difficulty?: "Beginner" | "Intermediate" | "Advanced";
  key_concepts?: string[];
  duration_weeks?: number;
  modules?: ModuleT[];
  resources?: string[];
  emphases?: Emphasis[];
  seed_quiz?: string[];
  alignment?: Alignment;
  learning_outcomes?: LearningOutcome[];
};

export type ModeId =
  | "dashboard"
  | "plan"
  | "alignment"
  | "deviation"
  | "lecturer-note"
  | "quiz"
  | "deep-dive"
  | "mindmap"
  | "history"
  | "lo-study"
  | "cheat-sheet"
  | "notes"
  | "flashcards"
  | "connections"
  | "study-hub"
  | "course-dashboard"
  | "create-lesson"
  | "knowledge-graph"
  | "adaptive-quiz"
  | "lo-progress";

export type CheatSheet = {
  title: string;
  updatedAt: string;
  sections: Array<{ heading: string; bullets: string[] }>;
  formulas?: string[];
  pitfalls?: string[];
  quickQuiz?: Array<{ q: string; a: string }>;
};
