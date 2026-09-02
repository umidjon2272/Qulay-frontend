import { useEffect, useState } from "react";

import { useAIChat } from "../../hooks/useAIChat";
import { useI18n } from "../../../../i18n/useI18n";

import ChatHeader from "../ChatHeader/ChatHeader";
import MessageList from "../MessageList/MessageList";
import ChatInput from "../ChatInput/ChatInput";

import "./AIChatDrawer.scss";

const AIChatDrawer = () => {
  const { t } = useI18n();
  const { isOpen, close, messages, isTyping, historyLoading, historyError, sendMessage, executeAction, clearChat, speakingId, speak, stopSpeaking } =
    useAIChat();

  const [input, setInput] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, close]);

  useEffect(() => {
    if (!isOpen) {
      stopSpeaking();
    }
  }, [isOpen, stopSpeaking]);

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessage(input);
    setInput("");
  };

  return (
    <>
      <div
        className={`ai-drawer-overlay ${isOpen ? "is-open" : ""}`}
        onClick={close}
        aria-hidden={!isOpen}
      />

      <aside
        className={`ai-drawer ${isOpen ? "is-open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={t("ai.chat.dialog", "Qulay AI suhbat oynasi")}
        aria-hidden={!isOpen}
      >
        <ChatHeader onClose={close} onClear={clearChat} />

        <MessageList
          messages={messages}
          isTyping={isTyping}
          speakingId={speakingId}
          onSpeak={speak}
          onStopSpeak={stopSpeaking}
          onAction={executeAction}
        />

        <ChatInput value={input} onChange={setInput} onSend={handleSend} disabled={isTyping || historyLoading || Boolean(historyError)} autoFocus={isOpen} />
      </aside>
    </>
  );
};

export default AIChatDrawer;
