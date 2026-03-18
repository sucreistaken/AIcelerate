// src/stores/gamificationStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type XpAction =
  | 'quiz-answer'      // +10
  | 'flashcard-review'  // +5
  | 'deep-dive-ask'     // +3
  | 'plan-create'       // +20
  | 'cheat-sheet-create' // +15
  | 'mindmap-learn'     // +2
  | 'note-create';      // +2

const XP_AMOUNTS: Record<XpAction, number> = {
  'quiz-answer': 10,
  'flashcard-review': 5,
  'deep-dive-ask': 3,
  'plan-create': 20,
  'cheat-sheet-create': 15,
  'mindmap-learn': 2,
  'note-create': 2,
};

export interface LevelInfo {
  level: number;
  name: string;
  minXp: number;
  maxXp: number;
}

const LEVELS: LevelInfo[] = [
  { level: 1, name: 'Çaylak', minXp: 0, maxXp: 100 },
  { level: 2, name: 'Öğrenci', minXp: 100, maxXp: 500 },
  { level: 3, name: 'Uzman', minXp: 500, maxXp: 1500 },
  { level: 4, name: 'Üstad', minXp: 1500, maxXp: Infinity },
];

export function getLevelInfo(xp: number): LevelInfo {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].minXp) return LEVELS[i];
  }
  return LEVELS[0];
}

export function getLevelProgress(xp: number): number {
  const level = getLevelInfo(xp);
  if (level.maxXp === Infinity) return 1;
  return (xp - level.minXp) / (level.maxXp - level.minXp);
}

interface XpEvent {
  action: XpAction;
  amount: number;
  timestamp: number;
}

interface GamificationState {
  totalXp: number;
  streakDays: number;
  lastActiveDate: string | null; // YYYY-MM-DD
  history: XpEvent[];
  levelUpShown: number; // last level-up level that was shown

  // Actions
  addXp: (action: XpAction) => { earned: number; leveledUp: boolean };
  checkStreak: () => void;
  getLevel: () => LevelInfo;
  getLevelProgress: () => number;
  acknowledgeLevelUp: () => void;
  getTodayXp: () => number;
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

function yesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

export const useGamificationStore = create<GamificationState>()(
  persist(
    (set, get) => ({
      totalXp: 0,
      streakDays: 0,
      lastActiveDate: null,
      history: [],
      levelUpShown: 0,

      addXp: (action) => {
        const amount = XP_AMOUNTS[action] || 0;
        const prevLevel = getLevelInfo(get().totalXp);

        const event: XpEvent = { action, amount, timestamp: Date.now() };
        set((s) => ({
          totalXp: s.totalXp + amount,
          history: [...s.history.slice(-200), event], // keep last 200 events
        }));

        // Check streak
        get().checkStreak();

        const newLevel = getLevelInfo(get().totalXp);
        const leveledUp = newLevel.level > prevLevel.level;

        return { earned: amount, leveledUp };
      },

      checkStreak: () => {
        const today = todayStr();
        const { lastActiveDate, streakDays } = get();

        if (lastActiveDate === today) return; // already counted today

        if (lastActiveDate === yesterdayStr()) {
          // consecutive day
          set({ streakDays: streakDays + 1, lastActiveDate: today });
        } else if (lastActiveDate !== today) {
          // streak broken or first day
          set({ streakDays: 1, lastActiveDate: today });
        }
      },

      getLevel: () => getLevelInfo(get().totalXp),

      getLevelProgress: () => getLevelProgress(get().totalXp),

      acknowledgeLevelUp: () => {
        const currentLevel = getLevelInfo(get().totalXp);
        set({ levelUpShown: currentLevel.level });
      },

      getTodayXp: () => {
        const todayStart = new Date(todayStr()).getTime();
        return get().history
          .filter((e) => e.timestamp >= todayStart)
          .reduce((sum, e) => sum + e.amount, 0);
      },
    }),
    {
      name: 'learncraft-gamification',
      partialize: (state) => ({
        totalXp: state.totalXp,
        streakDays: state.streakDays,
        lastActiveDate: state.lastActiveDate,
        history: state.history,
        levelUpShown: state.levelUpShown,
      }),
    }
  )
);
