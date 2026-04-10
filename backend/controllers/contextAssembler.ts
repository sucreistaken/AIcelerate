// controllers/contextAssembler.ts
// Builds optimal AI prompt context per endpoint type, course-aware.
// Also provides channel tool context (merged from channelContextBuilder).
import { getLesson } from "./lessonControllers";
import { getCourse, getCourseForLesson, type Course, type CourseKnowledgeIndex } from "./courseController";
import { channelService } from "../services/channelService";
import { estimateTokens, trimToTokenBudget } from "../utils/tokenBudget";
import { TTLCache } from "../utils/cache";

// --- Context caches (avoid redundant AI token spend) ---
// Tool context cache: same lesson + tool type → same context for 5 min
const toolContextCache = new TTLCache<{ context: string; meta: LessonContextMeta }>({
  ttlMs: 5 * 60_000,
  maxSize: 50,
});

// Course context cache: same lesson + endpoint → same context for 2 min
const courseContextCache = new TTLCache<AssembledContext>({
  ttlMs: 2 * 60_000,
  maxSize: 100,
});

// Token budget per endpoint type
const BUDGETS: Record<string, { course: number; lesson: number; crossLesson: number; progress: number }> = {
  "chat":        { course: 1500, lesson: 8000, crossLesson: 1500, progress: 500 },
  "cheat-sheet": { course: 1000, lesson: 12000, crossLesson: 2000, progress: 0 },
  "quiz":        { course: 1000, lesson: 6000, crossLesson: 3000, progress: 500 },
  "mindmap":     { course: 800, lesson: 10000, crossLesson: 1500, progress: 0 },
  "weakness":    { course: 1200, lesson: 4000, crossLesson: 2000, progress: 1500 },
};

// Tool-specific token budgets (for channel tools)
const TOOL_BUDGETS: Record<string, Record<string, number>> = {
  quiz:        { transcript: 3000, slides: 2000, emphases: 2000, cheatSheet: 1500, loModules: 2000, keyConcepts: 500 },
  flashcards:  { transcript: 2000, slides: 1500, emphases: 2000, cheatSheet: 2000, loModules: 3000, keyConcepts: 500 },
  "deep-dive": { transcript: 4000, slides: 2000, emphases: 1500, cheatSheet: 2000, loModules: 1500, keyConcepts: 500 },
  "mind-map":  { transcript: 2000, slides: 1500, emphases: 1500, cheatSheet: 1000, loModules: 2000, keyConcepts: 1000 },
};

export interface AssembledContext {
  courseBlock: string;
  lessonBlock: string;
  crossLessonBlock: string;
  progressBlock: string;
  fullContext: string;
  courseId: string | null;
  courseName: string | null;
}

