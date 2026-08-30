import { getApiErrorMessage } from "../../../services/api/apiClient";
import { executeAiTool, isToolSuccess } from "../../../services/api/aiToolsApi";
import type { TelegramPeer } from "../../../services/integrationService";
import { parseAIAction } from "../actions/aiActions";
import type { AIAction } from "../actions/actionTypes";
import { logRouter } from "./debugLog";
import { detectTelegramSearch, detectTelegramSend } from "./telegramIntent";
import { detectContactLookup, detectGoogleCalendarLookup, detectGoogleDriveSearch, detectMemoryLookup, isFinanceSummaryIntent } from "./toolIntents";
import { describeTelegramError } from "./telegramError";
import type { TelegramCandidate, TelegramSelection } from "./routerTypes";
import { getLocale } from "../../../i18n/useI18n";

export type RouterReply = {
  text: string;
  action?: AIAction;
  telegramSelection?: TelegramSelection;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isTelegramPeer = (value: unknown): value is TelegramPeer => {
  if (typeof value !== "object" || value === null) return false;
  const peer = value as Partial<TelegramPeer>;
  return (
    typeof peer.peerId === "string" && peer.peerId.trim().length > 0 &&
    (peer.type === "USER" || peer.type === "GROUP" || peer.type === "CHANNEL") &&
    typeof peer.displayName === "string" && peer.displayName.trim().length > 0 &&
    (peer.username === null || peer.username === undefined || typeof peer.username === "string")
  );
};

const normalizeTelegramPeers = (value: unknown): TelegramPeer[] =>
  Array.isArray(value) ? value.filter(isTelegramPeer) : [];

const toCandidate = (peer: TelegramPeer): TelegramCandidate => ({
  peerId: peer.peerId,
  type: peer.type,
  displayName: peer.displayName,
  username: peer.username ?? null,
});

const searchTelegramPeers = async (query: string, limit: number): Promise<TelegramPeer[]> => {
  logRouter("tool_call", { tool: "search_telegram_chats", confirmed: true });
  const result = await executeAiTool<unknown>("search_telegram_chats", { query, limit }, true);
  logRouter("tool_result", { tool: "search_telegram_chats", status: result.status });
  if (!isToolSuccess(result)) throw new Error("Unexpected confirmation_required for search_telegram_chats");
  return normalizeTelegramPeers(result.data);
};

export const buildTelegramSendConfirmation = async (peer: TelegramCandidate, text: string): Promise<RouterReply> => {
  logRouter("tool_call", { tool: "send_telegram_message", confirmed: false });
  const result = await executeAiTool<unknown>(
    "send_telegram_message",
    { peerId: peer.peerId, text },
    false,
  );
  logRouter("tool_result", { tool: "send_telegram_message", status: result.status, confirmationRequired: true });

  // A write preview must never turn into an implicit send. If the backend ever
  // violates the confirmation contract, stop here rather than presenting a
  // misleading confirmation after a possible write.
  if (result.status !== "confirmation_required") {
    throw new Error("Telegram send preview did not require confirmation");
  }

  const previewRecipient = isRecord(result.preview) && isTelegramPeer(result.preview.recipient)
    ? result.preview.recipient
    : null;
  const recipient = previewRecipient ?? peer;
  const confirmationMessage = `${recipient.displayName}ga yuborilsinmi?\n"${text}"`;

  const action: AIAction = {
    type: "sendTelegramMessage",
    payload: {
      peerId: recipient.peerId,
      recipientName: recipient.displayName,
      recipientUsername: recipient.username?.replace(/^@/, '') ?? undefined,
      text,
    },
    label: "Telegram xabari",
    confirmationMessage,
    success: `✅ ${recipient.displayName}ga xabar yuborildi.`,
    error: "Telegram xabarini yuborishda xatolik bo'ldi.",
  };

  return { text: confirmationMessage, action };
};

const handleTelegramSend = async (recipientRaw: string, text: string): Promise<RouterReply> => {
  logRouter("intent_detected", { intent: "telegram_send" });
  try {
    const query = recipientRaw.startsWith("@") ? recipientRaw.slice(1) : recipientRaw;
    const peers = await searchTelegramPeers(query, 5);

    if (peers.length === 0) {
      return { text: `"${recipientRaw}" nomli Telegram kontakti topilmadi. Ismni tekshiring yoki Telegram ulanganligini tasdiqlang.` };
    }

    if (peers.length === 1) {
      return await buildTelegramSendConfirmation(toCandidate(peers[0]), text);
    }

    logRouter("selection_required", { intent: "telegram_send", candidateCount: peers.length });
    return {
      text: `"${recipientRaw}" uchun bir nechta natija topildi. Kimga yuborishni tanlang:`,
      telegramSelection: { mode: "send_recipient", pendingText: text, candidates: peers.map(toCandidate) },
    };
  } catch (error) {
    logRouter("tool_error", { tool: "send_telegram_message" });
    return { text: describeTelegramError(error) };
  }
};

const handleTelegramSearch = async (query: string): Promise<RouterReply> => {
  logRouter("intent_detected", { intent: "telegram_search" });
  try {
    const peers = await searchTelegramPeers(query, 10);
    if (peers.length === 0) return { text: "Telegramda mos kontakt yoki chat topilmadi." };
    return {
      text: peers.length === 1
        ? "Telegramda mos chat topildi."
        : `${peers.length} ta mos Telegram chat topildi.`,
      telegramSelection: { mode: "search_result", candidates: peers.map(toCandidate) },
    };
  } catch (error) {
    logRouter("tool_error", { tool: "search_telegram_chats" });
    return { text: describeTelegramError(error) };
  }
};



type GoogleCalendarEvent = {
  id: string;
  title: string;
  start: string | null;
  end: string | null;
  location: string | null;
};

type GoogleDriveFile = {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string | null;
  webViewLink: string | null;
};

const dayRangeIso = (offsetDays = 0): { from: string; to: string } => {
  const from = new Date();
  from.setDate(from.getDate() + offsetDays);
  from.setHours(0, 0, 0, 0);
  const to = new Date(from);
  to.setDate(to.getDate() + 1);
  return { from: from.toISOString(), to: to.toISOString() };
};

const calendarRangeIso = (range: "today" | "tomorrow" | "week"): { from: string; to: string } => {
  if (range === "tomorrow") return dayRangeIso(1);
  if (range === "week") {
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    const to = new Date(from);
    to.setDate(to.getDate() + 7);
    return { from: from.toISOString(), to: to.toISOString() };
  }
  return dayRangeIso(0);
};

const formatCalendarTime = (value: string | null): string => {
  if (!value) return "Vaqt ko‘rsatilmagan";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(getLocale() === "ru" ? "ru-RU" : "uz-UZ", { hour: "2-digit", minute: "2-digit" }).format(date);
};

const handleGoogleCalendarLookup = async (range: "today" | "tomorrow" | "week"): Promise<RouterReply> => {
  logRouter("intent_detected", { intent: "google_calendar_events", range });
  try {
    const period = calendarRangeIso(range);
    logRouter("tool_call", { tool: "get_google_calendar_events", confirmed: true });
    const result = await executeAiTool<GoogleCalendarEvent[]>("get_google_calendar_events", period, true);
    logRouter("tool_result", { tool: "get_google_calendar_events", status: result.status });
    if (!isToolSuccess(result)) throw new Error("Unexpected confirmation_required for get_google_calendar_events");
    if (result.data.length === 0) {
      const label = range === "tomorrow" ? "Ertaga" : range === "week" ? "Keyingi 7 kunda" : "Bugun";
      return { text: `${label} Google Calendar’da uchrashuv topilmadi.` };
    }
    const lines = result.data.slice(0, 10).map((event) => {
      const location = event.location ? ` · ${event.location}` : "";
      return `• ${formatCalendarTime(event.start)} — ${event.title || "Nomsiz uchrashuv"}${location}`;
    });
    const label = range === "tomorrow" ? "Ertangi" : range === "week" ? "Keyingi 7 kundagi" : "Bugungi";
    return { text: `${label} Google Calendar uchrashuvlari:
${lines.join("\n")}` };
  } catch (error) {
    logRouter("tool_error", { tool: "get_google_calendar_events" });
    return { text: getApiErrorMessage(error, "Google Calendar ma’lumotlarini olishda xatolik yuz berdi.") };
  }
};

const handleGoogleDriveSearch = async (query: string): Promise<RouterReply> => {
  logRouter("intent_detected", { intent: "google_drive_search" });
  try {
    logRouter("tool_call", { tool: "search_google_drive_files", confirmed: true });
    const result = await executeAiTool<{ items: GoogleDriveFile[]; nextPageToken: string | null }>(
      "search_google_drive_files",
      { query, limit: 10 },
      true,
    );
    logRouter("tool_result", { tool: "search_google_drive_files", status: result.status });
    if (!isToolSuccess(result)) throw new Error("Unexpected confirmation_required for search_google_drive_files");
    const items = Array.isArray(result.data.items) ? result.data.items : [];
    if (items.length === 0) return { text: `Google Drive’da “${query}” bo‘yicha fayl topilmadi.` };
    const lines = items.slice(0, 8).map((file) => `• ${file.name || "Nomsiz fayl"}`);
    return { text: `Google Drive’dan topilgan fayllar:
${lines.join("\n")}` };
  } catch (error) {
    logRouter("tool_error", { tool: "search_google_drive_files" });
    return { text: getApiErrorMessage(error, "Google Drive fayllarini qidirishda xatolik yuz berdi.") };
  }
};

const handleFinanceSummary = async (): Promise<RouterReply> => {
  logRouter("intent_detected", { intent: "finance_summary" });
  try {
    logRouter("tool_call", { tool: "get_today_finance", confirmed: true });
    const result = await executeAiTool<{ todayIncome: string; todayExpense: string; todayProfit: string }>(
      "get_today_finance",
      {},
      true,
    );
    logRouter("tool_result", { tool: "get_today_finance", status: result.status });
    if (!isToolSuccess(result)) throw new Error("Unexpected confirmation_required for get_today_finance");
    const { todayIncome, todayExpense, todayProfit } = result.data;
    return { text: `Bugungi moliya:\nDaromad: ${todayIncome}\nXarajat: ${todayExpense}\nSof foyda: ${todayProfit}` };
  } catch (error) {
    logRouter("tool_error", { tool: "get_today_finance" });
    return { text: getApiErrorMessage(error, "Moliya ma'lumotlarini olishda xatolik yuz berdi.") };
  }
};

const handleContactLookup = async (query: string): Promise<RouterReply> => {
  logRouter("intent_detected", { intent: "contact_lookup" });
  try {
    logRouter("tool_call", { tool: "search_contacts", confirmed: true });
    const result = await executeAiTool<Array<{ displayName: string; phone: string | null }>>("search_contacts", { query }, true);
    logRouter("tool_result", { tool: "search_contacts", status: result.status });
    if (!isToolSuccess(result)) throw new Error("Unexpected confirmation_required for search_contacts");
    if (result.data.length === 0) return { text: `"${query}" bo'yicha kontakt topilmadi.` };
    const lines = result.data.map((contact) => `• ${contact.displayName}${contact.phone ? ` — ${contact.phone}` : ""}`);
    return { text: `Topilgan kontaktlar:\n${lines.join("\n")}` };
  } catch (error) {
    logRouter("tool_error", { tool: "search_contacts" });
    return { text: getApiErrorMessage(error, "Kontaktlarni qidirishda xatolik yuz berdi.") };
  }
};

const handleMemoryLookup = async (query: string): Promise<RouterReply> => {
  logRouter("intent_detected", { intent: "memory_lookup" });
  try {
    logRouter("tool_call", { tool: "get_relevant_memories", confirmed: true });
    const result = await executeAiTool<Array<{ key: string; value: string }>>("get_relevant_memories", { query }, true);
    logRouter("tool_result", { tool: "get_relevant_memories", status: result.status });
    if (!isToolSuccess(result)) throw new Error("Unexpected confirmation_required for get_relevant_memories");
    if (result.data.length === 0) return { text: `"${query}" haqida saqlangan ma'lumot topilmadi.` };
    const lines = result.data.slice(0, 5).map((memory) => `• ${memory.key}: ${memory.value}`);
    return { text: `Eslab qolganlarim:\n${lines.join("\n")}` };
  } catch (error) {
    logRouter("tool_error", { tool: "get_relevant_memories" });
    return { text: getApiErrorMessage(error, "Xotiradan ma'lumot olishda xatolik yuz berdi.") };
  }
};

const handleLegacyAction = (action: AIAction): RouterReply => {
  logRouter("intent_detected", { intent: action.type });
  logRouter("confirmation_required", { tool: action.type, requiresConfirmation: true });
  return { text: action.confirmationMessage, action };
};

const buildFallbackReply = (raw: string): string => {
  const lower = raw.toLocaleLowerCase("uz-UZ");

  if (lower.includes("telegram")) {
    return "Telegram: kimni qidirishni yoki kimga nima yozishni ayting. Masalan: “Telegramdan Azizni top” yoki “Azizga 'Salom' deb yoz”.";
  }
  if (lower.includes("drive") || lower.includes("google docs")) {
    return "Google Drive’dan fayl qidirish uchun, masalan: “Drive’dan shartnoma faylini top” deb yozing.";
  }
  if (lower.includes("calendar") || lower.includes("kalendar")) {
    return "Google Calendar uchun, masalan: “Bugungi Google Calendar uchrashuvlarimni ko‘rsat” deb yozing.";
  }
  if (lower.includes("fayl") || lower.includes("hujjat")) {
    return "Fayllar bo‘limida so‘nggi hujjatlaringiz va papkalaringizni ko‘rishingiz mumkin.";
  }
  if (lower.includes("salom") || lower.includes("assalom")) {
    return "Salom! Men Qulay AI — vazifa, eslatma, uchrashuv, moliya va Telegram xabarlarini boshqarishda yordam beraman.";
  }
  if (lower.includes("rahmat")) {
    return "Arzimaydi! Yana biror narsa kerak bo'lsa, shu yerdaman.";
  }

  return "Tushundim. Vazifa, eslatma, uchrashuv, qayd, bugungi reja, moliya yoki Telegram xabari haqida aniqroq yozing.";
};

/**
 * Deterministic intent/router layer standing in for a model-driven router
 * until OpenAI is wired up. Every branch that touches user data goes through
 * the backend AI Tool Registry (`/api/ai/tools/execute`) — nothing here
 * talks to Telegram, contacts, finance or memory directly.
 */
export const routeMessage = async (input: string): Promise<RouterReply> => {
  const trimmed = input.trim();

  const send = detectTelegramSend(trimmed);
  if (send) return handleTelegramSend(send.recipientRaw, send.text);

  const search = detectTelegramSearch(trimmed);
  if (search) return handleTelegramSearch(search.query);

  const googleDrive = detectGoogleDriveSearch(trimmed);
  if (googleDrive) return handleGoogleDriveSearch(googleDrive.query);

  const legacyAction = parseAIAction(trimmed);
  if (legacyAction) return handleLegacyAction(legacyAction);

  const googleCalendar = detectGoogleCalendarLookup(trimmed);
  if (googleCalendar) return handleGoogleCalendarLookup(googleCalendar.range);

  if (isFinanceSummaryIntent(trimmed)) return handleFinanceSummary();

  const contact = detectContactLookup(trimmed);
  if (contact) return handleContactLookup(contact.query);

  const memory = detectMemoryLookup(trimmed);
  if (memory) return handleMemoryLookup(memory.query);

  logRouter("intent_detected", { intent: "none" });
  return { text: buildFallbackReply(trimmed) };
};
