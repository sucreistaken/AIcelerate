import { channelService } from "./channelService";
import { getLesson } from "../controllers/lessonControllers";

// ── Token utilities (from contextAssembler.ts pattern) ────────────────────────
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function trimToTokenBudget(text: string, budget: number): string {
  const charBudget = budget * 4;
  if (text.length <= charBudget) return text;
  return text.slice(0, charBudget) + "...";
}

// ── LessonContextMeta (returned to frontend) ─────────────────────────────────
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

// Tool-specific token budgets
const TOKEN_BUDGETS: Record<string, Record<string, number>> = {
  quiz:        { transcript: 3000, slides: 2000, emphases: 2000, cheatSheet: 1500, loModules: 2000, keyConcepts: 500 },
  flashcards:  { transcript: 2000, slides: 1500, emphases: 2000, cheatSheet: 2000, loModules: 3000, keyConcepts: 500 },
  "deep-dive": { transcript: 4000, slides: 2000, emphases: 1500, cheatSheet: 2000, loModules: 1500, keyConcepts: 500 },
  "mind-map":  { transcript: 2000, slides: 1500, emphases: 1500, cheatSheet: 1000, loModules: 2000, keyConcepts: 1000 },
};

export async function buildToolContext(
  channelId: string,
  toolType: "quiz" | "flashcards" | "deep-dive" | "mind-map"
): Promise<{ context: string; meta: LessonContextMeta } | null> {
  try {
    const channel = await channelService.getByIdGlobal(channelId);
    if (!channel.lessonId) return null;

    const lesson = getLesson(channel.lessonId);
    if (!lesson) return null;

    const budgets = TOKEN_BUDGETS[toolType] || TOKEN_BUDGETS.quiz;
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

    // 3. Emphases (sorted by confidence, include evidence)
    const emphases = lesson.professorEmphases || [];
    if (emphases.length > 0) {
      const sorted = [...emphases].sort((a: any, b: any) => (b.confidence || 0) - (a.confidence || 0));
      const emphasisParts: string[] = [];
      let tokensUsed = 0;
      for (const e of sorted) {
        const line = `- [${(e.confidence * 100).toFixed(0)}%] ${e.statement}\n  Why: ${e.why}\n  Evidence: ${e.evidence || "N/A"}`;
        const lineTok = estimateTokens(line);
        if (tokensUsed + lineTok > budgets.emphases) break;
        emphasisParts.push(line);
        tokensUsed += lineTok;
      }
      if (emphasisParts.length > 0) {
        parts.push(`=== PROFESSOR EMPHASES (${emphasisParts.length}/${emphases.length}) ===\n${emphasisParts.join("\n")}`);
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

    return { context: parts.join("\n\n"), meta };
  } catch {
    return null;
  }
}