export function assembleCourseContext(
  lessonId: string,
  endpointType: string,
  options?: { userQuery?: string }
): AssembledContext {
  // Cache check — skip for chat (unique per message due to userQuery)
  if (endpointType !== "chat") {
    const cacheKey = `course:${lessonId}:${endpointType}`;
    const cached = courseContextCache.get(cacheKey);
    if (cached) return cached;
  }

  const budget = BUDGETS[endpointType] || BUDGETS["chat"];
  const lesson = getLesson(lessonId);

  const emptyResult: AssembledContext = {
    courseBlock: "",
    lessonBlock: "",
    crossLessonBlock: "",
    progressBlock: "",
    fullContext: "",
    courseId: null,
    courseName: null,
  };

  if (!lesson) return emptyResult;

  // Find the course this lesson belongs to
  const course = getCourseForLesson(lessonId);
  const ki = course?.knowledgeIndex;

  // 1. Course Block
  let courseBlock = "";
  if (course && ki) {
    const parts: string[] = [];
    parts.push(`Course: ${course.code} - ${course.name}`);

    if (course.learningOutcomes?.length) {
      parts.push(`Learning Outcomes:\n${course.learningOutcomes.map((lo, i) => `  LO${i + 1}: ${lo}`).join("\n")}`);
    }

    if (ki.overview.topicProgression.length) {
      parts.push(`Lesson Progression:\n${ki.overview.topicProgression.map((t, i) => `  W${i + 1}: ${t}`).join("\n")}`);
    }

    if (ki.overview.courseThemes.length) {
      parts.push(`Course Themes: ${ki.overview.courseThemes.join(", ")}`);
    }

    courseBlock = trimToTokenBudget(parts.join("\n\n"), budget.course);
  }

  // 2. Lesson Block (current lesson context - similar to existing buildCondensedContext)
  let lessonBlock = "";
  {
    const plan = lesson.plan as any;
    const parts: string[] = [];

    parts.push(`Current Lesson: ${lesson.title}`);
    if (plan?.topic) parts.push(`Topic: ${plan.topic}`);
    if (plan?.key_concepts?.length) parts.push(`Key concepts: ${plan.key_concepts.join(", ")}`);

    if (plan?.modules?.length) {
      const modSummary = plan.modules
        .slice(0, 6)
        .map((m: any) => `- ${m.title || "Module"}: ${m.goal || ""}`)
        .join("\n");
      parts.push(`Modules:\n${modSummary}`);
    }

    const emphases = lesson.professorEmphases || plan?.emphases || [];
    if (emphases.length) {
      const emphSummary = emphases
        .slice(0, 8)
        .map((e: any) => `- ${e.statement}${e.why ? ` (${e.why})` : ""}`)
        .join("\n");
      parts.push(`Professor emphases:\n${emphSummary}`);
    }

    // Include transcript excerpt based on budget
    const transcriptBudget = Math.floor(budget.lesson * 0.5);
    if (lesson.transcript) {
      parts.push(`Transcript excerpt:\n${trimToTokenBudget(lesson.transcript, transcriptBudget)}`);
    }

    const slideBudget = Math.floor(budget.lesson * 0.3);
    if (lesson.slideText) {
      parts.push(`Slide content:\n${trimToTokenBudget(lesson.slideText, slideBudget)}`);
    }

    lessonBlock = trimToTokenBudget(parts.join("\n\n"), budget.lesson);
  }

  // 3. Cross-Lesson Block — skip for endpoints that don't benefit (mindmap, cheat-sheet)
  // Only include when: chat (user may ask about other weeks), quiz (cross-lesson questions)
  let crossLessonBlock = "";
  const crossLessonEndpoints = new Set(["chat", "quiz", "weakness"]);
  if (course && ki && budget.crossLesson > 0 && crossLessonEndpoints.has(endpointType)) {
    const currentDigest = ki.lessonDigests.find((d) => d.lessonId === lessonId);
    const currentTopics = new Set(currentDigest?.keyTopics.map((t) => t.toLowerCase()) || []);

    // Find user-referenced week if any
    const weekRef = options?.userQuery?.match(/(?:week|hafta|w)\s*(\d+)/i);
    const referencedWeek = weekRef ? parseInt(weekRef[1]) : null;

    // Select relevant digests
    let relevantDigests = ki.lessonDigests.filter((d) => d.lessonId !== lessonId);

    if (referencedWeek) {
      // User referenced a specific week - prioritize it
      relevantDigests.sort((a, b) => {
        const aMatch = a.weekNumber === referencedWeek ? 0 : 1;
        const bMatch = b.weekNumber === referencedWeek ? 0 : 1;
        return aMatch - bMatch;
      });
    } else {
      // Score by topic overlap with current lesson
      relevantDigests = relevantDigests
        .map((d) => {
          const overlap = d.keyTopics.filter((t) => currentTopics.has(t.toLowerCase())).length;
          return { ...d, _score: overlap };
        })
        .sort((a: any, b: any) => b._score - a._score);
    }

    // Take top 3 most relevant
    const selected = relevantDigests.slice(0, 3);
    if (selected.length > 0) {
      const parts = selected.map((d) => {
        return `W${d.weekNumber} - ${d.title}: Topics: ${d.keyTopics.join(", ")}${d.emphasisHighlights.length ? `\n  Key points: ${d.emphasisHighlights.join("; ")}` : ""}`;
      });

      // Add concept bridges that connect to current lesson
      const bridges = ki.conceptBridges
        .filter((b) => b.appearsInWeeks.includes(currentDigest?.weekNumber || -1))
        .slice(0, 3);

      if (bridges.length) {
        parts.push("\nCross-lesson concepts:");
        for (const b of bridges) {
          parts.push(`  - ${b.concept}: ${b.evolution}`);
        }
      }

      crossLessonBlock = trimToTokenBudget(parts.join("\n"), budget.crossLesson);
    }
  }

  // 4. Progress Block
  let progressBlock = "";
  if (ki && budget.progress > 0) {
    const ps = ki.progressSnapshot;
    const parts: string[] = [];
    if (ps.weakTopics.length) parts.push(`Weak topics: ${ps.weakTopics.join(", ")}`);
    if (ps.strongTopics.length) parts.push(`Strong topics: ${ps.strongTopics.join(", ")}`);
    if (ps.quizAverageScore > 0) parts.push(`Quiz average: ${Math.round(ps.quizAverageScore * 100)}%`);
    if (ps.flashcardsDue > 0) parts.push(`Flashcards due: ${ps.flashcardsDue}`);
    parts.push(`Completed lessons: ${ps.completedLessons}/${ki.overview.totalLessons}`);
    progressBlock = trimToTokenBudget(parts.join("\n"), budget.progress);
  }

  // 5. Assemble full context
  const sections: string[] = [];
  if (courseBlock) sections.push(`=== COURSE OVERVIEW ===\n${courseBlock}`);
  sections.push(`=== CURRENT LESSON ===\n${lessonBlock}`);
  if (crossLessonBlock) sections.push(`=== RELATED LESSONS ===\n${crossLessonBlock}`);
  if (progressBlock) sections.push(`=== STUDENT PROGRESS ===\n${progressBlock}`);

  const result: AssembledContext = {
    courseBlock,
    lessonBlock,
    crossLessonBlock,
    progressBlock,
    fullContext: sections.join("\n\n"),
    courseId: course?.id || null,
    courseName: course ? `${course.code} - ${course.name}` : null,
  };

  // Store in cache (skip chat — unique per message)
  if (endpointType !== "chat") {
    courseContextCache.set(`course:${lessonId}:${endpointType}`, result);
  }

  return result;
}

