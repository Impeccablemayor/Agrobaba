import { useState } from 'react';
import { ConfirmDialog } from './ConfirmDialog';
import { useCancelOrder } from '../hooks/mutations/useOrderMutations';

/** "Cancel order" for an unpaid order, with an optional reason the other party sees. Callers
 *  decide visibility (unpaid + pending); the backend re-checks every rule. */
export function CancelOrderButton({ orderId, invoiceNumber, compact = false, onCancelled }: {
  orderId: string;
  invoiceNumber: string;
  compact?: boolean;
  onCancelled?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const cancel = useCancelOrder();

  async function confirm() {
    const ok = await cancel.mutateAsync({ orderId, reason });
    if (ok) {
      setOpen(false);
      setReason('');
      onCancelled?.();
    }
  }

  return (
    <>
      <button
        type="button"
        className={`btn-outline btn-inline ${compact ? 'btn-sm' : ''}`}
        style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
      >
        <i className="fa-solid fa-ban"></i> Cancel order
      </button>
      <ConfirmDialog
        open={open}
        title={`Cancel order ${invoiceNumber}?`}
        message="This unpaid order will be cancelled and the reserved stock released. This can't be undone."
        confirmLabel="Cancel order"
        cancelLabel="Keep order"
        destructive
        busy={cancel.isPending}
        onConfirm={() => void confirm()}
        onCancel={() => { if (!cancel.isPending) setOpen(false); }}
      >
        <textarea
          aria-label="Reason (optional)"
          placeholder="Reason (optional) - shared with the other party"
          maxLength={500}
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          style={{ width: '100%', margin: '4px 0 12px', fontSize: 13 }}
        />
      </ConfirmDialog>
    </>
  );
}
