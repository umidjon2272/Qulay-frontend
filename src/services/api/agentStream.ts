import type { AgentChatResponse, AgentProgress, AgentStreamEvent } from './agentApi';

type WireEvent = AgentStreamEvent | { type: 'complete'; result: AgentChatResponse } | { type: 'error'; message: string };
const progress = new Set<AgentProgress>(['preparing', 'checking_income', 'searching_tasks', 'waiting_confirmation', 'executing']);

const parseEvent = (line: string): WireEvent => {
  let value: unknown;
  try { value = JSON.parse(line); } catch { throw new Error('AI oqimida yaroqsiz NDJSON hodisasi'); }
  if (!value || typeof value !== 'object' || !('type' in value)) throw new Error('AI oqimi hodisasi to‘liq emas');
  const event = value as Record<string, unknown>;
  if (event.type === 'delta' && typeof event.delta === 'string') return event as WireEvent;
  if (event.type === 'status' && typeof event.status === 'string' && progress.has(event.status as AgentProgress)) return event as WireEvent;
  if (event.type === 'complete' && event.result && typeof event.result === 'object') return event as WireEvent;
  if (event.type === 'error' && typeof event.message === 'string') return event as WireEvent;
  throw new Error('AI oqimi hodisasi to‘liq emas');
};

export const consumeAgentStream = async (response: Response, onEvent: (event: AgentStreamEvent) => void, signal?: AbortSignal): Promise<AgentChatResponse> => {
  const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
  if (!contentType.includes('application/x-ndjson')) {
    await response.body?.cancel().catch(() => undefined);
    throw new Error('Server NDJSON o‘rniga boshqa javob qaytardi');
  }
  if (!response.body) throw new Error('Streaming response body is unavailable');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let result: AgentChatResponse | undefined;
  const handleLine = (raw: string) => {
    const line = raw.endsWith('\r') ? raw.slice(0, -1) : raw;
    if (!line.trim()) return;
    const event = parseEvent(line);
    if (event.type === 'complete') {
      if (result) throw new Error('AI oqimida takroriy complete hodisasi');
      result = event.result;
    } else if (event.type === 'error') throw new Error(event.message);
    else onEvent(event);
  };
  const abort = () => { void reader.cancel(signal?.reason).catch(() => undefined); };
  if (signal?.aborted) abort(); else signal?.addEventListener('abort', abort, { once: true });
  try {
    while (true) {
      const chunk = await reader.read();
      buffer += decoder.decode(chunk.value ?? new Uint8Array(), { stream: !chunk.done });
      const lines = buffer.split('\n'); buffer = lines.pop() ?? '';
      for (const line of lines) handleLine(line);
      if (chunk.done) break;
    }
    buffer += decoder.decode();
    if (buffer.trim()) handleLine(buffer);
    if (!result) throw new Error('AI oqimi tugallanmagan');
    return result;
  } finally {
    signal?.removeEventListener('abort', abort);
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
};
