import { STORAGE_KEYS } from "../constants/storageKeys";
import { readStorage, writeStorage } from "./storage";
import { createLocalId, getDateKey } from "./dateUtils";
import { notifyWorkspaceDataChanged } from "./workspaceEvents";
import type { Task } from "../types/workspace";

const initialTasks: Task[] = [
  {
    id: 1,
    title: "Mijozlar uchun taqdimot tayyorlash",
    description: "Yangi loyiha prezentatsiyasini yakunlash",
    time: "09:30",
    category: "Ish",
    priority: "Muhim",
    completed: false,
    date: getDateKey(),
  },
  {
    id: 2,
    title: "Jamoa yig‘ilishini rejalashtirish",
    description: "Haftalik meeting uchun mavzularni tayyorlash",
    time: "11:00",
    category: "Ish",
    priority: "O‘rta",
    completed: false,
    date: getDateKey(),
  },
  {
    id: 3,
    title: "Email xabarlarni tekshirish",
    description: "Muhim mijozlar xabarlariga javob berish",
    time: "13:00",
    category: "Email",
    priority: "Oddiy",
    completed: true,
    date: getDateKey(),
  },
  {
    id: 4,
    title: "Hisobotni yuborish",
    description: "Oylik natijalar hisobotini yuborish",
    time: "15:30",
    category: "Hisobot",
    priority: "Muhim",
    completed: false,
    date: getDateKey(),
  },
  {
    id: 5,
    title: "Ertangi kun rejasini tuzish",
    description: "Muhim ishlarni oldindan belgilash",
    time: "18:00",
    category: "Reja",
    priority: "O‘rta",
    completed: true,
    date: getDateKey(),
  },
];

const isTask = (value: unknown): value is Task => {
  if (typeof value !== "object" || value === null) return false;

  const task = value as Partial<Task>;

  return (
    typeof task.id === "number" &&
    typeof task.title === "string" &&
    typeof task.description === "string" &&
    typeof task.time === "string" &&
    typeof task.category === "string" &&
    (task.priority === "Muhim" ||
      task.priority === "O‘rta" ||
      task.priority === "Oddiy") &&
    typeof task.completed === "boolean" &&
    (task.date === undefined || typeof task.date === "string")
  );
};

const isTaskList = (value: unknown): value is Task[] =>
  Array.isArray(value) && value.every(isTask);

export const getTasks = (): Task[] =>
  readStorage(STORAGE_KEYS.tasks, initialTasks, isTaskList);

const saveTasks = (tasks: Task[]) => {
  if (!writeStorage(STORAGE_KEYS.tasks, tasks)) {
    throw new Error("Tasks could not be saved");
  }

  notifyWorkspaceDataChanged("tasks");
};

export type CreateTaskInput = Omit<Task, "id">;

export const createTask = (input: CreateTaskInput): Task => {
  const existing = getTasks();
  const task: Task = { ...input, id: createLocalId(existing) };
  saveTasks([task, ...existing]);
  return task;
};

export const updateTask = (id: number, patch: Partial<Task>): Task | null => {
  const tasks = getTasks();
  const currentTask = tasks.find((task) => task.id === id);

  if (!currentTask) return null;

  const updatedTask = { ...currentTask, ...patch };
  saveTasks(tasks.map((task) => (task.id === id ? updatedTask : task)));
  return updatedTask;
};

export const deleteTask = (id: number): boolean => {
  const tasks = getTasks();
  const nextTasks = tasks.filter((task) => task.id !== id);

  if (nextTasks.length === tasks.length) return false;

  saveTasks(nextTasks);
  return true;
};
