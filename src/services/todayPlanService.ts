import { getDateKey } from "./dateUtils";
import { getReminders } from "./reminderService";
import { getTasks } from "./taskService";
import { getCalendarEvents } from "./meetingService";
import type { CalendarEvent, Reminder, Task } from "../types/workspace";

export type TodayPlan = {
  dateKey: string;
  tasks: Task[];
  reminders: Reminder[];
  meetings: CalendarEvent[];
};

export const getTodayPlan = (dateKey = getDateKey()): TodayPlan => ({
  dateKey,
  tasks: getTasks().filter((task) => !task.date || task.date === dateKey),
  reminders: getReminders().filter(
    (reminder) => !reminder.dateKey || reminder.dateKey === dateKey,
  ),
  meetings: getCalendarEvents().filter((event) => event.date === dateKey),
});
