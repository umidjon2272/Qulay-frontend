import { request } from './api/apiClient';
import { getLocale } from '../i18n/useI18n';

type PushStatus = { configured: boolean; publicKey: string | null; enabled: boolean; subscriptionHashes: string[] };
const supported = () => window.isSecureContext && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
const error = (uz: string, ru: string) => new Error(getLocale() === 'ru' ? ru : uz);
async function registration() {
  const current = await navigator.serviceWorker.getRegistration();
  if (!current) await navigator.serviceWorker.register('/sw.js');
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([navigator.serviceWorker.ready, new Promise<never>((_, reject) => { timer = setTimeout(() => reject(error('Bildirishnoma xizmati tayyor emas. Sahifani yangilang.', 'Сервис уведомлений не готов. Обновите страницу.')), 8000); })]);
  } finally { clearTimeout(timer); }
}
export async function webPushStatus() {
  if (!supported()) return { available: false, subscribed: false };
  const status = await request<PushStatus>('/notifications/push');
  const worker = await navigator.serviceWorker.getRegistration();
  const subscription = await worker?.pushManager.getSubscription();
  let saved = false;
  if (subscription) {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(subscription.endpoint));
    const hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
    saved = status.subscriptionHashes?.includes(hash) ?? false;
  }
  return { available: status.configured, subscribed: Boolean(status.enabled && saved && Notification.permission === 'granted') };
}
export async function enableWebPush() {
  if (!supported()) throw error('Bu brauzer Web Push’ni qo‘llamaydi. iPhone’da saytni bosh ekranga qo‘shib oching.', 'Браузер не поддерживает Web Push. На iPhone добавьте сайт на главный экран и откройте оттуда.');
  // Must be invoked directly from the user's click, before other awaits on iOS.
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw error('Bildirishnoma ruxsatini brauzer sozlamalarida yoqing.', 'Разрешите уведомления в настройках браузера.');
  const status = await request<PushStatus>('/notifications/push');
  if (!status.configured || !status.publicKey) throw error('Serverda Web Push hali sozlanmagan.', 'Web Push ещё не настроен на сервере.');
  const worker = await registration();
  let existing = await worker.pushManager.getSubscription();
  const publicKey = Uint8Array.from(atob(status.publicKey.replace(/-/g, '+').replace(/_/g, '/')), char => char.charCodeAt(0));
  const oldKey = existing?.options.applicationServerKey;
  if (existing && oldKey && (oldKey.byteLength !== publicKey.byteLength || !new Uint8Array(oldKey).every((byte, index) => byte === publicKey[index]))) {
    await request('/notifications/push', { method: 'DELETE', body: JSON.stringify({ endpoint: existing.endpoint }) });
    await existing.unsubscribe(); existing = null;
  }
  const subscription = existing ?? await worker.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: publicKey });
  try {
    const json = subscription.toJSON();
    await request('/notifications/push', { method: 'POST', body: JSON.stringify({ endpoint: subscription.endpoint, keys: json.keys }) });
  } catch (cause) {
    if (!existing) await subscription.unsubscribe().catch(() => false);
    throw cause;
  }
}
export async function disableWebPush() {
  if (!supported()) return;
  const worker = await navigator.serviceWorker.getRegistration();
  const subscription = await worker?.pushManager.getSubscription();
  if (!subscription) return;
  // Delete this device only; other devices retain their subscription.
  await request('/notifications/push', { method: 'DELETE', body: JSON.stringify({ endpoint: subscription.endpoint }) });
  await subscription.unsubscribe();
}
export async function detachPushOnLogout() {
  if (!supported()) return;
  const worker = await navigator.serviceWorker.getRegistration();
  const subscription = await worker?.pushManager.getSubscription();
  if (!subscription) return;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);
  try { await request('/notifications/push', { method: 'DELETE', body: JSON.stringify({ endpoint: subscription.endpoint }), signal: controller.signal }); }
  finally { clearTimeout(timer); await subscription.unsubscribe(); }
}
