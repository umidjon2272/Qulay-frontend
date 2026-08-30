import { request } from './apiClient';

export type BriefingTaskItem = { id: string; title: string; dueDate?: string | null; priority?: string; status?: string };
export type BriefingMeetingItem = { id: string; title: string; startsAt: string };
export type BriefingReminderItem = { id: string; title: string; remindAt: string };
export type BriefingNoteItem = { id: string; title: string; createdAt: string };
export type BriefingFinanceItem = { currency: 'UZS' | 'USD'; totalIncome?: string; totalExpense?: string; netProfit?: string; todayIncome?: string; todayExpense?: string; todayProfit?: string };
export type BriefingPriority = { label: string; detail: string };
export type BriefingIntegrationIssue = { provider: 'google' | 'telegram'; state: string };

export type MorningBriefing = {
  date: string;
  timezone: string;
  overdueTasks: BriefingTaskItem[];
  todayMeetings: BriefingMeetingItem[];
  todayTasks: BriefingTaskItem[];
  todayReminders: BriefingReminderItem[];
  weekFinance: BriefingFinanceItem[];
  priorities: BriefingPriority[];
  integrationIssues: BriefingIntegrationIssue[];
  narrative: string;
};

export type EveningSummary = {
  date: string;
  timezone: string;
  completedTasks: BriefingTaskItem[];
  incompleteTasks: BriefingTaskItem[];
  todayMeetings: BriefingMeetingItem[];
  notesCreatedToday: BriefingNoteItem[];
  todayFinance: BriefingFinanceItem[];
  tomorrowMeetings: BriefingMeetingItem[];
  tomorrowTasks: BriefingTaskItem[];
  narrative: string;
};

export const briefingApi = {
  morning: (date?: string) => request<MorningBriefing>(`/briefing/morning${date ? `?date=${date}` : ''}`),
  evening: (date?: string) => request<EveningSummary>(`/briefing/evening${date ? `?date=${date}` : ''}`),
};
