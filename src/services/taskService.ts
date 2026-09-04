import { taskApi } from "./api";
import { notifyWorkspaceDataChanged } from "./workspaceEvents";
import { STORAGE_KEYS } from "../constants/storageKeys";
import { clearPersistedList, readPersistedList, writePersistedList } from "./persistentListCache";
import type { Task } from "../types/workspace";

const initialPersisted = readPersistedList<Task>(STORAGE_KEYS.tasks, "null");
let cache: Task[] = initialPersisted?.items ?? [];
let loadedAt = initialPersisted?.savedAt ?? 0;
let loadedKey = initialPersisted ? "null" : "";
const inFlight = new Map<string, Promise<Task[]>>();
const CACHE_TTL_MS = 30_000;
export const clearTaskCache = () => { cache = []; loadedAt = 0; loadedKey = ""; inFlight.clear(); clearPersistedList(STORAGE_KEYS.tasks); };
export type CreateTaskInput = Omit<Task, "id">;
export const getTasks = (): Task[] => cache;
export const loadTasks = (query?: Parameters<typeof taskApi.listTasks>[0]): Promise<Task[]> => {
  const key = JSON.stringify(query ?? null);
  if (loadedKey !== key) {
    const persisted = readPersistedList<Task>(STORAGE_KEYS.tasks, key);
    cache = persisted?.items ?? [];
    loadedAt = persisted?.savedAt ?? 0;
    loadedKey = key;
  }
  if (loadedAt > 0 && Date.now() - loadedAt < CACHE_TTL_MS) return Promise.resolve(cache);
  const existing = inFlight.get(key);
  if (existing) return cache.length ? Promise.resolve(cache) : existing;

  const request = taskApi.listTasks(query).then((next) => {
    if (loadedKey === key) { cache = next; loadedAt = Date.now(); }
    writePersistedList(STORAGE_KEYS.tasks, key, next);
    notifyWorkspaceDataChanged("tasks");
    return next;
  }).finally(() => { inFlight.delete(key); });
  inFlight.set(key, request);
  // Stale-while-revalidate: render cached data immediately while the server
  // refreshes it in the background.
  return cache.length ? Promise.resolve(cache) : request;
};
export const createTask = async (input: CreateTaskInput): Promise<Task> => {
  const task = await taskApi.createTask(input); cache = [task, ...cache]; writePersistedList(STORAGE_KEYS.tasks, loadedKey || "null", cache); notifyWorkspaceDataChanged("tasks"); return task;
};
export const updateTask = async (id: string | number, patch: Partial<Task>): Promise<Task> => {
  const task = await taskApi.updateTask(id, patch); cache = cache.map((item) => item.id === id ? task : item); writePersistedList(STORAGE_KEYS.tasks, loadedKey || "null", cache); notifyWorkspaceDataChanged("tasks"); return task;
};
export const completeTask = async (id: string | number): Promise<Task> => {
  const task = await taskApi.completeTask(id); cache = cache.map((item) => item.id === id ? task : item); writePersistedList(STORAGE_KEYS.tasks, loadedKey || "null", cache); notifyWorkspaceDataChanged("tasks"); return task;
};
export const reopenTask = async (id: string | number): Promise<Task> => {
  const task = await taskApi.reopenTask(id); cache = cache.map((item) => item.id === id ? task : item); writePersistedList(STORAGE_KEYS.tasks, loadedKey || "null", cache); notifyWorkspaceDataChanged("tasks"); return task;
};
export const deleteTask = async (id: string | number): Promise<boolean> => {
  await taskApi.deleteTask(id); cache = cache.filter((item) => item.id !== id); writePersistedList(STORAGE_KEYS.tasks, loadedKey || "null", cache); notifyWorkspaceDataChanged("tasks"); return true;
};
