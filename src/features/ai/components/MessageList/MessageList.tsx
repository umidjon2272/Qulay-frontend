import { useEffect, useRef } from "react";
import { Bot } from "lucide-react";

import type { AIAction } from "../../actions/actionTypes";
import type { ChatMessage } from "../../context/AIChatContextValue";

import MessageBubble from "../MessageBubble/MessageBubble";

import "./MessageList.scss";

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
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, isTyping]);

  return (
    <div className="message-list">
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
              <Bot size={13} />
            </div>

            <div className="message-list__typing">
              <span />
              <span />
              <span />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
};

export default MessageList;
