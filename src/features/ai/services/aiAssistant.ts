import { routeMessage } from "../router/chatRouter";
import type { AIAction } from "../actions/actionTypes";
import type { TelegramSelection } from "../router/routerTypes";

export type { AIAction } from "../actions/actionTypes";
export type { TelegramCandidate, TelegramSelection } from "../router/routerTypes";

export type AIReply = {
  text: string;
  action?: AIAction;
  telegramSelection?: TelegramSelection;
};

type AIReplyOptions = {
  signal?: AbortSignal;
};

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
  const reply = await routeMessage(input);
  throwIfAborted(options.signal);
  return reply;
};
