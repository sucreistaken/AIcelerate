import { channelToolRepo, FlashcardItem } from "../repositories/channelToolRepo";
import { channelService } from "./channelService";
import { getLesson } from "../controllers/lessonControllers";
import { generateId } from "../utils/idGenerator";

export async function extractFlashcardsFromLesson(channelId: string): Promise<{
  cards: FlashcardItem[];
  summary: { emphases: number; quickQuiz: number; miniQuiz: number; mustRemember: number; total: number };
}> {
  const channel = await channelService.getByIdGlobal(channelId);
  if (!channel.lessonId) throw new Error("No lesson linked");

  const lesson = getLesson(channel.lessonId);
  if (!lesson) throw new Error("Lesson not found");

  const data = channelToolRepo.load(channelId);
  if (!data.flashcards) data.flashcards = { cards: [] };

  const existingFronts = new Set(data.flashcards.cards.map((c) => c.front));
  const newCards: FlashcardItem[] = [];
  const summary = { emphases: 0, quickQuiz: 0, miniQuiz: 0, mustRemember: 0, total: 0 };

  // 1. From emphases
  const emphases = lesson.professorEmphases || [];
  for (const e of emphases) {
    const front = e.statement;
    if (front && !existingFronts.has(front)) {
      newCards.push({
        id: generateId(),
        front,
        back: `Why: ${e.why || "Important concept"}\nEvidence: ${e.evidence || "Professor emphasis"}`,
        topic: "Professor Emphasis",
        createdBy: "system",
        createdByNickname: "Lesson Extract",
        createdAt: new Date().toISOString(),
        votes: [],
        source: "lesson-emphasis",
      });
      existingFronts.add(front);
      summary.emphases++;
    }
  }

  // 2. From cheatSheet.quickQuiz
  if (lesson.cheatSheet?.quickQuiz) {
    for (const qa of lesson.cheatSheet.quickQuiz) {
      if (qa.q && !existingFronts.has(qa.q)) {
        newCards.push({
          id: generateId(),
          front: qa.q,
          back: qa.a,
          topic: "Cheat Sheet",
          createdBy: "system",
          createdByNickname: "Lesson Extract",
          createdAt: new Date().toISOString(),
          votes: [],
          source: "lesson-cheatsheet",
        });
        existingFronts.add(qa.q);
        summary.quickQuiz++;
      }
    }
  }

  // 3. From LO modules miniQuiz
  if (lesson.loModules?.modules) {
    for (const mod of lesson.loModules.modules) {
      if (mod.miniQuiz) {
        for (const mq of mod.miniQuiz) {
          if (mq.question && !existingFronts.has(mq.question)) {
            newCards.push({
              id: generateId(),
              front: mq.question,
              back: `${mq.answer}\n\nWhy: ${mq.why}`,
              topic: mod.loTitle || mod.loId,
              createdBy: "system",
              createdByNickname: "Lesson Extract",
              createdAt: new Date().toISOString(),
              votes: [],
              source: "lesson-miniQuiz",
            });
            existingFronts.add(mq.question);
            summary.miniQuiz++;
          }
        }
      }

      // 4. From mustRemember
      if (mod.mustRemember) {
        for (const fact of mod.mustRemember) {
          if (fact && !existingFronts.has(fact)) {
            const words = fact.split(" ");
            let front: string;
            let back: string;
            if (words.length > 3) {
              const blankIdx = Math.floor(words.length / 2);
              const blanked = [...words];
              back = blanked[blankIdx];
              blanked[blankIdx] = "______";
              front = `Fill in the blank: ${blanked.join(" ")}`;
            } else {
              front = `What is: ${fact}?`;
              back = fact;
            }
            newCards.push({
              id: generateId(),
              front,
              back,
              topic: mod.loTitle || mod.loId,
              createdBy: "system",
              createdByNickname: "Lesson Extract",
              createdAt: new Date().toISOString(),
              votes: [],
              source: "lesson-loModule",
            });
            existingFronts.add(fact);
            summary.mustRemember++;
          }
        }
      }
    }
  }

  summary.total = newCards.length;

  if (newCards.length > 0) {
    data.flashcards.cards.push(...newCards);
    channelToolRepo.save(channelId, data);
  }

  return { cards: newCards, summary };
}
