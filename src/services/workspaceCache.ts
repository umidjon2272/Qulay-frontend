import { clearMeetingCache } from "./meetingService";
import { clearNoteCache } from "./noteService";
import { clearReminderCache } from "./reminderService";
import { clearTaskCache } from "./taskService";
import { clearTodayPlanCache } from "./todayPlanService";
import { clearIntegrationState } from "./integrationService";

export const clearWorkspaceCache = () => {
  clearTaskCache();
  clearReminderCache();
  clearMeetingCache();
  clearNoteCache();
  clearTodayPlanCache();
  clearIntegrationState();
};
