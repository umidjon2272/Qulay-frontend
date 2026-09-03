import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';
const source = readFileSync(resolve(process.cwd(), 'public/sw.js'), 'utf8');
function setup() {
  const listeners = new Map<string, (event: unknown) => void>();
  const receipts = new Map<string, unknown>();
  const cache = { match: async (key: string) => receipts.get(key), put: async (key: string, value: unknown) => { receipts.set(key, value); }, keys: async () => [...receipts.keys()].map(url => ({ url })), delete: async (key: { url: string }) => receipts.delete(key.url) };
  const registration = { getNotifications: vi.fn().mockResolvedValue([]), showNotification: vi.fn().mockResolvedValue(undefined) };
  const clients = { matchAll: vi.fn().mockResolvedValue([]), openWindow: vi.fn().mockResolvedValue(undefined) };
  runInNewContext(source, { URL, Response, caches: { open: async () => cache }, self: { location: { origin: 'https://qulay.test' }, registration, clients, addEventListener: (type: string, handler: (event: unknown) => void) => listeners.set(type, handler) } });
  const trigger = async (type: string, fields: Record<string, unknown>) => {
    let task: Promise<unknown> | undefined;
    listeners.get(type)?.({ ...fields, waitUntil: (value: Promise<unknown>) => { task = value; } });
    await task;
  };
  return { trigger, registration, clients };
}
const payload = { id: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', body: 'Yangi bildirishnoma', url: '/reminders' };
describe('service worker push', () => {
  it('shows a push without a page and suppresses retries even after dismissal', async () => {
    const { trigger, registration } = setup();
    await trigger('push', { data: { json: () => payload } });
    await trigger('push', { data: { json: () => payload } });
    expect(registration.showNotification).toHaveBeenCalledOnce();
  });
  it('rejects cross-origin destinations and malformed payloads', async () => {
    const { trigger, registration } = setup();
    await trigger('push', { data: { json: () => ({ ...payload, url: 'https://evil.test/' }) } });
    await trigger('push', { data: { json: () => ({}) } });
    expect(registration.showNotification).not.toHaveBeenCalled();
  });
  it('opens the correct same-origin section when clicked', async () => {
    const { trigger, clients } = setup();
    const close = vi.fn();
    await trigger('notificationclick', { notification: { close, data: { url: 'https://qulay.test/reminders' } } });
    expect(close).toHaveBeenCalledOnce();
    expect(clients.openWindow).toHaveBeenCalledWith('https://qulay.test/reminders');
  });
});
