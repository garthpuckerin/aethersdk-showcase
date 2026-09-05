import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

/* A tiny notification stack. Feature pages call `useToast()` and announce the
   outcome of a human verb ("Retry queued for Axonify"). Outside a provider the
   hook degrades to a no-op so pages stay testable in isolation. */
const ToastContext = createContext(null);
const NOOP = { toast: () => null, dismiss: () => {} };
export const TOAST_DURATION_MS = 4_000;

export function ToastProvider({ children, durationMs = TOAST_DURATION_MS }) {
  const [toasts, setToasts] = useState([]);
  const counter = useRef(0);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const toast = useCallback((message, tone = 'default') => {
    counter.current += 1;
    const id = `toast_${counter.current}`;
    setToasts((current) => [...current, { id, message, tone }]);
    timers.current.set(id, setTimeout(() => dismiss(id), durationMs));
    return id;
  }, [dismiss, durationMs]);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((timer) => clearTimeout(timer));
  }, []);

  const value = useMemo(() => ({ toast, dismiss }), [dismiss, toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        {toasts.map((item) => (
          <div key={item.id} className={`toast toast--${item.tone}`}>
            <span>{item.message}</span>
            <button type="button" className="toast__dismiss" aria-label="Dismiss notification" onClick={() => dismiss(item.id)}>×</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  return useContext(ToastContext) ?? NOOP;
}
