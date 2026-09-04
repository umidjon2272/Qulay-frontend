import { reminderApi } from "./api";
import { notifyWorkspaceDataChanged } from "./workspaceEvents";
import { STORAGE_KEYS } from "../constants/storageKeys";
import { clearPersistedList, readPersistedList, writePersistedList } from "./persistentListCache";
import type { Reminder } from "../types/workspace";

const initialPersisted = readPersistedList<Reminder>(STORAGE_KEYS.reminders, "null");
let cache: Reminder[] = initialPersisted?.items ?? [];
let loadedAt = initialPersisted?.savedAt ?? 0;
let loadedKey = initialPersisted ? "null" : "";
const inFlight = new Map<string, Promise<Reminder[]>>();
const CACHE_TTL_MS = 30_000;
export const clearReminderCache = () => { cache = []; loadedAt = 0; loadedKey = ""; inFlight.clear(); clearPersistedList(STORAGE_KEYS.reminders); };
export type CreateReminderInput = Omit<Reminder, "id">;
export const getReminders = (): Reminder[] => cache;
export const loadReminders = (query?: Parameters<typeof reminderApi.listReminders>[0]): Promise<Reminder[]> => {
  const key = JSON.stringify(query ?? null);
  if (loadedKey !== key) {
    const persisted = readPersistedList<Reminder>(STORAGE_KEYS.reminders, key);
    cache = persisted?.items ?? [];
    loadedAt = persisted?.savedAt ?? 0;
    loadedKey = key;
  }
  if (loadedAt > 0 && Date.now() - loadedAt < CACHE_TTL_MS) return Promise.resolve(cache);
  const existing = inFlight.get(key);
  if (existing) return cache.length ? Promise.resolve(cache) : existing;

  const request = reminderApi.listReminders(query).then((next) => {
    if (loadedKey === key) { cache = next; loadedAt = Date.now(); }
    writePersistedList(STORAGE_KEYS.reminders, key, next);
    notifyWorkspaceDataChanged("reminders");
    return next;
  }).finally(() => { inFlight.delete(key); });
  inFlight.set(key, request);
  // Stale-while-revalidate: render cached data immediately while the server
  // refreshes it in the background.
  return cache.length ? Promise.resolve(cache) : request;
};
export const createReminder = async (input: CreateReminderInput): Promise<Reminder> => {
  const reminder = await reminderApi.createReminder(input); cache = [reminder, ...cache]; writePersistedList(STORAGE_KEYS.reminders, loadedKey || "null", cache); notifyWorkspaceDataChanged("reminders"); return reminder;
};
export const updateReminder = async (id: string | number, patch: Partial<Reminder>): Promise<Reminder> => {
  const reminder = await reminderApi.updateReminder(id, patch); cache = cache.map((item) => item.id === id ? reminder : item); writePersistedList(STORAGE_KEYS.reminders, loadedKey || "null", cache); notifyWorkspaceDataChanged("reminders"); return reminder;
};
export const completeReminder = async (id: string | number): Promise<Reminder> => {
  const reminder = await reminderApi.completeReminder(id); cache = cache.map((item) => item.id === id ? reminder : item); writePersistedList(STORAGE_KEYS.reminders, loadedKey || "null", cache); notifyWorkspaceDataChanged("reminders"); return reminder;
};
export const deleteReminder = async (id: string | number): Promise<boolean> => {
  await reminderApi.deleteReminder(id); cache = cache.filter((item) => item.id !== id); writePersistedList(STORAGE_KEYS.reminders, loadedKey || "null", cache); notifyWorkspaceDataChanged("reminders"); return true;
};
