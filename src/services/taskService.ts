import { taskApi } from "./api";
import { notifyWorkspaceDataChanged } from "./workspaceEvents";
import type { Task } from "../types/workspace";

let cache: Task[] = [];
export const clearTaskCache = () => { cache = []; };
export type CreateTaskInput = Omit<Task, "id">;
export const getTasks = (): Task[] => cache;
export const loadTasks = async (query?: Parameters<typeof taskApi.listTasks>[0]): Promise<Task[]> => {
  cache = await taskApi.listTasks(query); notifyWorkspaceDataChanged("tasks"); return cache;
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
