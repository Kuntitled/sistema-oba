"use client";

import * as React from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

type ToastVariant = "success" | "error" | "info";

interface ToastItem {
  id: number;
  variant: ToastVariant;
  message: string;
}

export interface ToastHelpers {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const NOOP_TOAST: ToastHelpers = {
  success: () => {},
  error: () => {},
  info: () => {},
};

const ToastContext = React.createContext<ToastHelpers>(NOOP_TOAST);

const MAX_TOASTS = 4;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);
  const nextIdRef = React.useRef(1);
  const timersRef = React.useRef<Map<number, number>>(new Map());

  const dismiss = React.useCallback((id: number) => {
    const timer = timersRef.current.get(id);
    if (timer !== undefined) {
      window.clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  React.useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const timer of timers.values()) {
        window.clearTimeout(timer);
      }
      timers.clear();
    };
  }, []);

  const pushToast = React.useCallback(
    (variant: ToastVariant, rawMessage: string) => {
      const message = rawMessage.trim();
      if (!message) return;

      const id = nextIdRef.current++;
      const durationMs = variant === "error" ? 5000 : 3500;

      setToasts((prev) => {
        const next = [...prev, { id, variant, message }];
        if (next.length > MAX_TOASTS) {
          const evicted = next.shift();
          if (evicted) {
            const oldTimer = timersRef.current.get(evicted.id);
            if (oldTimer !== undefined) {
              window.clearTimeout(oldTimer);
              timersRef.current.delete(evicted.id);
            }
          }
        }
        return next;
      });

      const timer = window.setTimeout(() => {
        dismiss(id);
      }, durationMs);
      timersRef.current.set(id, timer);
    },
    [dismiss]
  );

  const api = React.useMemo<ToastHelpers>(
    () => ({
      success: (message: string) => pushToast("success", message),
      error: (message: string) => pushToast("error", message),
      info: (message: string) => pushToast("info", message),
    }),
    [pushToast]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}

      {toasts.length > 0 && (
        <div
          aria-live="polite"
          className="fixed bottom-4 right-4 z-[90] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2 pointer-events-none"
        >
          {toasts.map((item) => {
            const styles =
              item.variant === "success"
                ? "border-emerald-500/45 bg-card/95 text-foreground shadow-lg shadow-emerald-950/20"
                : item.variant === "error"
                  ? "border-destructive/60 bg-card/95 text-foreground shadow-lg shadow-destructive/20"
                  : "border-primary/45 bg-card/95 text-foreground shadow-lg shadow-primary/15";

            return (
              <div
                key={item.id}
                role="status"
                className={`pointer-events-auto flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-xs backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-200 ${styles}`}
              >
                {item.variant === "success" ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                ) : item.variant === "error" ? (
                  <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                ) : (
                  <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                )}

                <span className="flex-1 font-medium leading-relaxed">
                  {item.message}
                </span>

                <button
                  type="button"
                  onClick={() => dismiss(item.id)}
                  aria-label="Fechar notificação"
                  className="text-muted-foreground hover:text-foreground p-0.5 rounded transition-colors shrink-0"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastHelpers {
  return React.useContext(ToastContext);
}
