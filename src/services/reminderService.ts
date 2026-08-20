import { STORAGE_KEYS } from "../constants/storageKeys";
import { addDays, createLocalId, getDateKey } from "./dateUtils";
import { readStorage, writeStorage } from "./storage";
import { notifyWorkspaceDataChanged } from "./workspaceEvents";
import type { Reminder } from "../types/workspace";

const today = getDateKey();
const tomorrow = getDateKey(addDays(new Date(), 1));

const initialReminders: Reminder[] = [
  {
    id: 1,
    title: "Mijozga javob yuborish",
    description: "Bugungi muhim xabarlarga javob berishni unutmang.",
    date: "Bugun",
    dateKey: today,
    time: "10:30",
    priority: "Muhim",
    completed: false,
  },
  {
    id: 2,
    title: "Jamoa yig‘ilishi",
    description: "Haftalik loyiha holatini muhokama qilish.",
    date: "Bugun",
    dateKey: today,
    time: "14:00",
    priority: "O‘rta",
    completed: false,
  },
  {
    id: 3,
    title: "Hisobotni tekshirish",
    description: "Oylik natijalarni ko‘rib chiqish.",
    date: "Bugun",
    dateKey: today,
    time: "16:30",
    priority: "Muhim",
    completed: false,
  },
  {
    id: 4,
    title: "Ertangi reja",
    description: "Ertangi kun uchun vazifalarni tayyorlash.",
    date: "Ertaga",
    dateKey: tomorrow,
    time: "18:00",
    priority: "Oddiy",
    completed: true,
  },
];

const isReminder = (value: unknown): value is Reminder => {
  if (typeof value !== "object" || value === null) return false;

  const reminder = value as Partial<Reminder>;

  return (
    typeof reminder.id === "number" &&
    typeof reminder.title === "string" &&
    typeof reminder.description === "string" &&
    typeof reminder.date === "string" &&
    typeof reminder.time === "string" &&
    (reminder.priority === "Muhim" ||
      reminder.priority === "O‘rta" ||
      reminder.priority === "Oddiy") &&
    typeof reminder.completed === "boolean" &&
    (reminder.dateKey === undefined || typeof reminder.dateKey === "string")
  );
};

const isReminderList = (value: unknown): value is Reminder[] =>
  Array.isArray(value) && value.every(isReminder);

export const getReminders = (): Reminder[] =>
  readStorage(STORAGE_KEYS.reminders, initialReminders, isReminderList);

const saveReminders = (reminders: Reminder[]) => {
  if (!writeStorage(STORAGE_KEYS.reminders, reminders)) {
    throw new Error("Reminders could not be saved");
  }

  notifyWorkspaceDataChanged("reminders");
};

export type CreateReminderInput = Omit<Reminder, "id">;

export const createReminder = (input: CreateReminderInput): Reminder => {
  const existing = getReminders();
  const reminder: Reminder = { ...input, id: createLocalId(existing) };
  saveReminders([reminder, ...existing]);
  return reminder;
};

export const updateReminder = (
  id: number,
  patch: Partial<Reminder>,
): Reminder | null => {
  const reminders = getReminders();
  const currentReminder = reminders.find((reminder) => reminder.id === id);

  if (!currentReminder) return null;

  const updatedReminder = { ...currentReminder, ...patch };
  saveReminders(
    reminders.map((reminder) =>
      reminder.id === id ? updatedReminder : reminder,
    ),
  );
  return updatedReminder;
};

export const deleteReminder = (id: number): boolean => {
  const reminders = getReminders();
  const nextReminders = reminders.filter((reminder) => reminder.id !== id);

  if (nextReminders.length === reminders.length) return false;

  saveReminders(nextReminders);
  return true;
};
