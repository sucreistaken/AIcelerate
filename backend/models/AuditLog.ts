import mongoose, { Schema, Document } from "mongoose";

export interface IAuditLog extends Document<string> {
  _id: string;
  userId: string;
  action: string;
  resource: string;
  details?: Record<string, unknown>;
  ip: string;
  timestamp: string;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    _id: { type: String, required: true },
    userId: { type: String, required: true },
    action: { type: String, required: true },
    resource: { type: String, required: true },
    details: { type: Schema.Types.Mixed },
    ip: { type: String, default: "" },
    timestamp: { type: String, required: true },
  },
  { timestamps: true, _id: false }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
// Admin queries: pending entries sorted newest-first, filterable by action
auditLogSchema.index({ timestamp: -1 });
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
// TTL: auto-delete audit entries older than 1 year
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });
// Search uses $regex (not $text) — no text index needed

export const AuditLogModel = mongoose.model<IAuditLog>("AuditLog", auditLogSchema);
