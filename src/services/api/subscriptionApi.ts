import { request } from './apiClient';

export type Plan = { tier: 'STARTER' | 'PRO' | 'BUSINESS'; name: string; monthlyPrice: number; currency: 'UZS' | 'USD'; isActive: boolean; limits: { aiCreditsPerMonth: number; toolActionsPerMonth: number; voiceMinutesPerMonth: number; files: number; storageMb: number; memories: number } };
export type SubscriptionInfo = { tier: Plan['tier']; status: string; trialEndsAt?: string | null; effectiveTier: Plan['tier']; trialActive: boolean; canUseAi: boolean; plan: Plan; usage: { aiCredits: { used: number; limit: number }; aiMessages: { used: number; limit: number }; toolActions: { used: number; limit: number }; voiceMinutes: { used: number; limit: number }; files: { used: number; limit: number }; storageMb: { used: number; limit: number }; memories: { used: number; limit: number } } };

export const subscriptionApi = {
  plans: () => request<Plan[]>('/subscriptions/plans'),
  mine: () => request<SubscriptionInfo>('/subscriptions/me'),
  logVoiceUsage: (audioSeconds: number) => request<{ recorded: boolean }>('/usage/voice', { method: 'POST', body: JSON.stringify({ audioSeconds }) }),
};
