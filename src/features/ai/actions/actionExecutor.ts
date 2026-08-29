import { executeAiTool } from "../../../services/api/aiToolsApi";
import { localDateTimeToIso, meetingFromApi, priorityToApi, reminderFromApi, tashkentDateTimeToIso, taskFromApi } from "../../../services/api/helpers";
import type { ApiMeeting, ApiNote, ApiReminder, ApiTask } from "../../../services/api/types";
import { clearMeetingCache } from "../../../services/meetingService";
import { clearNoteCache } from "../../../services/noteService";
import { clearReminderCache } from "../../../services/reminderService";
import { clearTaskCache } from "../../../services/taskService";
import { notifyWorkspaceDataChanged, type WorkspaceResource } from "../../../services/workspaceEvents";
import { getApiErrorMessage } from "../../../services/api/apiClient";
import { logRouter } from "../router/debugLog";
import { describeTelegramError } from "../router/telegramError";
import type { AIAction } from "./actionTypes";
import { agentApi } from "../../../services/api/agentApi";

export type AIActionExecutionResult = {
  success: boolean;
  message: string;
  data?: unknown;
};

/**
 * Every write goes through the backend AI Tool Registry
 * (`/api/ai/tools/execute`) with `confirmed: true` — the chat UI's own
 * ActionConfirmation card is the user's confirmation, so the tool is asked
 * to execute immediately rather than round-tripping through its own preview.
 */
const runWriteTool = async <TResult>(tool: string, input: Record<string, unknown>): Promise<TResult> => {
  logRouter("tool_call", { tool, confirmed: true });
  const result = await executeAiTool<TResult>(tool, input, true);
  logRouter("tool_result", { tool, status: result.status });
  if (result.status !== "success") throw new Error(`Unexpected confirmation_required for ${tool}`);
  return result.data;
};

const formatPlanMessage = async (action: Extract<AIAction, { type: "getTodayPlan" }>) => {
  logRouter("tool_call", { tool: "get_today_plan", confirmed: true });
  const result = await executeAiTool<{
    tasks: ApiTask[];
    reminders: ApiReminder[];
    meetings: ApiMeeting[];
  }>("get_today_plan", { date: action.payload.dateKey }, true);
  logRouter("tool_result", { tool: "get_today_plan", status: result.status });
  if (result.status !== "success") throw new Error("Unexpected confirmation_required for get_today_plan");

  const plan = result.data;
  const items = [
    ...plan.meetings.map(meetingFromApi).map((meeting) => ({ time: meeting.time, text: `• ${meeting.time} — ${meeting.title}` })),
    ...plan.tasks.map(taskFromApi).filter((task) => !task.completed).map((task) => ({ time: task.time, text: `• ${task.time} — ${task.title}` })),
    ...plan.reminders.map(reminderFromApi).filter((reminder) => !reminder.completed).map((reminder) => ({ time: reminder.time, text: `• ${reminder.time} — ${reminder.title}` })),
  ].sort((a, b) => a.time.localeCompare(b.time));

  if (items.length === 0) return "✅ Bugungi rejangiz bo‘sh.";
  return `✅ Bugungi reja (${items.length} ta):\n${items.map((item) => item.text).join("\n")}`;
};

export const executeAIAction = async (
  action: AIAction,
): Promise<AIActionExecutionResult> => {
  try {
    switch (action.type) {
      case "createTask": {
        const data = await runWriteTool<ApiTask>("create_task", {
          title: action.payload.title,
          description: action.payload.description || undefined,
          dueAt: action.payload.date && action.payload.time ? localDateTimeToIso(action.payload.date, action.payload.time) : undefined,
          priority: priorityToApi(action.payload.priority),
        });
        clearTaskCache();
        notifyWorkspaceDataChanged("tasks");
        return { success: true, message: action.success, data: taskFromApi(data) };
      }

      case "createReminder": {
        const data = await runWriteTool<ApiReminder>("create_reminder", {
          title: action.payload.title,
          remindAt: localDateTimeToIso(action.payload.date, action.payload.time),
          note: action.payload.description || undefined,
        });
        clearReminderCache();
        notifyWorkspaceDataChanged("reminders");
        return { success: true, message: action.success, data: reminderFromApi(data) };
      }

      case "createMeeting": {
        const notes = [action.payload.participant && `Ishtirokchi: ${action.payload.participant}`, action.payload.description]
          .filter(Boolean)
          .join(" · ") || undefined;
        const data = await runWriteTool<ApiMeeting>("create_meeting", {
          title: action.payload.title,
          startAt: tashkentDateTimeToIso(action.payload.date, action.payload.time),
          location: action.payload.location || undefined,
          notes,
        });
        clearMeetingCache();
        notifyWorkspaceDataChanged("calendarEvents");
        return data.googleSyncError
          ? { success: false, message: `Uchrashuv Qulay Calendar’da saqlandi, lekin Google Calendar sync xatosi: ${data.googleSyncError}`, data: meetingFromApi(data) }
          : { success: true, message: action.success, data: meetingFromApi(data) };
      }

      case "createNote": {
        const data = await runWriteTool<ApiNote>("create_note", {
          title: action.payload.title,
          content: action.payload.content,
        });
        clearNoteCache();
        notifyWorkspaceDataChanged("notes");
        return { success: true, message: action.success, data };
      }

      case "sendTelegramMessage": {
        const data = await runWriteTool<{ messageId: string }>("send_telegram_message", {
          peerId: action.payload.peerId,
          text: action.payload.text,
        });
        return { success: true, message: action.success, data };
      }

      case "confirmAgentAction": {
        const result = await agentApi.confirm(action.payload.actionId, true);
        (["tasks", "reminders", "calendarEvents", "notes", "finance", "contacts", "memories"] satisfies WorkspaceResource[]).forEach((scope) => notifyWorkspaceDataChanged(scope));
        return { success: result.status === "success", message: result.message || action.success, data: result.data };
      }

      case "getTodayPlan":
        return { success: true, message: await formatPlanMessage(action) };
    }
  } catch (error) {
    logRouter("tool_error", { tool: action.type });
    const fallback = action.type === "sendTelegramMessage"
      ? describeTelegramError(error)
      : getApiErrorMessage(error, action.error);
    return { success: false, message: fallback };
  }
};
