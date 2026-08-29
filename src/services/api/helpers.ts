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

export const tashkentDateTimeToIso = (date: string, time: string): string => `${date}T${time}:00+05:00`;

const tashkentParts = (value: string): { date: string; time: string } | null => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tashkent", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(parsed);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  return { date: `${part("year")}-${part("month")}-${part("day")}`, time: `${part("hour")}:${part("minute")}` };
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
    status: item.status,
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
  const parts = tashkentParts(item.startsAt) ?? isoToLocalParts(item.startsAt);
  const endParts = tashkentParts(item.endsAt) ?? isoToLocalParts(item.endsAt);
  const reminder = item.reminderMinutesBefore > 0 ? `${item.reminderMinutesBefore} daqiqa oldin` : undefined;
  return {
    id: item.id,
    title: item.title,
    date: parts.date,
    time: parts.time,
    endTime: endParts.time,
    type: "meeting",
    participant: item.participant ?? undefined,
    location: item.location ?? undefined,
    description: item.description ?? undefined,
    reminder,
    googleCalendarEventId: item.googleCalendarEventId ?? undefined,
    googleSyncError: item.googleSyncError ?? undefined,
  };
};

export const reminderMinutesFromLabel = (label?: string): number => {
  const value = label?.match(/\d+/)?.[0];
  return value ? Math.max(0, Number(value)) : 15;
};
