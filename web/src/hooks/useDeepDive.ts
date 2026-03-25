import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { deepDiveApi } from "../services/api";
import { useLessonStore } from "../stores/lessonStore";
import { useNotesStore } from "../stores/notesStore";
import { useGamificationStore } from "../stores/gamificationStore";
import {
  Message,
  ChatSession,
  LessonChats,
  STORAGE_KEY_PREFIX,
  getDefaultMessage,
  createNewSession,
} from "../components/deepdive/types";

export function useDeepDive() {
  const { currentLessonId } = useLessonStore();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSessionMenu, setShowSessionMenu] = useState(false);
  const [showStarredOnly, setShowStarredOnly] = useState(false);
  const [copiedMsgIdx, setCopiedMsgIdx] = useState<number | null>(null);
  const [hoveredMsg, setHoveredMsg] = useState<number | null>(null);
  const [savedMsgIdx, setSavedMsgIdx] = useState<number | null>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const streamControllerRef = useRef<AbortController | null>(null);

  const activeSession = sessions.find(s => s.id === activeSessionId);
  const messages = activeSession?.messages || [getDefaultMessage()];
  const isWelcome = messages.length <= 1 && messages[0]?.role === 'model' && !messages[0]?.content;

  // Load chats from localStorage
  useEffect(() => {
    if (!currentLessonId) return;
    const saved = localStorage.getItem(STORAGE_KEY_PREFIX + currentLessonId);
    if (saved) {
      try {
        const parsed: LessonChats = JSON.parse(saved);
        if (parsed.sessions?.length) {
          setSessions(parsed.sessions);
          setActiveSessionId(parsed.activeSessionId || parsed.sessions[0].id);
          return;
        }
      } catch { /* ignore */ }
    }
    const s = createNewSession('First Chat');
    setSessions([s]);
    setActiveSessionId(s.id);
  }, [currentLessonId]);

  // Save chats to localStorage
  useEffect(() => {
    if (!currentLessonId || !sessions.length) return;
    localStorage.setItem(STORAGE_KEY_PREFIX + currentLessonId, JSON.stringify({ activeSessionId, sessions }));
  }, [sessions, activeSessionId, currentLessonId]);

  // Scroll to bottom on new messages
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // Track scroll position for scroll-to-bottom button
  useEffect(() => {
    const el = messagesRef.current;
    if (!el) return;
    const h = () => setShowScrollBtn(el.scrollHeight - el.scrollTop - el.clientHeight > 100);
    el.addEventListener('scroll', h);
    return () => el.removeEventListener('scroll', h);
  }, []);

  // Close session menu on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowSessionMenu(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 200) + 'px';
  }, [input]);

  const createNewChat = useCallback(() => {
    const s = createNewSession();
    setSessions(p => [...p, s]);
    setActiveSessionId(s.id);
    setShowSessionMenu(false);
  }, []);

  const deleteSession = useCallback((id: string) => {
    setSessions(p => {
      const f = p.filter(s => s.id !== id);
      if (!f.length) { const n = createNewSession('First Chat'); setActiveSessionId(n.id); return [n]; }
      if (id === activeSessionId) setActiveSessionId(f[0].id);
      return f;
    });
    setShowSessionMenu(false);
  }, [activeSessionId]);

  const switchSession = useCallback((id: string) => {
    setActiveSessionId(id);
    setShowSessionMenu(false);
    setShowStarredOnly(false);
  }, []);

  const clearCurrentChat = useCallback(() => {
    setSessions(p => p.map(s => s.id === activeSessionId ? { ...s, messages: [getDefaultMessage()] } : s));
    setShowStarredOnly(false);
  }, [activeSessionId]);

  const toggleBookmark = useCallback((i: number) => {
    setSessions(p => p.map(s => s.id === activeSessionId
      ? { ...s, messages: s.messages.map((m, j) => j === i ? { ...m, bookmarked: !m.bookmarked } : m) }
      : s));
  }, [activeSessionId]);

  const copyMessage = useCallback((content: string, i: number) => {
    navigator.clipboard.writeText(content);
    setCopiedMsgIdx(i);
    setTimeout(() => setCopiedMsgIdx(null), 2000);
  }, []);

  const exportToMarkdown = useCallback(() => {
    if (!activeSession) return;
    const md = [`# ${activeSession.name}\n`, ...activeSession.messages.map(m =>
      m.role === 'user' ? `**You:** ${m.content}\n` : `**AI:** ${m.content}\n`
    )].join('\n');
    navigator.clipboard.writeText(md);
  }, [activeSession]);

  const saveToNotes = useCallback((content: string, idx: number) => {
    useNotesStore.getState().addNote(content, 'deep-dive', currentLessonId || undefined);
    setSavedMsgIdx(idx);
    setTimeout(() => setSavedMsgIdx(null), 2500);
  }, [currentLessonId]);

  const displayMessages = useMemo(() => {
    if (!showStarredOnly) return messages;
    return messages.filter(m => m.bookmarked);
  }, [messages, showStarredOnly]);

  const send = async (customMessage?: string) => {
    const text = customMessage || input;
    if (!text.trim() || !currentLessonId || !activeSessionId) return;
    setInput("");
    if (textareaRef.current) { textareaRef.current.style.height = 'auto'; }

    const sessionId = activeSessionId;
    setSessions(p => p.map(s => s.id === sessionId
      ? { ...s, messages: [...s.messages, { role: 'user' as const, content: text, timestamp: Date.now() }] }
      : s));
    setLoading(true);
    useGamificationStore.getState().addXp('deep-dive-ask');

    const placeholderMsg: Message = { role: 'model', content: '', timestamp: Date.now() };
    setSessions(p => p.map(s => s.id === sessionId ? { ...s, messages: [...s.messages, placeholderMsg] } : s));

    const history = messages.slice(1).map(m => ({ role: m.role, content: m.content }));

    streamControllerRef.current = deepDiveApi.chatStream(
      currentLessonId,
      text,
      history,
      (chunk) => {
        setSessions(p => p.map(s => {
          if (s.id !== sessionId) return s;
          const msgs = [...s.messages];
          const last = msgs[msgs.length - 1];
          if (last?.role === 'model') {
            msgs[msgs.length - 1] = { ...last, content: last.content + chunk };
          }
          return { ...s, messages: msgs };
        }));
      },
      (suggestions) => {
        setLoading(false);
        setSessions(p => p.map(s => {
          if (s.id !== sessionId) return s;
          const msgs = [...s.messages];
          const last = msgs[msgs.length - 1];
          if (last?.role === 'model') {
            msgs[msgs.length - 1] = { ...last, suggestions };
          }
          return { ...s, messages: msgs };
        }));
      },
      (error) => {
        setLoading(false);
        setSessions(p => p.map(s => {
          if (s.id !== sessionId) return s;
          const msgs = [...s.messages];
          const last = msgs[msgs.length - 1];
          if (last?.role === 'model') {
            msgs[msgs.length - 1] = { ...last, content: last.content || ("Something went wrong. " + error) };
          }
          return { ...s, messages: msgs };
        }));
      },
    );
  };

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  return {
    currentLessonId,
    sessions,
    activeSessionId,
    activeSession,
    messages,
    isWelcome,
    input,
    setInput,
    loading,
    showSessionMenu,
    setShowSessionMenu,
    showStarredOnly,
    setShowStarredOnly,
    copiedMsgIdx,
    hoveredMsg,
    setHoveredMsg,
    savedMsgIdx,
    showScrollBtn,
    bottomRef,
    messagesRef,
    menuRef,
    textareaRef,
    displayMessages,
    createNewChat,
    deleteSession,
    switchSession,
    clearCurrentChat,
    toggleBookmark,
    copyMessage,
    exportToMarkdown,
    saveToNotes,
    send,
    scrollToBottom,
  };
}
