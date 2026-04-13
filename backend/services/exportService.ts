import { channelToolRepo } from "../repositories/channelToolRepo";

export const exportService = {
  async exportQuiz(channelId: string) {
    const data = await channelToolRepo.load(channelId);
    if (!data.quiz) return null;

    const questions = data.quiz.questions.map(q => ({
      question: q.question,
      options: q.options,
      correctAnswer: q.options[q.correctIndex],
      explanation: q.explanation,
      type: q.type || 'mc',
      difficulty: q.difficulty || 'medium',
    }));

    const scores = Object.entries(data.quiz.scores).map(([_userId, s]) => ({
      nickname: s.nickname,
      correct: s.correct,
      total: s.total,
      percentage: s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0,
    }));

    return { questions, scores, generatedAt: data.quiz.generatedAt };
  },

  async exportFlashcards(channelId: string) {
    const data = await channelToolRepo.load(channelId);
    if (!data.flashcards) return null;

    return data.flashcards.cards.map(c => ({
      front: c.front,
      back: c.back,
      hint: c.hint,
      topic: c.topic,
      createdBy: c.createdByNickname,
      source: c.source,
    }));
  },

  async exportNotes(channelId: string) {
    const data = await channelToolRepo.load(channelId);
    if (!data.notes) return null;

    return data.notes.items.map(n => ({
      title: n.title,
      content: n.content,
      category: n.category,
      author: n.authorNickname,
      pinned: n.pinned,
      createdAt: n.createdAt,
    }));
  },

  async exportMindMap(channelId: string) {
    const data = await channelToolRepo.load(channelId);
    if (!data.mindMap) return null;

    return {
      mermaidCode: data.mindMap.mermaidCode,
      topic: data.mindMap.topic,
      generatedAt: data.mindMap.generatedAt,
    };
  },

  async exportAll(channelId: string) {
    return {
      quiz: await this.exportQuiz(channelId),
      flashcards: await this.exportFlashcards(channelId),
      notes: await this.exportNotes(channelId),
      mindMap: await this.exportMindMap(channelId),
      exportedAt: new Date().toISOString(),
    };
  },
};
