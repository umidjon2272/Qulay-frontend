import ActionConfirmation from '../ActionConfirmation/ActionConfirmation';
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
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
import type { ChatMessage } from "../../context/AIChatContextValue";
import { useAIChat } from "../../hooks/useAIChat";
import { useSpeechRecognition } from "../../hooks/useSpeechRecognition";
import { subscriptionApi } from "../../../../services/api/subscriptionApi";
import { prepareAudioPlayback, setVoiceAudioActive } from "../../../../services/audioPlayback";
import { voiceReplyKey } from "./voiceReply";

import VoiceOrb, { type VoiceOrbState } from "../VoiceOrb/VoiceOrb";

import "./VoiceMode.scss";

type VoiceModeProps = {
  open: boolean;
  onClose: () => void;
  onKeyboard: () => void;
};

type ActionStatus = "pending" | "loading" | "success" | "cancelled" | "failed";
const getLatest = (messages: ChatMessage[], role: ChatMessage["role"]) =>
  [...messages].reverse().find((message) => message.id !== 0 && message.role === role);

const VoiceMode = ({ open, onClose, onKeyboard }: VoiceModeProps) => {
  const {
    messages,
    isTyping,
    sendMessage,
    executeAction,
    cancelAction,
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
  const lastSpokenKeyRef = useRef('');

  const latestAI = useMemo(() => getLatest(messages, "ai"), [messages]);
  const latestAIRef = useRef<ChatMessage | undefined>(latestAI);
  latestAIRef.current = latestAI;
  const pendingAction = latestAI?.action;
  const transcriptMessages = useMemo(
    () => messages.filter((message) => message.id !== 0).slice(-4),
    [messages],
  );

  useEffect(() => {
    const onVoiceError = (event: Event) => setVoiceError(String((event as CustomEvent).detail));
    window.addEventListener("qulay:voice-error", onVoiceError);
    return () => window.removeEventListener("qulay:voice-error", onVoiceError);
  }, []);

  useEffect(() => subscribeToWorkspaceData("settings", () => {
    setVoiceReply(getSettings().ai.voiceReply);
  }), []);

  const handleResult = useCallback((transcript: string) => {
    // Approval and corrections are resolved centrally from the stored action.
    sendMessage(transcript);
  }, [sendMessage]);

  const { isSupported, isListening, isProcessing, interimTranscript, start, stop, finish, requestPermission } = useSpeechRecognition({
    onResult: handleResult,
    onError: (message) => setVoiceError(message),
  });

  useEffect(() => {
    if (!open) return;

    lastSpokenKeyRef.current = voiceReplyKey(latestAIRef.current);
    setMuted(false);
    setVoiceError("");
    setActionStatus("pending");
    void subscriptionApi.mine().then((info) => { if (info.usage.voiceMinutes.used >= info.usage.voiceMinutes.limit) setVoiceError(t("billing.voiceLimitReached", "Ovozli daqiqalar limiti tugadi.")); }).catch(() => undefined);
  }, [open, t]);

  useEffect(() => {
    setVoiceAudioActive(open);
    return () => setVoiceAudioActive(false);
  }, [open]);

  useEffect(() => { if (voiceError) stop(); }, [voiceError, stop]);

  useEffect(() => {
    setActionStatus(latestAI?.actionStatus ?? "pending");
  }, [latestAI?.id, latestAI?.actionStatus]);

  useEffect(() => {
    if (!open) {
      stop();
      stopSpeaking();
      return;
    }

    if (muted || voiceError || isTyping || isListening || isProcessing || speakingId !== null) return;

    const timer = window.setTimeout(() => start(), 180);
    return () => window.clearTimeout(timer);
  }, [isListening, isProcessing, isTyping, muted, open, speakingId, start, stop, stopSpeaking, voiceError]);

  useEffect(() => () => {
    stop();
    stopSpeaking();
  }, [stop, stopSpeaking]);

  useEffect(() => {
    const key = voiceReplyKey(latestAI);
    if (!open || !voiceReply || isTyping || !latestAI || !key || key === lastSpokenKeyRef.current) return;
    lastSpokenKeyRef.current = key;
    stop();
    speak(latestAI.id, latestAI.actionResult ?? latestAI.text);
  }, [isTyping, latestAI, open, speak, stop, voiceReply]);

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
      : isTyping || isProcessing
        ? "processing"
        : isListening
          ? "listening"
          : "idle";

  const stateText = voiceError
    ? t("voiceMode.state.error", "Ovozli suhbatda xatolik yuz berdi")
    : speakingId
      ? t("voiceMode.state.speaking", "Javob beryapman...")
      : isTyping || isProcessing
        ? t("voiceMode.state.thinking", "O'ylayapman...")
        : isListening
          ? t("voiceMode.state.listening", "Tinglayapman...")
          : muted
            ? t("voiceMode.state.muted", "Mikrofon o'chiq")
            : t("voiceMode.state.idle", "Gapirishni boshlashingiz mumkin");


  const handleEnd = () => {
    stop();
    stopSpeaking();
    onClose();
  };

  const handleRetry = async () => {
    await prepareAudioPlayback().catch(() => undefined);
    if (!isSupported) { showToast(t("voiceMode.notSupported", "Bu brauzer ovozli kiritishni qo'llab-quvvatlamaydi."), "error"); return; }
    const permissionGranted = await requestPermission();
    if (!permissionGranted) return;
    setVoiceError("");
    setMuted(false);
    start();
  };

  const handleActionConfirm = async () => {
    if (!pendingAction || actionStatus !== "pending") return;
    setActionStatus("loading");
    const result = await executeAction(pendingAction);
    setActionStatus(result.success ? "success" : "failed");
  };
  const handleActionCancel = async () => {
    if (!pendingAction || actionStatus !== "pending") return;
    setActionStatus("loading"); const result = await cancelAction(pendingAction); setActionStatus(result.success ? "cancelled" : "pending"); showToast(result.message, result.success ? "success" : "error");
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
              <span>{t("voiceMode.aiVoice", "AI yaratgan ovoz") }</span>
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

          {speakingId !== null && <button type="button" className="voice-mode__control" onClick={() => {
            stopSpeaking(); setMuted(false); setVoiceError(''); start();
          }}><Mic size={18} /> Gapirish — javobni to‘xtatish</button>}
          {isListening && <button type="button" className="voice-mode__control" onClick={finish}>Gapirib bo‘ldim</button>}

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

          {pendingAction && <ActionConfirmation action={pendingAction} status={actionStatus} onConfirm={handleActionConfirm} onDismiss={() => void handleActionCancel()} />}

          {voiceError && (
            <div className="voice-mode__error">
              <span>{voiceError}</span>
              <button type="button" onClick={() => void handleRetry()}><RotateCcw size={14} /> {t("voiceMode.checkMic", "Mikrofonni tekshirish")}</button>
              {latestAI && voiceReplyKey(latestAI) && <button type="button" onClick={() => {
                setVoiceError(''); stop(); speak(latestAI.id, latestAI.actionResult ?? latestAI.text);
              }}><Volume2 size={14} /> Javobni qayta eshitish</button>}
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
            onClick={() => { setVoiceReply(v => !v); stopSpeaking(); }}
            aria-pressed={voiceReply}
            aria-label={voiceReply ? "Ovozli javobni o‘chirish" : "Ovozli javobni yoqish"}
          >
            {voiceReply ? <Volume2 size={16} /> : <VolumeX size={16} />}
            <span>{voiceReply ? t("voiceMode.soundOn", "Ovoz yoqilgan") : t("voiceMode.textOnly", "Faqat matn")}</span>
          </button>
        </footer>
      </div>
    </div>
  );
};

export default VoiceMode;
