import { STORAGE_KEYS } from "../constants/storageKeys";
import {
  readSessionStorageString,
  readStorage,
  removeSessionStorage,
  writeSessionStorageString,
  writeStorage,
} from "./storage";

export type AuthSession = { name: string; email: string; createdAt: string };

const isAuthSession = (value: unknown): value is AuthSession =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as AuthSession).name === "string" &&
  typeof (value as AuthSession).email === "string" &&
  typeof (value as AuthSession).createdAt === "string";

export const getAuthSession = (): AuthSession | null => {
  const localSession = readStorage<unknown>(STORAGE_KEYS.authSession, null);
  if (isAuthSession(localSession)) return localSession;

  const sessionRaw = readSessionStorageString(STORAGE_KEYS.authSession);
  if (!sessionRaw) return null;

  try {
    const session: unknown = JSON.parse(sessionRaw);
    return isAuthSession(session) ? session : null;
  } catch {
    return null;
  }
};

export const createMockSession = (
  name: string,
  email: string,
  options: { remember?: boolean } = {},
): AuthSession => {
  const session = { name, email, createdAt: new Date().toISOString() };

  if (options.remember === false) {
    writeStorage(STORAGE_KEYS.authSession, null);
    writeSessionStorageString(STORAGE_KEYS.authSession, JSON.stringify(session));
  } else {
    writeStorage(STORAGE_KEYS.authSession, session);
    removeSessionStorage(STORAGE_KEYS.authSession);
  }

  return session;
};

export const clearMockSession = () => {
  const clearedLocal = writeStorage(STORAGE_KEYS.authSession, null);
  const clearedSession = removeSessionStorage(STORAGE_KEYS.authSession);
  return clearedLocal || clearedSession;
};
