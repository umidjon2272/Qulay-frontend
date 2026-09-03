import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('./api/apiClient', () => ({ request: vi.fn() }));
vi.mock('../i18n/useI18n', () => ({ getLocale: () => 'uz' }));
import { request } from './api/apiClient';
import { disableWebPush, enableWebPush, webPushStatus } from './webPush';
const subscription = { endpoint: 'https://fcm.googleapis.com/test', toJSON: () => ({ keys: { p256dh: 'key', auth: 'auth' } }), unsubscribe: vi.fn().mockResolvedValue(true) };
const worker = { pushManager: { getSubscription: vi.fn(), subscribe: vi.fn() } };
describe('Web Push permissions and persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'isSecureContext', { configurable: true, value: true });
    vi.stubGlobal('PushManager', class {});
    vi.stubGlobal('Notification', { permission: 'granted', requestPermission: vi.fn().mockResolvedValue('granted') });
    Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: { getRegistration: vi.fn().mockResolvedValue(worker), ready: Promise.resolve(worker) } });
    worker.pushManager.getSubscription.mockResolvedValue(null);
    worker.pushManager.subscribe.mockResolvedValue(subscription);
    vi.mocked(request).mockResolvedValue({ configured: true, publicKey: btoa('key'), enabled: true });
  });
  it('asks permission only on explicit enable, before registering', async () => {
    await webPushStatus();
    expect(Notification.requestPermission).not.toHaveBeenCalled();
    await enableWebPush();
    expect(Notification.requestPermission).toHaveBeenCalledOnce();
    expect(request).toHaveBeenLastCalledWith('/notifications/push', expect.objectContaining({ method: 'POST' }));
  });
  it('does not claim success when permission is denied', async () => {
    vi.mocked(Notification.requestPermission).mockResolvedValue('denied');
    await expect(enableWebPush()).rejects.toThrow();
    expect(worker.pushManager.subscribe).not.toHaveBeenCalled();
  });
  it('rolls back a newly created subscription if backend save fails', async () => {
    vi.mocked(request).mockResolvedValueOnce({ configured: true, publicKey: btoa('key') }).mockRejectedValueOnce(new Error('offline'));
    await expect(enableWebPush()).rejects.toThrow('offline');
    expect(subscription.unsubscribe).toHaveBeenCalledOnce();
  });
  it('disables this device without changing other device preferences', async () => {
    worker.pushManager.getSubscription.mockResolvedValue(subscription);
    await disableWebPush();
    expect(request).toHaveBeenCalledWith('/notifications/push', { method: 'DELETE', body: JSON.stringify({ endpoint: subscription.endpoint }) });
    expect(subscription.unsubscribe).toHaveBeenCalledOnce();
  });
});
