import { request } from "./apiClient";
import { localDateTimeToIso, meetingFromApi, reminderMinutesFromLabel } from "./helpers";
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
  const start = localDateTimeToIso(date, time);
  const endDate = new Date(start);
  endDate.setMinutes(endDate.getMinutes() + 60);
  return { title: input.title, description: input.description || undefined, participant: input.participant || undefined, startsAt: start, endsAt: endDate.toISOString(), reminderMinutesBefore: reminderMinutesFromLabel(input.reminder) };
};

export const listMeetings = (query?: Record<string, string | number | undefined>) => request<PaginatedResponse<ApiMeeting>>(`/meetings${queryString({ limit: 100, ...query })}`).then((response) => response.items.map(meetingFromApi));
export const getMeeting = (id: string | number) => request<ApiMeeting>(`/meetings/${id}`).then(meetingFromApi);
export const createMeeting = (input: Omit<CalendarEvent, "id" | "type">) => request<ApiMeeting>("/meetings", { method: "POST", body: JSON.stringify(dto(input)) }).then(meetingFromApi);
export const updateMeeting = (id: string | number, patch: Partial<CalendarEvent>) => {
  const body: Record<string, unknown> = {
    title: patch.title,
    description: patch.description,
    participant: patch.participant,
    reminderMinutesBefore: patch.reminder === undefined ? undefined : reminderMinutesFromLabel(patch.reminder),
  };
  if (patch.date && patch.time) {
    const start = localDateTimeToIso(patch.date, patch.time);
    const end = new Date(start);
    end.setMinutes(end.getMinutes() + 60);
    body.startsAt = start;
    body.endsAt = end.toISOString();
  }
  return request<ApiMeeting>(`/meetings/${id}`, { method: "PATCH", body: JSON.stringify(body) }).then(meetingFromApi);
};
export const deleteMeeting = (id: string | number) => request<{ message: string }>(`/meetings/${id}`, { method: "DELETE" });
export const cancelMeeting = (id: string | number) => request<ApiMeeting>(`/meetings/${id}/cancel`, { method: "PATCH" }).then(meetingFromApi);
