import mongoose, { Schema, Document } from "mongoose";

export interface ISystemSettings extends Document {
  key: string;
  rateLimitPerMinute: number;
  maxUploadSizeMb: number;
  maintenanceMode: boolean;
  allowRegistration: boolean;
  updatedAt: Date;
  createdAt: Date;
}

const systemSettingsSchema = new Schema<ISystemSettings>(
  {
    key: { type: String, required: true, unique: true, default: "system-settings" },
    rateLimitPerMinute: { type: Number, default: 200 },
    maxUploadSizeMb: { type: Number, default: 10 },
    maintenanceMode: { type: Boolean, default: false },
    allowRegistration: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const SystemSettingsModel = mongoose.model<ISystemSettings>("SystemSettings", systemSettingsSchema);
