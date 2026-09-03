import { useCallback, useEffect, useRef, useState } from 'react';
import { voiceApi } from '../../../services/api/voiceApi';
import { subscriptionApi } from '../../../services/api/subscriptionApi';

type Options = { active: boolean; onTranscript: (text: string) => void; onSpeechStart: () => void };

/** WebRTC transports transcription/VAD; the authenticated server agent owns all business actions. */
export const useRealtimeVoice = ({ active, onTranscript, onSpeechStart }: Options) => {
  const [status, setStatus] = useState<'connecting' | 'active' | 'unavailable'>('connecting');
  const [level, setLevel] = useState(0);
  const disposeRef = useRef<(() => void) | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mutedRef = useRef(false);
  const callbacks = useRef({ onTranscript, onSpeechStart });
  callbacks.current = { onTranscript, onSpeechStart };
  const close = useCallback(() => { disposeRef.current?.(); }, []);

  useEffect(() => {
    if (!active) { close(); return; }
    const abort = new AbortController();
    let disposed = false;
    let pc: RTCPeerConnection | undefined;
    let media: MediaStream | undefined;
    let context: AudioContext | undefined;
    let meterTimer: number | undefined;
    let usageTimer: number | undefined;
    let readyTimer: number | undefined;
    let startedAt = 0;
    let billedSeconds = 0;
    const seenItems = new Set<string>();
    const dispose = () => {
      if (disposed) return;
      disposed = true;
      abort.abort();
      window.clearTimeout(readyTimer);
      window.clearInterval(meterTimer);
      window.clearInterval(usageTimer);
      pc?.close();
      media?.getTracks().forEach(track => track.stop());
      if (context) void context.close().catch(() => undefined);
      if (streamRef.current === media) streamRef.current = null;
      if (disposeRef.current === dispose) { disposeRef.current = null; setLevel(0); }
      const remainder = startedAt ? Math.max(0, Math.ceil((Date.now() - startedAt) / 1000) - billedSeconds) : 0;
      if (remainder) void subscriptionApi.logVoiceUsage(remainder).catch(() => undefined);
    };
    disposeRef.current = dispose;
    const fail = () => { if (!disposed) { setStatus('unavailable'); dispose(); } };
    setStatus('connecting');
    // Late permission/SDP resolutions dispose their own resources, never a newer session.
    readyTimer = window.setTimeout(fail, 15_000);
    void (async () => {
      try {
        const session = await voiceApi.realtimeSession(abort.signal);
        if (disposed) return;
        if (!session.enabled) { fail(); return; }
        media = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
        if (disposed) { media.getTracks().forEach(track => track.stop()); return; }
        streamRef.current = media;
        media.getAudioTracks().forEach(track => { track.enabled = !mutedRef.current; });
        pc = new RTCPeerConnection();
        pc.addTrack(media.getAudioTracks()[0], media);
        pc.onconnectionstatechange = () => { if (pc?.connectionState === 'failed' || pc?.connectionState === 'closed') fail(); };
        context = new AudioContext();
        const analyser = context.createAnalyser(); analyser.fftSize = 512;
        context.createMediaStreamSource(media).connect(analyser);
        const samples = new Uint8Array(analyser.fftSize);
        meterTimer = window.setInterval(() => {
          if (disposed) return;
          analyser.getByteTimeDomainData(samples);
          const rms = Math.sqrt(samples.reduce((sum, value) => sum + ((value - 128) / 128) ** 2, 0) / samples.length);
          setLevel(mutedRef.current ? 0 : Math.min(1, Math.max(0, (rms - .01) * 9)));
        }, 70);
        const dc = pc.createDataChannel('oai-events');
        dc.onerror = fail; dc.onclose = fail;
        dc.onopen = () => {
          if (disposed) return;
          window.clearTimeout(readyTimer);
          startedAt = Date.now();
          usageTimer = window.setInterval(() => {
            const elapsed = Math.floor((Date.now() - startedAt) / 1000);
            const seconds = elapsed - billedSeconds;
            if (seconds > 0) { billedSeconds = elapsed; void subscriptionApi.logVoiceUsage(seconds).catch(fail); }
          }, 30_000);
          setStatus('active');
        };
        dc.onmessage = event => {
          if (disposed) return;
          let value: { type?: string; transcript?: string; item_id?: string };
          try { value = JSON.parse(String(event.data)); } catch { return; }
          if (value.type === 'error' || value.type === 'conversation.item.input_audio_transcription.failed') { fail(); return; }
          if (value.type === 'input_audio_buffer.speech_started' && !mutedRef.current) callbacks.current.onSpeechStart();
          if (value.type === 'conversation.item.input_audio_transcription.completed' && value.transcript?.trim()) {
            if (value.item_id && seenItems.has(value.item_id)) return;
            if (value.item_id) { if (seenItems.size >= 500) seenItems.delete(seenItems.values().next().value!); seenItems.add(value.item_id); }
            callbacks.current.onTranscript(value.transcript.trim());
          }
        };
        const offer = await pc.createOffer();
        if (disposed) return;
        await pc.setLocalDescription(offer);
        const answer = await fetch('https://api.openai.com/v1/realtime/calls', {
          method: 'POST', body: offer.sdp, signal: abort.signal,
          headers: { Authorization: 'Bearer ' + session.clientSecret, 'Content-Type': 'application/sdp' },
        });
        if (!answer.ok) throw new Error('Realtime SDP failed');
        const sdp = await answer.text();
        if (!disposed) await pc.setRemoteDescription({ type: 'answer', sdp });
      } catch { fail(); }
    })();
    return dispose;
  }, [active, close]);

  const setMuted = useCallback((muted: boolean) => {
    mutedRef.current = muted;
    streamRef.current?.getAudioTracks().forEach(track => { track.enabled = !muted; });
  }, []);
  return { status, level, setMuted, close };
};
