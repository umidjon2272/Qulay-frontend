import { lazy, Suspense, useEffect, useRef } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { Mic, Paperclip, Send, Square } from "lucide-react";

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
  const fileInputRef = useRef<HTMLInputElement>(null);
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
        <button
          type="button"
          className="chat-input__icon-btn"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          aria-label="Fayl biriktirish"
          title="Fayl biriktirish"
        >
          <Paperclip size={16} />
        </button>

        <textarea
          ref={inputRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Xabar yozing..."
          disabled={disabled}
          autoFocus={autoFocus}
          rows={1}
          maxLength={4000}
          aria-label="AI xabar matni"
        />

        <input
          ref={fileInputRef}
          type="file"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) showToast(`${file.name} xabarga biriktirildi`, "success");
            event.currentTarget.value = "";
          }}
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
