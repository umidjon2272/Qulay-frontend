import { STORAGE_KEYS } from "../constants/storageKeys";

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export const STORAGE_SCHEMA_VERSION = 1;

const getStorage = (): StorageLike | null => {
  if (typeof window === "undefined") return null;

  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

export const readStorageString = (key: string, fallback = ""): string => {
  const storage = getStorage();

  if (!storage) return fallback;

  try {
    return storage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
};

export const writeStorageString = (key: string, value: string): boolean => {
  const storage = getStorage();

  if (!storage) return false;

  try {
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
};

export const readStorage = <T>(
  key: string,
  fallback: T,
  isValid?: (value: unknown) => value is T,
): T => {
  const raw = readStorageString(key);

  if (!raw) return fallback;

  try {
    const value: unknown = JSON.parse(raw);

    if (isValid && !isValid(value)) return fallback;

    return value as T;
  } catch {
    return fallback;
  }
};

export const writeStorage = <T>(key: string, value: T): boolean =>
  writeStorageString(key, JSON.stringify(value));

export const removeStorage = (key: string): boolean => {
  const storage = getStorage();

  if (!storage) return false;

  try {
    storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
};

/**
 * Keeps a small, independent schema marker so future API/local migrations can
 * be introduced without changing every feature storage key at once.
 */
export const initializeStorageSchema = (): void => {
  const version = readStorage<number>(
    STORAGE_KEYS.schemaVersion,
    0,
    (value): value is number => typeof value === "number" && Number.isFinite(value),
  );

  if (version !== STORAGE_SCHEMA_VERSION) {
    writeStorage(STORAGE_KEYS.schemaVersion, STORAGE_SCHEMA_VERSION);
  }
};

export const readSessionStorageString = (key: string, fallback = ""): string => {
  if (typeof window === "undefined") return fallback;

  try {
    return window.sessionStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
};

export const writeSessionStorageString = (key: string, value: string): boolean => {
  if (typeof window === "undefined") return false;

  try {
    window.sessionStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
};

export const removeSessionStorage = (key: string): boolean => {
  if (typeof window === "undefined") return false;

  try {
    window.sessionStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
};
