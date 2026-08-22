export type User = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  role: "USER" | "ADMIN";
  status: "ACTIVE" | "BLOCKED";
  timezone: string;
  language: string;
  createdAt: string;
  updatedAt: string;
};

export type AuthResponse = {
  user: User;
  accessToken: string;
  refreshToken: string;
};

export type ApiTask = {
  id: string;
  title: string;
  description: string | null;
  status: "TODO" | "IN_PROGRESS" | "COMPLETED";
  priority: "LOW" | "MEDIUM" | "HIGH";
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ApiReminder = {
  id: string;
  title: string;
  description: string | null;
  remindAt: string;
  status: "ACTIVE" | "COMPLETED" | "CANCELLED";
  priority: "LOW" | "MEDIUM" | "HIGH";
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ApiMeeting = {
  id: string;
  title: string;
  description: string | null;
  participant: string | null;
  startsAt: string;
  endsAt: string;
  reminderMinutesBefore: number;
  status: "SCHEDULED" | "COMPLETED" | "CANCELLED";
  createdAt: string;
  updatedAt: string;
};

export type ApiNote = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type PaginatedResponse<T> = {
  items: T[];
  meta: PaginationMeta;
};

export type ApiToday = {
  date: string;
  timezone: string;
  tasks: ApiTask[];
  reminders: ApiReminder[];
  meetings: ApiMeeting[];
  overdueTasks: ApiTask[];
  nextMeeting: ApiMeeting | null;
};
