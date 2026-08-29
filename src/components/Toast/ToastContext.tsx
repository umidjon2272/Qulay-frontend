import {
  useCallback,
  useMemo,
  useRef,
  useState,
  useEffect,
  type ReactNode,
} from "react";

import { CheckCircle2, Info, Mic, MicOff } from "lucide-react";

import { ToastContext, type ToastVariant } from "./ToastContextValue";
import "./Toast.scss";

type ToastItem = {
  id: number;
  message: string;
  variant: ToastVariant;
};

const icons: Record<ToastVariant, typeof CheckCircle2> = {
  success: CheckCircle2,
  info: Info,
  voice: Mic,
  error: MicOff,
};

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);
  const timersRef = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const recentRef = useRef(new Map<string, number>());

  useEffect(() => {
    const timers = timersRef.current;

    return () => {
      for (const timer of timers.values()) {
        clearTimeout(timer);
      }

      timers.clear();
    };
  }, []);

  const showToast = useCallback((message: string, variant: ToastVariant = "info") => {
    const normalized = message.trim();
    if (!normalized) return;
    const key = `${variant}:${normalized}`;
    const now = Date.now();
    if (now - (recentRef.current.get(key) ?? 0) < 1500) return;
    recentRef.current.set(key, now);

    idRef.current += 1;
    const id = idRef.current;
    setToasts((current) => [...current, { id, message: normalized, variant }]);

    const timer = setTimeout(() => {
      timersRef.current.delete(id);
      recentRef.current.delete(key);
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 3200);

    timersRef.current.set(id, timer);
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div className="toast-stack" role="status" aria-live="polite">
        {toasts.map((toast) => {
          const Icon = icons[toast.variant];

          return (
            <div className={`toast toast--${toast.variant}`} key={toast.id}>
              <Icon size={15} />
              <span>{toast.message}</span>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};
