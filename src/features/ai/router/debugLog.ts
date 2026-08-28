/**
 * Structural-only debug logging for the AI chat router. Never pass message
 * text, recipient names or tool input/output content here — only intent
 * names, tool names, booleans and counts, and only in dev builds.
 */
const DEBUG = Boolean(import.meta.env.DEV);

export const logRouter = (event: string, data?: Record<string, string | number | boolean | null | undefined>) => {
  if (!DEBUG) return;
  // eslint-disable-next-line no-console
  console.debug(`[ai-router] ${event}`, data ?? {});
};
