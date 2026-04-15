import "@testing-library/jest-dom/vitest";

// Mock window.matchMedia for jsdom
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

/**
 * jsdom 29 ships a partial localStorage where `setItem` / `getItem` are
 * undefined in some test runners (observed with vitest 4 + jsdom 29). Zustand's
 * persist middleware then throws `storage.setItem is not a function` on every
 * setState. Replace `window.localStorage` + `window.sessionStorage` with a
 * faithful in-memory Storage implementation so persist works under test.
 */
class MemoryStorage implements Storage {
  private data = new Map<string, string>();
  get length(): number {
    return this.data.size;
  }
  clear(): void {
    this.data.clear();
  }
  getItem(key: string): string | null {
    return this.data.has(key) ? (this.data.get(key) as string) : null;
  }
  key(index: number): string | null {
    return Array.from(this.data.keys())[index] ?? null;
  }
  removeItem(key: string): void {
    this.data.delete(key);
  }
  setItem(key: string, value: string): void {
    this.data.set(key, String(value));
  }
}

function installStorage(name: "localStorage" | "sessionStorage"): void {
  Object.defineProperty(window, name, {
    configurable: true,
    writable: true,
    value: new MemoryStorage(),
  });
  // Some code reads the global without `window.` prefix.
  Object.defineProperty(globalThis, name, {
    configurable: true,
    writable: true,
    value: (window as unknown as Record<string, Storage>)[name],
  });
}

installStorage("localStorage");
installStorage("sessionStorage");
