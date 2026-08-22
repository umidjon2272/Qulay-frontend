import { meetingApi } from "./api";
import { notifyWorkspaceDataChanged } from "./workspaceEvents";
import type { CalendarEvent } from "../types/workspace";

let cache: CalendarEvent[] = [];
export const clearMeetingCache = () => { cache = []; };
export type CreateMeetingInput = Omit<CalendarEvent, "id" | "type"> & { type?: CalendarEvent["type"] };
export const getCalendarEvents = (): CalendarEvent[] => cache;
export const loadCalendarEvents = async (query?: Parameters<typeof meetingApi.listMeetings>[0]): Promise<CalendarEvent[]> => {
  cache = await meetingApi.listMeetings(query); notifyWorkspaceDataChanged("calendarEvents"); return cache;
};
export const createMeeting = async (input: CreateMeetingInput): Promise<CalendarEvent> => {
  const event = await meetingApi.createMeeting(input); cache = [event, ...cache]; notifyWorkspaceDataChanged("calendarEvents"); return event;
};
export const updateMeeting = async (id: string | number, patch: Partial<CalendarEvent>): Promise<CalendarEvent> => {
  const event = await meetingApi.updateMeeting(id, patch); cache = cache.map((item) => item.id === id ? event : item); notifyWorkspaceDataChanged("calendarEvents"); return event;
};
export const deleteMeeting = async (id: string | number): Promise<boolean> => {
  await meetingApi.deleteMeeting(id); cache = cache.filter((item) => item.id !== id); notifyWorkspaceDataChanged("calendarEvents"); return true;
};
export const cancelMeeting = async (id: string | number): Promise<CalendarEvent> => {
  const event = await meetingApi.cancelMeeting(id); cache = cache.map((item) => item.id === id ? event : item); notifyWorkspaceDataChanged("calendarEvents"); return event;
};
