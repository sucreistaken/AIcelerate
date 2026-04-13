// prompts/lessonPrompts.ts
// All AI prompt templates for lesson-related features.

import { smartTruncate } from "../utils/smartTruncate";
import { getLangDirective, type SupportedLang } from "../utils/langDirective";

/** @deprecated Use buildModulesPrompt + buildEmphasesPrompt + buildAlignmentPrompt instead */
export function buildPlanFromTextPrompt(
  LEC: string, SLD: string, courseCode: string | undefined,
  LO_BLOCK: string, lang?: SupportedLang
): string {
  return `
You are an instructional designer. Analyze the following teacher speech transcript (LEC) and slide text (SLIDE) together.

${getLangDirective(lang)}

PRIORITY:
- First, build a clear, practical learning plan (modules + lessons) that a student can follow.
- Then, extract teacher emphases from the lecture, and compare lecture vs slides (alignment).

IF OFFICIAL "LEARNING OUTCOMES" ARE PROVIDED:
- Align your plan with these learning outcomes.

[COURSE CODE]
${courseCode || "—"}

[OFFICIAL LEARNING OUTCOMES]
${LO_BLOCK}

GOALS:
1) LEARNING PLAN ("modules"): 2–6 modules, each with 1–6 lessons.
2) TEACHER EMPHASES ("emphases"): From transcript repetition, explanations, examples.
3) ALIGNMENT ("alignment"): Topics in both LEC and SLIDE.

OUTPUT: ONLY VALID JSON.
SCHEMA:
{
  "topic": "string", "key_concepts": string[], "duration_weeks": number,
  "modules": [{ "title": "string", "goal": "string", "lessons": [{ "title": "string", "objective": "string", "study_time_min": number, "activities": [{ "type": "read|watch|practice|quiz|project", "prompt": "string", "expected_outcome": "string" }], "mini_quiz": string[] }] }],
  "resources": string[],
  "emphases": [{ "statement": "string", "why": "string", "in_slides": boolean, "evidence": "string", "source": "lecture"|"slides"|"both", "from_transcript_quote": "string", "from_slide_quote": "string|null", "related_lo_ids": string[] }],
  "seed_quiz": string[],
  "alignment": { "summary_chatty": "string", "average_duration_min": number, "items": [{ "topic": "string", "concepts": string[], "in_both": boolean, "emphasis_level": "high"|"medium"|"low", "lecture_quotes": string[], "slide_refs": string[], "duration_min": number, "confidence": number }] }
}

RULES:
- At least 5 emphases and 5 alignment items.
- Output ONLY JSON.

[LEC]
${LEC}

[SLIDE]
${SLD}
`.trim();
}

// ── Split plan prompts (OPT-1) ───────────────────────────────────────────────

export function buildModulesPrompt(
  LEC: string, SLD: string, courseCode: string | undefined,
  LO_BLOCK: string, langDirective: string
): string {
  return `Instructional designer. ${langDirective}

Create PRACTICAL LEARNING PLAN: 2-6 modules, 1-6 lessons each. Include objectives, study time, activities (referencing content), mini quiz. Output ONLY valid JSON.

[COURSE] ${courseCode || "—"}
[LOs] ${LO_BLOCK}
[LEC] ${LEC}
[SLIDE] ${SLD}`.trim();
}

export function buildEmphasesPrompt(
  LEC: string, SLD: string, langDirective: string
): string {
  return `Educational analyst. ${langDirective}

Extract 5-12 teacher emphases: repeated topics, examples/analogies, "important"/"remember" phrases, extra time spent, common mistakes. For each: statement, why, in_slides, evidence (direct quotes), source. Only valid JSON. No hallucination.

[LEC] ${LEC}
[SLIDE] ${SLD}`.trim();
}

