// Reuse one context. Resume it from a user gesture BEFORE awaiting a TTS request.
// This also avoids creating an unbounded number of audio contexts on mobile.
let context: AudioContext | null = null;
let voiceActive = false;
export const setVoiceAudioActive = (active: boolean) => { voiceActive = active; };
export const isVoiceAudioActive = () => voiceActive;

export const getAudioContext = (): AudioContext => {
  if (!context || context.state === "closed") {
    const Constructor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Constructor) throw new Error("Audio playback is not supported");
    context = new Constructor();
  }
  return context;
};

export const prepareAudioPlayback = async (): Promise<void> => {
  const audio = getAudioContext();
  if (audio.state !== "running") await audio.resume();
  if (audio.state !== "running") throw new Error("Audio playback needs a user gesture");
};

export const playVoiceAudio = async (base64: string, signal: AbortSignal): Promise<void> => {
  if (signal.aborted) return;
  const audio = getAudioContext();
  if (audio.state !== "running") throw new Error("Audio playback needs a user gesture");
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const buffer = await audio.decodeAudioData(bytes.buffer);
  if (signal.aborted) return;
  await new Promise<void>((resolve, reject) => {
    const source = audio.createBufferSource();
    source.buffer = buffer;
    source.connect(audio.destination);
    let finished = false;
    const cleanup = () => {
      if (finished) return;
      finished = true;
      signal.removeEventListener("abort", abort);
      source.disconnect();
      resolve();
    };
    const abort = () => { try { source.stop(); } catch { /* already stopped */ } cleanup(); };
    source.onended = cleanup;
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) { abort(); return; }
    try { source.start(); } catch (error) {
      finished = true; signal.removeEventListener('abort', abort); source.disconnect(); reject(error);
    }
  });
};
