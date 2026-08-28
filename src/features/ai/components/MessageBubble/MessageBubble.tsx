import { useState } from "react";
import { Sparkles, User, Volume2, VolumeX } from "lucide-react";

import type { ChatMessage } from "../../context/AIChatContextValue";
import type { AIAction } from "../../actions/actionTypes";
import { useAIChat } from "../../hooks/useAIChat";

import ActionConfirmation from "../ActionConfirmation/ActionConfirmation";
import TelegramSelectionCard from "../TelegramSelection/TelegramSelection";

import "./MessageBubble.scss";

type MessageBubbleProps = {
  message: ChatMessage;
  isSpeaking: boolean;
  onSpeak: () => void;
  onStopSpeak: () => void;
  onAction: (action: AIAction) => Promise<unknown>;
};

type ActionStatus = "pending" | "loading" | "success" | "cancelled";

const MessageBubble = ({ message, isSpeaking, onSpeak, onStopSpeak, onAction }: MessageBubbleProps) => {
  const [actionStatus, setActionStatus] = useState<ActionStatus>("pending");
  const { resolveTelegramSelection } = useAIChat();

  const isUser = message.role === "user";
  const action = message.action;
  const selection = message.telegramSelection;
  const canSpeak = typeof window !== "undefined" && Boolean(window.speechSynthesis);

  return (
    <div className={`message-bubble ${isUser ? "message-bubble--user" : "message-bubble--ai"}`}>
      <div className="message-bubble__avatar">{isUser ? <User size={13} /> : <Sparkles size={13} />}</div>

      <div className="message-bubble__body">
        <div className="message-bubble__glass">
          <p>{message.text}</p>

          {!isUser && action && (
            <ActionConfirmation
              action={action}
              status={actionStatus}
              onConfirm={async () => {
                if (actionStatus !== "pending") return;
                setActionStatus("loading");
                try {
                  const result = await onAction(action);
                  setActionStatus(
                    result && typeof result === "object" && "success" in result && result.success
                      ? "success"
                      : "pending",
                  );
                } catch {
                  setActionStatus("pending");
                }
              }}
              onDismiss={() => setActionStatus("cancelled")}
            />
          )}

          {!isUser && selection && (
            <TelegramSelectionCard
              selection={selection}
              onSelect={(candidate) => {
                if (selection.mode === "send_recipient" && selection.pendingText) {
                  void resolveTelegramSelection(message.id, candidate, selection.pendingText);
                }
              }}
            />
          )}
        </div>

        <div className="message-bubble__meta">
          <span>{message.time}</span>

          {!isUser && canSpeak && (
            <button
              type="button"
              className={`message-bubble__speak ${isSpeaking ? "is-speaking" : ""}`}
              onClick={isSpeaking ? onStopSpeak : onSpeak}
              aria-label={isSpeaking ? "O'qishni to'xtatish" : "Ovozda o'qish"}
              title={isSpeaking ? "To'xtatish" : "Ovozda o'qish"}
            >
              {isSpeaking ? <VolumeX size={12} /> : <Volume2 size={12} />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
