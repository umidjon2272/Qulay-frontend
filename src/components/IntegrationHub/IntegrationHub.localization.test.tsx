import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { integrationCatalog } from "../../constants/integrations";
import { updateSettings } from "../../services/settingsService";

const services = vi.hoisted(() => ({
  getTelegramStatus: vi.fn(), getTelegramSalesAgentSettings: vi.fn(), getTelegramChats: vi.fn(),
  getGoogleStatus: vi.fn(), getBitoStatus: vi.fn(), getWhatsAppStatus: vi.fn(), getWhatsAppEmbeddedConfig: vi.fn(),
  connectTelegram: vi.fn(), disconnectTelegram: vi.fn(), updateTelegramSalesAgentSettings: vi.fn(),
  disconnectGoogle: vi.fn(), getGoogleConnectUrl: vi.fn(), resendTelegramCode: vi.fn(), restartTelegramCode: vi.fn(),
  startTelegramQrLogin: vi.fn(), getTelegramQrStatus: vi.fn(), verifyTelegramCode: vi.fn(), verifyTelegramPassword: vi.fn(),
  disconnectBito: vi.fn(), getBitoConnectUrl: vi.fn(), testBito: vi.fn(), connectWhatsAppEmbedded: vi.fn(),
  connectWhatsApp: vi.fn(), updateWhatsAppSalesAgentSettings: vi.fn(), testWhatsApp: vi.fn(), disconnectWhatsApp: vi.fn(),
}));
const integrationActions = vi.hoisted(() => ({ connect: vi.fn(), disconnect: vi.fn(), sync: vi.fn() }));

vi.mock("../../services/integrationService", () => services);
vi.mock("../../hooks/useToast", () => ({ useToast: () => ({ showToast: vi.fn() }) }));
vi.mock("../../hooks/useIntegrations", () => ({ useIntegrations: () => ({
  integrations: integrationCatalog.map((item) => ({ ...item, connected: false })), connectedCount: 0,
  ...integrationActions,
}) }));
vi.mock("../../services/api/integrationsHealthApi", () => ({ integrationsHealthApi: { get: vi.fn().mockRejectedValue(new Error("offline")) } }));
vi.mock("../../services/api/subscriptionApi", () => ({ subscriptionApi: { mine: vi.fn().mockResolvedValue({ canUseAi: true, plan: { features: ["GOOGLE", "TELEGRAM", "BITO", "WHATSAPP_SALES", "INSTAGRAM_SALES"] } }) } }));

import IntegrationHub from "./IntegrationHub";

describe("IntegrationHub localization", () => {
  beforeEach(() => {
    localStorage.clear(); vi.clearAllMocks();
    services.getTelegramStatus.mockResolvedValue({ connected: false });
    services.getTelegramSalesAgentSettings.mockResolvedValue(null);
    services.getTelegramChats.mockResolvedValue([]);
    services.getGoogleStatus.mockResolvedValue({ connected: false, calendarEnabled: false, driveEnabled: false });
    services.getBitoStatus.mockResolvedValue({ configured: true, oauthReady: true, connected: false, status: "DISCONNECTED", authorizing: false, toolCount: 0 });
    services.getWhatsAppStatus.mockResolvedValue({ configured: true, connected: false, status: "DISCONNECTED", enabled: false });
    services.getWhatsAppEmbeddedConfig.mockResolvedValue({ ready: false });
  });

  const renderHub = () => render(<MemoryRouter><IntegrationHub /></MemoryRouter>);

  it("renders Russian integration cards, brands and coming-soon status", async () => {
    updateSettings({ language: "Русский" }); renderHub();
    expect(await screen.findByText("Управляйте сообщениями с помощью AI")).toBeInTheDocument();
    expect(screen.getByText("Встречи и ваши планы")).toBeInTheDocument();
    expect(screen.getAllByText("Скоро")).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: "Пока недоступно" })).toHaveLength(2);
    for (const brand of ["Telegram", "Google Calendar", "Google Drive", "Bito ERP", "WhatsApp", "Instagram"]) {
      expect(screen.getByRole("heading", { name: brand })).toBeInTheDocument();
    }
    expect(screen.queryByText("AI orqali xabarlarni boshqaring")).not.toBeInTheDocument();
  });

  it("updates integration cards from Russian to Uzbek without refresh", async () => {
    updateSettings({ language: "Русский" }); renderHub();
    expect(await screen.findByText("Управляйте сообщениями с помощью AI")).toBeInTheDocument();
    act(() => { updateSettings({ language: "O'zbekcha" }); });
    await waitFor(() => expect(screen.getByText("AI orqali xabarlarni boshqaring")).toBeInTheDocument());
    expect(screen.getAllByText("Tez kunda")).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: "Hozircha mavjud emas" })).toHaveLength(2);
  });

  it("localizes disconnected integration modal copy", async () => {
    updateSettings({ language: "Русский" }); renderHub();
    const telegramCard = await screen.findByRole("heading", { name: "Telegram" });
    fireEvent.click(telegramCard.closest("article")!.querySelector("button")!);
    expect(await screen.findByText("Подключите Telegram к Qulay AI.")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "По телефону" })).toBeInTheDocument();
  });
});
