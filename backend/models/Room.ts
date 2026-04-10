import mongoose, { Schema, Document } from "mongoose";

// ── Sub-document interfaces ────────────────────────────────────────────────────

export interface ServerRole {
  id: string;
  name: string;
  color: string;
  permissions: string[];
  position: number;
}

export interface ServerCategory {
  id: string;
  name: string;
  position: number;
  channelIds: string[];
}

export interface RoomSettings {
  maxMembers: number;
  isPublic: boolean;
  defaultRole: string;
  materialId?: string;
}

// ── Main interface ─────────────────────────────────────────────────────────────

export interface IRoom extends Document {
  name: string;
  description: string;
  iconColor: string;
  inviteCode: string;
  ownerId: string;
  isPublic: boolean;
  maxMembers: number;
  memberIds: string[];
  memberRoles: Map<string, string[]>;
  categories: ServerCategory[];
  roles: ServerRole[];
  settings: RoomSettings;
  tags: string[];
  university?: string;
  defaultLessonId?: string;
  materialId?: string;
  memberCount: number;
  lastActivityAt: Date;
  archivedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ── Sub-schemas ────────────────────────────────────────────────────────────────

const serverRoleSchema = new Schema<ServerRole>(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    color: { type: String, default: "#95A5A6" },
    permissions: [String],
    position: { type: Number, default: 0 },
  },
  { _id: false }
);

const serverCategorySchema = new Schema<ServerCategory>(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    position: { type: Number, default: 0 },
    channelIds: [String],
  },
  { _id: false }
);

const roomSettingsSchema = new Schema<RoomSettings>(
  {
    maxMembers: { type: Number, default: 50 },
    isPublic: { type: Boolean, default: false },
    defaultRole: { type: String, default: "role-member" },
    materialId: String,
  },
  { _id: false }
);

// ── Main schema ────────────────────────────────────────────────────────────────

const roomSchema = new Schema<IRoom>(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, default: "", maxlength: 500 },
    iconColor: { type: String, default: "#6C5CE7" },
    inviteCode: { type: String, unique: true, sparse: true },
    ownerId: { type: String, required: true },
    isPublic: { type: Boolean, default: false },
    maxMembers: { type: Number, default: 50 },
    memberIds: { type: [String], default: [] },
    memberRoles: { type: Map, of: [String], default: new Map() },
    categories: { type: [serverCategorySchema], default: [] },
    roles: { type: [serverRoleSchema], default: [] },
    settings: { type: roomSettingsSchema, default: () => ({}) },
    tags: { type: [String], default: [] },
    university: String,
    defaultLessonId: String,
    materialId: String,
    memberCount: { type: Number, default: 1 },
    lastActivityAt: { type: Date, default: Date.now },
    archivedAt: Date,
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        ret.id = ret._id.toString();
        // Convert memberRoles Map to plain object for JSON
        if (ret.memberRoles instanceof Map) {
          ret.memberRoles = Object.fromEntries(ret.memberRoles);
        }
        delete ret.__v;
        return ret;
      },
    },
  }
);

// ── Indexes ────────────────────────────────────────────────────────────────────
roomSchema.index({ memberIds: 1 });
roomSchema.index({ ownerId: 1 });
roomSchema.index({ isPublic: 1, archivedAt: 1 });
roomSchema.index({ tags: 1 });
roomSchema.index({ inviteCode: 1 });
roomSchema.index({ "settings.isPublic": 1, lastActivityAt: -1 });
roomSchema.index({ name: "text", description: "text", university: "text", tags: "text" }, {
  weights: { name: 10, tags: 5, university: 3, description: 1 },
  name: "room_text_search",
});

// ── Permissions ────────────────────────────────────────────────────────────────

export const PERMISSIONS = {
  MANAGE_SERVER: "manage_server",
  MANAGE_CHANNELS: "manage_channels",
  MANAGE_ROLES: "manage_roles",
  MANAGE_MEMBERS: "manage_members",
  KICK_MEMBERS: "kick_members",
  SEND_MESSAGES: "send_messages",
  MANAGE_MESSAGES: "manage_messages",
  PIN_MESSAGES: "pin_messages",
  MENTION_EVERYONE: "mention_everyone",
  CREATE_INVITE: "create_invite",
  USE_TOOLS: "use_tools",
} as const;

export const DEFAULT_ROLES: ServerRole[] = [
  {
    id: "role-owner",
    name: "Owner",
    color: "#E74C3C",
    permissions: Object.values(PERMISSIONS),
    position: 3,
  },
  {
    id: "role-admin",
    name: "Admin",
    color: "#3498DB",
    permissions: [
      PERMISSIONS.MANAGE_CHANNELS, PERMISSIONS.MANAGE_MEMBERS,
      PERMISSIONS.KICK_MEMBERS, PERMISSIONS.SEND_MESSAGES,
      PERMISSIONS.MANAGE_MESSAGES, PERMISSIONS.PIN_MESSAGES,
      PERMISSIONS.MENTION_EVERYONE, PERMISSIONS.CREATE_INVITE,
      PERMISSIONS.USE_TOOLS,
    ],
    position: 2,
  },
  {
    id: "role-member",
    name: "Member",
    color: "#95A5A6",
    permissions: [
      PERMISSIONS.SEND_MESSAGES, PERMISSIONS.PIN_MESSAGES,
      PERMISSIONS.CREATE_INVITE, PERMISSIONS.USE_TOOLS,
    ],
    position: 0,
  },
];

export const Room = mongoose.model<IRoom>("Room", roomSchema);
