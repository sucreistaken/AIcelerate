import { Request, Response } from "express";
import { channelToolService } from "../services/channelToolService";
import { listLessons, getLesson } from "../services/lessonDataService";
import { channelService } from "../services/channelService";
import { roomService } from "../services/roomService";
import { AuthRequest } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { badRequest, notFound, forbidden } from "../middleware/errorHandler";

async function verifyMembership(userId: string, serverId: string): Promise<void> {
  const room = await roomService.getById(serverId);
  if (!room.memberIds.includes(userId)) throw forbidden("Not a member of this server");
}

export const channelToolController = {
  getToolData: asyncHandler(async (req: AuthRequest, res: Response) => {
    const channel = await channelService.getByIdGlobal(req.params.channelId);
    await verifyMembership(req.user!.userId, channel.roomId);
    const data = await channelToolService.getData(req.params.channelId);
    res.json({ ok: true, data });
  }),

  generateQuiz: asyncHandler(async (req: AuthRequest, res: Response) => {
    const channel = await channelService.getByIdGlobal(req.params.channelId);
    await verifyMembership(req.user!.userId, channel.roomId);
    const { topic, serverName, count, difficulty, includeTrueFalse } = req.body;
    const { data, sourcesSummary } = await channelToolService.generateQuiz(
      req.params.channelId, topic, serverName, count || 10, { difficulty, includeTrueFalse }
    );
    res.json({ ok: true, data, sourcesSummary });
  }),

  answerQuiz: asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const { nickname, questionId, selectedIndex } = req.body;
    const result = await channelToolService.answerQuiz(
      req.params.channelId, userId, nickname, questionId, selectedIndex
    );
    res.json({ ok: true, result });
  }),

  addFlashcard: asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const { front, back, topic, nickname } = req.body;
    const card = await channelToolService.addFlashcard(
      req.params.channelId, front, back, topic, userId, nickname
    );
    res.json({ ok: true, card });
  }),

  generateFlashcards: asyncHandler(async (req: AuthRequest, res: Response) => {
    const channel = await channelService.getByIdGlobal(req.params.channelId);
    await verifyMembership(req.user!.userId, channel.roomId);
    const { topic, serverName, count } = req.body;
    const { cards, sourcesSummary } = await channelToolService.generateFlashcards(
      req.params.channelId, topic, serverName, count
    );
    res.json({ ok: true, cards, sourcesSummary });
  }),

  extractFlashcards: asyncHandler(async (req: AuthRequest, res: Response) => {
    const channel = await channelService.getByIdGlobal(req.params.channelId);
    await verifyMembership(req.user!.userId, channel.roomId);
    const result = await channelToolService.extractFlashcardsFromLesson(req.params.channelId);
    res.json({ ok: true, ...result });
  }),

  reviewFlashcard: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { channelId } = req.params;
    const userId = req.user!.userId;
    const { cardId, quality } = req.body;
    if (!cardId || quality === undefined) throw badRequest("Missing cardId or quality");

    const q = Math.max(0, Math.min(5, Number(quality)));
    const card = await channelToolService.reviewFlashcard(channelId, cardId, userId, q);
    if (!card) throw notFound("Card not found");
    res.json({ ok: true, card });
  }),

  deepDiveChat: asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const { text, nickname, topic, serverName } = req.body;
    const { userMessage, aiMessage } = await channelToolService.deepDiveChat(
      req.params.channelId, text, userId, nickname, topic, serverName
    );
    res.json({ ok: true, userMessage, aiMessage });
  }),

  generateMindMap: asyncHandler(async (req: AuthRequest, res: Response) => {
    const channel = await channelService.getByIdGlobal(req.params.channelId);
    await verifyMembership(req.user!.userId, channel.roomId);
    const { topic, serverName } = req.body;
    const { mindMap, sourcesSummary } = await channelToolService.generateMindMap(
      req.params.channelId, topic, serverName
    );
    res.json({ ok: true, mindMap, sourcesSummary });
  }),

  startSprint: asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const { studyMin, breakMin, nickname } = req.body;
    const sprint = await channelToolService.startSprint(
      req.params.channelId, studyMin, breakMin, userId, nickname
    );
    res.json({ ok: true, sprint });
  }),

  updateSprintStatus: asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const { nickname, status } = req.body;
    const sprint = await channelToolService.updateSprintStatus(
      req.params.channelId, userId, nickname, status
    );
    res.json({ ok: true, sprint });
  }),

  addNote: asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const { title, content, category, nickname } = req.body;
    const note = await channelToolService.addNote(
      req.params.channelId, title, content, category, userId, nickname
    );
    res.json({ ok: true, note });
  }),

  editNote: asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const channel = await channelService.getByIdGlobal(req.params.channelId);
    await verifyMembership(userId, channel.roomId);
    const { title, content, category } = req.body;
    const note = await channelToolService.editNote(
      req.params.channelId, req.params.noteId, { title, content, category }
    );
    res.json({ ok: true, note });
  }),

  deleteNote: asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const channel = await channelService.getByIdGlobal(req.params.channelId);
    await verifyMembership(userId, channel.roomId);
    await channelToolService.deleteNote(req.params.channelId, req.params.noteId);
    res.status(204).end();
  }),

  pinNote: asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const channel = await channelService.getByIdGlobal(req.params.channelId);
    await verifyMembership(userId, channel.roomId);
    const note = await channelToolService.pinNote(req.params.channelId, req.params.noteId);
    res.json({ ok: true, note });
  }),

  lockTool: asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const result = await channelToolService.lockTool(req.params.channelId, userId);
    res.json({ ok: true, ...result });
  }),

  unlockTool: asyncHandler(async (req: AuthRequest, res: Response) => {
    const channel = await channelService.getByIdGlobal(req.params.channelId);
    await verifyMembership(req.user!.userId, channel.roomId);
    const result = await channelToolService.unlockTool(req.params.channelId);
    res.json({ ok: true, ...result });
  }),

  getLessons(_req: Request, res: Response) {
    const lessons = listLessons();
    const summaries = lessons.map((l) => ({
      id: l.id,
      title: l.title,
      date: l.date,
      hasTranscript: !!(l.transcript && l.transcript.length > 0),
      hasSlideText: !!(l.slideText && l.slideText.length > 0),
      hasPlan: !!l.plan,
      courseCode: l.courseCode,
    }));
    res.json({ ok: true, lessons: summaries });
  },

  linkLesson: asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const { channelId } = req.params;
    const { serverId, lessonId, lessonTitle } = req.body;
    if (!serverId || !lessonId || !lessonTitle) throw badRequest("Missing serverId, lessonId, or lessonTitle");
    await verifyMembership(userId, serverId);
    const channel = await channelService.linkLesson(channelId, lessonId, lessonTitle);
    res.json({ ok: true, channel });
  }),

  unlinkLesson: asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const { channelId } = req.params;
    const { serverId } = req.body;
    if (!serverId) throw badRequest("Missing serverId");
    await verifyMembership(userId, serverId);
    const channel = await channelService.unlinkLesson(channelId);
    res.json({ ok: true, channel });
  }),

  getLessonDetail: asyncHandler(async (req: Request, res: Response) => {
    const { channelId } = req.params;
    const channel = await channelService.getByIdGlobal(channelId);
    if (!channel.lessonId) return res.json({ linked: false });
    const lesson = getLesson(channel.lessonId);
    if (!lesson) return res.json({ linked: false });

    const modules = lesson.plan?.modules?.map((m: { title: string; goal?: string }) => ({
      title: m.title, goal: m.goal,
    })) || null;

    const emphases = lesson.professorEmphases?.map((e: { statement: string; why: string; evidence?: string; confidence?: number }) => ({
      statement: e.statement, why: e.why, evidence: e.evidence, confidence: e.confidence,
    })) || null;

    const cs = lesson.cheatSheet;
    const cheatSheet = cs ? {
      sections: cs.sections || [], formulas: cs.formulas || [],
      pitfalls: cs.pitfalls || [], quickQuiz: cs.quickQuiz || [],
    } : null;

    const rawLo = lesson.loModules?.modules;
    const loModules = rawLo?.length ? rawLo.map((m: { loId: string; loTitle: string; oneLineGist: string; coreIdeas?: string[]; mustRemember?: string[]; commonTraps?: string[]; miniQuiz?: unknown[]; examples?: unknown[] }) => ({
      loId: m.loId, loTitle: m.loTitle, oneLineGist: m.oneLineGist,
      coreIdeas: m.coreIdeas || [], mustRemember: m.mustRemember || [],
      commonTraps: m.commonTraps || [], miniQuiz: m.miniQuiz || [],
      examples: m.examples || [],
    })) : null;

    const learningOutcomes = lesson.plan?.learning_outcomes?.length
      ? lesson.plan.learning_outcomes.map((lo: string) => ({ code: lo, description: lo }))
      : null;

    res.json({
      linked: true,
      lesson: {
        id: lesson.id, title: lesson.title, modules, emphases, cheatSheet,
        loModules, learningOutcomes, keyConcepts: lesson.plan?.key_concepts || [],
      },
    });
  }),

  getLessonContext: asyncHandler(async (req: Request, res: Response) => {
    const { channelId } = req.params;
    const channel = await channelService.getByIdGlobal(channelId);
    if (!channel.lessonId) return res.json({ linked: false });
    const lesson = getLesson(channel.lessonId);
    if (!lesson) return res.json({ linked: false });

    const keyTopics: string[] = [];
    if (lesson.plan?.modules) {
      for (const mod of lesson.plan.modules) {
        if (mod.title) keyTopics.push(mod.title);
      }
    }

    const loMods = lesson.loModules?.modules;
    const cs = lesson.cheatSheet;

    res.json({
      linked: true, lessonId: lesson.id, lessonTitle: lesson.title,
      hasTranscript: !!(lesson.transcript && lesson.transcript.length > 0),
      hasSlides: !!(lesson.slideText && lesson.slideText.length > 0),
      hasPlan: !!lesson.plan, hasCheatSheet: !!cs,
      hasLoModules: !!(loMods && loMods.length > 0),
      hasLearningOutcomes: !!(lesson.plan?.learning_outcomes && lesson.plan.learning_outcomes.length > 0),
      keyTopics: keyTopics.slice(0, 10),
      emphasesCount: lesson.professorEmphases?.length || 0,
      loModuleCount: loMods?.length || 0,
      quickQuizCount: cs?.quickQuiz?.length || 0,
      miniQuizCount: loMods?.reduce((sum: number, m: { miniQuiz?: unknown[] }) => sum + (m.miniQuiz?.length || 0), 0) || 0,
      mustRememberCount: loMods?.reduce((sum: number, m: { mustRemember?: string[] }) => sum + (m.mustRemember?.length || 0), 0) || 0,
      formulaCount: cs?.formulas?.length || 0,
      pitfallCount: cs?.pitfalls?.length || 0,
    });
  }),
};
