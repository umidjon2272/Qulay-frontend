import { request } from './apiClient';

export const spokenText = (text: string) => text.replace(/```[\s\S]*?```/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[*_#`|>]/g, '').replace(/[–—]+/g, ' ').replace(/[.,!?;:…()[\]{}]+/g, ' ').replace(/\s+/g, ' ').trim();
export const voiceApi = {
  realtimeSession: (signal?: AbortSignal) => request<{ enabled: false } | { enabled: true; clientSecret: string; expiresAt?: number; model: string; voice: string }>('/ai/voice/realtime/session', { method: 'POST', signal }),
  transcribe: (blob: Blob, durationSeconds: number, signal?: AbortSignal) => {
    const form = new FormData();
    const ext = blob.type.includes('mp4') ? 'mp4' : blob.type.includes('ogg') ? 'ogg' : 'webm';
    form.append('audio', blob, `voice.${ext}`);
    form.append('durationSeconds', String(durationSeconds));
    return request<{ text: string }>('/ai/voice/transcribe', { method: 'POST', body: form, signal });
  },
  speak: (text: string, signal?: AbortSignal, voice?: 'marin' | 'cedar') => request<{ audio: string; mimeType: string }>('/ai/voice/speak', { method: 'POST', body: JSON.stringify({ text, voice }), signal }),
};
