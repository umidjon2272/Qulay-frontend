import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { normalizeAdminSettings } from "../../services/api/adminApi";
import { SettingsView } from "./AdminConsole";

describe("SettingsView (admin settings crash regression)", () => {
  it("renders nothing (no throw) when data is null — the pre-load state", () => {
    expect(() => render(<SettingsView data={null} />)).not.toThrow();
  });

  it("never crashes when handed data shaped like a different admin page's response", () => {
    // This is exactly the production crash: DataPage kept rendering SettingsView
    // with the previous page's response while the real settings fetch was in flight.
    const staleUsageData = normalizeAdminSettings({ range: 30, provider: { status: "not_configured" }, totals: {}, byUser: [], trend: [] });

    expect(() => render(<SettingsView data={staleUsageData} />)).not.toThrow();
    expect(screen.getAllByText("Ma'lumot mavjud emas.").length).toBeGreaterThan(0);
    expect(screen.getByDisplayValue("Qulay AI")).toBeInTheDocument();
  });

  it("renders real values for a fully-shaped, well-formed response", () => {
    const good = normalizeAdminSettings({
      platform: { name: "Qulay AI", defaultUserStatus: "ACTIVE", registrationEnabled: true, maintenanceMode: false },
      security: { accessTokenExpiresIn: "15m", refreshTokenExpiresIn: "30d", loginBruteForce: { maxFailures: 5, lockMinutes: 15 }, rateLimits: { loginPerIp: { max: 30, windowMinutes: 15 }, loginPerEmail: { max: 15, windowMinutes: 15 }, registerPerIp: { max: 10, windowMinutes: 10 }, registerPerEmail: { max: 3, windowMinutes: 60 }, passwordReset: { max: 5, windowMinutes: 15 }, globalPerIp: { max: 240, windowSeconds: 60 } } },
      notifications: { workerStatus: "running", intervalSeconds: 45, batchSize: 50, retryLimit: 3 },
      integrations: { telegram: { configured: true }, google: { configured: false }, openai: { configured: false } },
      storage: { provider: "LOCAL", maxFileSizeBytes: 20971520, localWarning: null },
      system: { environment: "production", version: "1.0.0", api: { status: "ok" }, database: { status: "ok", latencyMs: 4 } },
    });

    render(<SettingsView data={good} />);

    expect(screen.queryByText("Ma'lumot mavjud emas.")).not.toBeInTheDocument();
    expect(screen.getByText("15m")).toBeInTheDocument();
    expect(screen.getByText("Sozlangan")).toBeInTheDocument();
  });
});
