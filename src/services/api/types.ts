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
  location: string | null;
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

export type ApiFile = {
  id: string;
  originalName: string;
  label: string | null;
  mimeType: string;
  extension: string | null;
  sizeBytes: number;
  source: "UPLOAD" | "GOOGLE_DRIVE" | "TELEGRAM" | "SYSTEM";
  folderId: string | null;
  status: "ACTIVE" | "PROCESSING" | "FAILED" | "DELETED";
  checksum: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type ApiFolder = {
  id: string;
  userId: string;
  name: string;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { files: number; children: number };
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

export type ApiNotification = {
  id: string;
  type: "TASK" | "REMINDER" | "MEETING" | "SYSTEM" | "AI";
  title: string;
  message: string;
  entityType: string | null;
  entityId: string | null;
  channel: "IN_APP" | "TELEGRAM" | "WEB_PUSH";
  status: "PENDING" | "SENT" | "READ" | "FAILED" | "CANCELLED";
  scheduledAt: string | null;
  sentAt: string | null;
  readAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ApiNotificationPreference = {
  userId: string;
  taskEnabled: boolean;
  reminderEnabled: boolean;
  meetingEnabled: boolean;
  aiEnabled: boolean;
  telegramEnabled: boolean;
  webPushEnabled: boolean;
  defaultMeetingMinutesBefore: number;
};
