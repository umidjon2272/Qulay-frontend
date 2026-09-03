import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { request, requestStream, refreshAccessToken } from './apiClient';
import { saveAuth, getTokens } from './tokenStorage';
import type { User } from './types';

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
  it('surfaces an HTTP error before exposing a stream', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: 'denied', code: 'DENIED' }), { status: 403, headers: { 'content-type': 'application/json' } })));
    await expect(requestStream('/ai/agent/chat/stream', { method: 'POST', body: '{}' })).rejects.toMatchObject({ status: 403, code: 'DENIED' });
  });
  it('does not replay an old account mutation with a new account token', async () => {
    saveAuth({ accessToken: 'a', refreshToken: 'ra' }, { id: 'a' } as User);
    let finish!: (response: Response) => void;
    const network = vi.fn().mockImplementation(() => new Promise<Response>(resolve => { finish = resolve; }));
    vi.stubGlobal('fetch', network);
    const task = request('/agent-settings', { method: 'PATCH', body: '{}' });
    saveAuth({ accessToken: 'b', refreshToken: 'rb' }, { id: 'b' } as User);
    finish(new Response('{}', { status: 401 }));
    await expect(task).rejects.toMatchObject({ name: 'AbortError' });
    expect(network).toHaveBeenCalledOnce();
    expect(getTokens()?.accessToken).toBe('b');
  });
  it('never lets a stale refresh overwrite the current account tokens', async () => {
    saveAuth({ accessToken: 'a', refreshToken: 'ra' }, { id: 'a' } as User);
    let finish!: (response: Response) => void;
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => new Promise<Response>(resolve => { finish = resolve; })));
    const task = refreshAccessToken();
    saveAuth({ accessToken: 'b', refreshToken: 'rb' }, { id: 'b' } as User);
    finish(new Response(JSON.stringify({ accessToken: 'a-new', refreshToken: 'ra-new' })));
    await expect(task).rejects.toMatchObject({ name: 'AbortError' });
    expect(getTokens()).toEqual({ accessToken: 'b', refreshToken: 'rb' });
  });
});
