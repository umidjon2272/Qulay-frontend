import { STORAGE_KEYS } from "../constants/storageKeys";
import { readStorage, writeStorage } from "./storage";
import { notifyWorkspaceDataChanged } from "./workspaceEvents";

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
