// admin/registry.ts — Module registry for admin panel navigation
import {
  LayoutDashboard,
  Users,
  BookOpen,
  FileText,
  Shield,
  Bell,
  Brain,
  ScrollText,
  Settings,
  type LucideIcon,
} from "lucide-react";
import type { Permission } from "./types";

export interface AdminModule {
  id: string;
  label: string;
  icon: LucideIcon;
  path: string;
  permission: Permission;
  group: string;
}

export const MODULE_GROUPS: Record<string, string> = {
  management: "Yonetim",
  content: "Icerik",
  analytics: "Analitik",
  system: "Sistem",
};

export const ADMIN_MODULES: AdminModule[] = [
  // Management
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    path: "/admin",
    permission: "stats:read",
    group: "management",
  },
  {
    id: "users",
    label: "Kullanicilar",
    icon: Users,
    path: "/admin/users",
    permission: "users:read",
    group: "management",
  },
  {
    id: "courses",
    label: "Kurslar",
    icon: BookOpen,
    path: "/admin/courses",
    permission: "courses:read",
    group: "management",
  },
  {
    id: "lessons",
    label: "Dersler",
    icon: FileText,
    path: "/admin/lessons",
    permission: "lessons:read",
    group: "management",
  },

  // Content
  {
    id: "moderation",
    label: "Moderasyon",
    icon: Shield,
    path: "/admin/content-moderation",
    permission: "users:write",
    group: "content",
  },
  {
    id: "notifications",
    label: "Bildirimler",
    icon: Bell,
    path: "/admin/notifications",
    permission: "notifications:write",
    group: "content",
  },

  // Analytics
  {
    id: "ai-stats",
    label: "AI Istatistik",
    icon: Brain,
    path: "/admin/ai-stats",
    permission: "stats:read",
    group: "analytics",
  },
  {
    id: "audit-log",
    label: "Audit Log",
    icon: ScrollText,
    path: "/admin/audit-log",
    permission: "audit:read",
    group: "analytics",
  },

  // System
  {
    id: "settings",
    label: "Ayarlar",
    icon: Settings,
    path: "/admin/settings",
    permission: "settings:read",
    group: "system",
  },
];
