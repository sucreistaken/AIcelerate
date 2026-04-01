import { logger } from "../utils/logger";
import { getModel, getTemperature } from "./aiService";
import { getCourse, getCourseProgress } from "../controllers/courseController";
import { assembleCourseWideContext } from "../controllers/contextAssembler";
import { SCHEMAS } from "../prompts/schemas";
import { notFound } from "../middleware/errorHandler";
import { getLangDirective, type SupportedLang } from "../utils/langDirective";

export async function generateCourseChatResponse(
  courseId: string,
  message: string,
  history?: Array<{ role: string; content: string }>,
  lang?: SupportedLang
): Promise<{ text: string; suggestions: string[] }> {
  const course = getCourse(courseId);
  if (!course) throw notFound("Course not found");

  const courseCtx = assembleCourseWideContext(courseId);
  const chat = getModel().startChat({
    history: history?.map((h) => ({
      role: h.role === 'user' ? 'user' : 'model',
      parts: [{ text: h.content }],
    })) || [],
    generationConfig: { maxOutputTokens: 2500, temperature: getTemperature("creative") },
  });

  const prompt = `${getLangDirective(lang)}
=== YOUR ROLE ===
You are an EXPERT AI TUTOR for: ${course.code} - ${course.name}.

=== COURSE CONTEXT ===
${courseCtx.fullContext}

=== STUDENT MESSAGE ===
${message}

Answer directly, reference specific lessons, end with 3 suggested follow-up questions.
`;

  const result = await chat.sendMessage(prompt);
  let text = result.response.text();
  logger.info(`[AI] COURSE_CHAT | courseId=${courseId} | ~${Math.ceil(prompt.length / 4)} in`);

  const suggestionsMatch = text.match(/\*\*Suggested Questions:\*\*\s*([\s\S]*?)$/);
  let suggestions: string[] = [];
  if (suggestionsMatch) {
    suggestions = suggestionsMatch[1].trim().split('\n')
      .map(line => line.replace(/^\d+\.\s*/, '').trim())
      .filter(s => s.length > 5).slice(0, 3);
  }

  return { text, suggestions };
}

export async function generateStudySchedule(
  courseId: string,
  examDate?: string
): Promise<any> {
  const course = getCourse(courseId);
  if (!course) throw notFound("Course not found");

  const progress = getCourseProgress(courseId);
  const ki = course.knowledgeIndex;
  const effectiveExamDate = examDate || course.settings?.examDate || "Not specified";

  const prompt = `Generate a personalized weekly study schedule in JSON format.
Course: ${course.code} - ${course.name}
Total Lessons: ${progress?.totalLessons || 0}, Completed: ${progress?.completedLessons || 0}
Quiz Average: ${progress?.overallQuizAvg ? Math.round(progress.overallQuizAvg * 100) + '%' : 'N/A'}
Weak Topics: ${progress?.weakTopics?.join(', ') || 'None'}
Exam Date: ${effectiveExamDate}
${ki ? `Themes: ${ki.overview.courseThemes.join(', ')}` : ''}

Return JSON: { "days": [{ "day": "Monday", "slots": [{ "time": "Morning", "activity": "..." }] }], "tips": ["..."] }`;

  const result = await getModel().generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      maxOutputTokens: 2000,
      temperature: getTemperature("structured"),
      responseMimeType: "application/json",
      responseSchema: SCHEMAS.STUDY_SCHEDULE,
    } as any,
  });

  const text = result.response.text();
  logger.info(`[AI] STUDY_SCHEDULE | courseId=${courseId} | ~${Math.ceil(prompt.length / 4)} in, ~${Math.ceil(text.length / 4)} out`);
  const parsed = JSON.parse(text);

  return {
    courseId,
    generatedAt: new Date().toISOString(),
    examDate: effectiveExamDate !== "Not specified" ? effectiveExamDate : undefined,
    days: parsed.days || [],
    tips: parsed.tips || [],
  };
}
