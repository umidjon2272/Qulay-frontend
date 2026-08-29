import { request } from "./apiClient";
import { meetingFromApi, reminderMinutesFromLabel, tashkentDateTimeToIso } from "./helpers";
import type { CalendarEvent } from "../../types/workspace";
import type { ApiMeeting, PaginatedResponse } from "./types";

const queryString = (query: Record<string, string | number | undefined> = {}) => {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => { if (value !== undefined && value !== "") params.set(key, String(value)); });
  return params.toString() ? `?${params}` : "";
};
const dto = (input: Omit<CalendarEvent, "id" | "type"> | Partial<CalendarEvent>) => {
  const date = input.date ?? new Date().toISOString().slice(0, 10);
  const time = input.time ?? "09:00";
  const start = tashkentDateTimeToIso(date, time);
  const end = input.endTime ? tashkentDateTimeToIso(date, input.endTime) : undefined;
  const endDate = end ? new Date(end) : new Date(start);
  if (!end) endDate.setMinutes(endDate.getMinutes() + 60);
  if (endDate.getTime() <= new Date(start).getTime()) endDate.setDate(endDate.getDate() + 1);
  return { title: input.title, description: input.description || undefined, participant: input.participant || undefined, location: input.location || undefined, startsAt: start, endsAt: endDate.toISOString(), reminderMinutesBefore: reminderMinutesFromLabel(input.reminder) };
};

export const listMeetings = (query?: Record<string, string | number | undefined>) => request<PaginatedResponse<ApiMeeting>>(`/meetings${queryString({ limit: 100, ...query })}`).then((response) => response.items.map(meetingFromApi));
export const getMeeting = (id: string | number) => request<ApiMeeting>(`/meetings/${id}`).then(meetingFromApi);
export const createMeeting = (input: Omit<CalendarEvent, "id" | "type">) => request<ApiMeeting>("/meetings", { method: "POST", body: JSON.stringify(dto(input)) }).then(meetingFromApi);
export const updateMeeting = (id: string | number, patch: Partial<CalendarEvent>) => {
  const body: Record<string, unknown> = {
    title: patch.title,
    description: patch.description,
    participant: patch.participant,
    location: patch.location,
    reminderMinutesBefore: patch.reminder === undefined ? undefined : reminderMinutesFromLabel(patch.reminder),
  };
  if (patch.date && patch.time) {
    const start = tashkentDateTimeToIso(patch.date, patch.time);
    const endIso = patch.endTime ? tashkentDateTimeToIso(patch.date, patch.endTime) : undefined;
    const end = endIso ? new Date(endIso) : new Date(start);
    if (!endIso) end.setMinutes(end.getMinutes() + 60);
    if (end.getTime() <= new Date(start).getTime()) end.setDate(end.getDate() + 1);
    body.startsAt = start;
    body.endsAt = end.toISOString();
  }
  return request<ApiMeeting>(`/meetings/${id}`, { method: "PATCH", body: JSON.stringify(body) }).then(meetingFromApi);
};
export const deleteMeeting = (id: string | number) => request<{ message: string; googleSync: { synced: boolean; errorCode: string | null } }>(`/meetings/${id}`, { method: "DELETE" });
export const cancelMeeting = (id: string | number) => request<ApiMeeting>(`/meetings/${id}/cancel`, { method: "PATCH" }).then(meetingFromApi);
