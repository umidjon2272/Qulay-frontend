import { request } from "./apiClient";
import { meetingFromApi, reminderFromApi, taskFromApi } from "./helpers";
import type { ApiToday } from "./types";
import type { TodayPlan } from "../todayPlanService";

export const getToday = (date?: string): Promise<TodayPlan & { overdue: ReturnType<typeof taskFromApi>[]; nextMeeting: ReturnType<typeof meetingFromApi> | null }> => {
  const query = date ? `?date=${encodeURIComponent(date)}` : "";
  return request<ApiToday>(`/today${query}`).then((data) => ({ dateKey: data.date, tasks: data.tasks.map(taskFromApi), reminders: data.reminders.map(reminderFromApi), meetings: data.meetings.map(meetingFromApi), overdue: data.overdueTasks.map(taskFromApi), nextMeeting: data.nextMeeting ? meetingFromApi(data.nextMeeting) : null }));
};
