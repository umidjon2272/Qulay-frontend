import type { AppLocale } from "./useI18n";

/**
 * Maps a backend `code` (see backend/src/common/errors/app-error-codes.ts) to a
 * locale-correct message. Only throw sites that have been migrated to send `code`
 * appear here; everything else falls back to the generic status-based messages in
 * apiClient.ts, which are also locale-aware.
 */
const MESSAGES: Record<string, { uz: string; ru: string }> = {
  CURRENT_PASSWORD_INVALID: { uz: "Joriy parol noto'g'ri.", ru: "Текущий пароль неверен." },
  PASSWORD_SAME_AS_CURRENT: { uz: "Yangi parol eski parol bilan bir xil bo'lmasin.", ru: "Новый пароль не должен совпадать со старым." },
  EMAIL_ALREADY_REGISTERED: { uz: "Bu email bilan akkaunt mavjud.", ru: "Аккаунт с таким email уже существует." },
  INVALID_CREDENTIALS: { uz: "Email yoki parol noto'g'ri.", ru: "Неверный email или пароль." },
  ACCOUNT_BLOCKED: { uz: "Akkauntingiz bloklangan.", ru: "Ваш аккаунт заблокирован." },
  RESET_TOKEN_INVALID: { uz: "Havola yaroqsiz yoki muddati tugagan.", ru: "Ссылка недействительна или срок её действия истёк." },
  CONTACT_NOT_FOUND: { uz: "Kontakt topilmadi.", ru: "Контакт не найден." },
  MEMORY_KEY_CONFLICT: { uz: "Bu nom bilan xotira allaqachon mavjud.", ru: "Запись с таким ключом уже существует в памяти." },
  MEMORY_DISABLED: { uz: "AI xotirasi o'chirilgan.", ru: "Память AI отключена." },
  FINANCE_CURRENCY_AMBIGUOUS: { uz: "Valyutani tanlang — bu davrda bir nechta valyuta mavjud.", ru: "Укажите валюту — в этом периоде несколько валют." },
  FINANCE_ACCOUNT_CURRENCY_MISMATCH: { uz: "Hisob valyutasi tranzaksiya valyutasiga mos emas.", ru: "Валюта счёта не совпадает с валютой транзакции." },
};

export const localizedErrorMessage = (code: string | undefined, locale: AppLocale): string | null => {
  if (!code) return null;
  const entry = MESSAGES[code];
  if (!entry) return null;
  return entry[locale];
};