// Assemble context for course-level chat (no specific lesson)
export function assembleCourseWideContext(courseId: string): AssembledContext {
  const course = getCourse(courseId);
  const emptyResult: AssembledContext = {
    courseBlock: "",
    lessonBlock: "",
    crossLessonBlock: "",
    progressBlock: "",
    fullContext: "",
    courseId: null,
    courseName: null,
  };

  if (!course) return emptyResult;
  const ki = course.knowledgeIndex;

  const parts: string[] = [];
  parts.push(`Course: ${course.code} - ${course.name}`);
  if (course.description) parts.push(`Description: ${course.description}`);

  if (course.learningOutcomes?.length) {
    parts.push(`\nLearning Outcomes:\n${course.learningOutcomes.map((lo, i) => `  LO${i + 1}: ${lo}`).join("\n")}`);
  }

  if (ki) {
    parts.push(`\nTotal Lessons: ${ki.overview.totalLessons}`);
    parts.push(`Course Themes: ${ki.overview.courseThemes.join(", ")}`);

    parts.push(`\nLesson Overview:`);
    for (const d of ki.lessonDigests) {
      parts.push(`  W${d.weekNumber} - ${d.title}: ${d.keyTopics.join(", ")}`);
      if (d.emphasisHighlights.length) {
        parts.push(`    Emphases: ${d.emphasisHighlights.join("; ")}`);
      }
    }

    if (ki.conceptBridges.length) {
      parts.push(`\nCross-Lesson Concepts:`);
      for (const b of ki.conceptBridges) {
        parts.push(`  - ${b.concept}: ${b.evolution}`);
      }
    }

    if (ki.loCoverage.length) {
      parts.push(`\nLO Coverage:`);
      for (const lo of ki.loCoverage) {
        parts.push(`  ${lo.loId} (${lo.loTitle}): ${lo.coverageLevel} [${lo.coveredByLessons.length} lessons]`);
      }
    }

    const ps = ki.progressSnapshot;
    if (ps.weakTopics.length || ps.quizAverageScore > 0) {
      parts.push(`\nProgress:`);
      if (ps.weakTopics.length) parts.push(`  Weak: ${ps.weakTopics.join(", ")}`);
      if (ps.strongTopics.length) parts.push(`  Strong: ${ps.strongTopics.join(", ")}`);
      if (ps.quizAverageScore > 0) parts.push(`  Quiz avg: ${Math.round(ps.quizAverageScore * 100)}%`);
      parts.push(`  Completed: ${ps.completedLessons}/${ki.overview.totalLessons}`);
    }
  }

  const fullContext = parts.join("\n");

  return {
    courseBlock: fullContext,
    lessonBlock: "",
    crossLessonBlock: "",
    progressBlock: "",
    fullContext: `=== FULL COURSE CONTEXT ===\n${fullContext}`,
    courseId: course.id,
    courseName: `${course.code} - ${course.name}`,
  };
}

