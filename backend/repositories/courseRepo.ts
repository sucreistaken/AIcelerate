import path from "path";
import { BaseRepository } from "./baseRepository";
import type { Course } from "../controllers/courseController";

const DATA_PATH = path.join(process.cwd(), "backend", "data", "courses.json");

class CourseRepository extends BaseRepository<Course> {
  constructor() {
    super(DATA_PATH);
  }

  // ---- Synchronous convenience methods (backward-compat) ----

  findAllSync(): Course[] {
    return this.readAll();
  }

  findByIdSync(id: string): Course | null {
    return this.readAll().find((c) => c.id === id) ?? null;
  }

  upsertSync(item: Course): Course {
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
  saveAllSync(items: Course[]): void {
    this.writeAll(items);
  }
}

export const courseRepo = new CourseRepository();
