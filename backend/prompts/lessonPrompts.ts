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
  return `
You are an instructional designer. Create a structured learning plan from the lecture transcript and slides.

${langDirective}

[COURSE CODE]
${courseCode || "—"}

[OFFICIAL LEARNING OUTCOMES]
${LO_BLOCK}

Create a PRACTICAL LEARNING PLAN with 2–6 modules, each with 1–6 lessons.
Each lesson should have clear objectives, study time, activities, and a mini quiz.

OUTPUT: ONLY VALID JSON.

RULES:
- Activities must reference specific content from the lecture/slides.
- Mini quiz questions must be answerable from the provided content.
- Include key concepts and estimated study duration.

[LEC]
${LEC}

[SLIDE]
${SLD}
`.trim();
}

export function buildEmphasesPrompt(
  LEC: string, SLD: string, langDirective: string
): string {
  return `
You are an educational analyst. Extract teacher emphases from the lecture transcript.

${langDirective}

Look for:
- Topics the teacher REPEATS multiple times
- Concepts explained with EXAMPLES or ANALOGIES
- Phrases like "this is important", "pay attention", "remember this"
- Topics where the teacher spends significantly more time
- Warnings about common mistakes

For each emphasis, provide:
- The statement itself
- WHY the teacher emphasized it
- Whether it appears in the slides
- Direct evidence (quotes from transcript)
- Source: "lecture", "slides", or "both"

OUTPUT: ONLY VALID JSON.

RULES:
- At least 5 emphases, ideally 8-12.
- Include direct transcript quotes as evidence.
- Do NOT hallucinate — only extract what is actually in the content.

[LEC]
${LEC}

[SLIDE]
${SLD}
`.trim();
}

export function buildAlignmentPrompt(
  LEC: string, SLD: string, langDirective: string
): string {
  return `
You are an educational content analyst. Compare the lecture transcript with the slide text.

${langDirective}

For each topic covered, determine:
- Whether it appears in both lecture and slides, or only one
- The emphasis level (high/medium/low)
- Direct quotes from the lecture
- Slide references
- Estimated time spent on the topic
- Confidence level (0-1)

Also write a brief summary comparing how the lecture and slides relate.

OUTPUT: ONLY VALID JSON.

RULES:
- At least 5 alignment items.
- Be specific with quotes and references.

[LEC]
${LEC}

[SLIDE]
${SLD}
`.trim();
}

