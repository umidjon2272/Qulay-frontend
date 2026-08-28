import { describe, expect, it } from "vitest";
import { normalizeAdminSettings } from "./adminApi";

describe("normalizeAdminSettings", () => {
  it("passes through a fully-shaped response unchanged and reports no missing sections", () => {
    const raw = {
      platform: { name: "Qulay AI", defaultUserStatus: "ACTIVE", registrationEnabled: true, maintenanceMode: false },
      security: { accessTokenExpiresIn: "15m", refreshTokenExpiresIn: "30d", loginBruteForce: { maxFailures: 5, lockMinutes: 15 }, rateLimits: { loginPerIp: { max: 30, windowMinutes: 15 }, loginPerEmail: { max: 15, windowMinutes: 15 }, registerPerIp: { max: 10, windowMinutes: 10 }, registerPerEmail: { max: 3, windowMinutes: 60 }, passwordReset: { max: 5, windowMinutes: 15 }, globalPerIp: { max: 240, windowSeconds: 60 } } },
      notifications: { workerStatus: "running", intervalSeconds: 45, batchSize: 50, retryLimit: 3 },
      integrations: { telegram: { configured: true }, google: { configured: false }, openai: { configured: false } },
      storage: { provider: "LOCAL", maxFileSizeBytes: 20971520, localWarning: null },
      system: { environment: "production", version: "1.0.0", api: { status: "ok" }, database: { status: "ok", latencyMs: 4 } },
    };

    const { data, missingSections } = normalizeAdminSettings(raw);

    expect(missingSections).toEqual([]);
    expect(data.platform.name).toBe("Qulay AI");
    expect(data.security.rateLimits.loginPerIp.max).toBe(30);
    expect(data.system.database.status).toBe("ok");
  });

  it("never throws and marks every section missing for a completely wrong-shaped payload (the stale cross-page-data scenario)", () => {
    // Shape returned by /admin/usage — this is exactly what leaked into SettingsView
    // during the reported production crash before the stale-state race was fixed.
    const usageShapedResponse = {
      range: 30,
      provider: { status: "not_configured" },
      totals: { requests: 12 },
      byUser: [],
      trend: [],
    };

    const { data, missingSections } = normalizeAdminSettings(usageShapedResponse);

    expect(missingSections).toEqual(["platform", "security", "notifications", "integrations", "storage", "system"]);
    // The exact access that used to crash with "Cannot read properties of undefined (reading 'name')":
    expect(() => data.platform.name).not.toThrow();
    expect(data.platform.name).toBe("Qulay AI");
  });

  it("degrades gracefully when only some sections are present", () => {
    const partial = { platform: { name: "Qulay AI", defaultUserStatus: "ACTIVE", registrationEnabled: true, maintenanceMode: false } };

    const { data, missingSections } = normalizeAdminSettings(partial);

    expect(missingSections).toEqual(["security", "notifications", "integrations", "storage", "system"]);
    expect(data.platform.name).toBe("Qulay AI");
    expect(data.security.accessTokenExpiresIn).toBe("");
  });

  it.each([null, undefined, "not an object", 42, [], true])("never throws for malformed input: %p", (raw) => {
    expect(() => normalizeAdminSettings(raw)).not.toThrow();
    const { missingSections } = normalizeAdminSettings(raw);
    expect(missingSections.length).toBe(6);
  });
});
