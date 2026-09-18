import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { updateSettings } from "../../services/settingsService";

const subscription = vi.hoisted(() => ({ plans: vi.fn(), mine: vi.fn(), requestPlan: vi.fn() }));
vi.mock("../../services/api/subscriptionApi", () => ({ subscriptionApi: subscription }));
vi.mock("../../hooks/useToast", () => ({ useToast: () => ({ showToast: vi.fn() }) }));

import Billing from "./Billing";

const proPlan = {
  tier: "PRO" as const, name: "PRO", monthlyPrice: 199000, currency: "UZS" as const, isActive: true,
  features: ["AI_CHAT" as const],
  limits: { aiCreditsPerMonth: 1234, toolActionsPerMonth: 321, voiceMinutesPerMonth: 45, files: 10, storageMb: 100, memories: 20 },
};

const subscriptionInfo = {
  tier: "PRO" as const, status: "ACTIVE" as const,
  currentPeriodStart: "2026-09-01T00:00:00.000Z", currentPeriodEnd: "2026-10-01T00:00:00.000Z",
  effectiveTier: "PRO" as const, trialActive: false as const, canUseAi: true, plan: proPlan, pendingRequest: null,
  usage: {
    aiCredits: { used: 234, remaining: 1000, limit: 1234 }, aiMessages: { used: 12, limit: 100 },
    toolActions: { used: 7, limit: 321 }, voiceMinutes: { used: 5, limit: 45 }, files: { used: 2, limit: 10 },
    storageMb: { used: 3, limit: 100 }, memories: { used: 4, limit: 20 },
  },
};

describe("Billing localization", () => {
  beforeEach(() => {
    localStorage.clear(); vi.clearAllMocks();
    subscription.plans.mockResolvedValue([proPlan]);
    subscription.mine.mockResolvedValue(subscriptionInfo);
  });

  it("renders all billing copy in Russian while preserving dynamic plan values", async () => {
    updateSettings({ language: "Русский" });
    render(<Billing />);
    expect(await screen.findByRole("heading", { name: "Тарифы Qulay AI" })).toBeInTheDocument();
    expect(screen.getByText("Текущее использование")).toBeInTheDocument();
    expect(screen.getByText("Осталось AI-кредитов")).toBeInTheDocument();
    expect(screen.getByText(/199.000/)).toBeInTheDocument();
    expect(screen.getAllByText(/1.234/).length).toBeGreaterThan(0);
    expect(screen.queryByText("Joriy foydalanish")).not.toBeInTheDocument();
    expect(screen.queryByText("Tarifni tanlash")).not.toBeInTheDocument();
  });

  it("updates Billing from Russian to Uzbek without refresh", async () => {
    updateSettings({ language: "Русский" });
    render(<Billing />);
    expect(await screen.findByText("Текущее использование")).toBeInTheDocument();
    act(() => { updateSettings({ language: "O'zbekcha" }); });
    await waitFor(() => expect(screen.getByText("Joriy foydalanish")).toBeInTheDocument());
    expect(screen.getByRole("heading", { name: "Qulay AI tariflari" })).toBeInTheDocument();
    expect(screen.getByText(/199.000/)).toBeInTheDocument();
  });
});
