import { parseAIAction } from "../actions/aiActions";
import type { AIAction } from "../actions/actionTypes";

export type { AIAction } from "../actions/actionTypes";

export type AIReply = {
  text: string;
  action?: AIAction;
};

type AIReplyOptions = {
  signal?: AbortSignal;
};

/**
 * Local mock assistant. Its async contract is intentionally backend-ready:
 * a future API client can replace this function without changing chat UI.
 */
export const getAIReply = async (
  input: string,
  options: AIReplyOptions = {},
): Promise<AIReply> => {
  await wait(500 + Math.random() * 350, options.signal);

  const action = parseAIAction(input);

  if (input.toLocaleLowerCase("uz-UZ").includes("xato test")) {
    throw new Error("Local AI test error");
  }

  if (action) {
    return {
      text: action.confirmationMessage,
      action,
    };
  }

  const lower = input.toLocaleLowerCase("uz-UZ");

  if (lower.includes("uchrashuv") || lower.includes("meeting")) {
    return {
      text: "Uchrashuv yaratish uchun sana, vaqt va kim bilan uchrashishingizni yozing. Masalan: “Ertaga soat 11 da Aziz bilan uchrashuv qo‘y”.",
    };
  }

  if (lower.includes("vazifa") || lower.includes("task")) {
    return {
      text: "Vazifa yaratish uchun nomi va vaqtini yozing. Masalan: “Bugun soat 15:00 da hisobot yuborish vazifasini yarat”.",
    };
  }

  if (lower.includes("eslatma") || lower.includes("reminder")) {
    return {
      text: "Eslatma yaratish uchun nima va qachon kerakligini yozing. Masalan: “Bugun soat 18:00 da hujjat yuborishni eslat”.",
    };
  }

  if (lower.includes("fayl") || lower.includes("hujjat")) {
    return {
      text: "Fayllar bo‘limida so‘nggi hujjatlaringiz va papkalaringizni ko‘rishingiz mumkin.",
    };
  }

  if (lower.includes("telegram")) {
    return {
      text: "Telegram xabarini tayyorlashim uchun kimga va nima haqida yozish kerakligini ayting.",
    };
  }

  if (lower.includes("salom") || lower.includes("assalom")) {
    return {
      text: "Salom! Men Qulay AI — vazifa, eslatma, uchrashuv va qaydlarni boshqarishda yordam beraman.",
    };
  }

  if (lower.includes("rahmat")) {
    return { text: "Arzimaydi! Yana biror narsa kerak bo‘lsa, shu yerdaman." };
  }

  return {
    text: "Tushundim. Vazifa, eslatma, uchrashuv, qayd yoki bugungi rejangiz haqida aniqroq yozing.",
  };
};

const wait = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const abort = () => {
      clearTimeout(timer);
      reject(Object.assign(new Error("AI request aborted"), { name: "AbortError" }));
    };

    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", abort);
      resolve();
    }, ms);

    if (signal?.aborted) {
      abort();
      return;
    }

    signal?.addEventListener("abort", abort, { once: true });
  });
