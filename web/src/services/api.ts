// src/services/api.ts
// Barrel re-export - all API modules are re-exported from here
// so existing imports like `import { lessonsApi } from '../services/api'` continue to work.

// Shared types and helpers
export type { ApiResponse, LessonData, PlanResponse, TranscribeStartResponse } from './httpClient';
export { handleResponse } from './httpClient';

// Dashboard batch endpoint — fetches all initial data in 1 request instead of 7
// Uses singleton promise pattern: concurrent calls share a single in-flight request
import { API_BASE } from './httpClient';

let _dashboardPromise: Promise<any | null> | null = null;

export const dashboardApi = {
  async init(courseId?: string): Promise<any | null> {
    // Dedup: if a request is already in-flight, return the same promise
    if (_dashboardPromise) return _dashboardPromise;
    _dashboardPromise = (async () => {
      try {
        const params = new URLSearchParams();
        params.set("lite", "true"); // Skip transcript/slideText for faster dashboard load
        if (courseId) params.set("courseId", courseId);
        const res = await fetch(`${API_BASE}/api/dashboard/init?${params}`);
        if (!res.ok) return null;
        return await res.json();
      } catch {
        return null;
      } finally {
        _dashboardPromise = null; // Allow next call after completion
      }
    })();
    return _dashboardPromise;
  },
};

// Lesson-related APIs
export { lessonsApi, planApi, uploadApi, cheatSheetApi, deviationApi, deepDiveApi, connectionsApi } from './lessonApi';

// Quiz API
export { quizApi } from './quizApi';

// Flashcard API
export { flashcardApi } from './flashcardApi';

// Course and Learning Objectives APIs
export { courseApi, loApi, knowledgeGraphApi, adaptiveQuizApi, loProgressApi } from './courseApi';

// Scheduler, Notification, and Gamification APIs
export { schedulerApi, notificationApi, gamificationApi } from './schedulerApi';

// Share, Rooms, Workspace, Weakness, and Sprint APIs
export { sharesApi, roomsApi, roomWorkspaceApi, weaknessApi, sprintApi } from './shareApi';
