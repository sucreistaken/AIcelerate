import { XpModel } from "../models/Xp";

const XP_AMOUNTS: Record<string, number> = {
  "quiz-answer": 10,
  "flashcard-review": 5,
  "deep-dive-ask": 3,
  "plan-create": 20,
  "cheat-sheet-create": 15,
  "mindmap-learn": 2,
  "note-create": 2,
};

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

function yesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}

export const gamificationService = {
  async addXp(userId: string, action: string, customAmount?: number) {
    const amount = customAmount ?? XP_AMOUNTS[action] ?? 0;
    const today = todayStr();
    const yesterday = yesterdayStr();

    // Atomic pipeline update: compute streak in-place to avoid race conditions.
    // Uses MongoDB aggregation pipeline in update to conditionally set streakDays.
    const doc = await XpModel.findOneAndUpdate(
      { userId },
      [
        {
          $set: {
            totalXp: { $add: [{ $ifNull: ["$totalXp", 0] }, amount] },
            history: {
              $slice: [
                { $concatArrays: [{ $ifNull: ["$history", []] }, [{ action, amount, timestamp: Date.now() }]] },
                -500,
              ],
            },
            streakDays: {
              $switch: {
                branches: [
                  // Already active today — keep current streak
                  { case: { $eq: ["$lastActiveDate", today] }, then: { $ifNull: ["$streakDays", 1] } },
                  // Active yesterday — increment streak
                  { case: { $eq: ["$lastActiveDate", yesterday] }, then: { $add: [{ $ifNull: ["$streakDays", 0] }, 1] } },
                ],
                // Gap or new user — reset to 1
                default: 1,
              },
            },
            lastActiveDate: today,
          },
        },
      ],
      { upsert: true, new: true }
    );

    return {
      totalXp: doc.totalXp,
      earned: amount,
      streakDays: doc.streakDays,
    };
  },

  async getStats(userId: string) {
    const doc = await XpModel.findOne({ userId }).lean();

    if (!doc) {
      return {
        totalXp: 0,
        streakDays: 0,
        todayXp: 0,
        lastActiveDate: null,
        recentHistory: [],
      };
    }

    const today = todayStr();
    const yesterday = yesterdayStr();

    // Check if streak is still valid
    let streakDays = doc.streakDays;
    if (!doc.lastActiveDate || (doc.lastActiveDate !== today && doc.lastActiveDate !== yesterday)) {
      if (doc.lastActiveDate) streakDays = 0;
    }

    const todayStart = new Date(today).getTime();
    const todayXp = doc.history
      .filter((e) => e.timestamp >= todayStart)
      .reduce((sum, e) => sum + e.amount, 0);

    return {
      totalXp: doc.totalXp,
      streakDays,
      todayXp,
      lastActiveDate: doc.lastActiveDate,
      recentHistory: doc.history.slice(-20),
    };
  },
};
