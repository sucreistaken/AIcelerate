// src/services/api.ts
// Barrel re-export - all API modules are re-exported from here
// so existing imports like `import { lessonsApi } from '../services/api'` continue to work.

// Shared types and helpers
export type { ApiResponse, LessonData, PlanResponse, TranscribeStartResponse } from './httpClient';
export { handleResponse } from './httpClient';

// Dashboard batch endpoint — fetches all initial data in 1 request instead of 7
import { API_BASE } from './httpClient';

export const dashboardApi = {
  async init(courseId?: string): Promise<any | null> {
    try {
      const url = courseId
        ? `${API_BASE}/api/dashboard/init?courseId=${encodeURIComponent(courseId)}`
        : `${API_BASE}/api/dashboard/init`;
      const res = await fetch(url);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
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