export function buildAlignmentPrompt(
  LEC: string, SLD: string, langDirective: string
): string {
  return `Educational content analyst. ${langDirective}

Compare lecture vs slides. For each topic: in_both, emphasis_level (high/medium/low), lecture_quotes, slide_refs, duration_min, confidence (0-1). Include summary_chatty. Min 5 items. Only valid JSON.

[LEC] ${LEC}
[SLIDE] ${SLD}`.trim();
}

export function buildQuizFromPlanPrompt(planJson: string, crossLessonHint: string, lang?: SupportedLang): string {
  return `${getLangDirective(lang)}
Generate 10 quiz questions from plan. Distribution: 3 Easy, 4 Medium, 3 Hard. Types: 2 Why/How, 2 MC (A-D), 2 T/F, rest open. Each covers DIFFERENT concept, 15+ words, self-contained.
Format: [Easy/Medium/Hard] question text. MC: "Q? A) B) C) D)". T/F: "[T/F] Q"
${crossLessonHint}
PLAN:
${planJson}`.trim();
}

export function buildQuizAnswersPrompt(
  contextBlock: string, planJson: string | undefined, questions: string[]
): string {
  const planBlock = planJson ? planJson.slice(0, 6000) : "—";
  const qBlock = questions.map((q, i) => `${i + 1}. ${q}`).join("\n");
  return `Answer the questions with EVIDENCE from the lesson context.\n\n[LESSON CONTEXT]\n${contextBlock}\n\n[PLAN (optional)]\n${planBlock}\n\n[QUESTIONS]\n${qBlock}`.trim();
}

export function buildQuizEvalPrompt(
  contextBlock: string, question: string, studentAnswer: string, lang?: SupportedLang
): string {
  return `${getLangDirective(lang)}
Strict but fair exam grader. Grade from LESSON CONTEXT only.
Rubric: correct (all key concepts, accurate) | partial (main idea right, details missing) | incorrect (wrong/irrelevant).
Give specific feedback, list missing_points, include evidence quotes.

[CONTEXT] ${contextBlock}
[Q] ${question}
[ANSWER] ${studentAnswer}`.trim();
}

export function buildQuizEvalBatchPrompt(
  contextBlock: string, questionsBlock: string, lang?: SupportedLang
): string {
  return `${getLangDirective(lang)}
Grade ALL answers from CONTEXT only. Rubric: correct|partial|incorrect. Each: feedback + missing_points.

[CONTEXT] ${contextBlock}
[ANSWERS] ${questionsBlock}`.trim();
}

export function buildChatContext(
  lessonTitle: string, courseName: string | undefined, courseBlock: string | undefined,
  modules: { title?: string; name?: string; goal?: string }[], emphases: { statement?: string; why?: string }[], deviationSummary: string,
  loSummary: string, cheatSheetHighlights: string, cheatSheetFormulas: string,
  lessonContentBlock: string, crossLessonBlock: string | undefined,
  progressBlock: string | undefined
): string {
  return `
${courseBlock ? `=== COURSE OVERVIEW ===\n${courseBlock}\n` : ''}
=== LESSON INFORMATION ===
Title: ${lessonTitle}
Course: ${courseName || 'N/A'}

=== KEY TOPICS (Modules) ===
${modules.slice(0, 6).map((m, i) => `${i + 1}. ${m.title || m.name || 'Topic'}: ${m.goal || ''}`).join('\n') || 'Not available'}

=== PROFESSOR EMPHASES ===
${emphases.slice(0, 6).map((e) => `• ${e.statement || ''}${e.why ? ` → ${e.why}` : ''}`).join('\n') || 'None recorded'}

${deviationSummary ? `=== LECTURE DEVIATIONS ===\n${deviationSummary}\n` : ''}
${loSummary ? `=== LEARNING OUTCOMES COVERED ===\n${loSummary}\n` : ''}
${cheatSheetHighlights ? `=== COMMON PITFALLS ===\n• ${cheatSheetHighlights}\n` : ''}
${cheatSheetFormulas ? `=== KEY FORMULAS ===\n${cheatSheetFormulas}\n` : ''}

${lessonContentBlock}
${crossLessonBlock ? `\n=== RELATED LESSONS ===\n${crossLessonBlock}\n` : ''}
${progressBlock ? `\n=== STUDENT PROGRESS ===\n${progressBlock}\n` : ''}`;
}

