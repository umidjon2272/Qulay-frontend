import { ApiError, getApiErrorMessage } from "../../../services/api/apiClient";

const TELEGRAM_NOT_CONNECTED_MESSAGE =
  "Telegram hali ulanmagan. Sozlamalar → Integratsiyalar orqali Telegramni ulang.";
const TELEGRAM_NOT_CONFIGURED_MESSAGE =
  "Telegram integratsiyasi hozir sozlanmagan. Administratorga murojaat qiling.";

const readBackendMessage = (details: unknown): string => {
  if (typeof details !== "object" || details === null || !("message" in details)) return "";
  const message = (details as { message?: unknown }).message;
  if (Array.isArray(message)) return message.filter((item): item is string => typeof item === "string").join(" ");
  return typeof message === "string" ? message : "";
};

/** Maps Telegram/tool failures without exposing raw backend or Telegram secrets. */
export const describeTelegramError = (error: unknown): string => {
  if (error instanceof ApiError) {
    const backendMessage = `${error.message} ${readBackendMessage(error.details)}`.toLowerCase();
    if (error.status === 503) return TELEGRAM_NOT_CONFIGURED_MESSAGE;
    if (error.status === 401) return "Sessiya muddati tugagan. Iltimos qayta kiring.";
    if (error.status === 429) return "Telegram so'rovlar chegarasiga yetdi. Birozdan keyin qayta urinib ko'ring.";
    if (/not connected/.test(backendMessage)) return TELEGRAM_NOT_CONNECTED_MESSAGE;
    if (/connection has expired|session.*expired|session_revoke|auth_key_unregistered/.test(backendMessage)) {
      return "Telegram sessiyasi eskirgan. Sozlamalar → Integratsiyalar orqali Telegramni qayta ulang.";
    }
    if (error.status === 404 || /peer.*not found/.test(backendMessage)) return "Telegramda qabul qiluvchi topilmadi.";
    if (/invalid tool input/.test(backendMessage)) return "Telegram xabarini tayyorlashda ma'lumot formati xato.";
    if (error.status === 400) return "Telegram amalini bajarishda xatolik yuz berdi.";
  }
  return getApiErrorMessage(error, "Telegram bilan bog'lanishda xatolik yuz berdi.");
};
