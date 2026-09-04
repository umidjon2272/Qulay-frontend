import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { voiceApi } from "../../../services/api/voiceApi";
import { stopSharedMicrophone } from "./sharedMicrophone";
import { useRealtimeVoice } from "./useRealtimeVoice";

vi.mock("../../../services/api/voiceApi", () => ({
  voiceApi: { realtimeSession: vi.fn() },
}));

vi.mock("../../../services/api/subscriptionApi", () => ({
  subscriptionApi: { logVoiceUsage: vi.fn().mockResolvedValue({}) },
}));

const session = {
  enabled: true as const,
  clientSecret: "ephemeral",
  model: "test",
  voice: "marin",
};

const track = {
  stop: vi.fn(),
  enabled: true,
  readyState: "live" as MediaStreamTrackState,
  addEventListener: vi.fn(),
};

const media = {
  getTracks: () => [track],
  getAudioTracks: () => [track],
} as unknown as MediaStream;

let peers: Peer[] = [];

class Peer {
  connectionState = "new";
  localDescription: { type?: RTCSdpType; sdp: string } | null = null;
  onconnectionstatechange: (() => void) | null = null;
  channel = {
    onmessage: null as ((event: { data: string }) => void) | null,
    onopen: null as (() => void) | null,
    onerror: null as (() => void) | null,
    onclose: null as (() => void) | null,
  };

  constructor() {
    peers.push(this);
  }

  addTrack = vi.fn();
  createDataChannel = vi.fn(() => this.channel);
  createOffer = vi.fn().mockResolvedValue({ type: "offer", sdp: "offer" });
  setLocalDescription = vi.fn().mockImplementation(async (offer: RTCSessionDescriptionInit) => {
    this.localDescription = { type: offer.type, sdp: offer.sdp ?? "" };
  });
  setRemoteDescription = vi.fn().mockResolvedValue(undefined);
  close = vi.fn();
}

beforeEach(() => {
  stopSharedMicrophone();
  peers = [];
  track.stop.mockClear();
  track.addEventListener.mockClear();
  track.enabled = true;

  vi.mocked(voiceApi.realtimeSession).mockReset().mockResolvedValue(session);

  vi.stubGlobal("RTCPeerConnection", Peer);
  vi.stubGlobal(
    "AudioContext",
    class {
      resume = vi.fn().mockResolvedValue(undefined);
      close = vi.fn().mockResolvedValue(undefined);
      createAnalyser = () => ({
        fftSize: 512,
        getByteTimeDomainData: (array: Uint8Array) => array.fill(128),
      });
      createMediaStreamSource = () => ({ connect: vi.fn() });
    },
  );

  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ ok: true, text: async () => "answer" }),
  );

  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia: vi.fn().mockResolvedValue(media) },
  });
});

afterEach(() => {
  stopSharedMicrophone();
  vi.unstubAllGlobals();
});

describe("voice session lifecycle", () => {
  it("uses the current JSON WebRTC call contract, activates after mic is ready, and deduplicates transcript IDs", async () => {
    const transcript = vi.fn();
    const speech = vi.fn();

    const { result, unmount } = renderHook(() =>
      useRealtimeVoice({ active: true, onTranscript: transcript, onSpeechStart: speech }),
    );

    await waitFor(() => expect(peers[0]?.setRemoteDescription).toHaveBeenCalled());

    expect(fetch).toHaveBeenCalledWith(
      "https://api.openai.com/v1/realtime/calls",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ sdp: "offer" }),
        headers: expect.objectContaining({
          Authorization: "Bearer ephemeral",
          "Content-Type": "application/json",
          Accept: "application/sdp",
        }),
      }),
    );

    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(1);
    expect(peers[0].addTrack).toHaveBeenCalledWith(track, media);
    expect(result.current.status).toBe("connecting");

    act(() => peers[0].channel.onopen?.());
    await waitFor(() => expect(result.current.status).toBe("active"));

    act(() => {
      const event = {
        data: JSON.stringify({
          type: "conversation.item.input_audio_transcription.completed",
          item_id: "one",
          transcript: "Salom",
        }),
      };
      peers[0].channel.onmessage?.(event);
      peers[0].channel.onmessage?.(event);
    });

    expect(transcript).toHaveBeenCalledTimes(1);

    unmount();
    expect(peers[0].close).toHaveBeenCalledTimes(1);
    // The shared microphone stays parked instead of being destroyed, so reopening
    // Voice Mode does not trigger another browser permission prompt.
    expect(track.stop).not.toHaveBeenCalled();
  });

  it("aborts an in-flight session request and parks a concurrently acquired microphone on close", async () => {
    let resolve!: (value: typeof session) => void;
    vi.mocked(voiceApi.realtimeSession).mockReturnValue(
      new Promise((resolver) => {
        resolve = resolver;
      }),
    );

    const { unmount } = renderHook(() =>
      useRealtimeVoice({ active: true, onTranscript: vi.fn(), onSpeechStart: vi.fn() }),
    );

    const signal = vi.mocked(voiceApi.realtimeSession).mock.calls[0][0]!;
    await waitFor(() => expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(1));

    unmount();
    await act(async () => resolve(session));

    expect(signal.aborted).toBe(true);
    expect(track.enabled).toBe(false);
  });

  it("falls back after a Realtime call failure without issuing a second microphone permission request", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => "",
    } as Response);

    const { result } = renderHook(() =>
      useRealtimeVoice({ active: true, onTranscript: vi.fn(), onSpeechStart: vi.fn() }),
    );

    await waitFor(() => expect(result.current.status).toBe("unavailable"), {
      timeout: 2_000,
    });

    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(1);
  });

  it("ignores an old failed handshake after a newer session starts", async () => {
    let reject!: (error: Error) => void;
    vi.mocked(voiceApi.realtimeSession).mockReturnValueOnce(
      new Promise((_resolve, rejecter) => {
        reject = rejecter;
      }),
    );

    const { result, rerender, unmount } = renderHook(
      ({ active }) =>
        useRealtimeVoice({ active, onTranscript: vi.fn(), onSpeechStart: vi.fn() }),
      { initialProps: { active: true } },
    );

    await waitFor(() => expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(1));
    rerender({ active: false });
    rerender({ active: true });

    await waitFor(() => expect(peers[0]?.setRemoteDescription).toHaveBeenCalled());
    act(() => peers[0].channel.onopen?.());
    await waitFor(() => expect(result.current.status).toBe("active"));

    await act(async () => reject(new Error("old cancelled request")));

    expect(result.current.status).toBe("active");
    expect(peers[0].close).not.toHaveBeenCalled();

    act(() => result.current.setMuted(true));
    expect(track.enabled).toBe(false);

    unmount();
  });
});