export function buildQuizFromPlanPrompt(planJson: string, crossLessonHint: string, lang?: SupportedLang): string {
  return `You are an expert academic quiz generator. Generate exactly 10 quiz questions based on the plan below.

${getLangDirective(lang)}

RULES:
- Difficulty distribution: 3 Easy (factual recall), 4 Medium (understanding/application), 3 Hard (analysis/evaluation)
- Question type variety: include at least 2 "Why/How" questions, 2 multiple-choice (with options A-D), 2 true/false, and the rest open-ended
- Each question MUST cover a DIFFERENT concept from the plan — no duplicate or overlapping topics
- Each question must be at least 15 words long and be self-contained (understandable without seeing the plan)
- For multiple-choice questions, format as: "Question text? A) option1 B) option2 C) option3 D) option4"
- For true/false questions, start with "[T/F]"

FORMAT: Return one question per line, prefixed with difficulty tag:
[Easy] question text
[Medium] question text
[Hard] question text
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
  return `Act as a strict but fair academic exam grader. Grade the student's answer based ONLY on the lesson context provided.

${getLangDirective(lang)}

GRADING RUBRIC:
- "correct": All key concepts covered with accurate reasoning. Minor wording differences are acceptable.
- "partial": Main idea is correct but missing important supporting details, or has minor inaccuracies.
- "incorrect": Fundamentally wrong, irrelevant, or shows no understanding of the concept.

INSTRUCTIONS:
1. Compare the student's answer against the lesson context
2. Identify which key concepts from the context are addressed vs missed
3. Provide specific, actionable feedback explaining what was good and what was missed
4. List the specific concepts/points the student failed to mention in missing_points
5. Include direct quotes from lesson content as evidence

[LESSON CONTEXT]
${contextBlock}

[QUESTION]
${question}

[STUDENT_ANSWER]
${studentAnswer}`.trim();
}

export function buildQuizEvalBatchPrompt(
  contextBlock: string, questionsBlock: string, lang?: SupportedLang
): string {
  return `Act as a strict but fair academic exam grader. Grade ALL student answers based ONLY on the lesson context.

${getLangDirective(lang)}

GRADING RUBRIC (apply to each answer):
- "correct": All key concepts covered with accurate reasoning
- "partial": Main idea correct but missing important details or has minor inaccuracies
- "incorrect": Fundamentally wrong, irrelevant, or shows no understanding

For each answer, provide specific feedback and list missed concepts in missing_points.

[LESSON CONTEXT]
${contextBlock}

[STUDENT ANSWERS]
${questionsBlock}`.trim();
}

export function buildChatContext(
  lessonTitle: string, courseName: string | undefined, courseBlock: string | undefined,
  modules: any[], emphases: any[], deviationSummary: string,
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
${modules.slice(0, 6).map((m: any, i: number) => `${i + 1}. ${m.title || m.name || 'Topic'}: ${m.goal || ''}`).join('\n') || 'Not available'}

=== PROFESSOR EMPHASES ===
${emphases.slice(0, 6).map((e: any) => `• ${e.statement || e}${e.why ? ` → ${e.why}` : ''}`).join('\n') || 'None recorded'}

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
  return `
=== CRITICAL RULES ===
1. INSTRUCTION FOLLOWING: Do exactly what the user asks.
2. LANGUAGE: ${getLangDirective(lang)}
3. CONTEXT-BASED ANSWERS: Base answers on the LESSON CONTEXT.
4. ACCURACY: If info is not available, say so.

=== YOUR ROLE ===
You are an EXPERT AI TUTOR for this lesson.${courseId ? ` Full course knowledge available.` : ''}

=== LESSON CONTEXT ===
${context}

=== FORMATTING ===
- **bold** for key terms, bullet points, short paragraphs

=== RESPONSE STRUCTURE ===
1. Answer directly
2. Reference lesson content
3. End with:
---
💡 **Suggested Questions:**
1. [Follow-up]
2. [Deeper]
3. [Application]

=== STUDENT MESSAGE ===
${message}
`;
}

export function buildMindmapPrompt(
  title: string, moduleNames: string[], keyPoints: string[],
  concepts: string[], transcript: string, slides: string,
  crossLessonBlock: string | undefined, lang?: SupportedLang
): string {
  return `
You are a MASTER EDUCATOR creating a STUDY GUIDE mindmap.

${getLangDirective(lang)}

=== MERMAID SYNTAX (STRICT) ===
- Start with: mindmap
- Root: root((📚 Topic Name))
- Use 2-space indentation
- NO special chars: no [], (), {}, :, backticks, quotes
- Labels: MAX 35 chars

=== STRUCTURE (5 BRANCHES) ===
📚 TOPIC (root)
├── ❓ What - Definition
├── 🎯 Why - Purpose
├── ⚡ How - Steps
├── 💡 Practice - Examples
└── 📝 Remember - Key points

=== LESSON DATA ===
Topic: ${title}
Sections: ${moduleNames.join(", ") || "Introduction, Main Content, Practice"}
Key points: ${keyPoints.slice(0, 4).join(" | ") || "Important concepts"}
Terms: ${concepts.slice(0, 6).join(", ") || "vocabulary"}

=== LECTURE CONTENT ===
${smartTruncate(transcript, 1000) || "No transcript"}

=== SLIDE CONTENT ===
${smartTruncate(slides, 800) || "No slides"}

${crossLessonBlock ? `=== CONNECTIONS ===\n${crossLessonBlock}\n` : ''}
Create a STUDY GUIDE mindmap for "${title}". OUTPUT ONLY mermaid code.
`;
}

export function buildMindmapModulePrompt(targetTitle: string, targetContent: string, lang?: SupportedLang): string {
  return `
You are a MASTER EDUCATOR creating a STUDY GUIDE mindmap for a specific module.

${getLangDirective(lang)}

=== MERMAID SYNTAX (STRICT) ===
- Start with: mindmap
- Root: root((📚 Topic Name))
- Use 2-space indentation
- NO special chars
- Labels: MAX 35 chars

=== MODULE DATA ===
Module Title: ${targetTitle}
Module Content: ${smartTruncate(targetContent, 1000)}

OUTPUT ONLY mermaid code for "${targetTitle}".
`;
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
