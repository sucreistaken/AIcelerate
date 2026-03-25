import path from "path";
import { BaseRepository } from "./baseRepository";
import type { Lesson } from "../controllers/lessonControllers";

const DATA_PATH = path.join(process.cwd(), "backend", "data", "lessons.json");

class LessonRepository extends BaseRepository<Lesson> {
  constructor() {
    super(DATA_PATH);
  }

  // ---- Synchronous convenience methods (backward-compat) ----

  findAllSync(): Lesson[] {
    return this.readAll();
  }

  findByIdSync(id: string): Lesson | null {
    return this.readAll().find((l) => l.id === id) ?? null;
  }

  upsertSync(item: Lesson): Lesson {
    const items = this.readAll();
    const idx = items.findIndex((i) => i.id === item.id);
    if (idx === -1) {
      items.push(item);
    } else {
      items[idx] = item;
    }
    this.writeAll(items);
    return item;
  }

  deleteSync(id: string): boolean {
    const items = this.readAll();
    const filtered = items.filter((i) => i.id !== id);
    if (filtered.length === items.length) return false;
    this.writeAll(filtered);
    return true;
  }

  /** Replace the entire list (used by mutation helpers that modify in-place). */
  saveAllSync(items: Lesson[]): void {
    this.writeAll(items);
  }
}

export const lessonRepo = new LessonRepository();
