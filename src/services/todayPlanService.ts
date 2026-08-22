import { getDateKey } from "./dateUtils";
import { todayApi } from "./api";
import type { CalendarEvent, Reminder, Task } from "../types/workspace";

export type TodayPlan = { dateKey: string; tasks: Task[]; reminders: Reminder[]; meetings: CalendarEvent[] };
export type TodayPlanWithMeta = TodayPlan & { overdue: Task[]; nextMeeting: CalendarEvent | null };

export const getTodayPlan = (dateKey = getDateKey()): Promise<TodayPlanWithMeta> => todayApi.getToday(dateKey);
