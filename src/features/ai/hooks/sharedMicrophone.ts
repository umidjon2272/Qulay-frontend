let sharedStream: MediaStream | null = null;
let pending: Promise<MediaStream> | null = null;
let stopTimer: number | null = null;

const constraints: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
};

const isLive = (stream: MediaStream | null) =>
  Boolean(stream?.getAudioTracks().some((track) => track.readyState === "live"));

export const acquireSharedMicrophone = async (): Promise<MediaStream> => {
  if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    throw new Error("Microphone is unavailable");
  }

  if (stopTimer !== null) {
    window.clearTimeout(stopTimer);
    stopTimer = null;
  }

  if (isLive(sharedStream)) {
    sharedStream!.getAudioTracks().forEach((track) => { track.enabled = true; });
    return sharedStream!;
  }

  if (!pending) {
    pending = navigator.mediaDevices.getUserMedia({ audio: constraints }).then((stream) => {
      sharedStream = stream;
      return stream;
    }).finally(() => {
      pending = null;
    });
  }

  return pending;
};

/**
 * Park the microphone briefly instead of immediately requesting a brand-new
 * stream between Realtime -> fallback transitions or quick Voice Mode reopens.
 * The track is disabled while parked, so no audio is captured.
 */
export const parkSharedMicrophone = (delayMs = 10 * 60_000): void => {
  if (!sharedStream) return;
  sharedStream.getAudioTracks().forEach((track) => { track.enabled = false; });
  if (stopTimer !== null) window.clearTimeout(stopTimer);
  stopTimer = window.setTimeout(() => {
    sharedStream?.getTracks().forEach((track) => track.stop());
    sharedStream = null;
    stopTimer = null;
  }, delayMs);
};

export const stopSharedMicrophone = (): void => {
  if (stopTimer !== null) {
    window.clearTimeout(stopTimer);
    stopTimer = null;
  }
  sharedStream?.getTracks().forEach((track) => track.stop());
  sharedStream = null;
};

if (typeof window !== "undefined") {
  window.addEventListener("pagehide", () => stopSharedMicrophone(), { once: true });
}
