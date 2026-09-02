import { useCallback, useEffect, useRef, useState } from 'react';
import { voiceApi } from '../../../services/api/voiceApi';
import { subscriptionApi } from '../../../services/api/subscriptionApi';

type Options = { active: boolean; onTranscript: (text: string) => void; onSpeechStart: () => void };

/** WebRTC is transcription/VAD transport only; every transcript still goes through the authenticated Qulay agent. */
export const useRealtimeVoice = ({ active, onTranscript, onSpeechStart }: Options) => {
  const [status, setStatus] = useState<'connecting' | 'active' | 'unavailable'>('connecting');
  const [level, setLevel] = useState(0);
  const peer = useRef<RTCPeerConnection | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const meter = useRef<{ context: AudioContext; timer: number } | null>(null);
  const usage = useRef<{ startedAt: number; billedSeconds: number; timer: number } | null>(null);
  const callbacks = useRef({ onTranscript, onSpeechStart }); callbacks.current = { onTranscript, onSpeechStart };
  const close = useCallback(() => {
    peer.current?.close(); peer.current = null;
    stream.current?.getTracks().forEach(track => track.stop()); stream.current = null;
    if (meter.current) { window.clearInterval(meter.current.timer); void meter.current.context.close(); meter.current = null; }
    if (usage.current) {
      const state = usage.current; usage.current = null; window.clearInterval(state.timer);
      const remainder = Math.max(0, Math.ceil((Date.now() - state.startedAt) / 1000) - state.billedSeconds);
      if (remainder) void subscriptionApi.logVoiceUsage(remainder).catch(() => undefined);
    }
    setLevel(0);
  }, []);

  useEffect(() => {
    if (!active) { close(); return; }
    let cancelled = false;
    void (async () => {
      try {
        setStatus('connecting');
        const session = await voiceApi.realtimeSession();
        if (!session.enabled || cancelled) { setStatus('unavailable'); return; }
        const media = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
        if (cancelled) { media.getTracks().forEach(track => track.stop()); return; }
        const pc = new RTCPeerConnection(); peer.current = pc; stream.current = media;
        pc.addTrack(media.getAudioTracks()[0], media);
        const context = new AudioContext(); const analyser = context.createAnalyser(); analyser.fftSize = 512;
        context.createMediaStreamSource(media).connect(analyser); const samples = new Uint8Array(analyser.fftSize);
        const timer = window.setInterval(() => { analyser.getByteTimeDomainData(samples); const rms = Math.sqrt(samples.reduce((sum, value) => sum + ((value - 128) / 128) ** 2, 0) / samples.length); setLevel(Math.min(1, Math.max(0, (rms - .01) * 9))); }, 70);
        meter.current = { context, timer };
        const dc = pc.createDataChannel('oai-events');
        dc.onmessage = event => {
          let value: { type?: string; transcript?: string };
          try { value = JSON.parse(String(event.data)); } catch { return; }
          if (value.type === 'input_audio_buffer.speech_started') callbacks.current.onSpeechStart();
          if (value.type === 'conversation.item.input_audio_transcription.completed' && value.transcript?.trim()) callbacks.current.onTranscript(value.transcript.trim());
        };
        const offer = await pc.createOffer(); await pc.setLocalDescription(offer);
        const answer = await fetch('https://api.openai.com/v1/realtime/calls', { method: 'POST', body: offer.sdp, headers: { Authorization: `Bearer ${session.clientSecret}`, 'Content-Type': 'application/sdp' } });
        if (!answer.ok) throw new Error('Realtime SDP failed');
        await pc.setRemoteDescription({ type: 'answer', sdp: await answer.text() });
        if (!cancelled) {
          const state = { startedAt: Date.now(), billedSeconds: 0, timer: 0 };
          state.timer = window.setInterval(() => { state.billedSeconds += 30; void subscriptionApi.logVoiceUsage(30).catch(() => close()); }, 30_000);
          usage.current = state;
          setStatus('active');
        }
      } catch { close(); if (!cancelled) setStatus('unavailable'); }
    })();
    return () => { cancelled = true; close(); };
  }, [active, close]);

  const setMuted = useCallback((muted: boolean) => stream.current?.getAudioTracks().forEach(track => { track.enabled = !muted; }), []);
  return { status, level, setMuted, close };
};
