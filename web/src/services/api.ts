// src/services/api.ts
// Barrel re-export - all API modules are re-exported from here
// so existing imports like `import { lessonsApi } from '../services/api'` continue to work.

// Shared types and helpers
export type { ApiResponse, LessonData, PlanResponse, TranscribeStartResponse } from './httpClient';
export { handleResponse } from './httpClient';

// Lesson-related APIs
export { lessonsApi, planApi, uploadApi, cheatSheetApi, deviationApi, deepDiveApi, connectionsApi } from './lessonApi';

// Quiz API
export { quizApi } from './quizApi';

// Flashcard API
export { flashcardApi } from './flashcardApi';

// Course and Learning Objectives APIs
export { courseApi, loApi } from './courseApi';

// Scheduler, Notification, and Gamification APIs
export { schedulerApi, notificationApi, gamificationApi } from './schedulerApi';

// Share, Rooms, Workspace, Weakness, and Sprint APIs
export { sharesApi, roomsApi, roomWorkspaceApi, weaknessApi, sprintApi } from './shareApi';
