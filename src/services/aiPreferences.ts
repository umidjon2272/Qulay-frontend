import type { AgentSettings } from './api/agentSettingsApi';
import { getSettings, updateSettings } from './settingsService';

export function applyAiPreferences(value: AgentSettings) {
  const current = getSettings();
  updateSettings({ replyStyle: value.replyStyle, replyLength: value.replyLength,
    ai: { ...current.ai, saveHistory: value.saveHistory, voiceReply: value.voiceReply, confirmExternalActions: value.confirmExternalActions } });
}
