import { request } from "./apiClient";
import { localDateTimeToIso, priorityToApi, reminderFromApi } from "./helpers";
import type { Reminder } from "../../types/workspace";
import type { ApiReminder, PaginatedResponse } from "./types";

export type ReminderQuery = { active?: boolean; completed?: boolean; date?: string; priority?: "LOW" | "MEDIUM" | "HIGH"; search?: string; page?: number; limit?: number };
const queryString = (query: ReminderQuery = {}) => {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => { if (value !== undefined && value !== "") params.set(key, String(value)); });
  return params.toString() ? `?${params}` : "";
};

export const listReminders = (query?: ReminderQuery) => request<PaginatedResponse<ApiReminder>>(`/reminders${queryString({ limit: 100, ...query })}`).then((response) => response.items.map(reminderFromApi));
export const getReminder = (id: string | number) => request<ApiReminder>(`/reminders/${id}`).then(reminderFromApi);
export const createReminder = (input: Omit<Reminder, "id">) => request<ApiReminder>("/reminders", { method: "POST", body: JSON.stringify({ title: input.title, description: input.description || undefined, remindAt: localDateTimeToIso(input.dateKey ?? input.date, input.time), priority: priorityToApi(input.priority) }) }).then(reminderFromApi);
export const updateReminder = (id: string | number, patch: Partial<Reminder>) => request<ApiReminder>(`/reminders/${id}`, { method: "PATCH", body: JSON.stringify({ title: patch.title, description: patch.description, remindAt: patch.dateKey && patch.time ? localDateTimeToIso(patch.dateKey, patch.time) : undefined, priority: priorityToApi(patch.priority), status: patch.completed === undefined ? undefined : patch.completed ? "COMPLETED" : "ACTIVE" }) }).then(reminderFromApi);
export const deleteReminder = (id: string | number) => request<{ message: string }>(`/reminders/${id}`, { method: "DELETE" });
export const completeReminder = (id: string | number) => request<ApiReminder>(`/reminders/${id}/complete`, { method: "PATCH" }).then(reminderFromApi);
