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
import { useI18n } from "../../../../i18n/useI18n";
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
type TFn = (key: string, fallback: string, params?: Record<string, string | number>) => string;

const getActionDetails = (t: TFn, action: AIAction) => {
  switch (action.type) {
    case "createMeeting":
      return {
        title: t("voiceMode.action.createMeeting", "Uchrashuv yaratish"),
        subject: action.payload.participant || action.payload.title,
        meta: `${action.payload.dateLabel} · ${action.payload.time}`,
      };
    case "createTask":
      return { title: t("voiceMode.action.createTask", "Vazifa yaratish"), subject: action.payload.title, meta: `${action.payload.dateLabel} · ${action.payload.time}` };
    case "createReminder":
      return { title: t("voiceMode.action.createReminder", "Eslatma qo'shish"), subject: action.payload.title, meta: `${action.payload.dateLabel} · ${action.payload.time}` };
    case "createNote":
      return { title: t("voiceMode.action.createNote", "Qayd yozish"), subject: action.payload.title, meta: t("voiceMode.action.newNote", "Yangi qayd") };
    case "getTodayPlan":
      return { title: t("voiceMode.action.getTodayPlan", "Bugungi rejani ko'rish"), subject: t("briefing.title", "Bugungi reja"), meta: t("voiceMode.action.preparing", "Tayyorlanmoqda") };
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
  const { t } = useI18n();
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
      showToast(t("voiceMode.actionCancelled", "Amal bekor qilindi"), "success");
      return;
    }

    sendMessage(transcript);
  }, [actionStatus, executeAction, pendingAction, sendMessage, showToast, t]);

  const { isSupported, isListening, interimTranscript, start, stop, requestPermission } = useSpeechRecognition({
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
    ? t("voiceMode.state.error", "Ovozli suhbatda xatolik yuz berdi")
    : speakingId
      ? t("voiceMode.state.speaking", "Javob beryapman...")
      : isTyping
        ? t("voiceMode.state.thinking", "O'ylayapman...")
        : isListening
          ? t("voiceMode.state.listening", "Tinglayapman...")
          : muted
            ? t("voiceMode.state.muted", "Mikrofon o'chiq")
            : t("voiceMode.state.idle", "Gapirishni boshlashingiz mumkin");

  const actionDetails = pendingAction ? getActionDetails(t, pendingAction) : null;

  const handleEnd = () => {
    stop();
    stopSpeaking();
    onClose();
  };

  const handleRetry = async () => {
    if (!isSupported) { showToast(t("voiceMode.notSupported", "Bu brauzer ovozli kiritishni qo'llab-quvvatlamaydi."), "error"); return; }
    const permissionGranted = await requestPermission();
    if (!permissionGranted) return;
    setVoiceError("");
    setMuted(false);
    window.setTimeout(() => start(), 120);
  };

  const handleActionConfirm = async () => {
    if (!pendingAction || actionStatus !== "pending") return;
    setActionStatus("loading");
    const result = await executeAction(pendingAction);
    setActionStatus(result.success ? "success" : "pending");
  };

  return (
    <div className="voice-mode" role="dialog" aria-modal="true" aria-label={t("voiceMode.dialogAria", "Qulay AI Voice Mode")}>
      <div className="voice-mode__backdrop" />

      <div className="voice-mode__shell">
        <header className="voice-mode__header">
          <div className="voice-mode__brand">
            <span className="voice-mode__brand-dot" />
            <div>
              <strong>Qulay AI</strong>
              <span>{t("voiceMode.subtitle", "Voice Mode · O'zbekcha")}</span>
            </div>
          </div>

          <button type="button" className="voice-mode__close" onClick={handleEnd} aria-label={t("voiceMode.closeAria", "Voice Mode'ni yopish")}>
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
                <span>{message.role === "user" ? t("voiceMode.you", "Siz") : "Qulay AI"}</span>
                <p>{message.text}</p>
              </div>
            )) : (
              <div className="voice-mode__line voice-mode__line--interim">
                <span>{t("voiceMode.you", "Siz")}</span>
                <p>{interimTranscript || t("voiceMode.readyForVoiceChat", "Ovozli suhbatga tayyorman.")}</p>
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
                  {actionStatus === "loading" ? t("voiceMode.saving", "Saqlanmoqda") : t("common.confirm", "Tasdiqlash")}
                </button>
                <button type="button" onClick={() => setActionStatus("cancelled")} disabled={actionStatus === "loading"}>
                  {t("common.cancel", "Bekor qilish")}
                </button>
              </div>
            </section>
          )}

          {voiceError && (
            <div className="voice-mode__error">
              <span>{voiceError}</span>
              <button type="button" onClick={() => void handleRetry()}><RotateCcw size={14} /> {t("voiceMode.checkMic", "Mikrofonni tekshirish")}</button>
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
            aria-label={muted ? t("voiceMode.turnMicOn", "Mikrofonni yoqish") : t("voiceMode.turnMicOff", "Mikrofonni o'chirish")}
          >
            {muted ? <MicOff size={20} /> : <Mic size={20} />}
            <span>{muted ? t("voiceMode.turnOn", "Yoqish") : t("voiceMode.mute", "Mute")}</span>
          </button>

          <button type="button" className="voice-mode__end" onClick={handleEnd} aria-label={t("voiceMode.endSessionAria", "Voice session'ni tugatish")}>
            <PhoneOff size={22} />
            <span>{t("voiceMode.end", "Tugatish")}</span>
          </button>

          <button type="button" className="voice-mode__control" onClick={onKeyboard} aria-label={t("voiceMode.switchToKeyboardAria", "Klaviaturaga o'tish")}>
            <Keyboard size={20} />
            <span>{t("voiceMode.keyboard", "Klaviatura")}</span>
          </button>

          <button
            type="button"
            className="voice-mode__sound"
            onClick={speakingId ? stopSpeaking : undefined}
            aria-label={speakingId ? t("voiceMode.stopSpeakingAria", "Ovozli javobni to'xtatish") : t("voiceMode.soundOnAria", "Ovoz yoqilgan")}
          >
            {speakingId ? <VolumeX size={16} /> : <Volume2 size={16} />}
            <span>{voiceReply ? t("voiceMode.soundOn", "Ovoz yoqilgan") : t("voiceMode.textOnly", "Faqat matn")}</span>
          </button>
        </footer>
      </div>
    </div>
  );
};

export default VoiceMode;
