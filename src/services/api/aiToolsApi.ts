import { request } from "./apiClient";

export type AIToolMetadataSummary = {
  name: string;
  category: string;
  requiresConfirmation: boolean;
  sideEffect: "READ" | "WRITE";
};

export type ToolExecutionSuccess<T = unknown> = {
  status: "success";
  tool: string;
  data: T;
  meta: { executedAt: string; requestId: string };
};

export type ToolConfirmationRequired<T = unknown> = {
  status: "confirmation_required";
  tool: string;
  preview: T;
  meta: { requestId: string };
};

export type ToolExecutionResult<T = unknown> = ToolExecutionSuccess<T> | ToolConfirmationRequired<T>;

export const isToolSuccess = <T>(result: ToolExecutionResult<T>): result is ToolExecutionSuccess<T> =>
  result.status === "success";

export const isToolConfirmationRequired = <T>(result: ToolExecutionResult<T>): result is ToolConfirmationRequired<T> =>
  result.status === "confirmation_required";

export const listAiTools = () => request<AIToolMetadataSummary[]>("/ai/tools");

/**
 * Single entry point into the backend AI Tool Registry. Every AI-chat-driven
 * read or write goes through this call so the registry stays the single
 * source of truth for validation, authorization, previews and confirmation.
 */
export const executeAiTool = <TResult = unknown>(
  tool: string,
  input: Record<string, unknown>,
  confirmed: boolean,
  options: { requestId?: string; idempotencyKey?: string } = {},
) =>
  request<ToolExecutionResult<TResult>>("/ai/tools/execute", {
    method: "POST",
    body: JSON.stringify({ tool, input, confirmed, ...options }),
  });
