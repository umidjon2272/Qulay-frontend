import { getDateKey, getDateLabel } from "../dateUtils";
import type { CalendarEvent, Reminder, Task, TaskPriority } from "../../types/workspace";
import type { ApiMeeting, ApiReminder, ApiTask } from "./types";

export const priorityToApi = (priority?: TaskPriority): "LOW" | "MEDIUM" | "HIGH" | undefined =>
  priority === "Muhim" ? "HIGH" : priority === "Oddiy" ? "LOW" : priority ? "MEDIUM" : undefined;
export const priorityFromApi = (priority: "LOW" | "MEDIUM" | "HIGH"): TaskPriority =>
  priority === "HIGH" ? "Muhim" : priority === "LOW" ? "Oddiy" : ("O‘rta" as TaskPriority);

export const localDateTimeToIso = (date: string, time: string): string => {
  const parsed = new Date(`${date}T${time}:00`);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
};

export const isoToLocalParts = (value: string | null | undefined): { date: string; time: string } => {
  if (!value) return { date: getDateKey(), time: "09:00" };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { date: getDateKey(), time: "09:00" };
  return {
    date: getDateKey(date),
    time: date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }),
  };
};

export const taskFromApi = (item: ApiTask): Task => {
  const parts = isoToLocalParts(item.dueDate);
  return {
    id: item.id,
    title: item.title,
    description: item.description ?? "",
    time: parts.time,
    category: "Ish",
    priority: priorityFromApi(item.priority),
    completed: item.status === "COMPLETED",
    date: item.dueDate ? parts.date : undefined,
  };
};

export const reminderFromApi = (item: ApiReminder): Reminder => {
  const parts = isoToLocalParts(item.remindAt);
  return {
    id: item.id,
    title: item.title,
    description: item.description ?? "",
    date: getDateLabel(parts.date),
    dateKey: parts.date,
    time: parts.time,
    priority: priorityFromApi(item.priority),
    completed: item.status === "COMPLETED",
  };
};

export const meetingFromApi = (item: ApiMeeting): CalendarEvent => {
  const parts = isoToLocalParts(item.startsAt);
  const reminder = item.reminderMinutesBefore > 0 ? `${item.reminderMinutesBefore} daqiqa oldin` : undefined;
  return {
    id: item.id,
    title: item.title,
    date: parts.date,
    time: parts.time,
    type: "meeting",
    participant: item.participant ?? undefined,
    description: item.description ?? undefined,
    reminder,
  };
};

export const reminderMinutesFromLabel = (label?: string): number => {
  const value = label?.match(/\d+/)?.[0];
  return value ? Math.max(0, Number(value)) : 15;
};
