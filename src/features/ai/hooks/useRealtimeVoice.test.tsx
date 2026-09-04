import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useRealtimeVoice } from './useRealtimeVoice';
import { voiceApi } from '../../../services/api/voiceApi';

vi.mock('../../../services/api/voiceApi', () => ({ voiceApi: { realtimeSession: vi.fn() } }));
vi.mock('../../../services/api/subscriptionApi', () => ({ subscriptionApi: { logVoiceUsage: vi.fn().mockResolvedValue({}) } }));
const session = { enabled: true as const, clientSecret: 'ephemeral', model: 'test', voice: 'marin' };
const track = { stop: vi.fn(), enabled: true };
const media = { getTracks: () => [track], getAudioTracks: () => [track] };
let peers: Peer[] = [];
class Peer {
  connectionState = 'new';
  localDescription: { sdp: string } | null = null;
  onconnectionstatechange: (() => void) | null = null;
  channel = { onmessage: null as ((e: { data: string }) => void) | null, onopen: null as (() => void) | null, onerror: null as (() => void) | null, onclose: null as (() => void) | null };
  sender = { replaceTrack: vi.fn().mockResolvedValue(undefined) };
  constructor() { peers.push(this); }
  addTransceiver = vi.fn(() => ({ sender: this.sender }));
  createDataChannel = () => this.channel;
  createOffer = vi.fn().mockResolvedValue({ sdp: 'offer' });
  setLocalDescription = vi.fn().mockImplementation(async (offer: { sdp: string }) => { this.localDescription = offer; });
  setRemoteDescription = vi.fn().mockResolvedValue(undefined);
  close = vi.fn();
}
beforeEach(() => {
  peers = []; track.stop.mockClear(); track.enabled = true;
  vi.mocked(voiceApi.realtimeSession).mockReset().mockResolvedValue(session);
  vi.stubGlobal('RTCPeerConnection', Peer);
  vi.stubGlobal('AudioContext', class { close = vi.fn().mockResolvedValue(undefined); createAnalyser = () => ({ fftSize: 512, getByteTimeDomainData: (a: Uint8Array) => a.fill(128) }); createMediaStreamSource = () => ({ connect: vi.fn() }); });
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, text: async () => 'answer' }));
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: vi.fn().mockResolvedValue(media) } });
});
afterEach(() => { vi.unstubAllGlobals(); });

describe('voice session lifecycle', () => {
  it('uses the current JSON WebRTC call contract, activates after mic is ready, and deduplicates transcript IDs', async () => {
    const transcript = vi.fn(); const speech = vi.fn();
    const { result, unmount } = renderHook(() => useRealtimeVoice({ active: true, onTranscript: transcript, onSpeechStart: speech }));
    await waitFor(() => expect(peers[0]?.setRemoteDescription).toHaveBeenCalled());
    expect(fetch).toHaveBeenCalledWith('https://api.openai.com/v1/realtime/calls', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ sdp: 'offer' }),
      headers: expect.objectContaining({ Authorization: 'Bearer ephemeral', 'Content-Type': 'application/json', Accept: 'application/sdp' }),
    }));
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(1);
    expect(peers[0].sender.replaceTrack).toHaveBeenCalledWith(track);
    expect(result.current.status).toBe('connecting');
    act(() => peers[0].channel.onopen?.());
    expect(result.current.status).toBe('active');
    act(() => {
      const event = { data: JSON.stringify({ type: 'conversation.item.input_audio_transcription.completed', item_id: 'one', transcript: 'Salom' }) };
      peers[0].channel.onmessage?.(event); peers[0].channel.onmessage?.(event);
    });
    expect(transcript).toHaveBeenCalledTimes(1);
    unmount(); expect(track.stop).toHaveBeenCalledTimes(1); expect(peers[0].close).toHaveBeenCalledTimes(1);
  });

  it('aborts the handshake on close without requesting the microphone afterwards', async () => {
    let resolve!: (value: typeof session) => void;
    vi.mocked(voiceApi.realtimeSession).mockReturnValue(new Promise(r => { resolve = r; }));
    const { unmount } = renderHook(() => useRealtimeVoice({ active: true, onTranscript: vi.fn(), onSpeechStart: vi.fn() }));
    const signal = vi.mocked(voiceApi.realtimeSession).mock.calls[0][0]!;
    unmount();
    await act(async () => resolve(session));
    expect(signal.aborted).toBe(true); expect(navigator.mediaDevices.getUserMedia).not.toHaveBeenCalled();
  });

  it('falls back without prompting for microphone when the Realtime call handshake fails', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false, status: 500, text: async () => '' } as Response);
    const { result } = renderHook(() => useRealtimeVoice({ active: true, onTranscript: vi.fn(), onSpeechStart: vi.fn() }));
    await waitFor(() => expect(result.current.status).toBe('unavailable'));
    expect(navigator.mediaDevices.getUserMedia).not.toHaveBeenCalled();
  });

  it('ignores an old failed handshake after a newer session starts', async () => {
    let reject!: (error: Error) => void;
    vi.mocked(voiceApi.realtimeSession).mockReturnValueOnce(new Promise((_r, j) => { reject = j; }));
    const { result, rerender, unmount } = renderHook(({ active }) => useRealtimeVoice({ active, onTranscript: vi.fn(), onSpeechStart: vi.fn() }), { initialProps: { active: true } });
    rerender({ active: false }); rerender({ active: true });
    await waitFor(() => expect(peers[0]?.setRemoteDescription).toHaveBeenCalled());
    act(() => peers[0].channel.onopen?.());
    await waitFor(() => expect(result.current.status).toBe('active'));
    await act(async () => reject(new Error('old cancelled request')));
    expect(result.current.status).toBe('active'); expect(peers[0].close).not.toHaveBeenCalled();
    act(() => result.current.setMuted(true)); expect(track.enabled).toBe(false);
    unmount();
  });
});
