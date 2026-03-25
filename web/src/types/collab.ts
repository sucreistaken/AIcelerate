// Collaborative Study Room types (v1 + v2 Discord-inspired)

// ====== V1 Room Types ======

export interface StudyUser {
  id: string;
  nickname: string;
  avatar: string; // color hex
  joinedAt: string;
}

export interface RoomMember {
  userId: string;
  nickname: string;
  avatar: string;
  joinedAt: string;
  lastSeenAt: string;
  contributionCount: number;
}

export interface RoomSettings {
  maxParticipants: number;
  allowChat: boolean;
  lessonId?: string;
  courseCode?: string;
}

export interface StudyRoom {
  id: string;
  name: string;
  code: string; // 6-char code e.g. "MATH42"
  hostId: string;
  settings: RoomSettings;
  participants: StudyUser[];       // currently online
  members: RoomMember[];           // all-time members
  lessonId: string;                // required - every room is tied to a lesson
  lessonTitle: string;
  createdAt: string;
  // No expiresAt - rooms are permanent
}

// Workspace tool tabs
export type WorkspaceTool = "deep-dive" | "flashcards" | "mind-map" | "notes" | "quiz" | "sprint";

// ====== Shared Deep Dive (Group AI Chat) ======

export interface SharedDeepDiveState {
  messages: SharedChatMessage[];
  savedInsights: SharedInsight[];
}

export interface SharedChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  authorId: string;
  authorNickname: string;
  authorAvatar: string;
  timestamp: string;
  reactions: MessageReaction[];
  savedAsInsight: boolean;
}

export interface SharedInsight {
  id: string;
  text: string;
  sourceMessageId: string;
  savedBy: string;
  savedByNickname: string;
  tags: string[];
  timestamp: string;
}

// ====== Shared Flashcard Builder ======

export interface SharedFlashcard {
  id: string;
  front: string;
  back: string;
  topicName: string;
  createdBy: string;
  createdByNickname: string;
  createdAt: string;
  editedBy?: string;
  editedByNickname?: string;
  editedAt?: string;
  votes: FlashcardVote[];
  source: "manual" | "ai-generated";
}

export interface FlashcardVote {
  userId: string;
  vote: "up" | "down";
}

// ====== Shared Mind Map ======

export interface MindMapAnnotation {
  id: string;
  nodeLabel: string;
  type: "note" | "question" | "example" | "understood";
  text: string;
  authorId: string;
  authorNickname: string;
  authorAvatar: string;
  timestamp: string;
  replies: AnnotationReply[];
}

export interface AnnotationReply {
  id: string;
  text: string;
  authorId: string;
  authorNickname: string;
  timestamp: string;
}

// ====== Shared Notes ======

export interface SharedNote {
  id: string;
  title: string;
  content: string;
  category: "concept" | "formula" | "example" | "tip" | "warning" | "summary";
  authorId: string;
  authorNickname: string;
  authorAvatar: string;
  createdAt: string;
  editedAt?: string;
  editedBy?: string;
  editedByNickname?: string;
  source?: "manual" | "deep-dive" | "mind-map";
  sourceId?: string;
  pinned: boolean;
}

// ====== Room Workspace (all collaborative tool data) ======

export interface RoomWorkspace {
  deepDive: SharedDeepDiveState;
  flashcards: SharedFlashcard[];
  mindMapAnnotations: MindMapAnnotation[];
  notes: SharedNote[];
}

// ====== Chat ======

export type RoomChatMessageType = "text" | "system" | "activity";

export interface RoomChatMessage {
  id: string;
  type: RoomChatMessageType;
  author: string;
  authorId: string;
  text: string;
  time: string;
}

// ====== Collaboration V2 - Discord-Inspired Types ======

export interface UserProfile {
  id: string;
  nickname: string;
  avatar: string;
  bio: string;
  status: "online" | "studying" | "idle" | "dnd" | "offline";
  friendIds: string[];
  friendRequestsSent: string[];
  friendRequestsReceived: string[];
  friendCode: string;
  serverIds: string[];
  dmChannelIds: string[];
  lastActiveAt: string;
  createdAt: string;
  settings: {
    notifyMentions: boolean;
    notifyDMs: boolean;
  };
}

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

export interface StudyServerSettings {
  maxMembers: number;
  isPublic: boolean;
  defaultRole: string;
}

export interface StudyServer {
  id: string;
  name: string;
  description: string;
  iconColor: string;
  inviteCode: string;
  ownerId: string;
  defaultLessonId?: string;
  categories: ServerCategory[];
  roles: ServerRole[];
  memberIds: string[];
  memberRoles: Record<string, string[]>;
  settings: StudyServerSettings;
  tags: string[];
  university?: string;
  memberCount: number;
  lastActivityAt: string;
  createdAt: string;
}

export interface ServerTemplate {
  id: string;
  label: string;
  description: string;
  categories: {
    name: string;
    channels: {
      name: string;
      type: string;
      toolType?: string;
    }[];
  }[];
}

export type ChannelType = "text" | "study-tool" | "announcement";
export type ToolChannelType = "deep-dive" | "flashcards" | "mind-map" | "notes" | "quiz" | "sprint";

export interface ChannelPermissionOverride {
  roleId: string;
  allow: string[];
  deny: string[];
}

