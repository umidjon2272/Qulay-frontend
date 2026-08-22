import { createMeeting } from "../../../services/meetingService";
import { createNote } from "../../../services/noteService";
import { createReminder } from "../../../services/reminderService";
import { getTodayPlan } from "../../../services/todayPlanService";
import { createTask } from "../../../services/taskService";
import type { AIAction } from "./actionTypes";

export type AIActionExecutionResult = {
  success: boolean;
  message: string;
  data?: unknown;
};

const formatPlanMessage = async (action: Extract<AIAction, { type: "getTodayPlan" }>) => {
  const plan = await getTodayPlan(action.payload.dateKey);
  const items = [
    ...plan.meetings.map((meeting) => ({ time: meeting.time, text: `• ${meeting.time} — ${meeting.title}` })),
    ...plan.tasks
      .filter((task) => !task.completed)
      .map((task) => ({ time: task.time, text: `• ${task.time} — ${task.title}` })),
    ...plan.reminders
      .filter((reminder) => !reminder.completed)
      .map((reminder) => ({ time: reminder.time, text: `• ${reminder.time} — ${reminder.title}` })),
  ].sort((a, b) => a.time.localeCompare(b.time));

  if (items.length === 0) {
    return "✅ Bugungi rejangiz bo‘sh.";
  }

  return `✅ Bugungi reja (${items.length} ta):\n${items.map((item) => item.text).join("\n")}`;
};

export const executeAIAction = async (
  action: AIAction,
): Promise<AIActionExecutionResult> => {
  try {
    switch (action.type) {
      case "createTask": {
        const task = await createTask({
          title: action.payload.title,
          description: action.payload.description,
          time: action.payload.time,
          category: "AI",
          priority: action.payload.priority,
          completed: false,
          date: action.payload.date,
        });

        return { success: true, message: action.success, data: task };
      }

      case "createReminder": {
        const reminder = await createReminder({
          title: action.payload.title,
          description: action.payload.description,
          date: action.payload.dateLabel,
          dateKey: action.payload.date,
          time: action.payload.time,
          priority: action.payload.priority,
          completed: false,
        });

        return { success: true, message: action.success, data: reminder };
      }

      case "createMeeting": {
        const meeting = await createMeeting({
          title: action.payload.title,
          date: action.payload.date,
          time: action.payload.time,
          location: action.payload.location,
          participant: action.payload.participant,
          description: action.payload.description,
          reminder: action.payload.reminder,
        });

        return { success: true, message: action.success, data: meeting };
      }

      case "createNote": {
        const note = await createNote({
          title: action.payload.title,
          content: action.payload.content,
        });

        return { success: true, message: action.success, data: note };
      }

      case "getTodayPlan":
        return {
          success: true,
          message: await formatPlanMessage(action),
          data: await getTodayPlan(action.payload.dateKey),
        };
    }
  } catch {
    return { success: false, message: action.error };
  }
};
