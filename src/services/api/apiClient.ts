import { clearAuth, getTokens, isAccessTokenExpiringSoon, updateTokens, type AuthTokens } from "./tokenStorage";
import type { AuthResponse } from "./types";
import { getLocale } from "../../i18n/useI18n";
import { localizedErrorMessage } from "../../i18n/errorMessages";

const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:3000/api").replace(/\/$/, "");
const REQUEST_TIMEOUT_MS = 30_000;
const AI_REQUEST_TIMEOUT_MS = 240_000;
const AUTH_REQUEST_TIMEOUT_MS = 20_000;

export class ApiError extends Error {
  status: number;
  details: unknown;
  code?: string;

  constructor(status: number, message: string, details?: unknown, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
    this.code = code;
  }
}

const errorCodeOf = (details: unknown): string | undefined => {
  if (typeof details !== "object" || details === null || !("code" in details)) return undefined;
  const code = (details as { code?: unknown }).code;
  return typeof code === "string" ? code : undefined;
};

// Only used for the Uzbek path (the default locale) — a Russian-locale reader must
// never see this raw backend text, since it's English/Uzbee and not translated here.
const safeValidationMessage = (details: unknown): string | null => {
  if (typeof details !== "object" || details === null || !("message" in details)) return null;
  const message = (details as { message?: unknown }).message;
  if (Array.isArray(message)) {
    const first = message.find((item): item is string => typeof item === "string" && item.trim().length > 0);
    return first ? `Ma'lumot formati xato: ${first}` : null;
  }
  if (typeof message === "string" && message.trim() && !/^bad request$/i.test(message.trim())) return message.trim();
  return null;
};

const STATUS_FALLBACKS: Record<number, { uz: string; ru: string }> = {
  400: { uz: "Kiritilgan ma'lumotlarni tekshiring.", ru: "Проверьте введённые данные." },
  401: { uz: "Email yoki parol noto'g'ri.", ru: "Неверный email или пароль." },
  403: { uz: "Akkauntingiz bloklangan yoki bu amal uchun ruxsatingiz yo'q.", ru: "Ваш аккаунт заблокирован или у вас нет прав на это действие." },
  404: { uz: "So'ralgan ma'lumot topilmadi.", ru: "Запрошенные данные не найдены." },
  409: { uz: "Bu email bilan akkaunt mavjud.", ru: "Аккаунт с таким email уже существует." },
};

export const getApiErrorMessage = (error: unknown, fallback = "Server bilan bog'lanib bo'lmadi."): string => {
  if (!(error instanceof ApiError)) return fallback;
  const locale = getLocale();

  const codeMessage = localizedErrorMessage(error.code, locale);
  if (codeMessage) return codeMessage;

  // Uzbek keeps today's richer behavior (surfacing the raw validation message);
  // Russian never falls through to untranslated backend text.
  if (locale === "uz" && error.status === 400) return safeValidationMessage(error.details) ?? STATUS_FALLBACKS[400].uz;

  const statusFallback = STATUS_FALLBACKS[error.status];
  if (statusFallback) return statusFallback[locale];

  if (error.status >= 500) return locale === "ru" ? "На сервере произошла временная ошибка." : "Serverda vaqtinchalik xatolik yuz berdi.";
  return fallback;
};

let refreshPromise: Promise<AuthTokens> | null = null;

const isAuthEndpoint = (path: string) => ["/auth/login", "/auth/register", "/auth/refresh", "/auth/logout"].includes(path);

const isAuthInvalidationError = (error: unknown): boolean =>
  error instanceof ApiError && (error.status === 401 || error.status === 403);

const invalidateSession = (error: unknown): void => {
  // Timeouts, DNS/CORS failures and 5xx responses are not proof that the
  // refresh token is invalid. Preserve the cached session in those cases.
  if (!isAuthInvalidationError(error)) return;
  clearAuth();
  if (typeof window !== "undefined") window.dispatchEvent(new Event("yechim_ai_auth_session_changed"));
};

const rawRequest = async <T>(path: string, options: RequestInit = {}, token?: string): Promise<T> => {
  const controller = new AbortController();
  const timeout = window.setTimeout(
    () => controller.abort(),
    isAuthEndpoint(path) ? AUTH_REQUEST_TIMEOUT_MS : path.startsWith("/ai/") ? AI_REQUEST_TIMEOUT_MS : REQUEST_TIMEOUT_MS,
  );
  const abortFromCaller = () => controller.abort(options.signal?.reason);
  if (options.signal?.aborted) abortFromCaller();
  else options.signal?.addEventListener("abort", abortFromCaller, { once: true });
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && options.body && !(options.body instanceof FormData)) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  try {
    const response = await fetch(`${API_URL}${path}`, { ...options, headers, signal: controller.signal });
    const text = await response.text();
    let body: unknown = null;
    try { body = text ? JSON.parse(text) : null; } catch { body = text; }
    if (!response.ok) {
      const message = typeof body === "object" && body !== null && "message" in body
        ? String((body as { message: unknown }).message)
        : "API request failed";
      throw new ApiError(response.status, message, body, errorCodeOf(body));
    }
    return body as T;
  } catch (error) {
    if (options.signal?.aborted) throw Object.assign(new Error("Request aborted"), { name: "AbortError" });
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Server response timeout");
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
    options.signal?.removeEventListener("abort", abortFromCaller);
  }
};

export const refreshAccessToken = async (): Promise<AuthTokens> => {
  if (!refreshPromise) {
    const current = getTokens();
    if (!current?.refreshToken) return Promise.reject(new ApiError(401, "No refresh token"));
    refreshPromise = rawRequest<AuthResponse>("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken: current.refreshToken }),
    }).then((response) => {
      const tokens = { accessToken: response.accessToken, refreshToken: response.refreshToken };
      updateTokens(tokens);
      return tokens;
    }).finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
};

export const request = async <T>(path: string, options: RequestInit = {}, retry = true): Promise<T> => {
  let accessToken = getTokens()?.accessToken;

  // Refresh just before expiry so a burst of page data requests does not all
  // discover the expiry at once. The backend remains the source of truth.
  if (retry && accessToken && !isAuthEndpoint(path) && isAccessTokenExpiringSoon(accessToken)) {
    try {
      const next = await refreshAccessToken();
      accessToken = next.accessToken;
    } catch (refreshError) {
      invalidateSession(refreshError);
      throw refreshError;
    }
  }

  try {
    return await rawRequest<T>(path, options, accessToken);
  } catch (error) {
    const noRefreshEndpoint = isAuthEndpoint(path);
    if (!(error instanceof ApiError) || error.status !== 401 || !retry || noRefreshEndpoint) throw error;

    // Another request may have completed the single-flight rotation between
    // this request's first attempt and its 401 response. Reuse that token
    // before rotating the refresh token again.
    const latestToken = getTokens()?.accessToken;
    if (latestToken && latestToken !== accessToken) {
      try {
        return await rawRequest<T>(path, options, latestToken);
      } catch (latestError) {
        if (!(latestError instanceof ApiError) || latestError.status !== 401) throw latestError;
      }
    }

    try {
      const next = await refreshAccessToken();
      return await rawRequest<T>(path, options, next.accessToken);
    } catch (refreshError) {
      invalidateSession(refreshError);
      throw refreshError;
    }
  }
};

export const apiConfig = { baseUrl: API_URL };
