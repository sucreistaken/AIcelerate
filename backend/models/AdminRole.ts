import mongoose, { Schema, Document } from "mongoose";

export interface IAdminRole extends Document {
  name: string;
  description: string;
  permissions: string[];
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const adminRoleSchema = new Schema<IAdminRole>(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String, default: "" },
    permissions: { type: [String], default: [] },
    isSystem: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
adminRoleSchema.index({ isSystem: 1 });
adminRoleSchema.index({ permissions: 1 });

export const AdminRoleModel = mongoose.model<IAdminRole>("AdminRole", adminRoleSchema);
