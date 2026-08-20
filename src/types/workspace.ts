export type TaskPriority = "Muhim" | "O‘rta" | "Oddiy";

export type Task = {
  id: number;
  title: string;
  description: string;
  time: string;
  category: string;
  priority: TaskPriority;
  completed: boolean;
  date?: string;
};

export type Reminder = {
  id: number;
  title: string;
  description: string;
  date: string;
  time: string;
  priority: TaskPriority;
  completed: boolean;
  dateKey?: string;
};

export type CalendarEvent = {
  id: number;
  title: string;
  date: string;
  time: string;
  type: "meeting" | "work" | "personal";
  location?: string;
  participant?: string;
  description?: string;
  reminder?: string;
};

export type Note = {
  id: number;
  title: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
};

export type WorkspaceFile = {
  id: number;
  name: string;
  type: string;
  mimeType: string;
  size: number;
  addedAt: string;
  dataUrl?: string;
};
