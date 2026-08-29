import { lazy, Suspense, useEffect, useRef } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { Mic, Send, Square } from "lucide-react";

import { useSpeechRecognition } from "../../hooks/useSpeechRecognition";
import { useToast } from "../../../../hooks/useToast";

import "./ChatInput.scss";

const VoiceInput = lazy(() => import("../VoiceInput/VoiceInput"));

type ChatInputProps = {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
  autoFocus?: boolean;
};

const ChatInput = ({ value, onChange, onSend, disabled, autoFocus = true }: ChatInputProps) => {
  const { showToast } = useToast();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const valueRef = useRef(value);
  valueRef.current = value;

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
      showToast("Bu brauzer ovozli kiritishni qo'llab-quvvatlamaydi.", "error");
      return;
    }

    if (isListening) {
      stop();
    } else {
      showToast("Ovozli kiritish ishga tushdi", "voice");
      start();
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();

      if (disabled) return;

      onSend();
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (disabled) return;

    onSend();
  };

  return (
    <form className="chat-input-area" onSubmit={handleSubmit}>
      {isListening && (
        <Suspense fallback={null}>
          <VoiceInput interimText={interimTranscript} />
        </Suspense>
      )}

      <div className="chat-input">
        <textarea
          ref={inputRef}
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            event.currentTarget.style.height = "auto";
            event.currentTarget.style.height = `${Math.min(event.currentTarget.scrollHeight, 112)}px`;
          }}
          onKeyDown={handleKeyDown}
          placeholder="Xabar yozing..."
          disabled={disabled}
          autoFocus={autoFocus}
          rows={1}
          maxLength={4000}
          aria-label="AI xabar matni"
        />

        <button
          type="button"
          className={`chat-input__icon-btn chat-input__mic ${isListening ? "is-listening" : ""}`}
          onClick={handleMicClick}
          disabled={disabled}
          aria-label={isListening ? "Yozishni to'xtatish" : "Ovozli xabar"}
          title={isListening ? "To'xtatish" : "Ovozli xabar"}
        >
          {isListening ? <Square size={14} /> : <Mic size={16} />}
        </button>

        <button
          type="submit"
          className="chat-input__send"
          disabled={disabled || !value.trim()}
          aria-label="Yuborish"
        >
          <Send size={16} />
        </button>
      </div>
    </form>
  );
};

export default ChatInput;
