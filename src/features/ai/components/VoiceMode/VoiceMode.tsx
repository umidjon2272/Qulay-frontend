import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Keyboard,
  Mic,
  MicOff,
  PhoneOff,
  RotateCcw,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";

import { getSettings } from "../../../../services/settingsService";
import { subscribeToWorkspaceData } from "../../../../services/workspaceEvents";
import { useToast } from "../../../../hooks/useToast";
import type { AIAction } from "../../actions/actionTypes";
import type { ChatMessage } from "../../context/AIChatContextValue";
import { useAIChat } from "../../hooks/useAIChat";
import { useSpeechRecognition } from "../../hooks/useSpeechRecognition";

import VoiceOrb, { type VoiceOrbState } from "../VoiceOrb/VoiceOrb";

import "./VoiceMode.scss";

type VoiceModeProps = {
  open: boolean;
  onClose: () => void;
  onKeyboard: () => void;
};

type ActionStatus = "pending" | "loading" | "success" | "cancelled";

const getActionDetails = (action: AIAction) => {
  switch (action.type) {
    case "createMeeting":
      return {
        title: "Uchrashuv yaratish",
        subject: action.payload.participant || action.payload.title,
        meta: `${action.payload.dateLabel} · ${action.payload.time}`,
      };
    case "createTask":
      return { title: "Vazifa yaratish", subject: action.payload.title, meta: `${action.payload.dateLabel} · ${action.payload.time}` };
    case "createReminder":
      return { title: "Eslatma qo'shish", subject: action.payload.title, meta: `${action.payload.dateLabel} · ${action.payload.time}` };
    case "createNote":
      return { title: "Qayd yozish", subject: action.payload.title, meta: "Yangi qayd" };
    case "getTodayPlan":
      return { title: "Bugungi rejani ko'rish", subject: "Bugungi reja", meta: "Tayyorlanmoqda" };
  }
};

const isConfirmation = (text: string) => /tasdiq|tasdiqlay|ha,?\s*(mayli|albatta)?|confirm/i.test(text);
const isCancellation = (text: string) => /bekor|yo'q|yoq|cancel/i.test(text);

const getLatest = (messages: ChatMessage[], role: ChatMessage["role"]) =>
  [...messages].reverse().find((message) => message.id !== 0 && message.role === role);

