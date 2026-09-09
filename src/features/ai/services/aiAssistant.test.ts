import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getAIReply } from './aiAssistant';
import { agentApi } from '../../../services/api/agentApi';

vi.mock('../../../services/api/agentApi', () => ({ agentApi: { chat: vi.fn(), stream: vi.fn() } }));
vi.mock('../../../i18n/useI18n', () => ({ getLocale: () => 'uz' }));

describe('Bito answers in the chat UI', () => {
  beforeEach(() => vi.clearAllMocks());
  it('renders a read answer without an action/confirmation card', async () => {
    vi.mocked(agentApi.chat).mockResolvedValue({ conversationId: 'c', message: 'Cola — 12 dona.', pendingConfirmation: null });
    const reply = await getAIReply('Omborda Cola qancha?');
    expect(reply.text).toBe('Cola — 12 dona.');
    expect(reply.action).toBeUndefined();
  });
  it('keeps Bito writes behind the server confirmation card', async () => {
    vi.mocked(agentApi.chat).mockResolvedValue({ conversationId: 'c', message: 'Buyurtma yaratilsinmi?', pendingConfirmation: { id: 'a', tool: 'bito__create_order', preview: { provider: 'Bito ERP' } } } as never);
    const reply = await getAIReply('Bito buyurtma yarat');
    expect(reply.action?.type).toBe('confirmAgentAction');
    expect(reply.action?.payload).toMatchObject({ actionId: 'a', tool: 'bito__create_order' });
  });
});
