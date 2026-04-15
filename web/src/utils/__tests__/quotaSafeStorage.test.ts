import { describe, it, expect, vi, beforeEach } from "vitest";
import { quotaSafeLocalStorage } from "../quotaSafeStorage";

/**
 * Focus: quota-path fallbacks. Normal read/write is delegated to the browser
 * Storage (jsdom's MemoryStorage in the test environment) — we only assert
 * the pruning/removal branches that trigger on QuotaExceededError.
 */

function makeQuotaError(): DOMException {
  // DOMException has no public constructor in jsdom prior to 22; fall back
  // to a plain Error with the recognized name.
  const err = new Error("quota exceeded");
  err.name = "QuotaExceededError";
  return err as unknown as DOMException;
}

describe("quotaSafeLocalStorage", () => {
  let store: ReturnType<typeof quotaSafeLocalStorage>;

  beforeEach(() => {
    localStorage.clear();
    store = quotaSafeLocalStorage();
  });

  it("delegates normal setItem/getItem/removeItem to localStorage", () => {
    store.setItem("k", "v");
    expect(localStorage.getItem("k")).toBe("v");
    expect(store.getItem("k")).toBe("v");
    store.removeItem("k");
    expect(store.getItem("k")).toBeNull();
  });

  it("prunes the lessons array and retries once on quota error", () => {
    const blob = JSON.stringify({
      state: {
        lessons: Array.from({ length: 250 }, (_, i) => ({ id: `l${i}`, title: `Lesson ${i}` })),
        currentLessonId: null,
      },
      version: 1,
    });

    const setItemSpy = vi.spyOn(localStorage, "setItem");
    let firstCall = true;
    setItemSpy.mockImplementation((key: string, value: string) => {
      if (firstCall) {
        firstCall = false;
        throw makeQuotaError();
      }
      // Second call (after prune) should succeed — write to the underlying
      // MemoryStorage via the original descriptor.
      // Emulate success by using the default MemoryStorage set.
      (Object.getPrototypeOf(localStorage) as Storage).setItem.call(localStorage, key, value);
    });

    store.setItem("learncraft-lesson-storage", blob);

    // Two writes were attempted: original (failed) + pruned (succeeded).
    expect(setItemSpy).toHaveBeenCalledTimes(2);
    const [, prunedValue] = setItemSpy.mock.calls[1];
    const written = JSON.parse(prunedValue as string);
    expect(Array.isArray(written.state.lessons)).toBe(true);
    // Prune keeps last 100 lessons.
    expect(written.state.lessons.length).toBe(100);
  });

  it("removes the key as last resort if pruning cannot help", () => {
    const tinyBlob = JSON.stringify({ state: { foo: "bar" }, version: 1 });

    const setItemSpy = vi.spyOn(localStorage, "setItem");
    setItemSpy.mockImplementation(() => {
      throw makeQuotaError();
    });
    const removeSpy = vi.spyOn(localStorage, "removeItem");

    store.setItem("learncraft-course-storage", tinyBlob);

    expect(removeSpy).toHaveBeenCalledWith("learncraft-course-storage");
  });

  it("returns null on malformed read (corrupt blob) instead of throwing", () => {
    vi.spyOn(localStorage, "getItem").mockImplementation(() => {
      throw new Error("read failure");
    });
    expect(store.getItem("anything")).toBeNull();
  });
});
