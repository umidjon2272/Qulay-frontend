import { request } from "./apiClient";
import { localDateTimeToIso, priorityToApi, taskFromApi } from "./helpers";
import type { Task } from "../../types/workspace";
import type { ApiTask, PaginatedResponse } from "./types";

export type TaskQuery = { status?: "TODO" | "IN_PROGRESS" | "COMPLETED"; priority?: "LOW" | "MEDIUM" | "HIGH"; date?: string; search?: string; page?: number; limit?: number };
const queryString = (query: TaskQuery = {}) => {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => { if (value !== undefined && value !== "") params.set(key, String(value)); });
  return params.toString() ? `?${params}` : "";
};

export const listTasks = (query?: TaskQuery) => request<PaginatedResponse<ApiTask>>(`/tasks${queryString({ limit: 100, ...query })}`).then((response) => response.items.map(taskFromApi));
export const getTask = (id: string | number) => request<ApiTask>(`/tasks/${id}`).then(taskFromApi);
export const createTask = (input: Omit<Task, "id">) => request<ApiTask>("/tasks", { method: "POST", body: JSON.stringify({ title: input.title, description: input.description || undefined, priority: priorityToApi(input.priority), status: input.status, dueDate: input.date && input.time ? localDateTimeToIso(input.date, input.time) : undefined }) }).then(taskFromApi);
export const updateTask = (id: string | number, patch: Partial<Task>) => request<ApiTask>(`/tasks/${id}`, { method: "PATCH", body: JSON.stringify({ title: patch.title, description: patch.description, priority: priorityToApi(patch.priority), status: patch.status ?? (patch.completed === undefined ? undefined : patch.completed ? "COMPLETED" : "TODO"), dueDate: patch.date && patch.time ? localDateTimeToIso(patch.date, patch.time) : undefined }) }).then(taskFromApi);
export const deleteTask = (id: string | number) => request<{ message: string }>(`/tasks/${id}`, { method: "DELETE" });
export const completeTask = (id: string | number) => request<ApiTask>(`/tasks/${id}/complete`, { method: "PATCH" }).then(taskFromApi);
export const reopenTask = (id: string | number) => request<ApiTask>(`/tasks/${id}/reopen`, { method: "PATCH" }).then(taskFromApi);
