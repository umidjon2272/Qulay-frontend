import { useCallback, useEffect, useRef, useState } from 'react';
import { voiceApi } from '../../../services/api/voiceApi';
import { subscriptionApi } from '../../../services/api/subscriptionApi';
import { acquireSharedMicrophone, parkSharedMicrophone } from './sharedMicrophone';

type Options = { active: boolean; onTranscript: (text: string) => void; onSpeechStart: () => void };
type RealtimeStatus = 'connecting' | 'active' | 'unavailable' | 'denied';

const isMicrophoneDenied = (error: unknown) => {
  const name = (error as { name?: string } | null)?.name;
  return name === 'NotAllowedError' || name === 'SecurityError';
};

/** WebRTC transports transcription/VAD; the authenticated server agent owns all business actions. */
export const useRealtimeVoice = ({ active, onTranscript, onSpeechStart }: Options) => {
  const [status, setStatus] = useState<RealtimeStatus>('connecting');
  const [level, setLevel] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const retryCountRef = useRef(0);
  const disposeRef = useRef<(() => void) | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mutedRef = useRef(false);
  const callbacks = useRef({ onTranscript, onSpeechStart });
  callbacks.current = { onTranscript, onSpeechStart };
  const close = useCallback(() => { disposeRef.current?.(); }, []);

  useEffect(() => {
    if (!active) { retryCountRef.current = 0; close(); return; }
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
    let channelOpen = false;
    let microphoneReady = false;
    let activated = false;
    const seenItems = new Set<string>();

    const activate = () => {
      if (disposed || activated || !channelOpen || !microphoneReady) return;
      activated = true;
      window.clearTimeout(readyTimer);
      startedAt = Date.now();
      usageTimer = window.setInterval(() => {
        const elapsed = Math.floor((Date.now() - startedAt) / 1000);
        const seconds = elapsed - billedSeconds;
        if (seconds > 0) {
          billedSeconds = elapsed;
          void subscriptionApi.logVoiceUsage(seconds).catch(() => undefined);
        }
      }, 30_000);
      retryCountRef.current = 0;
      setStatus('active');
    };

    const dispose = () => {
      if (disposed) return;
      disposed = true;
      abort.abort();
      window.clearTimeout(readyTimer);
      window.clearInterval(meterTimer);
      window.clearInterval(usageTimer);
      pc?.close();
      if (media) parkSharedMicrophone();
      if (context) void context.close().catch(() => undefined);
      if (streamRef.current === media) streamRef.current = null;
      if (disposeRef.current === dispose) { disposeRef.current = null; setLevel(0); }
      const remainder = startedAt ? Math.max(0, Math.ceil((Date.now() - startedAt) / 1000) - billedSeconds) : 0;
      if (remainder) void subscriptionApi.logVoiceUsage(remainder).catch(() => undefined);
    };
    disposeRef.current = dispose;

    const fail = (reason: Extract<RealtimeStatus, 'unavailable' | 'denied'> = 'unavailable') => {
      if (disposed) return;
      if (reason === 'unavailable' && retryCountRef.current < 1) {
        retryCountRef.current += 1;
        dispose();
        setStatus('connecting');
        window.setTimeout(() => setAttempt((value) => value + 1), 220);
        return;
      }
      setStatus(reason);
      dispose();
    };

    setStatus('connecting');
    // Fail fast to the standard fallback. The microphone is not requested until the
    // Realtime SDP handshake succeeds, so a failed handshake cannot cause a second prompt.
    readyTimer = window.setTimeout(() => fail('unavailable'), 8_000);

    void (async () => {
      try {
        const session = await voiceApi.realtimeSession(abort.signal);
        if (disposed) return;
        if (!session.enabled) { fail('unavailable'); return; }

        pc = new RTCPeerConnection();
        const transceiver = pc.addTransceiver('audio', { direction: 'sendrecv' });
        pc.onconnectionstatechange = () => {
          if (pc?.connectionState === 'failed' || pc?.connectionState === 'closed') fail('unavailable');
        };

        const dc = pc.createDataChannel('oai-events');
        dc.onerror = () => fail('unavailable');
        dc.onclose = () => fail('unavailable');
        dc.onopen = () => { channelOpen = true; activate(); };
        dc.onmessage = event => {
          if (disposed) return;
          let value: { type?: string; transcript?: string; item_id?: string };
          try { value = JSON.parse(String(event.data)); } catch { return; }
          if (value.type === 'error' || value.type === 'conversation.item.input_audio_transcription.failed') { fail('unavailable'); return; }
          if (value.type === 'input_audio_buffer.speech_started' && !mutedRef.current) callbacks.current.onSpeechStart();
          if (value.type === 'conversation.item.input_audio_transcription.completed' && value.transcript?.trim()) {
            if (value.item_id && seenItems.has(value.item_id)) return;
            if (value.item_id) {
              if (seenItems.size >= 500) seenItems.delete(seenItems.values().next().value!);
              seenItems.add(value.item_id);
            }
            callbacks.current.onTranscript(value.transcript.trim());
          }
        };

        const offer = await pc.createOffer();
        if (disposed) return;
        await pc.setLocalDescription(offer);
        const sdp = pc.localDescription?.sdp ?? offer.sdp;
        if (!sdp) throw new Error('Realtime SDP offer is empty');

        // Current Realtime WebRTC API expects a JSON call payload with the SDP field.
        const answer = await fetch('https://api.openai.com/v1/realtime/calls', {
          method: 'POST',
          body: JSON.stringify({ sdp }),
          signal: abort.signal,
          headers: {
            Authorization: `Bearer ${session.clientSecret}`,
            'Content-Type': 'application/json',
            Accept: 'application/sdp',
          },
        });
        if (!answer.ok) throw new Error(`Realtime call failed: ${answer.status}`);
        const remoteSdp = await answer.text();
        if (disposed) return;
        await pc.setRemoteDescription({ type: 'answer', sdp: remoteSdp });

        // Ask for the microphone only after the Realtime transport is known to work.
        media = await acquireSharedMicrophone();
        if (disposed) { parkSharedMicrophone(); return; }
        const audioTrack = media.getAudioTracks()[0];
        if (!audioTrack) throw new Error('Microphone track is unavailable');
        audioTrack.enabled = !mutedRef.current;
        await transceiver.sender.replaceTrack(audioTrack);
        streamRef.current = media;

        context = new AudioContext();
        const analyser = context.createAnalyser();
        analyser.fftSize = 512;
        context.createMediaStreamSource(media).connect(analyser);
        const samples = new Uint8Array(analyser.fftSize);
        meterTimer = window.setInterval(() => {
          if (disposed) return;
          analyser.getByteTimeDomainData(samples);
          const rms = Math.sqrt(samples.reduce((sum, value) => sum + ((value - 128) / 128) ** 2, 0) / samples.length);
          setLevel(mutedRef.current ? 0 : Math.min(1, Math.max(0, (rms - .01) * 9)));
        }, 70);
        microphoneReady = true;
        activate();
      } catch (error) {
        fail(isMicrophoneDenied(error) ? 'denied' : 'unavailable');
      }
    })();

    return dispose;
  }, [active, close, attempt]);

  const setMuted = useCallback((muted: boolean) => {
    mutedRef.current = muted;
    streamRef.current?.getAudioTracks().forEach(track => { track.enabled = !muted; });
  }, []);

  return { status, level, setMuted, close };
};
