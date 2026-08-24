import { reminderApi } from "./api";
import { notifyWorkspaceDataChanged } from "./workspaceEvents";
import type { Reminder } from "../types/workspace";

let cache: Reminder[] = [];
let loadedAt = 0;
let loadedKey = "";
const inFlight = new Map<string, Promise<Reminder[]>>();
const CACHE_TTL_MS = 30_000;
export const clearReminderCache = () => { cache = []; loadedAt = 0; loadedKey = ""; inFlight.clear(); };
export type CreateReminderInput = Omit<Reminder, "id">;
export const getReminders = (): Reminder[] => cache;
export const loadReminders = (query?: Parameters<typeof reminderApi.listReminders>[0]): Promise<Reminder[]> => {
  const key = JSON.stringify(query ?? null);
  if (loadedKey === key && loadedAt > 0 && Date.now() - loadedAt < CACHE_TTL_MS) return Promise.resolve(cache);
  const existing = inFlight.get(key);
  if (existing) return existing;

  const request = reminderApi.listReminders(query).then((next) => {
    cache = next;
    loadedAt = Date.now();
    loadedKey = key;
    notifyWorkspaceDataChanged("reminders");
    return cache;
  }).finally(() => { inFlight.delete(key); });
  inFlight.set(key, request);
  return request;
};
export const createReminder = async (input: CreateReminderInput): Promise<Reminder> => {
  const reminder = await reminderApi.createReminder(input); cache = [reminder, ...cache]; notifyWorkspaceDataChanged("reminders"); return reminder;
};
export const updateReminder = async (id: string | number, patch: Partial<Reminder>): Promise<Reminder> => {
  const reminder = await reminderApi.updateReminder(id, patch); cache = cache.map((item) => item.id === id ? reminder : item); notifyWorkspaceDataChanged("reminders"); return reminder;
};
export const completeReminder = async (id: string | number): Promise<Reminder> => {
  const reminder = await reminderApi.completeReminder(id); cache = cache.map((item) => item.id === id ? reminder : item); notifyWorkspaceDataChanged("reminders"); return reminder;
};
export const deleteReminder = async (id: string | number): Promise<boolean> => {
  await reminderApi.deleteReminder(id); cache = cache.filter((item) => item.id !== id); notifyWorkspaceDataChanged("reminders"); return true;
};
