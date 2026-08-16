import { api } from './api';

export type ClientBehaviorEventType = 'add_to_cart' | 'remove_from_cart' | 'not_interested';

/** Best-effort telemetry - never blocks or surfaces an error for the actual user action
 *  (adding/removing a cart item must never fail just because this call did). */
export function recordEvent(eventType: ClientBehaviorEventType, productId: string): void {
  void api.post('/api/behavior/events', { eventType, productId }).catch(() => {});
}
