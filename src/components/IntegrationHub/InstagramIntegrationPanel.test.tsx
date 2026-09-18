import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { updateSettings } from '../../services/settingsService';

const integration = vi.hoisted(() => ({
  getInstagramStatus: vi.fn(),
  getInstagramConnectUrl: vi.fn(),
  connectInstagram: vi.fn(),
  updateInstagramSalesAgentSettings: vi.fn(),
  testInstagram: vi.fn(),
  disconnectInstagram: vi.fn(),
}));

vi.mock('../../services/integrationService', () => integration);

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
    localStorage.clear();
    vi.clearAllMocks();
    integration.getInstagramStatus.mockResolvedValue(connectedStatus);
  });

  it('renders connected Instagram controls in Russian and preserves product terms', async () => {
    updateSettings({ language: 'Русский' });
    render(<InstagramIntegrationPanel salesAllowed onConnectionChange={vi.fn()} onDisconnected={vi.fn()} onUpgrade={vi.fn()} />);

    await waitFor(() => expect(screen.getByText('AI-агент продаж Instagram')).toBeInTheDocument());
    expect(screen.getByText('Instagram Direct')).toBeInTheDocument();
    expect(screen.getByText('Комментарии')).toBeInTheDocument();
    expect(screen.getByText('Распознавание изображений')).toBeInTheDocument();
    expect(screen.getByText('Проверить подключение')).toBeInTheDocument();
    expect(screen.getByText('Отключить')).toBeInTheDocument();
    expect(screen.queryByText('Instagram AI sotuv agenti')).not.toBeInTheDocument();
  });

  it('updates connected Instagram copy from Russian to Uzbek without refresh', async () => {
    updateSettings({ language: 'Русский' });
    render(<InstagramIntegrationPanel salesAllowed onConnectionChange={vi.fn()} onDisconnected={vi.fn()} onUpgrade={vi.fn()} />);
    await screen.findByText('AI-агент продаж Instagram');
    act(() => { updateSettings({ language: "O'zbekcha" }); });
    await waitFor(() => expect(screen.getByText('Instagram AI sotuv agenti')).toBeInTheDocument());
    expect(screen.getByText('Commentlar')).toBeInTheDocument();
    expect(screen.getByText('Rasmni tushunish')).toBeInTheDocument();
  });
});
