import { useEffect, useRef, useState } from "react";
import { ChevronDown, Sparkles } from "lucide-react";

import type { AIAction } from "../../actions/actionTypes";
import type { ChatMessage } from "../../context/AIChatContextValue";

import MessageBubble from "../MessageBubble/MessageBubble";
import { useI18n } from "../../../../i18n/useI18n";

import "./MessageList.scss";

const NEAR_BOTTOM_THRESHOLD_PX = 120;

type MessageListProps = {
  messages: ChatMessage[];
  isTyping: boolean;
  speakingId: number | null;
  onSpeak: (id: number, text: string) => void;
  onStopSpeak: () => void;
  onAction: (action: AIAction) => Promise<unknown>;
};

const MessageList = ({
  messages,
  isTyping,
  speakingId,
  onSpeak,
  onStopSpeak,
  onAction,
}: MessageListProps) => {
  const { t } = useI18n();
  const listRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const isNearBottom = (list: HTMLDivElement) =>
    list.scrollHeight - list.scrollTop - list.clientHeight < NEAR_BOTTOM_THRESHOLD_PX;

  useEffect(() => {
    const list = listRef.current;
    if (!list) return undefined;
    const handleScroll = () => {
      const near = isNearBottom(list);
      isNearBottomRef.current = near;
      setShowScrollButton(!near);
    };
    list.addEventListener("scroll", handleScroll, { passive: true });
    return () => list.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const list = listRef.current;
    // Only auto-follow new messages when the reader was already at the bottom —
    // otherwise scrolling someone back down while they're reading history is worse
    // than leaving their position alone and offering the scroll-to-bottom button.
    if (!list || !isNearBottomRef.current) return;
    list.scrollTo({ top: list.scrollHeight, behavior: "smooth" });
  }, [messages.length, isTyping]);

  const scrollToBottom = () => {
    const list = listRef.current;
    if (!list) return;
    list.scrollTo({ top: list.scrollHeight, behavior: "smooth" });
    isNearBottomRef.current = true;
    setShowScrollButton(false);
  };

  return (
    <div ref={listRef} className="message-list">
      <div className="message-list__inner">
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            isSpeaking={speakingId === message.id}
            onSpeak={() => onSpeak(message.id, message.text)}
            onStopSpeak={onStopSpeak}
            onAction={onAction}
          />
        ))}

        {isTyping && (
          <div className="message-bubble message-bubble--ai">
            <div className="message-bubble__avatar">
              <Sparkles size={13} />
            </div>

            <div className="message-list__typing">
              <span />
              <span />
              <span />
            </div>
          </div>
        )}

      </div>

      {showScrollButton && (
        <button type="button" className="message-list__scroll-bottom" onClick={scrollToBottom} aria-label={t("ai.scrollLatest", "Eng yangi xabarga tushish")}>
          <ChevronDown size={16} />
        </button>
      )}
    </div>
  );
};

export default MessageList;
