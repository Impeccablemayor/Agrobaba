import { formatPrice } from '../lib/format';
import type { VendorOrderView } from '../types';

/** One checkout can include several sellers. Each seller's part has its own number and status, so
 *  one seller's delay doesn't hide another's progress. Shown to the buyer and to admins. */
export function VendorOrdersList({ vendorOrders }: { vendorOrders: VendorOrderView[] }) {
  if (!vendorOrders || vendorOrders.length === 0) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {vendorOrders.map((v) => (
        <div
          key={v.id}
          style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap',
            border: '1px solid var(--border-light)', borderRadius: 8, padding: '10px 12px', background: 'var(--bg)',
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{v.sellerName || `Seller #${v.sellerId}`}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'monospace' }}>{v.vendorOrderNumber}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className={`status-${v.status === 'delivered' ? 'delivered' : 'pending'}`} style={{ textTransform: 'capitalize', fontSize: 11.5 }}>
              {v.status}
            </span>
            <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: 13 }}>{formatPrice(v.total)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
