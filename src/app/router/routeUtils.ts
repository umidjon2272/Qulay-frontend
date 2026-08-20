const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export const getSafeReturnPath = (state: unknown): string | null => {
  if (!isRecord(state) || typeof state.from !== "string") return null;

  const path = state.from;

  if (!path.startsWith("/") || path.startsWith("//")) return null;
  if (path === "/login" || path.startsWith("/login?") || path === "/register" || path.startsWith("/register?")) {
    return null;
  }

  return path;
};
