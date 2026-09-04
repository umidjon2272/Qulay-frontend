import { useCallback, useEffect, useRef, useState } from "react";

import { subscriptionApi } from "../../../services/api/subscriptionApi";
import { voiceApi } from "../../../services/api/voiceApi";
import {
  acquireSharedMicrophone,
  parkSharedMicrophone,
} from "./sharedMicrophone";

type Options = {
  active: boolean;
  onTranscript: (text: string) => void;
  onSpeechStart: () => void;
};

type RealtimeStatus = "connecting" | "active" | "unavailable" | "denied";

const isMicrophoneDenied = (error: unknown) => {
  const name = (error as { name?: string } | null)?.name;
  return name === "NotAllowedError" || name === "SecurityError";
};

/**
 * Realtime is used as the fast VAD/transcription transport. Business actions
 * remain owned by the authenticated Qulay AI server agent.
 */
export const useRealtimeVoice = ({
  active,
  onTranscript,
  onSpeechStart,
}: Options) => {
  const [status, setStatus] = useState<RealtimeStatus>("connecting");
  const [level, setLevel] = useState(0);
  const [attempt, setAttempt] = useState(0);

  const retryCountRef = useRef(0);
  const disposeRef = useRef<(() => void) | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mutedRef = useRef(false);
  const callbacks = useRef({ onTranscript, onSpeechStart });
  callbacks.current = { onTranscript, onSpeechStart };

  const close = useCallback(() => {
    disposeRef.current?.();
  }, []);

  useEffect(() => {
    if (!active) {
      retryCountRef.current = 0;
      close();
      return;
    }

    const abort = new AbortController();
    let disposed = false;
    let pc: RTCPeerConnection | undefined;
    let media: MediaStream | undefined;
    let context: AudioContext | undefined;
    let meterTimer: number | undefined;
    let usageTimer: number | undefined;
    let retryTimer: number | undefined;
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
      retryCountRef.current = 0;
      setStatus("active");

      usageTimer = window.setInterval(() => {
        const elapsed = Math.floor((Date.now() - startedAt) / 1000);
        const seconds = elapsed - billedSeconds;
        if (seconds <= 0) return;
        billedSeconds = elapsed;
        void subscriptionApi.logVoiceUsage(seconds).catch(() => undefined);
      }, 30_000);
    };

    const dispose = () => {
      if (disposed) return;
      disposed = true;
      abort.abort();
      window.clearTimeout(readyTimer);
      window.clearTimeout(retryTimer);
      window.clearInterval(meterTimer);
      window.clearInterval(usageTimer);

      pc?.close();
      if (media) parkSharedMicrophone();
      if (context) void context.close().catch(() => undefined);

      if (streamRef.current === media) streamRef.current = null;
      if (disposeRef.current === dispose) {
        disposeRef.current = null;
        setLevel(0);
      }

      const remainder = startedAt
        ? Math.max(
            0,
            Math.ceil((Date.now() - startedAt) / 1000) - billedSeconds,
          )
        : 0;

      if (remainder) {
        void subscriptionApi.logVoiceUsage(remainder).catch(() => undefined);
      }
    };

    disposeRef.current = dispose;

    const fail = (
      reason: Extract<RealtimeStatus, "unavailable" | "denied"> = "unavailable",
    ) => {
      if (disposed) return;

      // One quick reconnect handles transient SDP/DC failures without making the
      // user reopen Voice Mode. The shared microphone is reused, so this does not
      // trigger a second permission request.
      if (reason === "unavailable" && retryCountRef.current < 1) {
        retryCountRef.current += 1;
        dispose();
        setStatus("connecting");
        retryTimer = window.setTimeout(
          () => setAttempt((value) => value + 1),
          250,
        );
        return;
      }

      setStatus(reason);
      dispose();
    };

    setStatus("connecting");
    readyTimer = window.setTimeout(() => fail("unavailable"), 8_000);

    void (async () => {
      try {
        // Start the API handshake and microphone request together. This removes a
        // serial round-trip on first Voice Mode open. Fallback reuses the same mic.
        const [session, microphone] = await Promise.all([
          voiceApi.realtimeSession(abort.signal),
          acquireSharedMicrophone(),
        ]);

        if (disposed) {
          parkSharedMicrophone();
          return;
        }

        media = microphone;

        if (!session.enabled) {
          fail("unavailable");
          return;
        }

        const audioTrack = media.getAudioTracks()[0];
        if (!audioTrack) throw new Error("Microphone track is unavailable");
        audioTrack.enabled = !mutedRef.current;
        streamRef.current = media;

        pc = new RTCPeerConnection();
        pc.addTrack(audioTrack, media);
        pc.onconnectionstatechange = () => {
          if (
            pc?.connectionState === "failed" ||
            pc?.connectionState === "closed"
          ) {
            fail("unavailable");
          }
        };

        const dc = pc.createDataChannel("oai-events");
        dc.onerror = () => fail("unavailable");
        dc.onclose = () => fail("unavailable");
        dc.onopen = () => {
          channelOpen = true;
          activate();
        };
        dc.onmessage = (event) => {
          if (disposed) return;

          let value: {
            type?: string;
            transcript?: string;
            item_id?: string;
          };

          try {
            value = JSON.parse(String(event.data));
          } catch {
            return;
          }

          if (
            value.type === "error" ||
            value.type === "conversation.item.input_audio_transcription.failed"
          ) {
            fail("unavailable");
            return;
          }

          if (
            value.type === "input_audio_buffer.speech_started" &&
            !mutedRef.current
          ) {
            callbacks.current.onSpeechStart();
          }

          if (
            value.type ===
              "conversation.item.input_audio_transcription.completed" &&
            value.transcript?.trim()
          ) {
            if (value.item_id && seenItems.has(value.item_id)) return;

            if (value.item_id) {
              if (seenItems.size >= 500) {
                const oldest = seenItems.values().next().value;
                if (oldest) seenItems.delete(oldest);
              }
              seenItems.add(value.item_id);
            }

            callbacks.current.onTranscript(value.transcript.trim());
          }
        };

        const offer = await pc.createOffer();
        if (disposed) return;

        await pc.setLocalDescription(offer);
        const sdp = pc.localDescription?.sdp ?? offer.sdp;
        if (!sdp) throw new Error("Realtime SDP offer is empty");

        const answer = await fetch("https://api.openai.com/v1/realtime/calls", {
          method: "POST",
          body: JSON.stringify({ sdp }),
          signal: abort.signal,
          headers: {
            Authorization: `Bearer ${session.clientSecret}`,
            "Content-Type": "application/json",
            Accept: "application/sdp",
          },
        });

        if (!answer.ok) {
          throw new Error(`Realtime call failed: ${answer.status}`);
        }

        const remoteSdp = await answer.text();
        if (disposed) return;
        await pc.setRemoteDescription({ type: "answer", sdp: remoteSdp });

        context = new AudioContext();
        await context.resume().catch(() => undefined);
        const analyser = context.createAnalyser();
        analyser.fftSize = 512;
        context.createMediaStreamSource(media).connect(analyser);

        const samples = new Uint8Array(analyser.fftSize);
        meterTimer = window.setInterval(() => {
          if (disposed) return;
          analyser.getByteTimeDomainData(samples);
          const rms = Math.sqrt(
            samples.reduce(
              (sum, value) => sum + ((value - 128) / 128) ** 2,
              0,
            ) / samples.length,
          );
          setLevel(
            mutedRef.current ? 0 : Math.min(1, Math.max(0, (rms - 0.01) * 9)),
          );
        }, 70);

        microphoneReady = true;
        activate();
      } catch (error) {
        fail(isMicrophoneDenied(error) ? "denied" : "unavailable");
      }
    })();

    return dispose;
  }, [active, attempt, close]);

  const setMuted = useCallback((muted: boolean) => {
    mutedRef.current = muted;
    streamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = !muted;
    });
  }, []);

  return { status, level, setMuted, close };
};
