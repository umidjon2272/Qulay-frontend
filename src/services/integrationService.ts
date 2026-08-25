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
  status: "DISCONNECTED" | "AWAITING_CODE" | "AWAITING_PASSWORD" | "CONNECTED" | "ERROR";
  username: string | null;
  displayName: string | null;
  maskedPhone: string | null;
  connectedAt: string | null;
};

export type TelegramPeer = {
  peerId: string;
  type: "USER" | "GROUP" | "CHANNEL";
  displayName: string;
  username: string | null;
  contactId?: string;
  lastActivity: string | null;
};

export const connectTelegram = (phoneNumber: string) =>
  request<{ status: "code_required" }>("/integrations/telegram/connect", { method: "POST", body: JSON.stringify({ phoneNumber }) });

export const verifyTelegramCode = (code: string) =>
  request<{ status: "connected" | "password_required" }>("/integrations/telegram/verify-code", { method: "POST", body: JSON.stringify({ code }) });

export const verifyTelegramPassword = (password: string) =>
  request<{ status: "connected" }>("/integrations/telegram/verify-password", { method: "POST", body: JSON.stringify({ password }) });

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
  connected: boolean;
  email: string | null;
  displayName: string | null;
  connectedAt: string | null;
  calendarEnabled: boolean;
  driveEnabled: boolean;
};

export const getGoogleConnectUrl = () => request<{ url: string }>("/integrations/google/connect-url");
export const getGoogleStatus = () => request<GoogleStatus>("/integrations/google/status");
export const disconnectGoogle = () => request<{ status: "disconnected" }>("/integrations/google/disconnect", { method: "DELETE" });
