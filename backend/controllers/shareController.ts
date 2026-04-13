// controllers/shareController.ts
// Thin wrapper — business logic lives in shareService.

import { shareService, SharedBundle } from "../services/shareService";

export type { SharedBundle };

// Create a new share
export function createShare(
  lessonId: string,
  createdBy: string = "anonymous"
): Promise<SharedBundle | null> {
  return shareService.createShare(lessonId, createdBy);
}

// Get a share by ID
export function getShare(shareId: string): Promise<SharedBundle | null> {
  return shareService.getShare(shareId);
}

// Add comment to share
export function addComment(
  shareId: string,
  author: string,
  text: string
): Promise<SharedBundle | null> {
  return shareService.addComment(shareId, author, text);
}

// List shares owned by user
export function listShares(userId: string): Promise<SharedBundle[]> {
  return shareService.listShares(userId);
}

// Delete a share (ownership enforced)
export function deleteShare(shareId: string, userId: string): Promise<boolean> {
  return shareService.deleteShare(shareId, userId);
}
