import { request } from './apiClient';
import { getStoredUser } from './tokenStorage';

export type AgentSettings = {
  replyStyle: string;
  replyLength: string;
  saveHistory: boolean;
  confirmExternalActions: boolean;
  voiceReply: boolean;
  morningBriefingEnabled: boolean;
  morningBriefingTime: string;
  eveningSummaryEnabled: boolean;
  eveningSummaryTime: string;
  telegramDelivery: boolean;
  inAppDelivery: boolean;
  proactiveEnabled: boolean;
  financialAlertsEnabled: boolean;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  timezone: string;
};

export type UpdateAgentSettingsInput = Partial<AgentSettings>;

let revision = 0;
let writes: Promise<unknown> = Promise.resolve();
export const agentSettingsRevision = () => revision;

export const agentSettingsApi = {
  get: () => request<AgentSettings>('/agent-settings'),
  update: (input: UpdateAgentSettingsInput): Promise<AgentSettings> => {
    revision++;
    const owner = getStoredUser()?.id;
    const assertOwner = () => { if (getStoredUser()?.id !== owner) throw Object.assign(new Error('Account changed'), { name: 'AbortError' }); };
    const operation = writes.catch(() => undefined).then(async () => {
      assertOwner();
      const result = await request<AgentSettings>('/agent-settings', { method: 'PATCH', body: JSON.stringify(input) });
      assertOwner();
      return result;
    });
    writes = operation;
    return operation.finally(() => { revision++; });
  },
};