export interface Channel {
  id: string;
  serverId: string;
  categoryId: string;
  name: string;
  type: ChannelType;
  toolType?: ToolChannelType;
  lessonId?: string;
  lessonTitle?: string;
  permissionOverrides: ChannelPermissionOverride[];
  pinnedMessageIds: string[];
  lastMessageAt: string;
  createdAt: string;
}

export interface MessageReaction {
  emoji: string;
  userIds: string[];
}

export interface MessageEmbed {
  type: "tool-result" | "quiz-score" | "achievement";
  title: string;
  description: string;
  color?: string;
  fields?: { name: string; value: string }[];
}

export interface ChannelMessage {
  id: string;
  channelId: string;
  authorId: string;
  content: string;
  type: "text" | "system" | "embed";
  embeds: MessageEmbed[];
  mentions: string[];
  reactions: MessageReaction[];
  threadId?: string;
  replyCount: number;
  pinned: boolean;
  edited: boolean;
  deleted: boolean;
  createdAt: string;
}

export interface ServerMemberInfo {
  id: string;
  nickname: string;
  avatar: string;
  status: UserProfile["status"];
  roles: string[];
}

// ====== Channel Tool Types ======

export interface ChannelQuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  type?: 'mc' | 'tf';
  difficulty?: string;
}

export interface ChannelQuizData {
  questions: ChannelQuizQuestion[];
  scores: Record<string, { correct: number; total: number; nickname: string }>;
  generatedAt?: string;
}

export interface ChannelFlashcardItem {
  id: string;
  front: string;
  back: string;
  hint?: string;
  topic: string;
  createdBy: string;
  createdByNickname: string;
  createdAt: string;
  votes: Array<{ userId: string; vote: "up" | "down" }>;
  source: "manual" | "ai-generated" | "lesson-emphasis" | "lesson-cheatsheet" | "lesson-miniQuiz" | "lesson-loModule";
  sm2?: Record<string, {
    easeFactor: number;
    interval: number;
    repetitions: number;
    nextReview: string;
    lastReview: string;
  }>;
}

export interface ChannelFlashcardData {
  cards: ChannelFlashcardItem[];
}

export interface ChannelDeepDiveMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  authorId: string;
  authorNickname: string;
  timestamp: string;
}

export interface ChannelDeepDiveData {
  messages: ChannelDeepDiveMessage[];
}

export interface ChannelMindMapData {
  mermaidCode: string;
  generatedAt?: string;
  topic?: string;
}

export interface ChannelSprintMember {
  status: string;
  lastUpdate: string;
  nickname: string;
}

export interface ChannelSprintData {
  phase: "idle" | "studying" | "break" | "finished";
  studyDurationMin: number;
  breakDurationMin: number;
  startedAt?: string;
  currentPhaseStartedAt?: string;
  pomodorosCompleted: number;
  members: Record<string, ChannelSprintMember>;
}

export interface ChannelNoteItem {
  id: string;
  title: string;
  content: string;
  category: "concept" | "formula" | "example" | "tip" | "warning" | "summary";
  authorId: string;
  authorNickname: string;
  createdAt: string;
  editedAt?: string;
  pinned: boolean;
}

export interface ChannelNotesData {
  items: ChannelNoteItem[];
}

export interface ChannelToolData {
  channelId: string;
  toolType: string;
  quiz?: ChannelQuizData;
  flashcards?: ChannelFlashcardData;
  deepDive?: ChannelDeepDiveData;
  mindMap?: ChannelMindMapData;
  sprint?: ChannelSprintData;
  notes?: ChannelNotesData;
  locked?: boolean;
  lockedBy?: string;
}

// ====== Lesson Linking Types ======

export interface LessonSummary {
  id: string;
  title: string;
  date: string;
  hasTranscript: boolean;
  hasSlideText: boolean;
  hasPlan: boolean;
  courseCode?: string;
}

export interface LessonContextInfo {
  linked: boolean;
  lessonId?: string;
  lessonTitle?: string;
  hasTranscript?: boolean;
  hasSlides?: boolean;
  hasPlan?: boolean;
  hasCheatSheet?: boolean;
  hasLoModules?: boolean;
  hasLearningOutcomes?: boolean;
  keyTopics?: string[];
  emphasesCount?: number;
  loModuleCount?: number;
  quickQuizCount?: number;
  miniQuizCount?: number;
  mustRememberCount?: number;
  formulaCount?: number;
  pitfallCount?: number;
}

export interface LessonDetailData {
  linked: boolean;
  lesson?: {
    id: string;
    title: string;
    modules: Array<{ title: string; goal: string }> | null;
    emphases: Array<{ statement: string; why: string; evidence: string; confidence: number }> | null;
    cheatSheet: {
      sections: Array<{ heading: string; bullets: string[] }>;
      formulas: string[];
      pitfalls: string[];
      quickQuiz: Array<{ q: string; a: string }>;
    } | null;
    loModules: Array<{
      loId: string;
      loTitle: string;
      oneLineGist: string;
      coreIdeas: string[];
      mustRemember: string[];
      commonTraps: string[];
      miniQuiz: Array<{ question: string; answer: string; why: string }>;
      examples: Array<{ label: string; description: string }>;
    }> | null;
    learningOutcomes: Array<{ code: string; description: string }> | null;
    keyConcepts: string[];
  };
}

export interface ExtractionSummary {
  emphases: number;
  quickQuiz: number;
  miniQuiz: number;
  mustRemember: number;
  total: number;
}
