import { meetingApi } from "./api";
import { notifyWorkspaceDataChanged } from "./workspaceEvents";
import type { CalendarEvent } from "../types/workspace";

let cache: CalendarEvent[] = [];
let loadedAt = 0;
let loadedKey = "";
const inFlight = new Map<string, Promise<CalendarEvent[]>>();
const CACHE_TTL_MS = 30_000;
export const clearMeetingCache = () => { cache = []; loadedAt = 0; loadedKey = ""; inFlight.clear(); };
export type CreateMeetingInput = Omit<CalendarEvent, "id" | "type"> & { type?: CalendarEvent["type"] };
export const getCalendarEvents = (): CalendarEvent[] => cache;
export const loadCalendarEvents = (query?: Parameters<typeof meetingApi.listMeetings>[0]): Promise<CalendarEvent[]> => {
  const key = JSON.stringify(query ?? null);
  if (loadedKey === key && loadedAt > 0 && Date.now() - loadedAt < CACHE_TTL_MS) return Promise.resolve(cache);
  const existing = inFlight.get(key);
  if (existing) return existing;

  const request = meetingApi.listMeetings(query).then((next) => {
    cache = next;
    loadedAt = Date.now();
    loadedKey = key;
    notifyWorkspaceDataChanged("calendarEvents");
    return cache;
  }).finally(() => { inFlight.delete(key); });
  inFlight.set(key, request);
  return request;
};
export const createMeeting = async (input: CreateMeetingInput): Promise<CalendarEvent> => {
  const event = await meetingApi.createMeeting(input); cache = [event, ...cache]; notifyWorkspaceDataChanged("calendarEvents"); return event;
};
export const updateMeeting = async (id: string | number, patch: Partial<CalendarEvent>): Promise<CalendarEvent> => {
  const event = await meetingApi.updateMeeting(id, patch); cache = cache.map((item) => item.id === id ? event : item); notifyWorkspaceDataChanged("calendarEvents"); return event;
};
export const deleteMeeting = async (id: string | number) => {
  const result = await meetingApi.deleteMeeting(id); cache = cache.filter((item) => item.id !== id); notifyWorkspaceDataChanged("calendarEvents"); return result;
};
export const cancelMeeting = async (id: string | number): Promise<CalendarEvent> => {
  const event = await meetingApi.cancelMeeting(id); cache = cache.map((item) => item.id === id ? event : item); notifyWorkspaceDataChanged("calendarEvents"); return event;
};
