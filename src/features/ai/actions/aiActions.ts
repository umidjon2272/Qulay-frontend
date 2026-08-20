import { addDays, getDateKey, getDateLabel } from "../../../services/dateUtils";
import type {
  AIAction,
  CreateMeetingPayload,
  CreateNotePayload,
  CreateReminderPayload,
  CreateTaskPayload,
} from "./actionTypes";

const normalizeInput = (input: string) =>
  input
    .toLocaleLowerCase("uz-UZ")
    .replace(/[ʻʼ‘’`]/g, "'")
    .replace(/\s+/g, " ")
    .trim();

const includesAny = (input: string, words: string[]) =>
  words.some((word) => input.includes(word));

const hasCreateIntent = (input: string) =>
  /(?:yarat|qo'sh|qosh|qo'y|qoy|belgila|tashkil qil|rejalashtir|yozib ol|note qil|create|add|schedule|set)/.test(
    input,
  );

const getDateContext = (input: string, now: Date) => {
  const isTomorrow = /\bertaga\b|\btomorrow\b/.test(input);
  const date = isTomorrow ? addDays(now, 1) : now;
  const dateKey = getDateKey(date);

  return {
    dateKey,
    dateLabel: getDateLabel(dateKey, now),
  };
};

const getTime = (input: string): string => {
  const timeWithMinutes = input.match(
    /(?:soat\s*)?([01]?\d|2[0-3])[:.]([0-5]\d)/,
  );

  if (timeWithMinutes) {
    return `${timeWithMinutes[1].padStart(2, "0")}:${timeWithMinutes[2]}`;
  }

  const hourOnly = input.match(
    /(?:\bsoat\s*)?\b([01]?\d|2[0-3])\s*(?:da|de)\b/,
  );

  if (hourOnly) {
    return `${hourOnly[1].padStart(2, "0")}:00`;
  }

  return "09:00";
};

const removeTimeAndDate = (input: string) =>
  input
    .replace(/\b(?:bugun|ertaga|today|tomorrow)\b/g, " ")
    .replace(
      /\b(?:soat\s*)?(?:[01]?\d|2[0-3])(?::[0-5]\d)?\s*(?:da|de)?\b/g,
      " ",
    );

const toTitle = (value: string) => {
  const cleaned = value
    .replace(/\b([a-zA-ZÀ-ÿʻʼ‘’']+?)ni\b/g, "$1")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return "";

  return `${cleaned.charAt(0).toLocaleUpperCase("uz-UZ")}${cleaned.slice(1)}`;
};

const extractSubject = (input: string, words: string[]) => {
  const commandPattern = new RegExp(
    `\\b(?:${[
      ...words,
      "men uchun",
      "iltimos",
      "menga",
      "yarat",
      "yaratish",
      "qo'sh",
      "qosh",
      "qo'y",
      "qoy",
      "belgila",
      "tashkil qil",
      "rejalashtir",
      "yozib ol",
      "note qil",
      "eslat",
      "eslatma",
      "create",
      "add",
      "schedule",
      "set",
    ]
      .sort((a, b) => b.length - a.length)
      .join("|")})\\b`,
    "gi",
  );

  return toTitle(
    removeTimeAndDate(input)
      .replace(commandPattern, " ")
      .replace(/[.,!?;:]/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
};

const createTaskAction = (input: string, now: Date): AIAction => {
  const { dateKey, dateLabel } = getDateContext(input, now);
  const time = getTime(input);
  const extractedTitle = extractSubject(input, ["vazifa", "task", "topshiriq"]);
  const title =
    !extractedTitle || extractedTitle.toLocaleLowerCase() === "yangi"
      ? "Yangi vazifa"
      : extractedTitle;
  const payload: CreateTaskPayload = {
    title,
    description: title,
    date: dateKey,
    dateLabel,
    time,
    priority: "O‘rta",
  };

  return {
    type: "createTask",
    payload,
    label: "Vazifa yaratish",
    confirmationMessage: `“${title}” vazifasini ${dateLabel.toLocaleLowerCase()} ${time} ga qo‘shaymi?`,
    success: `✅ Vazifa “${title}” ${dateLabel.toLocaleLowerCase()} ${time} ga qo‘shildi.`,
    error: "Vazifani yaratishda xatolik bo‘ldi.",
  };
};

const createReminderAction = (input: string, now: Date): AIAction => {
  const { dateKey, dateLabel } = getDateContext(input, now);
  const time = getTime(input);
  const title =
    extractSubject(input, ["eslatma", "reminder", "eslat"]) ||
    "Yangi eslatma";
  const payload: CreateReminderPayload = {
    title,
    description: title,
    date: dateKey,
    dateLabel,
    time,
    priority: "O‘rta",
  };

  return {
    type: "createReminder",
    payload,
    label: "Eslatma qo‘shish",
    confirmationMessage: `“${title}” eslatmasini ${dateLabel.toLocaleLowerCase()} ${time} ga qo‘shaymi?`,
    success: `✅ Eslatma ${dateLabel.toLocaleLowerCase()} ${time} ga qo‘shildi.`,
    error: "Eslatmani yaratishda xatolik bo‘ldi.",
  };
};

const createMeetingAction = (input: string, now: Date): AIAction => {
  const { dateKey, dateLabel } = getDateContext(input, now);
  const time = getTime(input);
  const subject = extractSubject(input, ["uchrashuv", "meeting", "yig'ilish"]);
  const title = subject
    ? subject.toLocaleLowerCase().includes("uchrashuv")
      ? subject
      : subject.toLocaleLowerCase().endsWith(" bilan")
        ? `${subject} uchrashuv`
        : `${subject} bilan uchrashuv`
    : "Yangi uchrashuv";
  const participantMatch = input.match(/\b([\p{L}][\p{L}\s-]{1,30}?)\s+bilan\b/iu)
    ?? input.match(/\b(?:bilan|with)\s+([\p{L}][\p{L}\s-]{1,30}?)(?:\s+uchrashuv|\s+meeting|\s+qo'y|$)/iu);
  const participant = participantMatch?.[1]?.trim();
  const payload: CreateMeetingPayload = {
    title,
    date: dateKey,
    dateLabel,
    time,
    participant,
    description: title,
    reminder: "15 daqiqa oldin",
  };

  return {
    type: "createMeeting",
    payload,
    label: "Uchrashuv yaratish",
    confirmationMessage: `“${title}” uchrashuvini ${dateLabel.toLocaleLowerCase()} ${time} ga qo‘yaymi?`,
    success: `✅ Uchrashuv ${dateLabel.toLocaleLowerCase()} ${time} ga qo‘yildi.`,
    error: "Uchrashuvni yaratishda xatolik bo‘ldi.",
  };
};

const createNoteAction = (input: string): AIAction => {
  const title =
    extractSubject(input, ["note", "qayd", "yozib ol"]) || "Yangi qayd";
  const payload: CreateNotePayload = {
    title,
    content: title,
  };

  return {
    type: "createNote",
    payload,
    label: "Qayd yozish",
    confirmationMessage: `“${title}” ni qayd qilib qo‘yaymi?`,
    success: `✅ “${title}” qayd qilib qo‘yildi.`,
    error: "Qaydni saqlashda xatolik bo‘ldi.",
  };
};

const createTodayPlanAction = (now: Date): AIAction => ({
  type: "getTodayPlan",
  payload: { dateKey: getDateKey(now) },
  label: "Bugungi rejani ko‘rish",
  confirmationMessage: "Bugungi rejangizni tayyorlaymi?",
  success: "✅ Bugungi rejangiz tayyor.",
  error: "Bugungi rejani olishda xatolik bo‘ldi.",
});

export const parseAIAction = (
  input: string,
  now = new Date(),
): AIAction | null => {
  const normalized = normalizeInput(input);

  if (!normalized) return null;

  if (
    includesAny(normalized, ["bugungi reja", "bugun reja", "today plan"]) ||
    (normalized.includes("bugun") &&
      includesAny(normalized, ["rejam", "rejalarim", "planim"]))
  ) {
    return createTodayPlanAction(now);
  }

  if (
    includesAny(normalized, ["eslat", "eslatma", "reminder"]) &&
    (hasCreateIntent(normalized) || normalized.includes("eslat"))
  ) {
    return createReminderAction(normalized, now);
  }

  if (
    includesAny(normalized, ["uchrashuv", "meeting", "yig'ilish"]) &&
    hasCreateIntent(normalized)
  ) {
    return createMeetingAction(normalized, now);
  }

  if (
    includesAny(normalized, ["yozib ol", "note qil", "qayd qil", "note", "qayd"]) &&
    (hasCreateIntent(normalized) || normalized.includes("yozib ol"))
  ) {
    return createNoteAction(normalized);
  }

  if (
    includesAny(normalized, ["vazifa", "task", "topshiriq"]) &&
    hasCreateIntent(normalized)
  ) {
    return createTaskAction(normalized, now);
  }

  return null;
};

export const getSupportedActionExamples = (): string[] => [
  "Ertaga soat 11 da Aziz bilan uchrashuv qo‘y",
  "Bugun soat 18:00 da hujjat yuborishni eslat",
  "Bugungi rejamni ayt",
  "Yangi vazifa yarat: hisobotni yuborish",
  "Loyiha g‘oyasini yozib ol",
];
