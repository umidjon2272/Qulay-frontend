import { getDateKey } from "./dateUtils";
import { todayApi } from "./api";
import type { CalendarEvent, Reminder, Task } from "../types/workspace";
import { STORAGE_KEYS } from "../constants/storageKeys";
import { clearPersistedList, readPersistedList, writePersistedList } from "./persistentListCache";

export type TodayPlan = { dateKey: string; tasks: Task[]; reminders: Reminder[]; meetings: CalendarEvent[] };
export type TodayPlanWithMeta = TodayPlan & { overdue: Task[]; nextMeeting: CalendarEvent | null };

const planCache = new Map<string, { loadedAt: number; value: TodayPlanWithMeta }>();
const inFlight = new Map<string, Promise<TodayPlanWithMeta>>();
const TODAY_CACHE_TTL_MS = 15_000;

export const clearTodayPlanCache = () => {
  planCache.clear();
  inFlight.clear();
  clearPersistedList(STORAGE_KEYS.todayPlan);
};

export const getTodayPlan = (dateKey = getDateKey()): Promise<TodayPlanWithMeta> => {
  let cached = planCache.get(dateKey);
  if (!cached) {
    const persisted = readPersistedList<TodayPlanWithMeta>(STORAGE_KEYS.todayPlan, dateKey);
    if (persisted?.items[0]) {
      cached = { loadedAt: persisted.savedAt, value: persisted.items[0] };
      planCache.set(dateKey, cached);
    }
  }
  if (cached && Date.now() - cached.loadedAt < TODAY_CACHE_TTL_MS) return Promise.resolve(cached.value);

  const existing = inFlight.get(dateKey);
  if (existing) return cached ? Promise.resolve(cached.value) : existing;

  const request = todayApi.getToday(dateKey).then((value) => {
    planCache.set(dateKey, { loadedAt: Date.now(), value });
    writePersistedList(STORAGE_KEYS.todayPlan, dateKey, [value]);
    return value;
  }).finally(() => { inFlight.delete(dateKey); });
  inFlight.set(dateKey, request);
  return cached ? Promise.resolve(cached.value) : request;
};
