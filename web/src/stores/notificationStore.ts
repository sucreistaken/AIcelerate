// src/stores/notificationStore.ts
import { create } from 'zustand';
import { AppNotification } from '../types';
import { notificationApi } from '../services/api';

interface NotificationState {
    notifications: AppNotification[];
    unreadCount: number;
    dropdownOpen: boolean;
    loading: boolean;

    fetchNotifications: () => Promise<void>;
    fetchUnreadCount: () => Promise<void>;
    triggerCheck: () => Promise<void>;
    dismissNotification: (id: string) => Promise<void>;
    dismissAll: () => Promise<void>;
    setDropdownOpen: (open: boolean) => void;
    toggleDropdown: () => void;
    prependNotification: (notif: AppNotification) => void;
    setUnreadCount: (count: number) => void;
}

export const useNotificationStore = create<NotificationState>()((set, get) => ({
    notifications: [],
    unreadCount: 0,
    dropdownOpen: false,
    loading: false,

    fetchNotifications: async () => {
        set({ loading: true });
        const res = await notificationApi.getAll();
        if (res.ok && res.notifications) {
            const undismissed = res.notifications.filter((n: AppNotification) => !n.dismissed).length;
            set({ notifications: res.notifications, unreadCount: undismissed });
        }
        set({ loading: false });
    },

    fetchUnreadCount: async () => {
        const res = await notificationApi.getUnreadCount();
        if (res.ok && typeof res.count === 'number') {
            set({ unreadCount: res.count });
        }
    },

    triggerCheck: async () => {
        const res = await notificationApi.check();
        if (res.ok) {
            if (typeof res.count === 'number') {
                set({ unreadCount: res.count });
            }
            // If new notifications were created, refresh the list
            if (res.newNotifications && res.newNotifications.length > 0) {
                get().fetchNotifications();
            }
        }
    },

    dismissNotification: async (id: string) => {
        const res = await notificationApi.dismiss(id);
        if (res.ok) {
            set((state) => ({
                notifications: state.notifications.map((n) =>
                    n.id === id ? { ...n, dismissed: true, dismissedAt: new Date().toISOString() } : n
                ),
                unreadCount: Math.max(0, state.unreadCount - 1),
            }));
        }
    },

    dismissAll: async () => {
        const res = await notificationApi.dismissAll();
        if (res.ok) {
            set((state) => ({
                notifications: state.notifications.map((n) => ({
                    ...n,
                    dismissed: true,
                    dismissedAt: new Date().toISOString(),
                })),
                unreadCount: 0,
            }));
        } else {
            // Fallback: dismiss locally even if API fails
            set((state) => ({
                notifications: state.notifications.map((n) => ({
                    ...n,
                    dismissed: true,
                    dismissedAt: new Date().toISOString(),
                })),
                unreadCount: 0,
            }));
        }
    },

    setDropdownOpen: (open: boolean) => set({ dropdownOpen: open }),
    toggleDropdown: () => {
        const wasOpen = get().dropdownOpen;
        set({ dropdownOpen: !wasOpen });
        if (!wasOpen) {
            // Refresh notifications when opening dropdown
            get().fetchNotifications();
        }
    },

    prependNotification: (notif: AppNotification) => {
        set((state) => ({
            notifications: [notif, ...state.notifications].slice(0, 50),
        }));
    },

    setUnreadCount: (count: number) => set({ unreadCount: count }),
}));
