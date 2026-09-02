import { getAudioContext, isVoiceAudioActive, prepareAudioPlayback } from './audioPlayback';
import { getSettings, type AppSettings } from './settingsService';
import type { ApiNotification } from './api/types';

type Preferences = AppSettings['notifications'];
export const inQuietHours = (settings: Preferences, now = new Date()) => {
  if (!settings.quietHoursEnabled) return false;
  const minutes = (text: string) => /^\d{2}:\d{2}$/.test(text) ? Number(text.slice(0, 2)) * 60 + Number(text.slice(3)) : NaN;
  const start = minutes(settings.quietHoursStart), end = minutes(settings.quietHoursEnd);
  const current = now.getHours() * 60 + now.getMinutes();
  if (!Number.isFinite(start + end)) return false;
  if (start === end) return true;
  return start < end ? current >= start && current < end : current >= start || current < end;
};

/** Original two-note glass chime. No Apple recordings or external asset/key needed. */
export const playNotificationChime = async (preview = false): Promise<boolean> => {
  const settings = getSettings().notifications;
  if (!preview && (!settings.sound || inQuietHours(settings) || isVoiceAudioActive())) return false;
  if (settings.soundVolume <= 0) return false;
  if (preview) await prepareAudioPlayback();
  const context = getAudioContext();
  if (context.state !== 'running') return false;
  const start = context.currentTime + 0.01;
  // Soft attack and long exponential release prevent clicks and harsh beeps.
  for (const [offset, frequency, strength] of [[0, 880, .11], [.115, 1318.51, .075]]) {
    const tone = context.createOscillator();
    const envelope = context.createGain();
    tone.type = 'sine';
    tone.frequency.setValueAtTime(frequency, start + offset);
    envelope.gain.setValueAtTime(.0001, start + offset);
    envelope.gain.exponentialRampToValueAtTime(strength * settings.soundVolume, start + offset + .018);
    envelope.gain.exponentialRampToValueAtTime(.0001, start + offset + .65);
    tone.connect(envelope); envelope.connect(context.destination);
    tone.onended = () => { tone.disconnect(); envelope.disconnect(); };
    tone.start(start + offset); tone.stop(start + offset + .68);
  }
  return true;
};

type SoundLedger = { ids: string[]; lastSoundAt: number };
export const claimNotifications = (ledger: SoundLedger, ids: string[], firstLoad: boolean, now: number) => {
  const unseen = ids.some(id => !ledger.ids.includes(id));
  const shouldPlay = !firstLoad && unseen && now - ledger.lastSoundAt >= 3500;
  return { shouldPlay, ledger: { ids: [...new Set([...ledger.ids, ...ids])].slice(-500), lastSoundAt: shouldPlay ? now : ledger.lastSoundAt } };
};

export const notificationEligible = (item: ApiNotification, settings: Preferences) => {
  if (item.readAt || item.status !== 'SENT' || item.channel !== 'IN_APP') return false;
  return ({ TASK: settings.newTasks, REMINDER: settings.reminders, MEETING: settings.meetingReminders, AI: settings.aiReplies, SYSTEM: true })[item.type];
};

// Claim under a browser-wide lock so two tabs cannot play the same notification.
export const announceNotifications = async (userId: string, items: ApiNotification[], firstLoad: boolean, active: () => boolean) => {
  const key = `qulay:notification-sound:${userId}`;
  const claim = async () => {
    if (!active()) return;
    let ledger: SoundLedger = { ids: [], lastSoundAt: 0 };
    try {
      const stored = JSON.parse(localStorage.getItem(key) ?? 'null');
      if (Array.isArray(stored?.ids) && typeof stored.lastSoundAt === 'number') ledger = stored;
    } catch { /* unavailable/corrupt storage: first poll stays silent */ }
    const ids = items.filter(item => notificationEligible(item, getSettings().notifications)).map(item => item.id);
    const claimed = claimNotifications(ledger, ids, firstLoad, Date.now());
    try { localStorage.setItem(key, JSON.stringify(claimed.ledger)); } catch { return; }
    if (claimed.shouldPlay && active()) await playNotificationChime().catch(() => false);
  };
  if (navigator.locks) await navigator.locks.request(key, claim);
  else if (document.hasFocus()) await claim(); // Only one focused tab, safe older-browser fallback.
};
