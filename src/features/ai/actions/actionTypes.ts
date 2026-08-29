import type { TaskPriority } from "../../../types/workspace";

export type CreateTaskPayload = {
  title: string;
  description: string;
  date: string;
  dateLabel: string;
  time: string;
  priority: TaskPriority;
};

export type CreateReminderPayload = {
  title: string;
  description: string;
  date: string;
  dateLabel: string;
  time: string;
  priority: TaskPriority;
};

export type CreateMeetingPayload = {
  title: string;
  date: string;
  dateLabel: string;
  time: string;
  location?: string;
  participant?: string;
  description?: string;
  reminder?: string;
};

export type CreateNotePayload = {
  title: string;
  content: string;
};

export type GetTodayPlanPayload = {
  dateKey: string;
};

export type SendTelegramMessagePayload = {
  peerId: string;
  recipientName: string;
  recipientUsername?: string;
  text: string;
};

export type ConfirmAgentActionPayload = {
  actionId: string;
  tool: string;
  preview: unknown;
};

type ActionBase<Type extends string, Payload> = {
  type: Type;
  payload: Payload;
  label: string;
  confirmationMessage: string;
  success: string;
  error: string;
};

export type AIAction =
  | ActionBase<"createTask", CreateTaskPayload>
  | ActionBase<"createReminder", CreateReminderPayload>
  | ActionBase<"createMeeting", CreateMeetingPayload>
  | ActionBase<"createNote", CreateNotePayload>
  | ActionBase<"getTodayPlan", GetTodayPlanPayload>
  | ActionBase<"sendTelegramMessage", SendTelegramMessagePayload>
  | ActionBase<"confirmAgentAction", ConfirmAgentActionPayload>;

export type AIActionType = AIAction["type"];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isPriority = (value: unknown): value is TaskPriority =>
  value === "Muhim" || value === "O‘rta" || value === "Oddiy";

const isString = (value: unknown): value is string => typeof value === "string";

export const isAIAction = (value: unknown): value is AIAction => {
  if (!isRecord(value) || !isRecord(value.payload)) return false;

  const action = value as Partial<AIAction>;
  const payload = value.payload;

  const common =
    isString(value.label) &&
    isString(value.confirmationMessage) &&
    isString(value.success) &&
    isString(value.error);

  if (!common) return false;

  if (action.type === "createTask" || action.type === "createReminder") {
    return (
      isString(payload.title) &&
      isString(payload.description) &&
      isString(payload.date) &&
      isString(payload.dateLabel) &&
      isString(payload.time) &&
      isPriority(payload.priority)
    );
  }

  if (action.type === "createMeeting") {
    return (
      isString(payload.title) &&
      isString(payload.date) &&
      isString(payload.dateLabel) &&
      isString(payload.time) &&
      (payload.location === undefined || isString(payload.location)) &&
      (payload.participant === undefined || isString(payload.participant)) &&
      (payload.description === undefined || isString(payload.description)) &&
      (payload.reminder === undefined || isString(payload.reminder))
    );
  }

  if (action.type === "createNote") {
    return isString(payload.title) && isString(payload.content);
  }

  if (action.type === "sendTelegramMessage") {
    return (
      isString(payload.peerId) &&
      isString(payload.recipientName) &&
      isString(payload.text) &&
      (payload.recipientUsername === undefined || isString(payload.recipientUsername))
    );
  }

  if (action.type === "confirmAgentAction") {
    return isString(payload.actionId) && isString(payload.tool);
  }

  return action.type === "getTodayPlan" && isString(payload.dateKey);
};
