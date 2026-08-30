import { lazy, Suspense, useEffect, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { AudioLines, FolderOpen, Mic, Paperclip, Send, Square } from "lucide-react";

import { useSpeechRecognition } from "../../hooks/useSpeechRecognition";
import { useToast } from "../../../../hooks/useToast";
import { useCloseOnOutsideClick } from "../../../../hooks/useCloseOnOutsideClick";
import { useI18n } from "../../../../i18n/useI18n";

import "./ChatInput.scss";

const VoiceInput = lazy(() => import("../VoiceInput/VoiceInput"));

const TEXTAREA_MAX_HEIGHT = 140;

type ChatInputProps = {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onVoice?: () => void;
  disabled?: boolean;
  autoFocus?: boolean;
};

const ChatInput = ({ value, onChange, onSend, onVoice, disabled, autoFocus = true }: ChatInputProps) => {
  const { showToast } = useToast();
  const { t } = useI18n();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const valueRef = useRef(value);
  valueRef.current = value;
  const [attachOpen, setAttachOpen] = useState(false);
  const [sending, setSending] = useState(false);
  useCloseOnOutsideClick(attachOpen, () => setAttachOpen(false));

  const { isSupported, isListening, interimTranscript, start, stop } = useSpeechRecognition({
    onResult: (transcript) => {
      const nextValue = valueRef.current ? `${valueRef.current} ${transcript}` : transcript;
      valueRef.current = nextValue;
      onChange(nextValue);
      inputRef.current?.focus();
    },
    onError: (message) => showToast(message, "error"),
  });

  useEffect(() => {
    if (disabled && isListening) stop();
  }, [disabled, isListening, stop]);

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return undefined;
    const scrollLatestIntoView = () => {
      window.requestAnimationFrame(() => {
        const list = document.querySelector<HTMLElement>(".ai-page .message-list");
        if (list) list.scrollTop = list.scrollHeight;
      });
    };
    const onViewportChange = () => { if (document.activeElement === input) scrollLatestIntoView(); };
    input.addEventListener("focus", scrollLatestIntoView);
    window.visualViewport?.addEventListener("resize", onViewportChange);
    window.visualViewport?.addEventListener("scroll", onViewportChange);
    return () => {
      input.removeEventListener("focus", scrollLatestIntoView);
      window.visualViewport?.removeEventListener("resize", onViewportChange);
      window.visualViewport?.removeEventListener("scroll", onViewportChange);
    };
  }, []);

  const handleMicClick = () => {
    if (!isSupported) {
      showToast(t("voiceMode.notSupported", "Bu brauzer ovozli kiritishni qo'llab-quvvatlamaydi."), "error");
      return;
    }

    if (isListening) {
      stop();
    } else {
      showToast(t("ai.voiceStarted", "Ovozli kiritish ishga tushdi"), "voice");
      start();
    }
  };

  const submit = () => {
    if (disabled || sending || !value.trim()) return;
    setSending(true);
    onSend();
    window.setTimeout(() => setSending(false), 300);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submit();
  };

  const showVoiceTrigger = Boolean(onVoice) && !value.trim();

  return (
    <form className="chat-input-area" onSubmit={handleSubmit}>
      {isListening && (
        <Suspense fallback={null}>
          <VoiceInput interimText={interimTranscript} />
        </Suspense>
      )}

      <div className="chat-input">
        <div className="chat-input__attach">
          <button
            type="button"
            className="chat-input__icon-btn chat-input__attach-btn"
            onClick={(event) => { event.stopPropagation(); setAttachOpen((value_) => !value_); }}
            disabled={disabled}
            aria-label={t("ai.attach", "Fayl biriktirish")}
            aria-expanded={attachOpen}
            title={t("ai.attach", "Fayl biriktirish")}
          >
            <Paperclip size={16} />
          </button>
          {attachOpen && (
            <div className="chat-input__attach-menu" role="menu" onClick={(event) => event.stopPropagation()}>
              <button type="button" role="menuitem" onClick={() => { setAttachOpen(false); navigate("/files"); }}>
                <FolderOpen size={14} /> {t("ai.attachFiles", "Fayllar")}
              </button>
              <button type="button" role="menuitem" disabled className="chat-input__attach-soon">
                <Paperclip size={14} /> {t("ai.attachSoon", "Xabarga biriktirish (tez orada)")}
              </button>
            </div>
          )}
        </div>

        <textarea
          ref={inputRef}
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            event.currentTarget.style.height = "auto";
            event.currentTarget.style.height = `${Math.min(event.currentTarget.scrollHeight, TEXTAREA_MAX_HEIGHT)}px`;
          }}
          onKeyDown={handleKeyDown}
          placeholder={t("ai.messagePlaceholder", "Xabar yozing...")}
          disabled={disabled}
          autoFocus={autoFocus}
          rows={1}
          maxLength={4000}
          aria-label={t("ai.messageAria", "AI xabar matni")}
        />

        <button
          type="button"
          className={`chat-input__icon-btn chat-input__mic ${isListening ? "is-listening" : ""}`}
          onClick={handleMicClick}
          disabled={disabled}
          aria-label={isListening ? t("ai.stopRecording", "Yozishni to'xtatish") : t("ai.voiceMessage", "Ovozli xabar")}
          title={isListening ? t("common.stop", "To'xtatish") : t("ai.voiceMessage", "Ovozli xabar")}
        >
          {isListening ? <Square size={14} /> : <Mic size={16} />}
        </button>

        {showVoiceTrigger ? (
          <button
            type="button"
            className="chat-input__voice-trigger"
            onClick={onVoice}
            disabled={disabled}
            aria-label={t("ai.voice", "Voice Mode'ni ochish")}
            title={t("ai.voice", "Voice Mode'ni ochish")}
          >
            <AudioLines size={17} />
          </button>
        ) : (
          <button
            type="submit"
            className="chat-input__send"
            disabled={disabled || sending || !value.trim()}
            aria-label={t("common.send", "Yuborish")}
          >
            <Send size={16} />
          </button>
        )}
      </div>
    </form>
  );
};

export default ChatInput;
