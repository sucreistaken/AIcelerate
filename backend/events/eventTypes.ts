export interface EventMap {
  // Message events
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Mongoose toJSON() returns complex type
  "message:sent": { channelId: string; serverId: string; message: any };
  "message:deleted": { channelId: string; messageId: string };
  "message:reacted": { channelId: string; messageId: string; emoji: string; userId: string };

  // Member events
  "member:joined": { serverId: string; userId: string };
  "member:left": { serverId: string; userId: string };

  // Quiz events
  "quiz:completed": { channelId: string; serverId: string; participants: { userId: string; score: number }[] };

  // Contribution events
  "contribution:made": {
    serverId: string;
    userId: string;
    type: "message" | "flashcard" | "note" | "annotation" | "quiz" | "insight";
  };

  // Profile events
  "profile:statusChanged": { userId: string; status: string };

  // Server events
  "server:created": { serverId: string; ownerId: string };
  "server:deleted": { serverId: string };

  // Lesson events
  "lesson:updated": { lessonId: string };
}

export type EventName = keyof EventMap;
