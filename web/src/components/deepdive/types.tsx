import React from "react";
import { t } from "../../utils/i18n";

export interface Message {
  role: 'user' | 'model';
  content: string;
  suggestions?: string[];
  bookmarked?: boolean;
  timestamp?: number;
}

export interface ChatSession {
  id: string;
  name: string;
  messages: Message[];
  createdAt: number;
}

export interface LessonChats {
  activeSessionId: string;
  sessions: ChatSession[];
}

export const QUICK_ACTIONS: { icon: React.ReactNode; labelKey: string; query: string }[] = [
  {
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
    labelKey: "deepDive.summarize",
    query: "Briefly summarize the main topic of this lesson"
  },
  {
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
    labelKey: "deepDive.keyConcepts",
    query: "List the most important concepts in this lesson"
  },
  {
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
    labelKey: "deepDive.examQuestion",
    query: "Ask me an exam question about this topic"
  },
  {
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
    labelKey: "deepDive.realWorld",
    query: "Give me a real-world example for this topic"
  },
];

export const STORAGE_KEY_PREFIX = 'lc.deepdive.chats.';

export const getDefaultMessage = (): Message => ({
  role: 'model',
  content: "",
  suggestions: ["What is this lesson about?", "What are the key concepts?", "How should I prepare for the exam?"],
  timestamp: Date.now(),
});

export const createNewSession = (name?: string): ChatSession => ({
  id: `chat-${Date.now()}`,
  name: name || t("deepDive.firstChat"),
  messages: [getDefaultMessage()],
  createdAt: Date.now()
});
