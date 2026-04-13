import { MongoRepository } from "./mongoRepository";
import { LessonModel } from "../models/Lesson";
import type { Lesson } from "../types/lesson";

class LessonRepository extends MongoRepository<Lesson> {
  constructor() {
    super(LessonModel);
  }
}

export const lessonRepo = new LessonRepository();
