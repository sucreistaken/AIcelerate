export interface PaginationParams {
  cursor?: string;
  limit: number;
  direction?: "forward" | "backward";
}

export interface PaginatedResult<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export function clampLimit(limit?: number): number {
  const n = Number(limit) || DEFAULT_PAGE_SIZE;
  return Math.min(Math.max(1, n), MAX_PAGE_SIZE);
}

/**
 * Build a Mongoose cursor-based pagination filter.
 * Uses _id as the natural cursor (lexicographically ordered ObjectId).
 */
export function cursorFilter(cursor?: string, direction: "forward" | "backward" = "forward") {
  if (!cursor) return {};
  return direction === "forward" ? { _id: { $gt: cursor } } : { _id: { $lt: cursor } };
}

/**
 * Build PaginatedResult from a fetched array.
 * Fetch limit+1 items to determine hasMore, then slice.
 */
export function buildPaginatedResult<T extends { id?: string; _id?: any }>(
  items: T[],
  limit: number,
): PaginatedResult<T> {
  const hasMore = items.length > limit;
  const sliced = hasMore ? items.slice(0, limit) : items;
  const last = sliced[sliced.length - 1];
  const nextCursor = hasMore && last ? (last.id || last._id?.toString() || null) : null;
  return { items: sliced, nextCursor, hasMore };
}
