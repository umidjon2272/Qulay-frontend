import { meetingApi } from "./api";
import { notifyWorkspaceDataChanged } from "./workspaceEvents";
import { STORAGE_KEYS } from "../constants/storageKeys";
import { clearPersistedList, readPersistedList, writePersistedList } from "./persistentListCache";
import type { CalendarEvent } from "../types/workspace";

const initialPersisted = readPersistedList<CalendarEvent>(STORAGE_KEYS.calendarEvents, "null");
let cache: CalendarEvent[] = initialPersisted?.items ?? [];
let loadedAt = initialPersisted?.savedAt ?? 0;
let loadedKey = initialPersisted ? "null" : "";
const inFlight = new Map<string, Promise<CalendarEvent[]>>();
const CACHE_TTL_MS = 30_000;
export const clearMeetingCache = () => { cache = []; loadedAt = 0; loadedKey = ""; inFlight.clear(); clearPersistedList(STORAGE_KEYS.calendarEvents); };
export type CreateMeetingInput = Omit<CalendarEvent, "id" | "type"> & { type?: CalendarEvent["type"] };
export const getCalendarEvents = (): CalendarEvent[] => cache;
export const loadCalendarEvents = (query?: Parameters<typeof meetingApi.listMeetings>[0]): Promise<CalendarEvent[]> => {
  const key = JSON.stringify(query ?? null);
  if (loadedKey !== key) {
    const persisted = readPersistedList<CalendarEvent>(STORAGE_KEYS.calendarEvents, key);
    cache = persisted?.items ?? [];
    loadedAt = persisted?.savedAt ?? 0;
    loadedKey = key;
  }
  if (loadedAt > 0 && Date.now() - loadedAt < CACHE_TTL_MS) return Promise.resolve(cache);
  const existing = inFlight.get(key);
  if (existing) return cache.length ? Promise.resolve(cache) : existing;

  const request = meetingApi.listMeetings(query).then((next) => {
    if (loadedKey === key) { cache = next; loadedAt = Date.now(); }
    writePersistedList(STORAGE_KEYS.calendarEvents, key, next);
    notifyWorkspaceDataChanged("calendarEvents");
    return next;
  }).finally(() => { inFlight.delete(key); });
  inFlight.set(key, request);
  // Stale-while-revalidate: render cached data immediately while the server
  // refreshes it in the background.
  return cache.length ? Promise.resolve(cache) : request;
};
export const createMeeting = async (input: CreateMeetingInput): Promise<CalendarEvent> => {
  const event = await meetingApi.createMeeting(input); cache = [event, ...cache]; writePersistedList(STORAGE_KEYS.calendarEvents, loadedKey || "null", cache); notifyWorkspaceDataChanged("calendarEvents"); return event;
};
export const updateMeeting = async (id: string | number, patch: Partial<CalendarEvent>): Promise<CalendarEvent> => {
  const event = await meetingApi.updateMeeting(id, patch); cache = cache.map((item) => item.id === id ? event : item); writePersistedList(STORAGE_KEYS.calendarEvents, loadedKey || "null", cache); notifyWorkspaceDataChanged("calendarEvents"); return event;
};
export const deleteMeeting = async (id: string | number) => {
  const result = await meetingApi.deleteMeeting(id); cache = cache.filter((item) => item.id !== id); writePersistedList(STORAGE_KEYS.calendarEvents, loadedKey || "null", cache); notifyWorkspaceDataChanged("calendarEvents"); return result;
};
export const cancelMeeting = async (id: string | number): Promise<CalendarEvent> => {
  const event = await meetingApi.cancelMeeting(id); cache = cache.map((item) => item.id === id ? event : item); writePersistedList(STORAGE_KEYS.calendarEvents, loadedKey || "null", cache); notifyWorkspaceDataChanged("calendarEvents"); return event;
};
