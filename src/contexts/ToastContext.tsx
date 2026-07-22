import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { onToast, showToast as emitToast } from '../lib/toastBus';
import type { ToastType } from '../types';

interface ToastEntry {
  id: number;
  message: string;
  type: ToastType;
  leaving: boolean;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const ICONS: Record<ToastType, string> = {
  success: 'fa-circle-check',
  error: 'fa-circle-xmark',
  warning: 'fa-triangle-exclamation',
  info: 'fa-circle-info',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const nextId = useRef(0);

  useEffect(() => {
    return onToast((message, type) => {
      const id = nextId.current++;
      setToasts((prev) => [...prev, { id, message, type, leaving: false }]);

      setTimeout(() => {
        setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 300);
      }, 3500);
    });
  }, []);

  return (
    <ToastContext.Provider value={{ showToast: emitToast }}>
      {children}
      <div className="toast-container">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`toast ${t.type}`}
            style={t.leaving ? { opacity: 0, transform: 'translateX(120px)', transition: 'all 0.3s ease' } : undefined}
          >
            <i className={`fa-solid ${ICONS[t.type]}`}></i>
            <p>{t.message}</p>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
