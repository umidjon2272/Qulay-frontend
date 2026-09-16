import { request } from './apiClient';

export type PlanTier = 'STARTER' | 'PRO' | 'BUSINESS' | 'SALES_AI';
export type PlanFeature = 'AI_CHAT' | 'TASKS' | 'REMINDERS' | 'CALENDAR' | 'GOOGLE' | 'TELEGRAM' | 'BITO' | 'TELEGRAM_SALES' | 'WHATSAPP_SALES' | 'INSTAGRAM_SALES';
export type Plan = {
  tier: PlanTier;
  name: string;
  monthlyPrice: number;
  currency: 'UZS' | 'USD';
  isActive: boolean;
  features: PlanFeature[];
  limits: { aiCreditsPerMonth: number; toolActionsPerMonth: number; voiceMinutesPerMonth: number; files: number; storageMb: number; memories: number };
};
export type SubscriptionRequest = { id: string; tier: PlanTier; status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELED'; requestedAt: string };
export type SubscriptionInfo = {
  tier: PlanTier;
  status: 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'EXPIRED';
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  effectiveTier: PlanTier;
  trialActive: false;
  canUseAi: boolean;
  plan: Plan;
  pendingRequest?: SubscriptionRequest | null;
  usagePeriod?: { start: string; end: string | null };
  usage: {
    aiCredits: { used: number; remaining?: number; limit: number };
    aiMessages: { used: number; limit: number };
    toolActions: { used: number; limit: number };
    voiceMinutes: { used: number; limit: number };
    files: { used: number; limit: number };
    storageMb: { used: number; limit: number };
    memories: { used: number; limit: number };
  };
};

export const subscriptionApi = {
  plans: () => request<Plan[]>('/subscriptions/plans'),
  mine: () => request<SubscriptionInfo>('/subscriptions/me'),
  requestPlan: (tier: PlanTier) => request<SubscriptionRequest>('/subscriptions/request', { method: 'POST', body: JSON.stringify({ tier }) }),
  logVoiceUsage: (audioSeconds: number) => request<{ recorded: boolean }>('/usage/voice', { method: 'POST', body: JSON.stringify({ audioSeconds }) }),
};
