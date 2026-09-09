import { beforeEach, describe, expect, it, vi } from "vitest";

const { request } = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("./api/apiClient", () => ({ request }));

import { getBitoConnectUrl, getTelegramQrStatus, startTelegramQrLogin } from "./integrationService";

describe("Telegram QR integration API", () => {
  beforeEach(() => request.mockReset());

  it("starts and polls QR login through authenticated API-client requests", async () => {
    request.mockResolvedValueOnce({ status: "pending", qrUrl: "tg://login?token=safe", expiresAt: "2030-01-01T00:00:00.000Z" });
    request.mockResolvedValueOnce({ status: "success" });

    await expect(startTelegramQrLogin()).resolves.toMatchObject({ status: "pending" });
    await expect(getTelegramQrStatus()).resolves.toEqual({ status: "success" });
    expect(request).toHaveBeenNthCalledWith(1, "/integrations/telegram/qr/start", { method: "POST" });
    expect(request).toHaveBeenNthCalledWith(2, "/integrations/telegram/qr/status");
  });

  it("starts Bito OAuth through the authenticated API client", async () => {
    request.mockResolvedValueOnce({ connected: false, url: "https://auth.bito.example/authorize", serverName: "Bito", toolCount: 0 });

    await expect(getBitoConnectUrl()).resolves.toMatchObject({ connected: false, url: "https://auth.bito.example/authorize" });
    expect(request).toHaveBeenCalledWith("/integrations/bito/auth-url");
  });
});
