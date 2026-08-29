import { request } from './apiClient';

export type Plan = { tier: 'STARTER' | 'PRO' | 'BUSINESS'; name: string; monthlyPriceUzs: number; limits: { aiMessagesPerMonth: number; toolActionsPerMonth: number; files: number; storageMb: number; memories: number } };
export type SubscriptionInfo = { tier: Plan['tier']; status: string; trialEndsAt?: string | null; effectiveTier: Plan['tier']; trialActive: boolean; canUseAi: boolean; plan: Omit<Plan, 'tier'>; usage: { aiMessages: { used: number; limit: number }; toolActions: { used: number; limit: number }; files: { used: number; limit: number }; storageMb: { used: number; limit: number }; memories: { used: number; limit: number } } };

export const subscriptionApi = {
  plans: () => request<Plan[]>('/subscriptions/plans'),
  mine: () => request<SubscriptionInfo>('/subscriptions/me'),
};
