import { getDateKey } from "./dateUtils";
import { todayApi } from "./api";
import type { CalendarEvent, Reminder, Task } from "../types/workspace";

export type TodayPlan = { dateKey: string; tasks: Task[]; reminders: Reminder[]; meetings: CalendarEvent[] };
export type TodayPlanWithMeta = TodayPlan & { overdue: Task[]; nextMeeting: CalendarEvent | null };

const planCache = new Map<string, { loadedAt: number; value: TodayPlanWithMeta }>();
const inFlight = new Map<string, Promise<TodayPlanWithMeta>>();
const TODAY_CACHE_TTL_MS = 15_000;

export const clearTodayPlanCache = () => {
  planCache.clear();
  inFlight.clear();
};

export const getTodayPlan = (dateKey = getDateKey()): Promise<TodayPlanWithMeta> => {
  const cached = planCache.get(dateKey);
  if (cached && Date.now() - cached.loadedAt < TODAY_CACHE_TTL_MS) return Promise.resolve(cached.value);

  const existing = inFlight.get(dateKey);
  if (existing) return existing;

  const request = todayApi.getToday(dateKey).then((value) => {
    planCache.set(dateKey, { loadedAt: Date.now(), value });
    return value;
  }).finally(() => { inFlight.delete(dateKey); });
  inFlight.set(dateKey, request);
  return request;
};
