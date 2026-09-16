import { describe, expect, it } from 'vitest';
import { resolveWhatsAppHealth } from './integrationHealth';
import type { IntegrationHealth } from '../../services/api/integrationsHealthApi';
import type { WhatsAppStatus } from '../../services/integrationService';

const status = (patch: Partial<WhatsAppStatus> = {}): WhatsAppStatus => ({
  configured: true,
  embeddedSignupReady: true,
  connected: true,
  status: 'CONNECTED',
  displayPhoneNumber: '+998900000000',
  verifiedName: 'QULAY',
  phoneNumberId: 'p1',
  wabaId: 'w1',
  webhookSubscribed: true,
  enabled: true,
  salesOnly: true,
  voiceEnabled: true,
  maxVoiceSeconds: 60,
  replyMode: 'TEXT',
  connectedAt: '2026-09-16T10:00:00.000Z',
  lastValidatedAt: '2026-09-16T10:05:00.000Z',
  lastErrorCode: null,
  ...patch,
});

it('never paints a DEGRADED WhatsApp connection green', () => {
  const result = resolveWhatsAppHealth(null, status({ status: 'DEGRADED', connected: true, webhookSubscribed: false, lastErrorCode: 'WEBHOOK_SUBSCRIBE_FAILED' }));
  expect(result?.state).toBe('TEMPORARY_ISSUE');
  expect(result?.lastErrorCode).toBe('WEBHOOK_SUBSCRIBE_FAILED');
});

it('preserves backend health instead of overwriting a temporary issue with CONNECTED', () => {
  const base: IntegrationHealth = {
    state: 'TEMPORARY_ISSUE', connected: true,
    lastSuccessfulSyncAt: '2026-09-16T10:00:00.000Z', lastCheckedAt: '2026-09-16T10:06:00.000Z',
    lastErrorCode: 'Meta webhook ishlamayapti',
  };
  expect(resolveWhatsAppHealth(base, status())?.state).toBe('TEMPORARY_ISSUE');
});
