import path from "path";
import { BaseRepository } from "./baseRepository";
import type { SystemSettings } from "../types/admin";

const DATA_PATH = path.join(process.cwd(), "backend", "data", "settings.json");

const SETTINGS_ID = "system-settings";

const defaultSettings: SystemSettings[] = [
  {
    id: SETTINGS_ID,
    rateLimitPerMinute: 200,
    maxUploadSizeMb: 10,
    maintenanceMode: false,
    allowRegistration: true,
    updatedAt: new Date().toISOString(),
  },
];

class SettingsRepository extends BaseRepository<SystemSettings> {
  constructor() {
    super(DATA_PATH, defaultSettings);
  }

  async getSettings(): Promise<SystemSettings> {
    const found = await this.findById(SETTINGS_ID);
    if (found) return found;

    // Should not happen since seed data creates it, but fallback
    const fallback = defaultSettings[0];
    await this.create(fallback);
    return fallback;
  }

  async updateSettings(
    updates: Partial<Omit<SystemSettings, "id">>
  ): Promise<SystemSettings> {
    const current = await this.getSettings();
    const merged: SystemSettings = {
      ...current,
      ...updates,
      id: SETTINGS_ID,
      updatedAt: new Date().toISOString(),
    };
    const result = await this.update(SETTINGS_ID, merged);
    return result ?? merged;
  }
}

export const settingsRepo = new SettingsRepository();
