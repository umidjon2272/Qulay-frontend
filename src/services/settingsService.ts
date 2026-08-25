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
  };
  replyStyle: string;
  replyLength: string;
  ai: {
    voiceReply: boolean;
    autoSpeak: boolean;
    saveHistory: boolean;
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
  },
  replyStyle: "Professional",
  replyLength: "O'rta",
  ai: { voiceReply: true, autoSpeak: false, saveHistory: true },
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
      ...defaultSettings.notifications,
      ...Object.fromEntries(
        Object.entries(defaultSettings.notifications).map(([key, fallback]) => [
          key,
          typeof storedNotifications[key] === "boolean" ? storedNotifications[key] : fallback,
        ]),
      ) as AppSettings["notifications"],
    },
    replyStyle: typeof stored.replyStyle === "string" ? stored.replyStyle : defaultSettings.replyStyle,
    replyLength: typeof stored.replyLength === "string" ? stored.replyLength : defaultSettings.replyLength,
    ai: {
      ...defaultSettings.ai,
      ...Object.fromEntries(
        Object.entries(defaultSettings.ai).map(([key, fallback]) => [
          key,
          typeof storedAi[key] === "boolean" ? storedAi[key] : fallback,
        ]),
      ) as AppSettings["ai"],
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
