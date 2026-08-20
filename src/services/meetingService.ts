import { STORAGE_KEYS } from "../constants/storageKeys";
import { createLocalId, getDateKey } from "./dateUtils";
import { readStorage, writeStorage } from "./storage";
import { notifyWorkspaceDataChanged } from "./workspaceEvents";
import type { CalendarEvent } from "../types/workspace";

const initialCalendarEvents: CalendarEvent[] = [
  {
    id: 1,
    title: "Jamoa yig‘ilishi",
    date: getDateKey(),
    time: "09:30",
    type: "meeting",
    location: "Google Meet",
    participant: "Yechim jamoasi",
    description: "Haftalik loyiha holatini muhokama qilish.",
    reminder: "15 daqiqa oldin",
  },
  {
    id: 2,
    title: "Loyiha ustida ishlash",
    date: getDateKey(),
    time: "11:00",
    type: "work",
  },
  {
    id: 3,
    title: "Mijoz bilan uchrashuv",
    date: getDateKey(),
    time: "14:30",
    type: "meeting",
    location: "Zoom",
    participant: "Mijoz",
  },
  {
    id: 4,
    title: "Sport",
    date: getDateKey(),
    time: "18:00",
    type: "personal",
  },
];

const isCalendarEvent = (value: unknown): value is CalendarEvent => {
  if (typeof value !== "object" || value === null) return false;

  const event = value as Partial<CalendarEvent>;

  return (
    typeof event.id === "number" &&
    typeof event.title === "string" &&
    typeof event.date === "string" &&
    typeof event.time === "string" &&
    (event.type === "meeting" ||
      event.type === "work" ||
      event.type === "personal") &&
    (event.location === undefined || typeof event.location === "string")
    && (event.participant === undefined || typeof event.participant === "string")
    && (event.description === undefined || typeof event.description === "string")
    && (event.reminder === undefined || typeof event.reminder === "string")
  );
};

const isCalendarEventList = (value: unknown): value is CalendarEvent[] =>
  Array.isArray(value) && value.every(isCalendarEvent);

export const getCalendarEvents = (): CalendarEvent[] =>
  readStorage(
    STORAGE_KEYS.calendarEvents,
    initialCalendarEvents,
    isCalendarEventList,
  );

const saveCalendarEvents = (events: CalendarEvent[]) => {
  if (!writeStorage(STORAGE_KEYS.calendarEvents, events)) {
    throw new Error("Calendar events could not be saved");
  }

  notifyWorkspaceDataChanged("calendarEvents");
};

export type CreateMeetingInput = Omit<CalendarEvent, "id" | "type"> & {
  type?: CalendarEvent["type"];
};

export const createMeeting = (input: CreateMeetingInput): CalendarEvent => {
  const event: CalendarEvent = {
    ...input,
    id: createLocalId(getCalendarEvents()),
    type: input.type ?? "meeting",
  };

  saveCalendarEvents([event, ...getCalendarEvents()]);
  return event;
};

export const updateMeeting = (
  id: number,
  patch: Partial<CalendarEvent>,
): CalendarEvent | null => {
  const events = getCalendarEvents();
  const current = events.find((event) => event.id === id);
  if (!current) return null;
  const updated = { ...current, ...patch };
  saveCalendarEvents(events.map((event) => (event.id === id ? updated : event)));
  return updated;
};

export const deleteMeeting = (id: number): boolean => {
  const events = getCalendarEvents();
  const next = events.filter((event) => event.id !== id);
  if (next.length === events.length) return false;
  saveCalendarEvents(next);
  return true;
};
