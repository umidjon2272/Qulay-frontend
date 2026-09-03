import { useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { agentSettingsApi, agentSettingsRevision } from '../services/api/agentSettingsApi';
import { defaultSettings, updateSettings } from '../services/settingsService';
import { applyAiPreferences } from '../services/aiPreferences';

/** Hydrate per-account behavior, and pick up changes from other devices on focus. */
export default function AiSettingsSync() {
  const { user } = useAuth();
  useEffect(() => {
    updateSettings({ ai: { ...defaultSettings.ai }, replyStyle: defaultSettings.replyStyle, replyLength: defaultSettings.replyLength });
    if (!user?.id) return;
    let active = true;
    let running = false;
    const sync = async () => {
      if (running) return; running = true;
      const revision = agentSettingsRevision();
      try { const preferences = await agentSettingsApi.get(); if (active && revision === agentSettingsRevision()) applyAiPreferences(preferences); }
      catch { /* Do not claim a successful save or overwrite local state on error. */ }
      finally { running = false; }
    };
    void sync(); window.addEventListener('focus', sync);
    return () => { active = false; window.removeEventListener('focus', sync); };
  }, [user?.id]);
  useEffect(() => {
    if (user?.language === 'uz' || user?.language === 'ru') updateSettings({ language: user.language === 'uz' ? "O'zbekcha" : 'Русский' });
  }, [user?.id, user?.language]);
  return null;
}
