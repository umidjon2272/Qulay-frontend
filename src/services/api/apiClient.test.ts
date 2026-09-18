import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, request, requestStream, refreshAccessToken } from './apiClient';
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

describe('connector credential errors', () => {
  beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });
  afterEach(() => vi.unstubAllGlobals());

  it('does not refresh or clear the QULAY session for an Instagram Meta token 401', async () => {
    saveAuth({ accessToken: 'qulay-access', refreshToken: 'qulay-refresh' }, { id: 'owner-1' } as User);
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      message: 'Instagram token expired',
      code: 'INSTAGRAM_ACCESS_TOKEN_INVALID',
    }), { status: 401, headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(request('/integrations/instagram/test', { method: 'POST' })).rejects.toMatchObject({
      status: 401,
      code: 'INSTAGRAM_ACCESS_TOKEN_INVALID',
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(getTokens()).toEqual({ accessToken: 'qulay-access', refreshToken: 'qulay-refresh' });
  });
});

describe('admin request storm protection', () => {
  beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });
  afterEach(() => vi.unstubAllGlobals());

  it('coalesces concurrent identical GET requests into one network call', async () => {
    saveAuth({ accessToken: 'access', refreshToken: 'refresh' }, { id: 'admin-1' } as User);
    let finish!: (response: Response) => void;
    const fetchMock = vi.fn().mockImplementation(() => new Promise<Response>(resolve => { finish = resolve; }));
    vi.stubGlobal('fetch', fetchMock);

    const first = request<{ ok: boolean }>('/admin/users?page=1');
    const second = request<{ ok: boolean }>('/admin/users?page=1');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    finish(new Response(JSON.stringify({ ok: true }), { status: 200 }));

    await expect(Promise.all([first, second])).resolves.toEqual([{ ok: true }, { ok: true }]);
  });

  it('honors Retry-After and blocks a local retry storm after a 429', async () => {
    saveAuth({ accessToken: 'access', refreshToken: 'refresh' }, { id: 'admin-2' } as User);
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: 'limited' }), {
      status: 429,
      headers: { 'Retry-After': '7' },
    }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(request('/health/platform?cooldown-case=1')).rejects.toMatchObject({ status: 429, retryAfterSeconds: 7 });
    const retry = request('/health/platform?cooldown-case=1');
    await expect(retry).rejects.toBeInstanceOf(ApiError);
    await expect(retry).rejects.toMatchObject({ status: 429 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
