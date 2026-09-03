import type { AIAction } from "../actions/actionTypes";
import type { TelegramSelection } from "../router/routerTypes";
import { agentApi } from "../../../services/api/agentApi";
import { getLocale } from "../../../i18n/useI18n";

export type { AIAction } from "../actions/actionTypes";
export type { TelegramCandidate, TelegramSelection } from "../router/routerTypes";

export type AIReply = {
  text: string;
  action?: AIAction;
  telegramSelection?: TelegramSelection;
  serverPersisted?: boolean;
  conversationId?: string;
  resolvedActionId?: string;
  resolvedActionStatus?: "success" | "cancelled" | "failed";
};

type AIReplyOptions = {
  voice?: boolean;
  signal?: AbortSignal;
  conversationId?: string | null;
  onDelta?: (delta: string) => void;
  onStatus?: (status: import('../../../services/api/agentApi').AgentProgress) => void;
};


const throwIfAborted = (signal?: AbortSignal) => {
  if (signal?.aborted) throw Object.assign(new Error("AI request aborted"), { name: "AbortError" });
};

/** The server owns AI routing and configuration errors; no preflight round trip. */
export const getAIReply = async (
  input: string,
  options: AIReplyOptions = {},
): Promise<AIReply> => {
  throwIfAborted(options.signal);
    const result = options.onDelta || options.onStatus
      ? await agentApi.stream(input, options.conversationId ?? undefined, event => event.type === 'delta' ? options.onDelta?.(event.delta) : options.onStatus?.(event.status), options.signal, options.voice)
      : await agentApi.chat(input, options.conversationId ?? undefined, options.signal, options.voice);
    throwIfAborted(options.signal);
    const pending = result.pendingConfirmation;
    const ru = getLocale() === 'ru';
    return {
      text: result.message,
      conversationId: result.conversationId,
      serverPersisted: true,
      resolvedActionId: result.resolvedActionId,
      resolvedActionStatus: result.resolvedActionStatus,
      action: pending ? {
        type: "confirmAgentAction",
        payload: { actionId: pending.id, tool: pending.tool, preview: pending.preview },
        label: ru ? "Действие AI" : "AI amali",
        confirmationMessage: result.message,
        success: ru ? "✅ Действие выполнено." : "✅ Amal bajarildi.",
        error: ru ? "Не удалось выполнить действие." : "Amalni bajarishda xatolik yuz berdi.",
      } : undefined,
    };
};
