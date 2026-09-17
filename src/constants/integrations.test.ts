import { describe, expect, it } from 'vitest';
import { integrationCatalog } from './integrations';

describe('temporarily paused sales connectors', () => {
  it.each(['whatsapp', 'instagram'])('marks %s as coming soon so connect is disabled in the hub', (id) => {
    const integration = integrationCatalog.find((item) => item.id === id);
    expect(integration).toBeDefined();
    expect(integration?.comingSoon).toBe(true);
    expect(integration?.description.toLowerCase()).toContain('tez kunda');
  });

  it('keeps Telegram as the active sales channel', () => {
    expect(integrationCatalog.find((item) => item.id === 'telegram')?.comingSoon).not.toBe(true);
  });
});
