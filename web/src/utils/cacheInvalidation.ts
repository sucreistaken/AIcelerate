// Cache invalidation utility
// Tracks lesson updatedAt timestamps to invalidate stale cached data

const CACHE_VERSION_KEY = 'lc.cache.versions';

function getVersions(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(CACHE_VERSION_KEY) || '{}'); } catch { return {}; }
}

function setVersions(versions: Record<string, string>) {
  localStorage.setItem(CACHE_VERSION_KEY, JSON.stringify(versions));
}

/**
 * Check if a lesson's cached data is stale.
 * Returns true if the cache should be invalidated.
 */
export function isLessonCacheStale(lessonId: string, updatedAt?: string): boolean {
  if (!updatedAt) return false;
  const versions = getVersions();
  const cached = versions[lessonId];
  return cached !== updatedAt;
}

/**
 * Mark a lesson's cache as current with given updatedAt.
 */
export function markLessonCacheCurrent(lessonId: string, updatedAt: string) {
  const versions = getVersions();
  versions[lessonId] = updatedAt;
  setVersions(versions);
}

/**
 * Invalidate all cached data for a lesson.
 * Removes quiz answers, eval results, and other per-lesson cache entries.
 */
export function invalidateLessonCache(lessonId: string) {
  const prefixes = [
    'lc.quiz.answers.',
    'lc.quiz.eval.',
    'lc.quiz.history.',
    'lc.deepdive.chats.',
    'lc.mindmap.',
    'lc.mindmap.progress.',
  ];
  for (const prefix of prefixes) {
    localStorage.removeItem(prefix + lessonId);
  }
  // Update version tracking
  const versions = getVersions();
  delete versions[lessonId];
  setVersions(versions);
}
