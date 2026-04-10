import type { LessonContextInfo } from "../../../../types";
import { useDeepDive } from "./useDeepDive";
import DeepDiveEmptyState from "./DeepDiveEmptyState";
import DeepDiveMessageList from "./DeepDiveMessageList";

interface Props {
  channelId: string;
  topic: string;
  serverName: string;
  nickname: string;
  lessonContext?: LessonContextInfo | null;
}

export default function ChannelDeepDive({ channelId, topic, serverName, nickname, lessonContext }: Props) {
  const {
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
  } = useDeepDive(channelId, topic, serverName, nickname, lessonContext);

  if (messages.length === 0 && !loading) {
    return (
      <DeepDiveEmptyState
        topic={topic}
        quickActions={quickActions}
        loading={loading}
        input={input}
        setInput={setInput}
        handleQuickAction={handleQuickAction}
        handleSend={() => handleSend()}
        handleKeyDown={handleKeyDown}
        textareaRef={textareaRef}
      />
    );
  }

  return (
    <DeepDiveMessageList
      topic={topic}
      messages={messages}
      loading={loading}
      savedMsgId={savedMsgId}
      quickActions={quickActions}
      input={input}
      setInput={setInput}
      handleQuickAction={handleQuickAction}
      handleSend={() => handleSend()}
      handleKeyDown={handleKeyDown}
      handleSaveAsNote={handleSaveAsNote}
      messagesEndRef={messagesEndRef}
      textareaRef={textareaRef}
    />
  );
}
