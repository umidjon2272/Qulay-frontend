import { STORAGE_KEYS } from "../constants/storageKeys";
import { readStorage, removeStorage, writeStorage } from "./storage";
import { notifyWorkspaceDataChanged } from "./workspaceEvents";
import { request } from "./api/apiClient";

export type IntegrationConnection = { connected: boolean; username?: string };
export type IntegrationState = Record<string, IntegrationConnection>;

const isIntegrationState = (value: unknown): value is IntegrationState => {
  if (typeof value !== "object" || value === null) return false;

  return Object.values(value).every((connection) => {
    if (typeof connection !== "object" || connection === null) return false;

    const item = connection as Partial<IntegrationConnection>;
    return (
      typeof item.connected === "boolean" &&
      (item.username === undefined || typeof item.username === "string")
    );
  });
};

export const getIntegrationState = (): IntegrationState =>
  readStorage(STORAGE_KEYS.integrations, {}, isIntegrationState);

export const clearIntegrationState = () => {
  removeStorage(STORAGE_KEYS.integrations);
  notifyWorkspaceDataChanged("integrations");
};

export const connectIntegration = (id: string, username?: string) => {
  const next = { ...getIntegrationState(), [id]: { connected: true, username: username?.trim() || undefined } };
  if (!writeStorage(STORAGE_KEYS.integrations, next)) {
    throw new Error("Integrations could not be saved");
  }
  notifyWorkspaceDataChanged("integrations");
  return next[id];
};

export const disconnectIntegration = (id: string) => {
  const next = { ...getIntegrationState(), [id]: { connected: false } };
  if (!writeStorage(STORAGE_KEYS.integrations, next)) {
    throw new Error("Integrations could not be saved");
  }
  notifyWorkspaceDataChanged("integrations");
  return next[id];
};

export type TelegramStatus = {
  connected: boolean;
  status: "DISCONNECTED" | "AWAITING_CODE" | "AWAITING_PASSWORD" | "CONNECTED" | "ERROR" | "not_configured";
  username: string | null;
  displayName: string | null;
  maskedPhone: string | null;
  connectedAt: string | null;
  temporaryError?: boolean;
};

export type TelegramPeer = {
  peerId: string;
  type: "USER" | "GROUP" | "CHANNEL";
  displayName: string;
  username: string | null;
  contactId?: string;
  lastActivity: string | null;
};

export type TelegramDeliveryType = "telegram_app" | "sms" | "call" | "email" | "fragment" | "firebase_sms" | "unknown";

export type TelegramCodeRequiredResult = {
  status: "code_required";
  delivery: TelegramDeliveryType;
  nextDelivery: TelegramDeliveryType | null;
  timeoutSeconds: number | null;
};

export const connectTelegram = (phoneNumber: string) =>
  request<TelegramCodeRequiredResult>("/integrations/telegram/connect", { method: "POST", body: JSON.stringify({ phoneNumber }) });

export const resendTelegramCode = () =>
  request<TelegramCodeRequiredResult>("/integrations/telegram/resend-code", { method: "POST" });

export const verifyTelegramCode = (code: string) =>
  request<{ status: "connected" | "password_required" }>("/integrations/telegram/verify-code", { method: "POST", body: JSON.stringify({ code }) });

export const verifyTelegramPassword = (password: string) =>
  request<{ status: "connected" }>("/integrations/telegram/verify-password", { method: "POST", body: JSON.stringify({ password }) });

export type TelegramQrResult =
  | { status: "pending"; qrUrl?: string; expiresAt?: string }
  | { status: "success" | "password_required" | "error" };

export const startTelegramQrLogin = () =>
  request<TelegramQrResult>("/integrations/telegram/qr/start", { method: "POST" });

export const getTelegramQrStatus = () =>
  request<TelegramQrResult>("/integrations/telegram/qr/status");

export const getTelegramStatus = () => request<TelegramStatus>("/integrations/telegram/status");

export const disconnectTelegram = () =>
  request<{ status: "disconnected" }>("/integrations/telegram/disconnect", { method: "DELETE" });

export const searchTelegramChats = (query: string) =>
  request<TelegramPeer[]>(`/integrations/telegram/search?q=${encodeURIComponent(query)}`);

export const getTelegramChats = (limit = 10, search?: string) => {
  const params = new URLSearchParams({ limit: String(limit) });
  if (search) params.set("search", search);
  return request<TelegramPeer[]>(`/integrations/telegram/chats?${params.toString()}`);
};

export const sendTelegramMessage = (peerId: string, text: string, confirmed: boolean) =>
  request<{ status: "sent" | "confirmation_required"; messageId?: string; preview?: unknown }>("/integrations/telegram/send", {
    method: "POST",
    body: JSON.stringify({ peerId, text, confirmed }),
  });

export type GoogleStatus = {
  configured: boolean;
  connected: boolean;
  status: "DISCONNECTED" | "CONNECTED" | "ERROR" | "not_configured";
  email: string | null;
  displayName: string | null;
  connectedAt: string | null;
  calendarEnabled: boolean;
  driveEnabled: boolean;
};

export const getGoogleConnectUrl = () => request<{ url: string }>("/integrations/google/auth-url");
export const getGoogleStatus = () => request<GoogleStatus>("/integrations/google/status");
export const disconnectGoogle = () => request<{ status: "disconnected" }>("/integrations/google/disconnect", { method: "DELETE" });
