let sharedStream: MediaStream | null = null;
let pending: Promise<MediaStream> | null = null;

const constraints: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
};

const isLive = (stream: MediaStream | null) =>
  Boolean(stream?.getAudioTracks().some((track) => track.readyState === "live"));

const rememberGranted = () => {
  try {
    window.localStorage.setItem("qulay:microphone-permission-granted", "1");
  } catch {
    // Storage is optional; the live MediaStream remains the source of truth.
  }
};

export const hasKnownMicrophonePermission = (): boolean => {
  if (isLive(sharedStream)) return true;
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem("qulay:microphone-permission-granted") === "1";
  } catch {
    return false;
  }
};

/**
 * One microphone stream is shared by Realtime and the recorder fallback.
 * Keeping the same live (but disabled while idle) track prevents duplicate
 * getUserMedia calls while the SPA tab remains open.
 */
export const acquireSharedMicrophone = async (): Promise<MediaStream> => {
  if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    throw new Error("Microphone is unavailable");
  }

  if (isLive(sharedStream)) {
    sharedStream!.getAudioTracks().forEach((track) => {
      track.enabled = true;
    });
    return sharedStream!;
  }

  // A browser may terminate a track while the page is suspended. Drop the dead
  // reference before requesting a replacement.
  sharedStream = null;

  if (!pending) {
    pending = navigator.mediaDevices
      .getUserMedia({ audio: constraints })
      .then((stream) => {
        sharedStream = stream;
        rememberGranted();
        for (const track of stream.getAudioTracks()) {
          track.addEventListener(
            "ended",
            () => {
              if (sharedStream === stream && !isLive(stream)) sharedStream = null;
            },
            { once: true },
          );
        }
        return stream;
      })
      .finally(() => {
        pending = null;
      });
  }

  return pending;
};

/**
 * Stop capturing without destroying the permission-bearing stream. This is
 * intentionally kept for the lifetime of the current SPA page so opening Voice
 * Mode again does not issue another getUserMedia call.
 */
export const parkSharedMicrophone = (): void => {
  if (!sharedStream) return;
  sharedStream.getAudioTracks().forEach((track) => {
    track.enabled = false;
  });
};

/** Explicit hard stop, used only when the application truly wants to release it. */
export const stopSharedMicrophone = (): void => {
  sharedStream?.getTracks().forEach((track) => track.stop());
  sharedStream = null;
  pending = null;
};
