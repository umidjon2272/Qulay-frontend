import { ApiError, getApiErrorMessage } from "../../../services/api/apiClient";
import { executeAiTool, isToolSuccess } from "../../../services/api/aiToolsApi";
import type { TelegramPeer } from "../../../services/integrationService";
import { parseAIAction } from "../actions/aiActions";
import type { AIAction } from "../actions/actionTypes";
import { logRouter } from "./debugLog";
import { detectTelegramSearch, detectTelegramSend } from "./telegramIntent";
import { detectContactLookup, detectMemoryLookup, isFinanceSummaryIntent } from "./toolIntents";
import type { TelegramCandidate, TelegramSelection } from "./routerTypes";

export type RouterReply = {
  text: string;
  action?: AIAction;
  telegramSelection?: TelegramSelection;
};

const TELEGRAM_NOT_CONNECTED_MESSAGE =
  "Telegram hali ulanmagan. Sozlamalar → Integratsiyalar orqali Telegramni ulang.";
const TELEGRAM_NOT_CONFIGURED_MESSAGE =
  "Telegram integratsiyasi hozir sozlanmagan. Administratorga murojaat qiling.";

const describeTelegramError = (error: unknown): string => {
  if (error instanceof ApiError) {
    if (error.status === 503) return TELEGRAM_NOT_CONFIGURED_MESSAGE;
    if (error.status === 400 && /not connected/i.test(error.message)) return TELEGRAM_NOT_CONNECTED_MESSAGE;
    if (error.status === 401) return "Sessiya muddati tugagan. Iltimos qayta kiring.";
  }
  return getApiErrorMessage(error, "Telegram bilan bog'lanishda xatolik yuz berdi.");
};

const toCandidate = (peer: TelegramPeer): TelegramCandidate => ({
  peerId: peer.peerId,
  displayName: peer.displayName,
  username: peer.username,
});

const searchTelegramPeers = async (query: string, limit: number): Promise<TelegramPeer[]> => {
  logRouter("tool_call", { tool: "search_telegram_chats", confirmed: true });
  const result = await executeAiTool<TelegramPeer[]>("search_telegram_chats", { query, limit }, true);
  logRouter("tool_result", { tool: "search_telegram_chats", status: result.status });
  if (!isToolSuccess(result)) throw new Error("Unexpected confirmation_required for search_telegram_chats");
  return result.data;
};

export const buildTelegramSendConfirmation = async (peer: TelegramCandidate, text: string): Promise<RouterReply> => {
  logRouter("tool_call", { tool: "send_telegram_message", confirmed: false });
  const result = await executeAiTool<{ recipient: TelegramPeer; text: string; confirmationRequired: true }>(
    "send_telegram_message",
    { peerId: peer.peerId, text },
    false,
  );
  logRouter("tool_result", { tool: "send_telegram_message", status: result.status, confirmationRequired: true });

  const recipient = result.status === "confirmation_required" ? result.preview.recipient : peer;
  const confirmationMessage = `${recipient.displayName}ga yuborilsinmi?\n"${text}"`;

  const action: AIAction = {
    type: "sendTelegramMessage",
    payload: {
      peerId: recipient.peerId,
      recipientName: recipient.displayName,
      recipientUsername: recipient.username ?? undefined,
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
    if (peers.length === 0) return { text: "Telegramda mos chat topilmadi." };
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

  if (isFinanceSummaryIntent(trimmed)) return handleFinanceSummary();

  const contact = detectContactLookup(trimmed);
  if (contact) return handleContactLookup(contact.query);

  const memory = detectMemoryLookup(trimmed);
  if (memory) return handleMemoryLookup(memory.query);

  const legacyAction = parseAIAction(trimmed);
  if (legacyAction) return handleLegacyAction(legacyAction);

  logRouter("intent_detected", { intent: "none" });
  return { text: buildFallbackReply(trimmed) };
};