// ── Channel Tool Context (merged from channelContextBuilder) ────────────────

export interface LessonContextMeta {
  lessonTitle: string;
  hasTranscript: boolean;
  hasSlides: boolean;
  hasCheatSheet: boolean;
  hasLoModules: boolean;
  hasLearningOutcomes: boolean;
  emphasesCount: number;
  modulesCount: number;
  loModuleCount: number;
  quickQuizCount: number;
  miniQuizCount: number;
  mustRememberCount: number;
  formulaCount: number;
  pitfallCount: number;
  sourcesSummary: string;
}

export async function buildToolContext(
  channelId: string,
  toolType: "quiz" | "flashcards" | "deep-dive" | "mind-map"
): Promise<{ context: string; meta: LessonContextMeta } | null> {
  try {
    const channel = await channelService.getByIdGlobal(channelId);
    if (!channel.lessonId) return null;

    // Cache check — same lesson + tool type = same context for 5 min
    // Skip cache for deep-dive (conversational, needs fresh context)
    const cacheKey = `tool:${channel.lessonId}:${toolType}`;
    if (toolType !== "deep-dive") {
      const cached = toolContextCache.get(cacheKey);
      if (cached) return cached;
    }

    const lesson = getLesson(channel.lessonId);
    if (!lesson) return null;

    const budgets = TOOL_BUDGETS[toolType] || TOOL_BUDGETS.quiz;
    const parts: string[] = [];
    const sources: string[] = [];

    parts.push(`=== LESSON: ${lesson.title} ===`);

    // 1. Transcript
    if (lesson.transcript) {
      parts.push(`=== TRANSCRIPT ===\n${trimToTokenBudget(lesson.transcript, budgets.transcript)}`);
      sources.push("transcript");
    }

    // 2. Slides
    if (lesson.slideText) {
      parts.push(`=== SLIDES ===\n${trimToTokenBudget(lesson.slideText, budgets.slides)}`);
      sources.push("slides");
    }

    // 3. Emphases — compact pipe-delimited format (~30% fewer tokens vs JSON)
    const emphases = lesson.professorEmphases || [];
    if (emphases.length > 0) {
      const sorted = [...emphases].sort((a: any, b: any) => (b.confidence || 0) - (a.confidence || 0));
      const emphasisParts: string[] = [];
      let tokensUsed = 0;
      for (const e of sorted) {
        const line = `${e.statement} | ${e.why} | ${e.evidence || "—"}`;
        const lineTok = estimateTokens(line);
        if (tokensUsed + lineTok > budgets.emphases) break;
        emphasisParts.push(line);
        tokensUsed += lineTok;
      }
      if (emphasisParts.length > 0) {
        parts.push(`=== EMPHASES (${emphasisParts.length}/${emphases.length}) ===\n${emphasisParts.join("\n")}`);
        sources.push(`${emphasisParts.length} emphases`);
      }
    }

    // 4. Key Concepts
    if (lesson.plan?.key_concepts?.length) {
      const conceptsText = lesson.plan.key_concepts.join(", ");
      parts.push(`=== KEY CONCEPTS ===\n${trimToTokenBudget(conceptsText, budgets.keyConcepts)}`);
      sources.push("key concepts");
    }

    // 5. Modules
    if (lesson.plan?.modules?.length) {
      const modulesSummary = lesson.plan.modules
        .map((m: any, i: number) => `${i + 1}. ${m.title}: ${m.goal || ""}`)
        .join("\n");
      parts.push(`=== MODULES ===\n${modulesSummary}`);
    }

    // 6. CheatSheet
    const cs = lesson.cheatSheet;
    if (cs) {
      const csParts: string[] = [];
      if (cs.sections?.length) {
        const sectionsText = cs.sections
          .map((s: any) => `## ${s.heading}\n${(s.bullets || []).map((b: string) => `- ${b}`).join("\n")}`)
          .join("\n\n");
        csParts.push(sectionsText);
      }
      if (cs.formulas?.length) {
        csParts.push(`## Formulas\n${cs.formulas.map((f: string) => `- ${f}`).join("\n")}`);
      }
      if (cs.pitfalls?.length) {
        csParts.push(`## Common Pitfalls\n${cs.pitfalls.map((p: string) => `- ${p}`).join("\n")}`);
      }
      if (cs.quickQuiz?.length) {
        csParts.push(`## Quick Q&A\n${cs.quickQuiz.map((qa: any) => `Q: ${qa.q}\nA: ${qa.a}`).join("\n\n")}`);
      }
      if (csParts.length > 0) {
        parts.push(`=== CHEAT SHEET ===\n${trimToTokenBudget(csParts.join("\n\n"), budgets.cheatSheet)}`);
        sources.push("cheat sheet");
      }
    }

    // 7. LO Modules
    const loMods = lesson.loModules?.modules;
    if (loMods?.length) {
      const loParts: string[] = [];
      let tokensUsed = 0;
      for (const mod of loMods) {
        const lines: string[] = [];
        lines.push(`## ${mod.loId}: ${mod.loTitle}`);
        lines.push(`Gist: ${mod.oneLineGist}`);
        if (mod.coreIdeas?.length) lines.push(`Core Ideas: ${mod.coreIdeas.join("; ")}`);
        if (mod.mustRemember?.length) lines.push(`Must Remember: ${mod.mustRemember.join("; ")}`);
        if (mod.commonTraps?.length) lines.push(`Common Traps: ${mod.commonTraps.join("; ")}`);
        if (mod.miniQuiz?.length) {
          lines.push(`Mini Quiz:\n${mod.miniQuiz.map((mq: any) => `  Q: ${mq.question}\n  A: ${mq.answer}`).join("\n")}`);
        }
        const block = lines.join("\n");
        const blockTok = estimateTokens(block);
        if (tokensUsed + blockTok > budgets.loModules) break;
        loParts.push(block);
        tokensUsed += blockTok;
      }
      if (loParts.length > 0) {
        parts.push(`=== LO STUDY MODULES (${loParts.length}/${loMods.length}) ===\n${loParts.join("\n\n")}`);
        sources.push(`${loParts.length} LO modules`);
      }
    }

    // 8. Learning Outcomes
    const los = lesson.plan?.learning_outcomes;
    if (los?.length) {
      const loText = los.map((lo: any) => `- ${lo.code}: ${lo.description}`).join("\n");
      parts.push(`=== LEARNING OUTCOMES ===\n${loText}`);
      sources.push("learning outcomes");
    }

    // Build meta
    const meta: LessonContextMeta = {
      lessonTitle: lesson.title,
      hasTranscript: !!(lesson.transcript && lesson.transcript.length > 0),
      hasSlides: !!(lesson.slideText && lesson.slideText.length > 0),
      hasCheatSheet: !!cs,
      hasLoModules: !!(loMods && loMods.length > 0),
      hasLearningOutcomes: !!(los && los.length > 0),
      emphasesCount: emphases.length,
      modulesCount: lesson.plan?.modules?.length || 0,
      loModuleCount: loMods?.length || 0,
      quickQuizCount: cs?.quickQuiz?.length || 0,
      miniQuizCount: loMods?.reduce((sum: number, m: any) => sum + (m.miniQuiz?.length || 0), 0) || 0,
      mustRememberCount: loMods?.reduce((sum: number, m: any) => sum + (m.mustRemember?.length || 0), 0) || 0,
      formulaCount: cs?.formulas?.length || 0,
      pitfallCount: cs?.pitfalls?.length || 0,
      sourcesSummary: sources.join(" + "),
    };

    const result = { context: parts.join("\n\n"), meta };

    // Store in cache (skip deep-dive — conversational)
    if (toolType !== "deep-dive") {
      toolContextCache.set(cacheKey, result);
    }

    return result;
  } catch {
    return null;
  }
}

// Invalidate tool context cache when lesson is updated or unlinked
export function invalidateToolContextCache(lessonId: string): void {
  toolContextCache.invalidate(`tool:${lessonId}:*`);
  courseContextCache.invalidate(`course:${lessonId}:*`);
}
