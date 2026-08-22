import { clearMeetingCache } from "./meetingService";
import { clearNoteCache } from "./noteService";
import { clearReminderCache } from "./reminderService";
import { clearTaskCache } from "./taskService";

export const clearWorkspaceCache = () => {
  clearTaskCache();
  clearReminderCache();
  clearMeetingCache();
  clearNoteCache();
};
