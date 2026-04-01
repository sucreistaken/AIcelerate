import { logger } from "../utils/logger";
import {
  channelToolRepo,
  QuizQuestion,
} from "../repositories/channelToolRepo";
import { getModel, stripCodeFences, getTemperature } from "./aiService";
import { SCHEMAS } from "../prompts/schemas";
import { generateId } from "../utils/idGenerator";
import { buildToolContext } from "./channelContextBuilder";
import { getLangDirective, type SupportedLang } from "../utils/langDirective";

// ── Quiz: generate ──────────────────────────────────────────────────────────
export async function generateQuiz(
  channelId: string,
  topic: string,
  serverName: string,
  count: number = 10,
  options?: { difficulty?: 'easy' | 'medium' | 'hard'; includeTrueFalse?: boolean },
  lang?: SupportedLang
) {
  const data = channelToolRepo.load(channelId);
  const difficulty = options?.difficulty || 'medium';
  const includeTF = options?.includeTrueFalse ?? true;

  try {
    const toolCtx = await buildToolContext(channelId, "quiz");

    const difficultyGuide = {
      easy: 'Focus on basic definitions, simple recall, and straightforward concepts. Questions should be answerable by someone who just read the material once.',
      medium: 'Mix of recall and application questions. Include some questions that require understanding relationships between concepts.',
      hard: 'Focus on analysis, application to novel scenarios, and tricky edge cases. Include questions that require deep understanding.',
    }[difficulty];

    const tfInstruction = includeTF
      ? `Include 2-3 True/False questions. For T/F questions, use options: ["True", "False"] with correctIndex 0 for True, 1 for False.`
      : 'All questions should be multiple choice with 4 options.';

    const contextBlock = toolCtx
      ? `Based on the following lecture material, generate questions that test understanding of the actual content:\n\n${toolCtx.context}\n\n`
      : '';

    const prompt = `${getLangDirective(lang)}\n\n${contextBlock}Generate exactly ${count} quiz questions about '${topic}' for a university study group '${serverName}'.

DIFFICULTY: ${difficulty.toUpperCase()}
${difficultyGuide}

${tfInstruction}

Return ONLY a JSON array with this schema:
[{
  "question": "string",
  "options": ["string array - 4 items for MC, 2 for T/F"],
  "correctIndex": number,
  "explanation": "Detailed explanation of WHY this answer is correct and others are wrong (2-3 sentences)",
  "type": "mc" or "tf",
  "difficulty": "${difficulty}"
}]

RULES:
- Each explanation must teach something, not just state the answer
- Options should be plausible (no obvious wrong answers)
- Questions should cover different aspects of the topic
${toolCtx ? `- Questions MUST be based on the provided lecture material
- Use professor emphases to create WHY-type questions that test deeper understanding
- Use cheat sheet quickQuiz items for factual recall questions
- Reference learning outcomes in explanations where relevant` : ''}
- Return ONLY valid JSON array`;

    const result = await getModel().generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 3000, temperature: getTemperature("balanced"), responseMimeType: "application/json", responseSchema: SCHEMAS.CHANNEL_QUIZ } as any,
    });
    const text = result.response.text();
    logger.info(`[AI] CHANNEL_QUIZ | ~${Math.ceil(prompt.length / 4)} in, ~${Math.ceil(text.length / 4)} out | max=3000`);
    const parsed = JSON.parse(text);

    const questions: QuizQuestion[] = (Array.isArray(parsed) ? parsed : []).map((q: any) => ({
      id: generateId(),
      question: q.question,
      options: q.options,
      correctIndex: q.correctIndex,
      explanation: q.explanation || '',
      type: q.type || (q.options?.length === 2 ? 'tf' : 'mc'),
      difficulty: q.difficulty || difficulty,
    }));

    data.quiz = {
      questions,
      scores: {},
      generatedAt: new Date().toISOString(),
    };

    channelToolRepo.save(channelId, data);
    return { data, sourcesSummary: toolCtx?.meta.sourcesSummary || null };
  } catch (err) {
    logger.error("channelToolService.generateQuiz error:", err);
    throw new Error("Failed to generate quiz");
  }
}

// ── Quiz: answer ────────────────────────────────────────────────────────────
export function answerQuiz(
  channelId: string,
  userId: string,
  nickname: string,
  questionId: string,
  selectedIndex: number
) {
  const data = channelToolRepo.load(channelId);

  if (!data.quiz || !data.quiz.questions.length) {
    throw new Error("No quiz available");
  }

  const question = data.quiz.questions.find((q) => q.id === questionId);
  if (!question) {
    throw new Error("Question not found");
  }

  const correct = selectedIndex === question.correctIndex;

  if (!data.quiz.scores[userId]) {
    data.quiz.scores[userId] = { correct: 0, total: 0, nickname };
  }

  data.quiz.scores[userId].total += 1;
  if (correct) {
    data.quiz.scores[userId].correct += 1;
  }

  channelToolRepo.save(channelId, data);

  return {
    correct,
    correctIndex: question.correctIndex,
    explanation: question.explanation,
    scores: data.quiz.scores,
  };
}
