import { useCallback, useEffect, useRef, useState } from "react";

type UseSpeechRecognitionOptions = {
  lang?: string;
  onResult?: (transcript: string) => void;
  onError?: (message: string) => void;
};

type UseSpeechRecognitionReturn = {
  isSupported: boolean;
  isListening: boolean;
  interimTranscript: string;
  start: () => void;
  stop: () => void;
  requestPermission: () => Promise<boolean>;
};

const getRecognitionConstructor = () => {
  if (typeof window === "undefined") return undefined;

  return window.SpeechRecognition ?? window.webkitSpeechRecognition;
};

export const useSpeechRecognition = (
  options: UseSpeechRecognitionOptions = {},
): UseSpeechRecognitionReturn => {
  const { lang = "uz-UZ", onResult, onError } = options;
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const mountedRef = useRef(true);
  const listeningRef = useRef(false);
  const onResultRef = useRef(onResult);
  const onErrorRef = useRef(onError);

  onResultRef.current = onResult;
  onErrorRef.current = onError;

  const isSupported = Boolean(getRecognitionConstructor());

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      listeningRef.current = false;

      const recognition = recognitionRef.current;
      recognitionRef.current = null;

      if (recognition) {
        recognition.onstart = null;
        recognition.onresult = null;
        recognition.onerror = null;
        recognition.onend = null;

        try {
          recognition.abort();
        } catch {
          // The browser may throw when recognition has already ended.
        }
      }
    };
  }, []);

  const stop = useCallback(() => {
    const recognition = recognitionRef.current;
    listeningRef.current = false;

    if (recognition) {
      try {
        recognition.stop();
      } catch {
        try {
          recognition.abort();
        } catch {
          // Ignore browsers that reject a second stop/abort call.
        }
      }
    }

    recognitionRef.current = null;

    if (mountedRef.current) {
      setIsListening(false);
      setInterimTranscript("");
    }
  }, []);


  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!navigator.mediaDevices?.getUserMedia) {
      onErrorRef.current?.("Bu brauzer mikrofonga ruxsat so'rashni qo'llab-quvvatlamaydi.");
      return false;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      return true;
    } catch {
      onErrorRef.current?.("Mikrofonga ruxsat berilmadi. Brauzer sozlamalaridan mikrofonni yoqing.");
      return false;
    }
  }, []);

  const start = useCallback(() => {
    const Recognition = getRecognitionConstructor();

    if (!Recognition) {
      onErrorRef.current?.("Bu brauzer ovozli kiritishni qo'llab-quvvatlamaydi.");
      return;
    }

    if (listeningRef.current || recognitionRef.current) return;

    const recognition = new Recognition();
    recognitionRef.current = recognition;

    recognition.lang = lang;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      if (!mountedRef.current || recognitionRef.current !== recognition) return;

      listeningRef.current = true;
      setIsListening(true);
      setInterimTranscript("");
    };

    recognition.onresult = (event) => {
      if (!mountedRef.current || recognitionRef.current !== recognition) return;

      let finalText = "";
      let interimText = "";

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const text = result?.[0]?.transcript ?? "";

        if (result?.isFinal) {
          finalText += text;
        } else {
          interimText += text;
        }
      }

      if (finalText.trim()) {
        onResultRef.current?.(finalText.trim());
      }

      setInterimTranscript(interimText);
    };

    recognition.onerror = (event) => {
      if (!mountedRef.current || recognitionRef.current !== recognition) return;

      listeningRef.current = false;
      setIsListening(false);
      setInterimTranscript("");

      const messages: Record<string, string> = {
        "not-allowed": "Mikrofonga ruxsat berilmadi. Brauzer sozlamalaridan ruxsat bering.",
        "service-not-allowed": "Ovozli xizmatga ruxsat berilmadi.",
        "audio-capture": "Mikrofon topilmadi yoki boshqa dastur tomonidan ishlatilmoqda.",
        network: "Ovozli xizmatga ulanib bo'lmadi.",
        "no-speech": "Ovoz aniqlanmadi. Qayta urinib ko'ring.",
      };

      if (event.error !== "aborted") {
        onErrorRef.current?.(messages[event.error] ?? "Ovozli kiritishda xatolik yuz berdi.");
      }
    };

    recognition.onend = () => {
      if (!mountedRef.current || recognitionRef.current !== recognition) return;

      recognitionRef.current = null;
      listeningRef.current = false;
      setIsListening(false);
      setInterimTranscript("");
    };

    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
      listeningRef.current = false;
      setIsListening(false);
      setInterimTranscript("");
      onErrorRef.current?.("Mikrofonni ishga tushirib bo'lmadi.");
    }
  }, [lang]);

  return { isSupported, isListening, interimTranscript, start, stop, requestPermission };
};
