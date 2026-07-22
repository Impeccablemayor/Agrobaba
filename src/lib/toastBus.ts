import type { ToastType } from '../types';

type Listener = (message: string, type: ToastType) => void;

const listeners = new Set<Listener>();

export function onToast(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function showToast(message: string, type: ToastType = 'info'): void {
  listeners.forEach((l) => l(message, type));
}
