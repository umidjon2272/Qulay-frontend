import { taskApi } from "./api";
import { notifyWorkspaceDataChanged } from "./workspaceEvents";
import type { Task } from "../types/workspace";

let cache: Task[] = [];
let loadedAt = 0;
let loadedKey = "";
const inFlight = new Map<string, Promise<Task[]>>();
const CACHE_TTL_MS = 30_000;
export const clearTaskCache = () => { cache = []; loadedAt = 0; loadedKey = ""; inFlight.clear(); };
export type CreateTaskInput = Omit<Task, "id">;
export const getTasks = (): Task[] => cache;
export const loadTasks = (query?: Parameters<typeof taskApi.listTasks>[0]): Promise<Task[]> => {
  const key = JSON.stringify(query ?? null);
  if (loadedKey === key && loadedAt > 0 && Date.now() - loadedAt < CACHE_TTL_MS) return Promise.resolve(cache);
  const existing = inFlight.get(key);
  if (existing) return existing;

  const request = taskApi.listTasks(query).then((next) => {
    cache = next;
    loadedAt = Date.now();
    loadedKey = key;
    notifyWorkspaceDataChanged("tasks");
    return cache;
  }).finally(() => { inFlight.delete(key); });
  inFlight.set(key, request);
  return request;
};
export const createTask = async (input: CreateTaskInput): Promise<Task> => {
  const task = await taskApi.createTask(input); cache = [task, ...cache]; notifyWorkspaceDataChanged("tasks"); return task;
};
export const updateTask = async (id: string | number, patch: Partial<Task>): Promise<Task> => {
  const task = await taskApi.updateTask(id, patch); cache = cache.map((item) => item.id === id ? task : item); notifyWorkspaceDataChanged("tasks"); return task;
};
export const completeTask = async (id: string | number): Promise<Task> => {
  const task = await taskApi.completeTask(id); cache = cache.map((item) => item.id === id ? task : item); notifyWorkspaceDataChanged("tasks"); return task;
};
export const reopenTask = async (id: string | number): Promise<Task> => {
  const task = await taskApi.reopenTask(id); cache = cache.map((item) => item.id === id ? task : item); notifyWorkspaceDataChanged("tasks"); return task;
};
export const deleteTask = async (id: string | number): Promise<boolean> => {
  await taskApi.deleteTask(id); cache = cache.filter((item) => item.id !== id); notifyWorkspaceDataChanged("tasks"); return true;
};
