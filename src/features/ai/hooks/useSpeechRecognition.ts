import { useCallback, useEffect, useRef, useState } from 'react';
import { voiceApi } from '../../../services/api/voiceApi';
import { getLocale } from '../../../i18n/useI18n';

type Options = { lang?: string; onResult?: (transcript: string) => void; onError?: (message: string) => void };
type Recording = { recorder: MediaRecorder; stream: MediaStream; context: AudioContext | null; timer: number; startedAt: number; speechAt: number; lastSoundAt: number; voicedFrames: number; cancelled: boolean };

/** One bounded recording per turn, with silence detection. Every transcript uses the same agent as text. */
export const useSpeechRecognition = (options: Options = {}) => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);
  const callbacks = useRef(options); callbacks.current = options;
  const active = useRef<Recording | null>(null);
  const pending = useRef<AbortController | null>(null);
  const starting = useRef(false);
  const mounted = useRef(true);
  const generation = useRef(0);
  const isSupported = typeof window !== 'undefined' && typeof MediaRecorder !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia);
  const errorText = (uz: string, ru: string) => getLocale() === 'ru' ? ru : uz;

  const release = useCallback((state: Recording) => {
    window.clearInterval(state.timer);
    state.stream.getTracks().forEach(track => track.stop());
    void state.context?.close().catch(() => undefined);
  }, []);

  const stop = useCallback(() => {
    generation.current += 1;
    pending.current?.abort(); pending.current = null;
    const state = active.current;
    active.current = null;
    if (state) {
      state.cancelled = true;
      if (state.recorder.state !== 'inactive') state.recorder.stop();
      release(state);
    }
    if (mounted.current) { setIsListening(false); setIsProcessing(false); setInterimTranscript(''); setAudioLevel(0); }
  }, [release]);

  const finish = useCallback(() => {
    const state = active.current;
    if (state && state.recorder.state !== 'inactive') state.recorder.stop();
  }, []);

  const requestPermission = useCallback(async () => {
    try { const stream = await navigator.mediaDevices.getUserMedia({ audio: true }); stream.getTracks().forEach(track => track.stop()); return true; }
    catch { callbacks.current.onError?.(errorText('Mikrofonga ruxsat bering.', 'Разрешите доступ к микрофону.')); return false; }
  }, []);

  const start = useCallback(() => {
    if (active.current || starting.current || pending.current) return;
    if (!isSupported) { callbacks.current.onError?.(errorText('Bu brauzerda ovoz yozish ishlamaydi.', 'Этот браузер не поддерживает запись звука.')); return; }
    const currentGeneration = generation.current;
    starting.current = true;
    void (async () => {
      let stream: MediaStream | undefined;
      let context: AudioContext | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
        if (!mounted.current || currentGeneration !== generation.current) { stream.getTracks().forEach(t => t.stop()); return; }
        const mimeType = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus'].find(type => MediaRecorder.isTypeSupported(type));
        const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
        const chunks: BlobPart[] = [];
        const now = Date.now();
        context = typeof AudioContext !== 'undefined' ? new AudioContext() : null;
        const analyser = context?.createAnalyser();
        if (analyser && context) { analyser.fftSize = 2048; context.createMediaStreamSource(stream).connect(analyser); await context.resume(); }
        if (!mounted.current || currentGeneration !== generation.current) { stream.getTracks().forEach(t => t.stop()); void context?.close().catch(() => undefined); return; }
        const state: Recording = { recorder, stream, context, timer: 0, startedAt: now, speechAt: 0, lastSoundAt: now, voicedFrames: 0, cancelled: false };
        active.current = state;
        recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
        recorder.onerror = () => { stop(); callbacks.current.onError?.(errorText('Ovoz yozishda xatolik.', 'Ошибка записи звука.')); };
        recorder.onstop = () => {
          release(state);
          if (active.current === state) active.current = null;
          if (!mounted.current || state.cancelled || currentGeneration !== generation.current) return;
          setIsListening(false);
          const duration = Math.min(90, (Date.now() - state.startedAt) / 1000);
          if (duration < 0.4 || (analyser && state.voicedFrames < 3)) { setInterimTranscript(''); return; }
          const blob = new Blob(chunks, { type: recorder.mimeType || mimeType || 'audio/webm' });
          if (!blob.size) return;
          const controller = new AbortController(); pending.current = controller;
          setIsProcessing(true);
          // Keep the voice UI clean: transcription happens silently in the background.
          setInterimTranscript('');
          void voiceApi.transcribe(blob, duration, controller.signal).then(result => {
            if (!controller.signal.aborted && mounted.current && currentGeneration === generation.current && result.text.trim()) callbacks.current.onResult?.(result.text.trim());
          }).catch(() => {
            if (!controller.signal.aborted && mounted.current) callbacks.current.onError?.(errorText('Ovozni tanib bo‘lmadi. Qayta urinib ko‘ring.', 'Не удалось распознать речь. Попробуйте ещё раз.'));
          }).finally(() => {
            if (pending.current === controller) pending.current = null;
            if (mounted.current && currentGeneration === generation.current) { setIsProcessing(false); setInterimTranscript(''); }
          });
        };
        recorder.start();
        setIsListening(true); setInterimTranscript('');
        const samples = new Uint8Array(analyser?.fftSize ?? 2048);
        state.timer = window.setInterval(() => {
          const elapsed = Date.now() - state.startedAt;
          if (analyser) {
            analyser.getByteTimeDomainData(samples);
            const energy = Math.sqrt(samples.reduce((sum, v) => sum + ((v - 128) / 128) ** 2, 0) / samples.length);
            setAudioLevel(Math.min(1, Math.max(0, (energy - 0.01) * 9)));
            if (energy > 0.018) { state.speechAt ||= Date.now(); state.lastSoundAt = Date.now(); state.voicedFrames += 1; }
          }
          if (elapsed >= 45_000 || (state.speechAt && Date.now() - state.lastSoundAt > 650)) finish();
          else if (!state.speechAt && analyser && elapsed >= 12_000) {
            stop(); callbacks.current.onError?.(errorText('Ovoz eshitilmadi. Davom etish uchun mikrofonni bosing.', 'Речь не обнаружена. Нажмите микрофон, чтобы продолжить.'));
          }
        }, 100);
      } catch {
        void context?.close().catch(() => undefined);
        stream?.getTracks().forEach(t => t.stop());
        if (mounted.current && currentGeneration === generation.current) callbacks.current.onError?.(errorText('Mikrofonni yoqib bo‘lmadi. Brauzer ruxsatini tekshiring.', 'Не удалось включить микрофон. Проверьте разрешения браузера.'));
      } finally { starting.current = false; }
    })();
  }, [finish, isSupported, release, stop]);

  useEffect(() => { mounted.current = true; return () => { mounted.current = false; stop(); }; }, [stop]);
  return { isSupported, isListening, isProcessing, interimTranscript, audioLevel, start, stop, finish, requestPermission };
};
