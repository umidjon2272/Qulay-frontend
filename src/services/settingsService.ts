import { STORAGE_KEYS } from "../constants/storageKeys";
import { readStorage, writeStorage } from "./storage";
import { notifyWorkspaceDataChanged } from "./workspaceEvents";

export type AppSettings = {
  theme: "light" | "dark" | "system";
  language: string;
  timezone: string;
  dateFormat: string;
  defaultPage: string;
  notifications: {
    aiReplies: boolean;
    newTasks: boolean;
    reminders: boolean;
    meetingReminders: boolean;
    telegram: boolean;
    email: boolean;
    weekly: boolean;
    webPush: boolean;
    sound: boolean;
    soundVolume: number;
    quietHoursEnabled: boolean;
    quietHoursStart: string;
    quietHoursEnd: string;
  };
  replyStyle: string;
  replyLength: string;
  ai: {
    voiceReply: boolean;
    autoSpeak: boolean;
    saveHistory: boolean;
    confirmExternalActions: boolean;
  };
  twoFactor: boolean;
};

export const defaultSettings: AppSettings = {
  theme: "dark",
  language: "O'zbekcha",
  timezone: "Toshkent (GMT+5)",
  dateFormat: "12 Avgust 2026",
  defaultPage: "Bosh sahifa",
  notifications: {
    aiReplies: true,
    newTasks: true,
    reminders: true,
    meetingReminders: true,
    telegram: false,
    email: true,
    weekly: true,
    webPush: false,
    sound: true,
    soundVolume: 0.65,
    quietHoursEnabled: false,
    quietHoursStart: "22:00",
    quietHoursEnd: "08:00",
  },
  replyStyle: "Professional",
  replyLength: "O'rta",
  ai: { voiceReply: true, autoSpeak: false, saveHistory: true, confirmExternalActions: true },
  twoFactor: false,
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isTheme = (value: unknown): value is AppSettings["theme"] =>
  value === "light" || value === "dark" || value === "system";

const normalizeSettings = (value: unknown): AppSettings => {
  const stored = isRecord(value) ? value : {};
  const storedNotifications = isRecord(stored.notifications)
    ? stored.notifications
    : {};
  const storedAi = isRecord(stored.ai) ? stored.ai : {};

  return {
    ...defaultSettings,
    theme: isTheme(stored.theme) ? stored.theme : defaultSettings.theme,
    language: typeof stored.language === "string" ? stored.language : defaultSettings.language,
    timezone: typeof stored.timezone === "string" ? stored.timezone : defaultSettings.timezone,
    dateFormat: typeof stored.dateFormat === "string" ? stored.dateFormat : defaultSettings.dateFormat,
    defaultPage: typeof stored.defaultPage === "string" ? stored.defaultPage : defaultSettings.defaultPage,
    notifications: {
      aiReplies: typeof storedNotifications.aiReplies === "boolean" ? storedNotifications.aiReplies : defaultSettings.notifications.aiReplies,
      newTasks: typeof storedNotifications.newTasks === "boolean" ? storedNotifications.newTasks : defaultSettings.notifications.newTasks,
      reminders: typeof storedNotifications.reminders === "boolean" ? storedNotifications.reminders : defaultSettings.notifications.reminders,
      meetingReminders: typeof storedNotifications.meetingReminders === "boolean" ? storedNotifications.meetingReminders : defaultSettings.notifications.meetingReminders,
      telegram: typeof storedNotifications.telegram === "boolean" ? storedNotifications.telegram : defaultSettings.notifications.telegram,
      email: typeof storedNotifications.email === "boolean" ? storedNotifications.email : defaultSettings.notifications.email,
      weekly: typeof storedNotifications.weekly === "boolean" ? storedNotifications.weekly : defaultSettings.notifications.weekly,
      webPush: typeof storedNotifications.webPush === "boolean" ? storedNotifications.webPush : defaultSettings.notifications.webPush,
      sound: typeof storedNotifications.sound === "boolean" ? storedNotifications.sound : defaultSettings.notifications.sound,
      soundVolume: typeof storedNotifications.soundVolume === 'number' && Number.isFinite(storedNotifications.soundVolume) ? Math.min(1, Math.max(0, storedNotifications.soundVolume)) : defaultSettings.notifications.soundVolume,
      quietHoursEnabled: typeof storedNotifications.quietHoursEnabled === "boolean" ? storedNotifications.quietHoursEnabled : defaultSettings.notifications.quietHoursEnabled,
      quietHoursStart: typeof storedNotifications.quietHoursStart === "string" ? storedNotifications.quietHoursStart : defaultSettings.notifications.quietHoursStart,
      quietHoursEnd: typeof storedNotifications.quietHoursEnd === "string" ? storedNotifications.quietHoursEnd : defaultSettings.notifications.quietHoursEnd,
    },
    replyStyle: typeof stored.replyStyle === "string" ? stored.replyStyle : defaultSettings.replyStyle,
    replyLength: typeof stored.replyLength === "string" ? stored.replyLength : defaultSettings.replyLength,
    ai: {
      voiceReply: typeof storedAi.voiceReply === "boolean" ? storedAi.voiceReply : defaultSettings.ai.voiceReply,
      autoSpeak: typeof storedAi.autoSpeak === "boolean" ? storedAi.autoSpeak : defaultSettings.ai.autoSpeak,
      saveHistory: typeof storedAi.saveHistory === "boolean" ? storedAi.saveHistory : defaultSettings.ai.saveHistory,
      confirmExternalActions: typeof storedAi.confirmExternalActions === "boolean" ? storedAi.confirmExternalActions : defaultSettings.ai.confirmExternalActions,
    },
    twoFactor: typeof stored.twoFactor === "boolean" ? stored.twoFactor : defaultSettings.twoFactor,
  };
};

export const getSettings = (): AppSettings =>
  normalizeSettings(readStorage<unknown>(STORAGE_KEYS.settings, null));

export const updateSettings = (patch: Partial<AppSettings>): AppSettings => {
  const current = getSettings();
  const next = normalizeSettings({
    ...current,
    ...patch,
    notifications: patch.notifications
      ? { ...current.notifications, ...patch.notifications }
      : current.notifications,
    ai: patch.ai ? { ...current.ai, ...patch.ai } : current.ai,
  });

  writeStorage(STORAGE_KEYS.settings, next);
  notifyWorkspaceDataChanged("settings");
  return next;
};
