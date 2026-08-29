import { routeMessage } from "../router/chatRouter";
import type { AIAction } from "../actions/actionTypes";
import type { TelegramSelection } from "../router/routerTypes";
import { agentApi } from "../../../services/api/agentApi";

export type { AIAction } from "../actions/actionTypes";
export type { TelegramCandidate, TelegramSelection } from "../router/routerTypes";

export type AIReply = {
  text: string;
  action?: AIAction;
  telegramSelection?: TelegramSelection;
  serverPersisted?: boolean;
  conversationId?: string;
};

type AIReplyOptions = {
  signal?: AbortSignal;
  conversationId?: string | null;
};

let agentConfigured: boolean | null = null;

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
  if (agentConfigured === null) {
    try { agentConfigured = (await agentApi.status()).configured; } catch { agentConfigured = false; }
  }
  if (agentConfigured) {
    const result = await agentApi.chat(input, options.conversationId ?? undefined, options.signal);
    throwIfAborted(options.signal);
    const pending = result.pendingConfirmation;
    return {
      text: result.message,
      conversationId: result.conversationId,
      serverPersisted: true,
      action: pending ? {
        type: "confirmAgentAction",
        payload: { actionId: pending.id, tool: pending.tool, preview: pending.preview },
        label: "AI amali",
        confirmationMessage: result.message,
        success: "✅ Amal bajarildi.",
        error: "Amalni bajarishda xatolik yuz berdi.",
      } : undefined,
    };
  }
  const reply = await routeMessage(input);
  throwIfAborted(options.signal);
  return reply;
};
