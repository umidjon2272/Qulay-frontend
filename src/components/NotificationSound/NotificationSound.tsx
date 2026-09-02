import { useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { list } from '../../services/api/notificationApi';
import { announceNotifications } from '../../services/notificationSound';
import { prepareAudioPlayback } from '../../services/audioPlayback';

/** Mounted above layouts: notifications also work in the distraction-free AI page. */
export const NotificationSound = () => {
  const { user, status } = useAuth();
  const userId = user?.id;
  useEffect(() => {
    if (status !== 'authenticated' || !userId) return;
    let active = true, busy = false, firstLoad = true;
    const unlock = () => { void prepareAudioPlayback().catch(() => undefined); };
    const poll = async () => {
      if (!active || busy) return;
      busy = true;
      try {
        const result = await list({ unreadOnly: true, limit: 100 });
        if (!active) return;
        await announceNotifications(userId, result.items, firstLoad, () => active);
        firstLoad = false;
      } catch { /* Transient notification errors do not interrupt chat. */ }
      finally { busy = false; }
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    window.addEventListener('focus', poll);
    const timer = window.setInterval(poll, 30_000);
    void poll();
    return () => {
      active = false; window.clearInterval(timer);
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('focus', poll);
    };
  }, [status, userId]);
  return null;
};
