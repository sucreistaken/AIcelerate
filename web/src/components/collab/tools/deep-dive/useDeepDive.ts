import { useState, useRef, useEffect, useMemo } from "react";
import { logger } from "../../../../utils/logger";
import { useChannelToolStore } from "../../../../stores/channelToolStore";
import { channelToolApi } from "../../../../services/channelToolApi";
import { getCollabSocket } from "../../../../services/socket";
import type { ChannelDeepDiveMessage, LessonContextInfo } from "../../../../types";

const EMPTY_MSGS: ChannelDeepDiveMessage[] = [];

const QUICK_ACTIONS = [
  { label: "\Özetle", prompt: "Bu konuyu \özetle: " },
  { label: "Soru sor", prompt: "Bu konuyla ilgili bana bir soru sor: " },
  { label: "\Örnekler", prompt: "Bu konuyla ilgili ger\çek d\ünya \örnekleri ver: " },
  { label: "Ba\ğlant\ılar", prompt: "Bu konunun di\ğer konularla ba\ğlant\ılar\ın\ı g\öster: " },
];

export interface QuickAction {
  label: string;
  prompt: string;
}

export function useDeepDive(
  channelId: string,
  topic: string,
  serverName: string,
  nickname: string,
  lessonContext?: LessonContextInfo | null
) {
  const messages = useChannelToolStore(
    (s) => s.dataByChannel[channelId]?.deepDive?.messages ?? EMPTY_MSGS
  );
  // loading lives in Zustand (same store as messages) so updates are ATOMIC
  const loading = useChannelToolStore((s) => !!s.aiPending[channelId]);
  const startRequest = useChannelToolStore((s) => s.startDeepDiveRequest);
  const setAiPending = useChannelToolStore((s) => s.setAiPending);
  const addPlaceholder = useChannelToolStore((s) => s.addDeepDivePlaceholder);
  const appendChunk = useChannelToolStore((s) => s.appendDeepDiveChunk);
  const reconcile = useChannelToolStore((s) => s.reconcileDeepDiveStream);
  const rollback = useChannelToolStore((s) => s.rollbackDeepDiveStream);
  const addNoteToStore = useChannelToolStore((s) => s.addNoteToStore);

  const [input, setInput] = useState("");
  const [savedMsgId, setSavedMsgId] = useState<string | null>(null);

  const quickActions = useMemo(() => {
    const base = [...QUICK_ACTIONS];
    if (lessonContext?.linked) {
      if ((lessonContext.emphasesCount || 0) > 0) {
        base.push({ label: "Hocan\ın Vurgular\ı", prompt: "Hocan\ın vurgulad\ı\ğ\ı en \önemli noktalar\ı a\ç\ıkla: " });
      }
      if (lessonContext.hasCheatSheet) {
        base.push({ label: "Yayg\ın Hatalar", prompt: "Bu konuda \ö\ğrencilerin en s\ık yapt\ı\ğ\ı hatalar\ı ve yan\ılg\ılar\ı a\ç\ıkla: " });
      }
      if (lessonContext.hasLoModules) {
        base.push({ label: "Temel Fikirler", prompt: "Dersin temel fikirlerini ve \çekirdek kavramlar\ın\ı \özetle: " });
      }
    }
    return base;
  }, [lessonContext]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // AbortController for the in-flight stream — cancelled on unmount or new send
  const streamControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Cancel in-flight stream on unmount or channel switch
  useEffect(() => {
    return () => {
      streamControllerRef.current?.abort();
      streamControllerRef.current = null;
    };
  }, [channelId]);

  function handleSend(text?: string) {
    const messageText = text ?? input.trim();
    if (!messageText || loading) return;

    setInput("");

    // ATOMIC: add user message + enable typing bubble in ONE set() — zero intermediate renders
    const tempUserId = `temp-user-${Date.now()}`;
    const placeholderAiId = `temp-ai-${Date.now()}`;
    startRequest(channelId, {
      id: tempUserId,
      role: "user",
      text: messageText,
      authorId: "me",
      authorNickname: nickname,
      timestamp: new Date().toISOString(),
    });

    // Cancel any prior stream before starting a new one (shouldn't happen due
    // to the `loading` guard above, but belt-and-braces).
    streamControllerRef.current?.abort();

    let receivedChunk = false;
    let fullAiText = "";

    const controller = channelToolApi.deepDiveChatStream(
      channelId,
      { text: messageText, nickname, topic, serverName },
      {
        onChunk: (chunk) => {
          if (!receivedChunk) {
            receivedChunk = true;
            // First chunk: add the placeholder so text starts filling in.
            // Keeping the typing bubble visible until this point gives the
            // "AI thinking..." → "AI typing..." handoff the user expects.
            addPlaceholder(channelId, {
              id: placeholderAiId,
              role: "assistant",
              text: "",
              authorId: "ai",
              authorNickname: "Study AI",
              timestamp: new Date().toISOString(),
            });
            // Hide the typing bubble now that the bubble itself is rendering.
            setAiPending(channelId, false);
          }
          fullAiText += chunk;
          appendChunk(channelId, placeholderAiId, chunk);
        },
        onDone: ({ userMessageId, aiMessageId }) => {
          // Edge case: stream completed without any chunks (empty response).
          // Add the placeholder now so reconciliation has a target to rename.
          if (!receivedChunk) {
            addPlaceholder(channelId, {
              id: placeholderAiId,
              role: "assistant",
              text: "",
              authorId: "ai",
              authorNickname: "Study AI",
              timestamp: new Date().toISOString(),
            });
          }
          reconcile(channelId, tempUserId, placeholderAiId, userMessageId, aiMessageId);

          // Broadcast the completed pair to other members so they see the AI message.
          // We carry the real IDs + final AI text. The sender won't receive their
          // own echo (socket.to() skips the origin).
          getCollabSocket().emit("tool:deepdive:msg", {
            channelId,
            userMessage: {
              id: userMessageId,
              role: "user",
              text: messageText,
              authorId: "me",
              authorNickname: nickname,
              timestamp: new Date().toISOString(),
            },
            aiMessage: {
              id: aiMessageId,
              role: "assistant",
              text: fullAiText,
              authorId: "ai",
              authorNickname: "Study AI",
              timestamp: new Date().toISOString(),
            },
          });

          streamControllerRef.current = null;
        },
        onError: (err) => {
          logger.error("Deep dive chat stream failed:", err);
          rollback(channelId, tempUserId, placeholderAiId);
          streamControllerRef.current = null;
        },
      },
    );
    streamControllerRef.current = controller;
  }

  function handleQuickAction(prompt: string) {
    handleSend(prompt + topic);
  }

  async function handleSaveAsNote(msg: ChannelDeepDiveMessage) {
    try {
      const title = `Deep Dive: ${topic}`;
      const content = msg.text;
      const { note } = await channelToolApi.addNote(
        channelId, title, content, "summary", nickname
      );
      addNoteToStore(channelId, note);
      getCollabSocket().emit("tool:notes:add", { channelId, note });
      setSavedMsgId(msg.id);
      setTimeout(() => setSavedMsgId(null), 2000);
    } catch (err) {
      logger.error("Failed to save as note:", err);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return {
    messages,
    input,
    setInput,
    loading,
    savedMsgId,
    quickActions,
    messagesEndRef,
    textareaRef,
    handleSend,
    handleQuickAction,
    handleSaveAsNote,
    handleKeyDown,
  };
}
