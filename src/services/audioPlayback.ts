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
    const analyser = typeof audio.createAnalyser === 'function' ? audio.createAnalyser() : null;
    if (analyser) analyser.fftSize = 256;
    source.buffer = buffer;
    if (analyser) { source.connect(analyser); analyser.connect(audio.destination); } else source.connect(audio.destination);
    const samples = new Uint8Array(analyser?.frequencyBinCount ?? 0);
    const meter = analyser ? window.setInterval(() => {
      analyser.getByteFrequencyData(samples);
      const level = samples.reduce((sum, value) => sum + value, 0) / samples.length / 180;
      window.dispatchEvent(new CustomEvent('qulay:playback-level', { detail: Math.min(1, level) }));
    }, 60) : 0;
    let finished = false;
    const cleanup = () => {
      if (finished) return;
      finished = true;
      window.clearInterval(meter);
      window.dispatchEvent(new CustomEvent('qulay:playback-level', { detail: 0 }));
      signal.removeEventListener("abort", abort);
      source.disconnect(); analyser?.disconnect();
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
