import { reminderApi } from "./api";
import { notifyWorkspaceDataChanged } from "./workspaceEvents";
import type { Reminder } from "../types/workspace";

let cache: Reminder[] = [];
export const clearReminderCache = () => { cache = []; };
export type CreateReminderInput = Omit<Reminder, "id">;
export const getReminders = (): Reminder[] => cache;
export const loadReminders = async (query?: Parameters<typeof reminderApi.listReminders>[0]): Promise<Reminder[]> => {
  cache = await reminderApi.listReminders(query); notifyWorkspaceDataChanged("reminders"); return cache;
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
