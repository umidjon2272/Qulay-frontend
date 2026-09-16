import type { IntegrationHealth } from '../../services/api/integrationsHealthApi';
import type { WhatsAppStatus } from '../../services/integrationService';

export const resolveWhatsAppHealth = (
  base: IntegrationHealth | null,
  status: WhatsAppStatus | null,
): IntegrationHealth | null => {
  if (!status) return base;
  // Backend health is the canonical classification. In particular, never turn
  // its TEMPORARY_ISSUE/RECONNECT_REQUIRED state green merely because the
  // credentials row still counts as connected.
  if (base) return base;

  const lastSuccessfulSyncAt = status.lastValidatedAt ?? status.connectedAt ?? null;
  const lastCheckedAt = new Date().toISOString();
  if (status.status === 'DEGRADED') {
    return {
      state: 'TEMPORARY_ISSUE',
      connected: true,
      lastSuccessfulSyncAt,
      lastCheckedAt,
      lastErrorCode: status.lastErrorCode ?? (status.webhookSubscribed ? null : 'WHATSAPP_WEBHOOK_NOT_SUBSCRIBED'),
    };
  }
  if (status.status === 'ERROR') {
    return {
      state: status.lastErrorCode ? 'RECONNECT_REQUIRED' : 'TEMPORARY_ISSUE',
      connected: false,
      lastSuccessfulSyncAt,
      lastCheckedAt,
      lastErrorCode: status.lastErrorCode,
    };
  }
  if (status.status === 'CONNECTED') {
    return {
      state: status.webhookSubscribed ? 'CONNECTED' : 'TEMPORARY_ISSUE',
      connected: true,
      lastSuccessfulSyncAt,
      lastCheckedAt,
      lastErrorCode: status.webhookSubscribed ? status.lastErrorCode : (status.lastErrorCode ?? 'WHATSAPP_WEBHOOK_NOT_SUBSCRIBED'),
    };
  }
  return {
    state: 'DISCONNECTED',
    connected: false,
    lastSuccessfulSyncAt,
    lastCheckedAt,
    lastErrorCode: null,
  };
};
