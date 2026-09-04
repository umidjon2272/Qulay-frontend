import ActionConfirmation from '../ActionConfirmation/ActionConfirmation';
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Mic,
  MicOff,
  PhoneOff,
  RotateCcw,
  Volume2,
  VolumeX,
  MessageSquareText,
} from "lucide-react";

import { getSettings } from "../../../../services/settingsService";
import { subscribeToWorkspaceData } from "../../../../services/workspaceEvents";
import { useToast } from "../../../../hooks/useToast";
import { useI18n } from "../../../../i18n/useI18n";
import type { ChatMessage } from "../../context/AIChatContextValue";
import { useAIChat } from "../../hooks/useAIChat";
import { useSpeechRecognition } from "../../hooks/useSpeechRecognition";
import { useRealtimeVoice } from "../../hooks/useRealtimeVoice";
import { subscriptionApi } from "../../../../services/api/subscriptionApi";
import { prepareAudioPlayback, setVoiceAudioActive } from "../../../../services/audioPlayback";
import { voiceReplyKey } from "./voiceReply";

import VoiceOrb, { type VoiceOrbState } from "../VoiceOrb/VoiceOrb";

import "./VoiceMode.scss";

type VoiceModeProps = {
  open: boolean;
  onClose: () => void;
};

type ActionStatus = "pending" | "loading" | "success" | "cancelled" | "failed";
const getLatest = (messages: ChatMessage[], role: ChatMessage["role"]) =>
  [...messages].reverse().find((message) => message.id !== 0 && message.role === role);

