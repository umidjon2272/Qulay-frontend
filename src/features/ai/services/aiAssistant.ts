import { routeMessage } from "../router/chatRouter";
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
  signal?: AbortSignal;
  conversationId?: string | null;
  onDelta?: (delta: string) => void;
  onStatus?: (status: import('../../../services/api/agentApi').AgentProgress) => void;
};

let agentConfigured: boolean | null = null;
let agentStatusCheckedAt = 0;

const throwIfAborted = (signal?: AbortSignal) => {
  if (signal?.aborted) throw Object.assign(new Error("AI request aborted"), { name: "AbortError" });
};

/**
 * Deterministic intent/router adapter. Every branch either resolves through
 * the backend AI Tool Registry (`/api/ai/tools/execute`) or falls back to a
 * generic reply — there is no local mock data path left here.
 */
export const getAIReply = async (
  input: string,
  options: AIReplyOptions = {},
): Promise<AIReply> => {
  throwIfAborted(options.signal);
  if (agentConfigured === null || Date.now() - agentStatusCheckedAt > (agentConfigured ? 60_000 : 3_000)) {
    try { agentConfigured = (await agentApi.status()).configured; agentStatusCheckedAt = Date.now(); } catch { agentConfigured = null; }
  }
  if (agentConfigured !== false) {
    const result = options.onDelta || options.onStatus
      ? await agentApi.stream(input, options.conversationId ?? undefined, event => event.type === 'delta' ? options.onDelta?.(event.delta) : options.onStatus?.(event.status), options.signal)
      : await agentApi.chat(input, options.conversationId ?? undefined, options.signal);
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
  }
  const reply = await routeMessage(input);
  throwIfAborted(options.signal);
  return reply;
};
