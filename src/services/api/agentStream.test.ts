import { describe, expect, it, vi } from 'vitest';
import { consumeAgentStream } from './agentStream';

const encoder = new TextEncoder();
const response = (chunks: Array<string | Uint8Array>, type = 'application/x-ndjson; charset=utf-8') => new Response(new ReadableStream({
  start(controller) { chunks.forEach(chunk => controller.enqueue(typeof chunk === 'string' ? encoder.encode(chunk) : chunk)); controller.close(); },
}), { headers: { 'content-type': type } });
const complete = JSON.stringify({ type: 'complete', result: { conversationId: 'c1', message: 'Salom', pendingConfirmation: null } });

describe('consumeAgentStream', () => {
  it('handles one JSON event split across network chunks', async () => {
    const seen = vi.fn();
    const result = await consumeAgentStream(response(['{"type":"delta","del', 'ta":"Sa"}\n', complete]), seen);
    expect(seen).toHaveBeenCalledWith({ type: 'delta', delta: 'Sa' });
    expect(result.message).toBe('Salom');
  });

  it('handles multiple events, CRLF, split UTF-8 and no final newline', async () => {
    const bytes = encoder.encode(`{"type":"delta","delta":"o‘zbek"}\r\n{"type":"status","status":"executing"}\n${complete}`);
    const apostrophe = bytes.indexOf(0xe2);
    const seen: unknown[] = [];
    await consumeAgentStream(response([bytes.slice(0, apostrophe + 1), bytes.slice(apostrophe + 1)]), event => seen.push(event));
    expect(seen).toEqual([{ type: 'delta', delta: 'o‘zbek' }, { type: 'status', status: 'executing' }]);
  });

  it.each([
    ['invalid JSON', '{nope}\n'],
    ['incomplete event', '{"type":"delta"}\n'],
    ['missing complete', '{"type":"delta","delta":"x"}\n'],
  ])('rejects %s', async (_label, body) => {
    await expect(consumeAgentStream(response([body]), () => undefined)).rejects.toThrow();
  });

  it('surfaces stream errors and rejects ordinary JSON responses', async () => {
    await expect(consumeAgentStream(response(['{"type":"error","message":"uzildi"}\n']), () => undefined)).rejects.toThrow('uzildi');
    await expect(consumeAgentStream(response(['{}'], 'application/json'), () => undefined)).rejects.toThrow('NDJSON');
  });

  it('cancels the reader when aborted', async () => {
    const cancel = vi.fn();
    const stream = new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(encoder.encode('{"type":"delta","delta":"x"}\n')); }, cancel });
    const controller = new AbortController();
    const pending = consumeAgentStream(new Response(stream, { headers: { 'content-type': 'application/x-ndjson' } }), () => controller.abort(), controller.signal);
    await expect(pending).rejects.toThrow();
    expect(cancel).toHaveBeenCalled();
  });
});
