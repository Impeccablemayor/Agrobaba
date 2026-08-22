import { useEffect, useId, useRef } from 'react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Destructive actions focus the safe "Cancel" button first so Enter cannot trigger them accidentally. */
  destructive?: boolean;
  /** Disables actions and blocks dismissal while the confirmed action is processing. */
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const FOCUSABLE = 'button:not([disabled])';

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId();
  const messageId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  // Latest callbacks/state without re-running focus management while `busy` flips.
  const liveRef = useRef({ busy, onCancel });
  liveRef.current = { busy, onCancel };

  useEffect(() => {
    if (!open) return;

    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    const initialTarget = destructive ? cancelRef.current : confirmRef.current;
    initialTarget?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        if (!liveRef.current.busy) liveRef.current.onCancel();
        return;
      }
      if (e.key !== 'Tab') return;
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (!focusable || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      restoreFocusRef.current?.focus?.();
    };
  }, [open, destructive]);

  if (!open) return null;

  return (
    <div
      className="confirm-overlay"
      onClick={() => { if (!liveRef.current.busy) liveRef.current.onCancel(); }}
    >
      <div
        ref={dialogRef}
        className="confirm-dialog"
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={messageId}
        aria-busy={busy || undefined}
      >
        <div className="confirm-icon" aria-hidden="true">
          <i className="fa-solid fa-triangle-exclamation"></i>
        </div>
        <h3 id={titleId}>{title}</h3>
        <p id={messageId}>{message}</p>
        <div className="confirm-actions">
          <button ref={cancelRef} type="button" className="btn btn-outline" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </button>
          <button ref={confirmRef} type="button" className="btn btn-danger" onClick={onConfirm} disabled={busy}>
            {busy && <i className="fa-solid fa-spinner fa-spin" aria-hidden="true"></i>}
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