const VoiceMode = ({ open, onClose }: VoiceModeProps) => {
  const {
    messages,
    isTyping,
    sendMessage,
    stopResponse,
    executeAction,
    cancelAction,
    speakingId,
    speak,
    queueSpeech,
    stopSpeaking,
  } = useAIChat();
  const { showToast } = useToast();
  const { t } = useI18n();
  const [muted, setMuted] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  const [actionStatus, setActionStatus] = useState<ActionStatus>("pending");
  const [voiceReply, setVoiceReply] = useState(() => getSettings().ai.voiceReply);
  const [playbackLevel, setPlaybackLevel] = useState(0);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [selectedVoice, setSelectedVoice] = useState<'marin' | 'cedar'>('marin');
  const lastSpokenKeyRef = useRef('');
  const streamedSpeechRef = useRef<{ id: number; offset: number } | null>(null);

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
    const onPlaybackLevel = (event: Event) => setPlaybackLevel(Number((event as CustomEvent).detail) || 0);
    window.addEventListener("qulay:voice-error", onVoiceError);
    window.addEventListener("qulay:playback-level", onPlaybackLevel);
    return () => { window.removeEventListener("qulay:voice-error", onVoiceError); window.removeEventListener("qulay:playback-level", onPlaybackLevel); };
  }, []);

  useEffect(() => subscribeToWorkspaceData("settings", () => {
    setVoiceReply(getSettings().ai.voiceReply);
  }), []);

  const handleResult = useCallback((transcript: string) => {
    // Approval and corrections are resolved centrally from the stored action.
    stopResponse();
    sendMessage(transcript, { voice: true });
  }, [sendMessage, stopResponse]);

  const { isSupported, isListening, isProcessing, interimTranscript, audioLevel, start, stop } = useSpeechRecognition({
    onResult: handleResult,
    onError: (message) => setVoiceError(message),
  });
  const interruptResponse = useCallback(() => { stopSpeaking(); stopResponse(); }, [stopSpeaking, stopResponse]);
  const realtime = useRealtimeVoice({ active: open, onTranscript: handleResult, onSpeechStart: interruptResponse });

  useEffect(() => {
    if (!open || realtime.status !== 'denied') return;
    setVoiceError(t('voiceMode.micPermission', 'Mikrofonga ruxsat bering.'));
  }, [open, realtime.status, t]);

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

    if (realtime.status !== 'unavailable' || muted || voiceError || isTyping || isListening || isProcessing || speakingId !== null) return;

    const timer = window.setTimeout(() => start(), 180);
    return () => window.clearTimeout(timer);
  }, [isListening, isProcessing, isTyping, muted, open, realtime.status, speakingId, start, stop, stopSpeaking, voiceError]);

  useEffect(() => () => {
    stop();
    stopSpeaking();
  }, [stop, stopSpeaking]);

  useEffect(() => {
    const key = voiceReplyKey(latestAI);
    if (!open || !voiceReply || isTyping || latestAI?.streaming || (latestAI && streamedSpeechRef.current?.id === latestAI.id) || !latestAI || !key || key === lastSpokenKeyRef.current) return;
    lastSpokenKeyRef.current = key;
    stop();
    speak(latestAI.id, latestAI.actionResult ?? latestAI.text, selectedVoice);
  }, [isTyping, latestAI, open, selectedVoice, speak, stop, voiceReply]);

  useEffect(() => {
    if (!open || !voiceReply || !latestAI || (!latestAI.streaming && !streamedSpeechRef.current)) return;
    if (!streamedSpeechRef.current || streamedSpeechRef.current.id !== latestAI.id) streamedSpeechRef.current = { id: latestAI.id, offset: 0 };
    const cursor = streamedSpeechRef.current;
    const remaining = latestAI.text.slice(cursor.offset);
    const matches = [...remaining.matchAll(/[^.!?]+[.!?](?:\s|$)/g)];
const chunks = matches.map(match => match[0].trim()).filter(Boolean);

let consumed = matches.reduce(
  (total, match) => total + match[0].length,
  0,
);

// AI nuqta qo‘yishini uzoq kutmaymiz.
// Yetarli matn kelishi bilan birinchi qismini ovozga yuboramiz.
<<<<<<< HEAD
if (latestAI.streaming && chunks.length === 0 && remaining.length >= 40) {
  const preview = remaining.slice(0, 90);
=======
if (latestAI.streaming && chunks.length === 0 && remaining.length >= 32) {
  const preview = remaining.slice(0, 76);
>>>>>>> e87b4b9 (perf: improve realtime voice speed)

  const punctuationCut = Math.max(
    preview.lastIndexOf(','),
    preview.lastIndexOf(';'),
    preview.lastIndexOf(':'),
  );

  const spaceCut = preview.lastIndexOf(' ');

  const cut =
<<<<<<< HEAD
    punctuationCut >= 28
      ? punctuationCut + 1
      : spaceCut >= 32
=======
    punctuationCut >= 22
      ? punctuationCut + 1
      : spaceCut >= 26
>>>>>>> e87b4b9 (perf: improve realtime voice speed)
        ? spaceCut + 1
        : 0;

  if (cut > 0) {
    chunks.push(remaining.slice(0, cut).trim());
    consumed = cut;
  }
}

if (!latestAI.streaming) {
  const tail = remaining.slice(consumed).trim();

  if (tail) {
    chunks.push(tail);
  }

  consumed = remaining.length;
}

if (!chunks.length) return;

cursor.offset = latestAI.streaming
  ? cursor.offset + consumed
  : latestAI.text.length;

chunks.forEach(chunk =>
  queueSpeech(latestAI.id, chunk, selectedVoice),
);
    if (!latestAI.streaming) { lastSpokenKeyRef.current = voiceReplyKey(latestAI); streamedSpeechRef.current = null; }
  }, [latestAI, open, queueSpeech, selectedVoice, voiceReply]);

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
        : isListening || (realtime.status === 'active' && !muted)
          ? "listening"
          : "idle";

  const accessibleStateText = voiceError
    ? t("voiceMode.state.error", "Ovozli suhbatda xatolik yuz berdi")
    : muted
      ? t("voiceMode.state.muted", "Mikrofon o'chiq")
      : speakingId
        ? t("voiceMode.state.speaking", "Javob beryapman")
        : isTyping || isProcessing
          ? t("voiceMode.state.thinking", "Javob tayyorlanmoqda")
          : t("voiceMode.state.listening", "Tinglayapman");


  const handleEnd = () => {
    stop();
    stopSpeaking();
    onClose();
  };

  const handleRetry = async () => {
    await prepareAudioPlayback().catch(() => undefined);
    if (!isSupported) { showToast(t("voiceMode.notSupported", "Bu brauzer ovozli kiritishni qo'llab-quvvatlamaydi."), "error"); return; }
    setVoiceError("");
    setMuted(false);
    realtime.setMuted(false);
    // Retry only after an explicit click. Do not run a separate permission probe;
    // start() itself requests the microphone once if the browser needs it.
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

          <div className="voice-mode__header-actions">
            <label className="voice-mode__voice-select"><span>{t('voiceMode.voiceLabel', 'Ovoz')}</span><select value={selectedVoice} onChange={event => setSelectedVoice(event.target.value as 'marin' | 'cedar')}><option value="marin">Marin</option><option value="cedar">Cedar</option></select></label>
            <button type="button" className="voice-mode__close" onClick={() => setTranscriptOpen(value => !value)} aria-label={t('voiceMode.transcript', 'Transkriptni ochish')}><MessageSquareText size={19} /></button>
          </div>
        </header>

        <main className="voice-mode__body">
          <div className={`voice-mode__state voice-mode__state--${state}`} aria-label={accessibleStateText} title={voiceError || muted ? accessibleStateText : undefined}>
            <span className="voice-mode__state-dot" />
          </div>

          <VoiceOrb state={state} level={state === "listening" ? (realtime.status === 'active' ? realtime.level : audioLevel) : state === "speaking" ? playbackLevel : 0} />

          {speakingId !== null && <button type="button" className="voice-mode__control" onClick={() => {
            interruptResponse(); setMuted(false); realtime.setMuted(false); setVoiceError(''); if (realtime.status === 'unavailable' || realtime.status === 'denied') start();
          }}><Mic size={18} /> {t('voiceMode.interrupt', 'Gapirish — javobni to‘xtatish')}</button>}

          {!transcriptOpen && !isProcessing && !isTyping && <p className="voice-mode__caption">{interimTranscript || transcriptMessages.at(-1)?.text || t("voiceMode.readyForVoiceChat", "Ovozli suhbatga tayyorman.")}</p>}
          {transcriptOpen && <div className="voice-mode__transcript" aria-live="polite">
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
          </div>}

          {pendingAction && <ActionConfirmation action={pendingAction} status={actionStatus} onConfirm={handleActionConfirm} onDismiss={() => void handleActionCancel()} />}

          {voiceError && (
            <div className="voice-mode__error">
              <span>{voiceError}</span>
              <button type="button" onClick={() => void handleRetry()}><RotateCcw size={14} /> {t("voiceMode.checkMic", "Mikrofonni tekshirish")}</button>
              {latestAI && voiceReplyKey(latestAI) && <button type="button" onClick={() => {
                setVoiceError(''); stop(); speak(latestAI.id, latestAI.actionResult ?? latestAI.text);
              }}><Volume2 size={14} /> {t('voiceMode.replay', 'Javobni qayta eshitish')}</button>}
            </div>
          )}
        </main>

        <footer className="voice-mode__controls">
          <form className="voice-mode__composer" onSubmit={event => { event.preventDefault(); const value = textInput.trim(); if (value) { sendMessage(value); setTextInput(''); } }}>
            <input value={textInput} onChange={event => setTextInput(event.target.value)} placeholder={t('voiceMode.write', 'Xabar yozing…')} aria-label={t('voiceMode.write', 'Xabar yozing…')} />
          </form>
          <button
            type="button"
            className={`voice-mode__control ${muted ? "is-active" : ""}`}
            onClick={() => {
              if (muted) {
                setMuted(false);
                realtime.setMuted(false);
                setVoiceError("");
              } else {
                setMuted(true);
                realtime.setMuted(true);
                stop();
              }
            }}
            aria-label={muted ? t("voiceMode.turnMicOn", "Mikrofonni yoqish") : t("voiceMode.turnMicOff", "Mikrofonni o'chirish")}
          >
            {muted ? <MicOff size={20} /> : <Mic size={20} />}
            <span>{muted ? t("voiceMode.turnOn", "Yoqish") : t("voiceMode.mute", "O‘chirish")}</span>
          </button>

          <button type="button" className="voice-mode__end" onClick={handleEnd} aria-label={t("voiceMode.endSessionAria", "Ovozli suhbatni tugatish")}>
            <PhoneOff size={22} />
            <span>{t("voiceMode.end", "Tugatish")}</span>
          </button>

          <button
            type="button"
            className="voice-mode__sound"
            onClick={() => { setVoiceReply(v => !v); stopSpeaking(); }}
            aria-pressed={voiceReply}
            aria-label={voiceReply ? t('voiceMode.soundDisable', 'Ovozli javobni o‘chirish') : t('voiceMode.soundEnable', 'Ovozli javobni yoqish')}
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
