// src/services/schedulerApi.ts
// Scheduler, Notification, and Gamification APIs

import { API_BASE } from './httpClient';
import { StudyTask, DailyPlan, WeeklyOverview, StreakData, AppNotification } from '../types';

// ============ Scheduler API ============
export const schedulerApi = {
    async getNextSession(courseId?: string): Promise<{ ok: boolean; task?: StudyTask | null; totalPending?: number; error?: string }> {
        try {
            const url = courseId
                ? `${API_BASE}/api/scheduler/next-session?courseId=${encodeURIComponent(courseId)}`
                : `${API_BASE}/api/scheduler/next-session`;
            const res = await fetch(url);
            return await res.json();
        } catch (error) {
            return { ok: false, error: 'Failed to get next session' };
        }
    },

    async getDailyPlan(courseId?: string): Promise<{ ok: boolean; plan?: DailyPlan; error?: string }> {
        try {
            const url = courseId
                ? `${API_BASE}/api/scheduler/daily?courseId=${encodeURIComponent(courseId)}`
                : `${API_BASE}/api/scheduler/daily`;
            const res = await fetch(url);
            return await res.json();
        } catch (error) {
            return { ok: false, error: 'Failed to get daily plan' };
        }
    },

    async getWeeklyOverview(courseId?: string): Promise<{ ok: boolean; overview?: WeeklyOverview; error?: string }> {
        try {
            const url = courseId
                ? `${API_BASE}/api/scheduler/weekly?courseId=${encodeURIComponent(courseId)}`
                : `${API_BASE}/api/scheduler/weekly`;
            const res = await fetch(url);
            return await res.json();
        } catch (error) {
            return { ok: false, error: 'Failed to get weekly overview' };
        }
    },

    async completeTask(taskId: string): Promise<{ ok: boolean; streak?: StreakData; error?: string }> {
        try {
            const res = await fetch(`${API_BASE}/api/scheduler/complete-task`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ taskId }),
            });
            return await res.json();
        } catch (error) {
            return { ok: false, error: 'Failed to complete task' };
        }
    },

    async getStreak(): Promise<{ ok: boolean; streak?: StreakData; error?: string }> {
        try {
            const res = await fetch(`${API_BASE}/api/scheduler/streak`);
            return await res.json();
        } catch (error) {
            return { ok: false, error: 'Failed to get streak' };
        }
    },
};

// ============ Notification API ============
export const notificationApi = {
    async getAll(unreadOnly?: boolean): Promise<{ ok: boolean; notifications?: AppNotification[]; error?: string }> {
        try {
            const url = unreadOnly
                ? `${API_BASE}/api/notifications?unread=true`
                : `${API_BASE}/api/notifications`;
            const res = await fetch(url);
            return await res.json();
        } catch (error) {
            return { ok: false, error: 'Failed to load notifications' };
        }
    },

    async dismiss(notifId: string): Promise<{ ok: boolean; notification?: AppNotification; error?: string }> {
        try {
            const res = await fetch(`${API_BASE}/api/notifications/${notifId}/dismiss`, {
                method: 'POST',
            });
            return await res.json();
        } catch (error) {
            return { ok: false, error: 'Failed to dismiss notification' };
        }
    },

    async getUnreadCount(): Promise<{ ok: boolean; count?: number; error?: string }> {
        try {
            const res = await fetch(`${API_BASE}/api/notifications/unread-count`);
            return await res.json();
        } catch (error) {
            return { ok: false, error: 'Failed to get unread count' };
        }
    },

    async check(): Promise<{ ok: boolean; newNotifications?: AppNotification[]; count?: number; error?: string }> {
        try {
            const res = await fetch(`${API_BASE}/api/notifications/check`, {
                method: 'POST',
            });
            return await res.json();
        } catch (error) {
            return { ok: false, error: 'Failed to check notifications' };
        }
    },
};

// ============ Gamification ============
export const gamificationApi = {
    async addXp(action: string, amount?: number): Promise<{ ok: boolean; totalXp?: number; earned?: number; streakDays?: number; error?: string }> {
        try {
            const res = await fetch(`${API_BASE}/api/xp/add`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, amount }),
            });
            return await res.json();
        } catch (error) {
            return { ok: false, error: 'Failed to add XP' };
        }
    },

    async getStats(): Promise<{ ok: boolean; totalXp?: number; streakDays?: number; todayXp?: number; error?: string }> {
        try {
            const res = await fetch(`${API_BASE}/api/xp/stats`);
            return await res.json();
        } catch (error) {
            return { ok: false, error: 'Failed to get stats' };
        }
    },
};
