/**
 * Singleton Mermaid loader with deduplication.
 *
 * Mermaid is ~2MB gzipped. This loader ensures:
 *   1. It's only loaded when first needed (dynamic import)
 *   2. Concurrent loadMermaid() calls share a single import
 *   3. Once loaded, the instance is cached forever (no re-init)
 *   4. prefetchMermaid() can be called on hover to warm the cache
 */

type MermaidAPI = typeof import("mermaid").default;

let instance: MermaidAPI | null = null;
let loadPromise: Promise<MermaidAPI> | null = null;

export function loadMermaid(): Promise<MermaidAPI> {
  if (instance) return Promise.resolve(instance);
  if (loadPromise) return loadPromise;

  loadPromise = import("mermaid").then((mod) => {
    instance = mod.default;
    instance.initialize({
      startOnLoad: false,
      theme: document.documentElement.classList.contains("dark") ? "dark" : "default",
      securityLevel: "loose",
    });
    return instance;
  });

  return loadPromise;
}

/** Fire-and-forget prefetch — call on hover/intersection to warm cache */
export function prefetchMermaid(): void {
  loadMermaid();
}
