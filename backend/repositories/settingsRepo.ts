import { SystemSettingsModel } from "../models/SystemSettings";
import type { SystemSettings } from "../types/admin";
import { logger } from "../utils/logger";

const SETTINGS_KEY = "system-settings";

const DEFAULT_SETTINGS: Omit<SystemSettings, "id"> = {
  rateLimitPerMinute: 200,
  maxUploadSizeMb: 10,
  maintenanceMode: false,
  allowRegistration: true,
  updatedAt: new Date().toISOString(),
};

function docToSettings(doc: { _id: unknown; rateLimitPerMinute: number; maxUploadSizeMb: number; maintenanceMode: boolean; allowRegistration: boolean; updatedAt?: Date }): SystemSettings {
  return {
    id: String(doc._id),
    rateLimitPerMinute: doc.rateLimitPerMinute,
    maxUploadSizeMb: doc.maxUploadSizeMb,
    maintenanceMode: doc.maintenanceMode,
    allowRegistration: doc.allowRegistration,
    updatedAt: doc.updatedAt?.toISOString?.() ?? new Date().toISOString(),
  };
}

/**
 * Singleton-pattern settings repository using MongoDB.
 * Uses findOneAndUpdate with upsert for atomic reads and writes.
 */
class SettingsRepository {
  async getSettings(): Promise<SystemSettings> {
    const doc = await SystemSettingsModel.findOneAndUpdate(
      { key: SETTINGS_KEY },
      { $setOnInsert: DEFAULT_SETTINGS },
      { upsert: true, new: true, lean: true }
    );

    if (!doc) {
      logger.error("Settings upsert returned null — should never happen");
      return { ...DEFAULT_SETTINGS, id: "fallback" };
    }

    return docToSettings(doc);
  }

  async updateSettings(
    updates: Partial<Omit<SystemSettings, "id">>
  ): Promise<SystemSettings> {
    const doc = await SystemSettingsModel.findOneAndUpdate(
      { key: SETTINGS_KEY },
      { $set: { ...updates, updatedAt: new Date() } },
      { upsert: true, new: true, lean: true }
    );

    if (!doc) {
      logger.error("Settings upsert returned null — should never happen");
      return { ...DEFAULT_SETTINGS, id: "fallback" };
    }

    return docToSettings(doc);
  }
}

export const settingsRepo = new SettingsRepository();
