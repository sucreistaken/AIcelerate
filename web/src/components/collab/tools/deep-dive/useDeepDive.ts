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
  const addDeepDiveMessages = useChannelToolStore((s) => s.addDeepDiveMessages);
  const addNoteToStore = useChannelToolStore((s) => s.addNoteToStore);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(text?: string) {
    const messageText = text ?? input.trim();
    if (!messageText || loading) return;

    setInput("");
    setLoading(true);

    try {
      const { userMessage, aiMessage } = await channelToolApi.deepDiveChat(
        channelId, messageText, nickname, topic, serverName
      );
      // Stop loading BEFORE adding messages — prevents 1-frame flash where
      // both the typing bubble and the real AI message are visible
      setLoading(false);
      addDeepDiveMessages(channelId, [userMessage, aiMessage]);
      getCollabSocket().emit("tool:deepdive:msg", { channelId, userMessage, aiMessage });
    } catch (err) {
      logger.error("Deep dive chat failed:", err);
      setLoading(false);
    }
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