const VoiceMode = ({ open, onClose, onKeyboard }: VoiceModeProps) => {
  const {
    messages,
    isTyping,
    sendMessage,
    executeAction,
    speakingId,
    speak,
    stopSpeaking,
  } = useAIChat();
  const { showToast } = useToast();
  const [muted, setMuted] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  const [actionStatus, setActionStatus] = useState<ActionStatus>("pending");
  const [voiceReply, setVoiceReply] = useState(() => getSettings().ai.voiceReply);
  const lastSpokenIdRef = useRef<number | null>(null);

  const latestAI = useMemo(() => getLatest(messages, "ai"), [messages]);
  const latestAIRef = useRef<ChatMessage | undefined>(latestAI);
  latestAIRef.current = latestAI;
  const pendingAction = latestAI?.action;
  const transcriptMessages = useMemo(
    () => messages.filter((message) => message.id !== 0).slice(-4),
    [messages],
  );

  useEffect(() => subscribeToWorkspaceData("settings", () => {
    setVoiceReply(getSettings().ai.voiceReply);
  }), []);

  const handleResult = useCallback((transcript: string) => {
    const normalized = transcript.toLocaleLowerCase("uz-UZ");

    if (pendingAction && actionStatus === "pending" && isConfirmation(normalized)) {
      setActionStatus("loading");
      void executeAction(pendingAction).then((result) => {
        setActionStatus(result.success ? "success" : "pending");
      });
      return;
    }

    if (pendingAction && actionStatus === "pending" && isCancellation(normalized)) {
      setActionStatus("cancelled");
      showToast("Amal bekor qilindi", "success");
      return;
    }

    sendMessage(transcript);
  }, [actionStatus, executeAction, pendingAction, sendMessage, showToast]);

  const { isSupported, isListening, interimTranscript, start, stop } = useSpeechRecognition({
    onResult: handleResult,
    onError: (message) => setVoiceError(message),
  });

  useEffect(() => {
    if (!open) return;

    lastSpokenIdRef.current = latestAIRef.current?.id ?? null;
    setMuted(false);
    setVoiceError("");
    setActionStatus("pending");
  }, [open]);

  useEffect(() => {
    setActionStatus("pending");
  }, [latestAI?.id]);

  useEffect(() => {
    if (!open) {
      stop();
      stopSpeaking();
      return;
    }

    if (muted || voiceError || isTyping || isListening || speakingId) return;

    const timer = window.setTimeout(() => start(), 180);
    return () => window.clearTimeout(timer);
  }, [isListening, isTyping, muted, open, speakingId, start, stop, stopSpeaking, voiceError]);

  useEffect(() => () => {
    stop();
    stopSpeaking();
  }, [stop, stopSpeaking]);

  useEffect(() => {
    if (!open || !voiceReply || isTyping || !latestAI || latestAI.id === lastSpokenIdRef.current) return;

    lastSpokenIdRef.current = latestAI.id;
    speak(latestAI.id, latestAI.text);
  }, [isTyping, latestAI, open, speak, voiceReply]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  if (!open) return null;

  const state: VoiceOrbState = voiceError
    ? "error"
    : speakingId
      ? "speaking"
      : isTyping
        ? "processing"
        : isListening
          ? "listening"
          : "idle";

  const stateText = voiceError
    ? "Ovozli suhbatda xatolik yuz berdi"
    : speakingId
      ? "Javob beryapman..."
      : isTyping
        ? "O'ylayapman..."
        : isListening
          ? "Tinglayapman..."
          : muted
            ? "Mikrofon o'chiq"
            : "Gapirishni boshlashingiz mumkin";

  const actionDetails = pendingAction ? getActionDetails(pendingAction) : null;

  const handleEnd = () => {
    stop();
    stopSpeaking();
    onClose();
  };

  const handleRetry = () => {
    setVoiceError("");
    setMuted(false);
    if (!isSupported) showToast("Bu brauzer ovozli kiritishni qo'llab-quvvatlamaydi.", "error");
  };

  const handleActionConfirm = async () => {
    if (!pendingAction || actionStatus !== "pending") return;
    setActionStatus("loading");
    const result = await executeAction(pendingAction);
    setActionStatus(result.success ? "success" : "pending");
  };

  return (
    <div className="voice-mode" role="dialog" aria-modal="true" aria-label="Yechim AI Voice Mode">
      <div className="voice-mode__backdrop" />

      <div className="voice-mode__shell">
        <header className="voice-mode__header">
          <div className="voice-mode__brand">
            <span className="voice-mode__brand-dot" />
            <div>
              <strong>Yechim AI</strong>
              <span>Voice Mode · O'zbekcha</span>
            </div>
          </div>

          <button type="button" className="voice-mode__close" onClick={handleEnd} aria-label="Voice Mode'ni yopish">
            <X size={19} />
          </button>
        </header>

        <main className="voice-mode__body">
          <div className={`voice-mode__state voice-mode__state--${state}`}>
            <span className="voice-mode__state-dot" />
            {stateText}
          </div>

          <VoiceOrb state={state} />

          <div className="voice-mode__transcript" aria-live="polite">
            {transcriptMessages.length > 0 ? transcriptMessages.map((message) => (
              <div className={`voice-mode__line voice-mode__line--${message.role}`} key={message.id}>
                <span>{message.role === "user" ? "Siz" : "Yechim AI"}</span>
                <p>{message.text}</p>
              </div>
            )) : (
              <div className="voice-mode__line voice-mode__line--interim">
                <span>Siz</span>
                <p>{interimTranscript || "Ovozli suhbatga tayyorman."}</p>
              </div>
            )}
            {interimTranscript && <p className="voice-mode__interim">{interimTranscript}</p>}
          </div>

          {actionDetails && (actionStatus === "pending" || actionStatus === "loading") && (
            <section className="voice-mode__confirmation">
              <div className="voice-mode__confirmation-icon"><Check size={16} /></div>
              <div>
                <strong>{actionDetails.title}</strong>
                <span>{actionDetails.subject}</span>
                <small>{actionDetails.meta}</small>
              </div>
              <div className="voice-mode__confirmation-actions">
                <button type="button" onClick={() => void handleActionConfirm()} disabled={actionStatus === "loading"}>
                  <Check size={14} />
                  {actionStatus === "loading" ? "Saqlanmoqda" : "Tasdiqlash"}
                </button>
                <button type="button" onClick={() => setActionStatus("cancelled")} disabled={actionStatus === "loading"}>
                  Bekor qilish
                </button>
              </div>
            </section>
          )}

          {voiceError && (
            <div className="voice-mode__error">
              <span>{voiceError}</span>
              <button type="button" onClick={handleRetry}><RotateCcw size={14} /> Qayta urinish</button>
            </div>
          )}
        </main>

        <footer className="voice-mode__controls">
          <button
            type="button"
            className={`voice-mode__control ${muted ? "is-active" : ""}`}
            onClick={() => {
              if (muted) {
                setMuted(false);
                setVoiceError("");
              } else {
                setMuted(true);
                stop();
              }
            }}
            aria-label={muted ? "Mikrofonni yoqish" : "Mikrofonni o'chirish"}
          >
            {muted ? <MicOff size={20} /> : <Mic size={20} />}
            <span>{muted ? "Yoqish" : "Mute"}</span>
          </button>

          <button type="button" className="voice-mode__end" onClick={handleEnd} aria-label="Voice session'ni tugatish">
            <PhoneOff size={22} />
            <span>Tugatish</span>
          </button>

          <button type="button" className="voice-mode__control" onClick={onKeyboard} aria-label="Klaviaturaga o'tish">
            <Keyboard size={20} />
            <span>Klaviatura</span>
          </button>

          <button
            type="button"
            className="voice-mode__sound"
            onClick={speakingId ? stopSpeaking : undefined}
            aria-label={speakingId ? "Ovozli javobni to'xtatish" : "Ovoz yoqilgan"}
          >
            {speakingId ? <VolumeX size={16} /> : <Volume2 size={16} />}
            <span>{voiceReply ? "Ovoz yoqilgan" : "Faqat matn"}</span>
          </button>
        </footer>
      </div>
    </div>
  );
};

export default VoiceMode;
