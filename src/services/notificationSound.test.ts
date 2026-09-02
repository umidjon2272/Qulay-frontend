import { describe, expect, it, beforeEach } from 'vitest';
import { claimNotifications, inQuietHours, notificationEligible } from './notificationSound';
import { defaultSettings, getSettings, updateSettings } from './settingsService';
import type { ApiNotification } from './api/types';

describe('notification sound rules', () => {
  beforeEach(() => localStorage.clear());
  it('silences first load/reload and claims a new ID just once across tabs', () => {
    const initial=claimNotifications({ids:[],lastSoundAt:0},['old'],true,10000);
    expect(initial.shouldPlay).toBe(false);
    const first=claimNotifications(initial.ledger,['old','new'],false,15000);
    expect(first.shouldPlay).toBe(true);
    expect(claimNotifications(first.ledger,['old','new'],false,20000).shouldPlay).toBe(false);
    expect(claimNotifications(first.ledger,['old','new','newer'],true,20000).shouldPlay).toBe(false);
  });
  it('detects replacements even when unread count stays the same, and throttles batches', () => {
    const first=claimNotifications({ids:['a'],lastSoundAt:0},['b'],false,10000);
    expect(first.shouldPlay).toBe(true);
    expect(claimNotifications(first.ledger,['c','d'],false,11000).shouldPlay).toBe(false);
  });
  it('honours overnight quiet hours including the end boundary', () => {
    const prefs={...defaultSettings.notifications,quietHoursEnabled:true};
    expect(inQuietHours(prefs,new Date(2026,8,2,23))).toBe(true);
    expect(inQuietHours(prefs,new Date(2026,8,2,7,59))).toBe(true);
    expect(inQuietHours(prefs,new Date(2026,8,2,8))).toBe(false);
    expect(inQuietHours({...prefs,quietHoursEnabled:false},new Date(2026,8,2,23))).toBe(false);
  });
  it('persists volume and ignores other channels, read notifications and disabled categories', () => {
    updateSettings({notifications:{...defaultSettings.notifications,soundVolume:2}});
    expect(getSettings().notifications.soundVolume).toBe(1);
    updateSettings({notifications:{...defaultSettings.notifications,soundVolume:0}});
    expect(getSettings().notifications.soundVolume).toBe(0);
    const notification={status:'SENT',readAt:null,channel:'IN_APP',type:'AI'} as ApiNotification;
    expect(notificationEligible(notification,defaultSettings.notifications)).toBe(true);
    expect(notificationEligible({...notification,channel:'TELEGRAM'},defaultSettings.notifications)).toBe(false);
    expect(notificationEligible(notification,{...defaultSettings.notifications,aiReplies:false})).toBe(false);
  });
});
