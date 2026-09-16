import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const integration = vi.hoisted(() => ({
  getInstagramStatus: vi.fn(),
  getInstagramConnectUrl: vi.fn(),
  connectInstagram: vi.fn(),
  updateInstagramSalesAgentSettings: vi.fn(),
  testInstagram: vi.fn(),
  disconnectInstagram: vi.fn(),
}));

vi.mock('../../services/integrationService', async () => {
  const actual = await vi.importActual<typeof import('../../services/integrationService')>('../../services/integrationService');
  return { ...actual, ...integration };
});

import { InstagramIntegrationPanel } from './InstagramIntegrationPanel';

const connectedStatus = {
  configured: true,
  oauthReady: true,
  connected: true,
  status: 'CONNECTED' as const,
  instagramUserId: '17841400000000000',
  username: 'qulay_test',
  displayName: 'Qulay Test',
  profilePictureUrl: null,
  webhookSubscribed: true,
  enabled: true,
  dmEnabled: true,
  commentsEnabled: true,
  imageVisionEnabled: true,
  connectedAt: '2026-09-16T10:00:00.000Z',
  lastValidatedAt: '2026-09-16T10:00:00.000Z',
  lastErrorCode: null,
};

describe('InstagramIntegrationPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    integration.getInstagramStatus.mockResolvedValue(connectedStatus);
  });

  it('keeps connected Instagram controls compact and moves automation management to AI Chat', async () => {
    render(<InstagramIntegrationPanel salesAllowed onConnectionChange={vi.fn()} onDisconnected={vi.fn()} onUpgrade={vi.fn()} />);

    await waitFor(() => expect(screen.getByText('Instagram AI sotuv agenti')).toBeInTheDocument());
    expect(screen.getByText('Instagram Direct')).toBeInTheDocument();
    expect(screen.getByText('Commentlar')).toBeInTheDocument();
    expect(screen.getByText('Rasmni tushunish')).toBeInTheDocument();
    expect(screen.getByText('Ulanishni tekshirish')).toBeInTheDocument();
    expect(screen.getByText('Ulanishni uzish')).toBeInTheDocument();
    expect(screen.getByText(/Post automationlarini AI Chat’da/)).toBeInTheDocument();

    expect(screen.queryByText('Automation yaratish')).not.toBeInTheDocument();
    expect(screen.queryByText('Trigger / ma’no')).not.toBeInTheDocument();
    expect(screen.queryByText('Faol automationlar')).not.toBeInTheDocument();
  });
});
