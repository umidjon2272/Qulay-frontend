import { lazy, Suspense, useState, useEffect } from "react";
const MessageMarkdown = lazy(() => import('./MessageMarkdown'));
import { Check, Copy, Sparkles, User, Volume2, VolumeX } from "lucide-react";

import type { ChatMessage } from "../../context/AIChatContextValue";
import type { AIAction } from "../../actions/actionTypes";
import { useAIChat } from "../../hooks/useAIChat";
import { useI18n } from "../../../../i18n/useI18n";

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

type ActionStatus = "pending" | "loading" | "success" | "cancelled" | "failed";

const MessageBubble = ({ message, isSpeaking, onSpeak, onStopSpeak, onAction }: MessageBubbleProps) => {
  const [actionStatus, setActionStatus] = useState<ActionStatus>("pending");
  const [actionFeedback, setActionFeedback] = useState(message.actionResult ?? "");
  const [copied, setCopied] = useState(false);
  const { resolveTelegramSelection, cancelAction } = useAIChat();
  const { t } = useI18n();

  useEffect(() => { if (message.actionStatus) setActionStatus(message.actionStatus); }, [message.actionStatus]);
  useEffect(() => { if (message.actionResult) setActionFeedback(message.actionResult); }, [message.actionResult]);

  const isUser = message.role === "user";
  const action = message.action;
  const selection = message.telegramSelection;
  const canSpeak = typeof window !== "undefined" && typeof Audio !== "undefined";
  const canCopy = typeof navigator !== "undefined" && Boolean(navigator.clipboard);
  const progressText = message.progress && ({
    preparing: "Javob tayyorlayapman…",
    checking_income: "Daromadlarni tekshiryapman…",
    searching_tasks: "Vazifalarni qidiryapman…",
    waiting_confirmation: "Tasdiq kutilmoqda",
    executing: "Bajarilmoqda…",
  } as const)[message.progress];

  const copyText = async () => {
    if (!canCopy) return;
    try {
      await navigator.clipboard.writeText(message.text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard permission can be denied silently; the button just stays idle.
    }
  };

  return (
    <div className={`message-bubble ${isUser ? "message-bubble--user" : "message-bubble--ai"}`}>
      <div className="message-bubble__avatar">{isUser ? <User size={13} /> : <Sparkles size={13} />}</div>

      <div className="message-bubble__body">
        <div className="message-bubble__glass">
          {isUser ? <p>{message.text}</p> : !action && <>
            {message.text && <Suspense fallback={<p>{message.text}</p>}><MessageMarkdown text={message.text} /></Suspense>}
            {progressText && !message.text && <div className="message-bubble__progress" role="status"><span />{progressText}</div>}
            {message.incomplete && <div className="message-bubble__incomplete">{t('ai.incomplete', 'Javob to‘xtatildi · tugallanmagan')}</div>}
          </>}

          {!isUser && action && (
            <ActionConfirmation
              action={action}
              status={actionStatus}
              result={actionFeedback}
              onConfirm={async () => {
                if (actionStatus !== "pending") return;
                setActionStatus("loading");
                setActionFeedback("");
                try {
                  const result = await onAction(action);
                  const success = Boolean(result && typeof result === "object" && "success" in result && result.success);
                  setActionStatus(success ? "success" : "failed");
                  if (result && typeof result === "object" && "message" in result && typeof result.message === "string") {
                    setActionFeedback(result.message);
                  }
                } catch {
                  setActionStatus("pending");
                  setActionFeedback(action.error);
                }
              }}
              onDismiss={() => {
                if (actionStatus !== "pending") return;
                setActionStatus("loading");
                void cancelAction(action).then((result) => {
                  setActionFeedback(result.success ? "" : result.message);
                  setActionStatus(result.success ? "cancelled" : "pending");
                });
              }}
            />
          )}
          {!isUser && actionFeedback && actionStatus === "failed" && <p className="message-bubble__action-error" role="alert">{actionFeedback}</p>}

          {!isUser && selection && (
            <TelegramSelectionCard
              selection={selection}
              onSelect={(candidate) => {
                void resolveTelegramSelection(message.id, candidate, selection);
              }}
            />
          )}
        </div>

        <div className="message-bubble__meta">
          <span>{message.time}</span>

          {!isUser && canCopy && (
            <button
              type="button"
              className="message-bubble__copy"
              onClick={() => void copyText()}
              aria-label={copied ? t("ai.message.copied", "Nusxalandi") : t("ai.message.copy", "Nusxalash")}
              title={copied ? t("ai.message.copied", "Nusxalandi") : t("ai.message.copy", "Nusxalash")}
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
            </button>
          )}

          {!isUser && canSpeak && (
            <button
              type="button"
              className={`message-bubble__speak ${isSpeaking ? "is-speaking" : ""}`}
              onClick={isSpeaking ? onStopSpeak : onSpeak}
              aria-label={isSpeaking ? t("ai.message.stopReading", "O'qishni to'xtatish") : t("ai.message.readAloud", "Ovozda o'qish")}
              title={isSpeaking ? t("common.stop", "To'xtatish") : t("ai.message.readAloud", "Ovozda o'qish")}
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
