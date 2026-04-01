export interface LOProgress {
  loId: string;
  loTitle: string;
  lessonsContributing: string[];
  quizScores: number[];
  flashcardMastery: {
    total: number;
    graduated: number;
    learning: number;
    new: number;
  };
  overallConfidence: number;   // 0-1
  masteryLevel: "not_started" | "beginning" | "developing" | "proficient" | "mastered";
  recommendedNext: string;     // study action suggestion
}

export interface LODashboardData {
  courseId: string;
  courseName: string;
  totalLOs: number;
  loProgress: LOProgress[];
  overallMastery: number;      // 0-1 average across all LOs
  studyPriority: string[];     // LO IDs ordered by urgency (weakest first)
  generatedAt: string;
}