export function buildChatPrompt(
  context: string, message: string, courseId: string | undefined, lang?: SupportedLang
): string {
  return `${getLangDirective(lang)}
Expert AI tutor.${courseId ? ' Full course knowledge.' : ''} Answer from LESSON CONTEXT only. If unavailable, say so. Use **bold** for key terms. End with:
---
💡 **Suggested Questions:**
1. [Follow-up] 2. [Deeper] 3. [Application]

=== LESSON CONTEXT ===
${context}

=== STUDENT MESSAGE ===
${message}`;
}

export function buildMindmapPrompt(
  title: string, moduleNames: string[], keyPoints: string[],
  concepts: string[], transcript: string, slides: string,
  crossLessonBlock: string | undefined, lang?: SupportedLang
): string {
  return `${getLangDirective(lang)}
Create Mermaid mindmap. Syntax: "mindmap" header, root((Topic)), 2-space indent, no special chars, max 35 char labels.
5 branches: What(definition), Why(purpose), How(steps), Practice(examples), Remember(key points).

Topic: ${title}
Sections: ${moduleNames.join(", ") || "Introduction, Main Content, Practice"}
Key: ${keyPoints.slice(0, 4).join(" | ") || "concepts"}
Terms: ${concepts.slice(0, 6).join(", ") || "vocabulary"}
[LEC] ${smartTruncate(transcript, 1000) || "—"}
[SLD] ${smartTruncate(slides, 800) || "—"}
${crossLessonBlock ? `[CONNECTIONS] ${crossLessonBlock}` : ''}
Output ONLY mermaid code.`;
}

export function buildMindmapModulePrompt(targetTitle: string, targetContent: string, lang?: SupportedLang): string {
  return `${getLangDirective(lang)}
Create Mermaid mindmap. Syntax: "mindmap" header, root((Topic)), 2-space indent, no special chars, max 35 chars.

Module: ${targetTitle}
Content: ${smartTruncate(targetContent, 1000)}
Output ONLY mermaid code.`;
}

export function buildMindmapNodeDetailPrompt(
  nodeName: string, lessonTitle: string, transcript: string, action: string, lang?: SupportedLang
): string {
  const langDir = getLangDirective(lang);
  if (action === "all") {
    return `${langDir}\n\nFor the concept "${nodeName}" from "${lessonTitle}", provide an explanation, a real-world example, and a quiz question.

Context:
${smartTruncate(transcript, 1500)}`;
  }
  if (action === "explain") {
    return `${langDir}\n\nExplain "${nodeName}" VERY BRIEFLY.\n\nContext:\n${smartTruncate(transcript, 1000)}\n\nReturn ONLY JSON:\n{ "title": "${nodeName}", "explanation": "2-3 sentences", "keyPoints": ["point"], "relatedConcepts": ["concept"] }`;
  }
  if (action === "example") {
    return `${langDir}\n\nGive ONE simple example for "${nodeName}".\n\nContext:\n${smartTruncate(transcript, 1000)}\n\nReturn ONLY JSON:\n{ "title": "${nodeName}", "example": { "scenario": "1 sentence", "explanation": "1 sentence", "takeaway": "5-8 words" } }`;
  }
  // quiz
  return `${langDir}\n\nCreate a quiz question about "${nodeName}" from "${lessonTitle}".\n\nContext:\n${smartTruncate(transcript, 1500)}\n\nReturn ONLY JSON:\n{ "title": "${nodeName}", "quiz": { "question": "?", "options": ["A)", "B)", "C)", "D)"], "correctAnswer": "A", "explanation": "why" } }`;
}
