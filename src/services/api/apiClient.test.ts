import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { request } from './apiClient';

describe('voice upload and chat cancellation', () => {
  beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });
  afterEach(() => vi.unstubAllGlobals());
  it('lets the browser supply the multipart boundary for audio', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: async () => '{"text":"salom"}' });
    vi.stubGlobal('fetch', fetchMock);
    const body = new FormData(); body.append('audio', new Blob(['audio'], { type: 'audio/webm' }), 'voice.webm');
    await expect(request('/ai/voice/transcribe', { method: 'POST', body })).resolves.toEqual({ text: 'salom' });
    const options = fetchMock.mock.calls[0][1];
    expect(options.body).toBe(body);
    expect(options.headers.has('Content-Type')).toBe(false);
  });
  it('aborts the network request when the user starts a different chat', async () => {
    let networkSignal: AbortSignal | undefined;
    vi.stubGlobal('fetch', vi.fn((_url, options: RequestInit) => new Promise((_resolve, reject) => {
      networkSignal = options.signal as AbortSignal;
      networkSignal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
    })));
    const controller = new AbortController();
    const result = request('/ai/agent/chat', { method: 'POST', body: '{}', signal: controller.signal });
    controller.abort();
    await expect(result).rejects.toMatchObject({ name: 'AbortError' });
    expect(networkSignal?.aborted).toBe(true);
  });
});
