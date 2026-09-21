import { api } from './api';
import { showToast } from './toastBus';

// ------------------------------------------------------------------
// Customer-facing payment DTOs (mirror backend PaymentDtos exactly)
// ------------------------------------------------------------------

export interface PaymentInitResult {
  orderId: number;
  reference: string | null;
  authorizationUrl: string | null;
  status: string; // "INITIATED" | "ALREADY_PAID" | "INIT_FAILED"
  message: string | null;
}

export interface PaymentVerifyResponse {
  orderId: number | null;
  reference: string;
  status: string | null;
  orderStatus: string | null;
  amountNaira: number;
  currency: string;
  channel: string | null;
  paidAt: string | null;
  message: string | null;
}

export interface PaymentStatusResponse {
  orderId: number;
  paymentStatus: string | null;
  reference: string | null;
  orderStatus: string | null;
  message: string | null;
}

// ------------------------------------------------------------------
// Customer API helpers
// ------------------------------------------------------------------

/** Start a Paystack checkout for an order. The caller should redirect the browser to the
 *  returned authorizationUrl (or toast the init failure). Never throws — gateway failures
 *  surface as an INIT_FAILED status in the response instead. */
export async function initializePayment(orderId: string): Promise<PaymentInitResult | null> {
  try {
    return await api.post<PaymentInitResult>('/api/payments/initialize', { orderId: Number(orderId) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to start payment';
    showToast(message, 'error');
    return null;
  }
}

/** Verify a checkout with Paystack (informational — the webhook is the source of truth).
 *  Returns null when the gateway is unreachable instead of throwing, so the callback page
 *  can fall back to polling getOrderPaymentStatus. */
export async function verifyPayment(reference: string): Promise<PaymentVerifyResponse | null> {
  try {
    return await api.get<PaymentVerifyResponse>(
      `/api/payments/${encodeURIComponent(reference)}/verify`,
    );
  } catch {
    return null;
  }
}

/** Read-only payment status for the callback page's polling fallback. Requires the orderId. */
export async function getOrderPaymentStatus(
  orderId: string,
): Promise<PaymentStatusResponse | null> {
  try {
    return await api.get<PaymentStatusResponse>(
      `/api/payments/${orderId}/status`,
    );
  } catch {
    return null;
  }
}

/** One-shot checkout redirect: start the payment and hand off to Paystack. Returns true
 *  when the redirect was initiated, false on failure (caller should show a retry CTA). */
export async function beginCheckout(orderId: string): Promise<boolean> {
  const result = await initializePayment(orderId);
  if (!result) return false;

  if (result.status === 'ALREADY_PAID') {
    showToast('This order is already paid for.', 'success');
    return false;
  }
  if (result.status === 'INIT_FAILED' || !result.authorizationUrl) {
    showToast(result.message || 'Unable to start payment right now. Please try again.', 'warning');
    return false;
  }

  window.location.assign(result.authorizationUrl);
  return true;
}

// ------------------------------------------------------------------
// Admin-facing payment types (mirror backend AdminPaymentDtos exactly)
// ------------------------------------------------------------------

export interface PaymentAdminSummary {
  id: number;
  orderId: number;
  invoiceNumber: string;
  buyerId: number;
  buyerName: string | null;
  orderStatus: string | null;
  amountNaira: number;
  currency: string;
  status: string;
  channel: string | null;
  reference: string | null;
  providerTransactionId: string | null;
  paidAt: string | null;
  requiresReview: boolean;
  createdAt: string;
}

export interface AttemptView {
  id: number;
  attemptNumber: number;
  reference: string;
  status: string;
  amountNaira: number;
  channel: string | null;
  providerTransactionId: string | null;
  gatewayResponse: string | null;
  createdAt: string;
}

export interface RefundView {
  id: number;
  amountNaira: number;
  status: string;
  reason: string | null;
  initiatorEmail: string | null;
  providerReference: string | null;
  failureReason: string | null;
  createdAt: string;
  processedAt: string | null;
}

export interface IssueView {
  id: number;
  type: string;
  message: string;
  resolved: boolean;
  resolvedBy: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

export interface PaymentAdminDetail {
  payment: PaymentAdminSummary;
  amountDescriptive: string;
  attempts: AttemptView[];
  refunds: RefundView[];
  issues: IssueView[];
}

export interface AdminPaymentAnalytics {
  total: number;
  todayCount: number;
  todayVolume: number;
  pending: number;
  initiated: number;
  success: number;
  failed: number;
  abandoned: number;
  requiresReview: number;
  refunded: number;
  openIssues: number;
  successRate: number;
}

/** Spring Page<T> shape returned by all paginated admin endpoints. */
export interface PageResult<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  empty: boolean;
}

// ------------------------------------------------------------------
// Admin API helpers
// ------------------------------------------------------------------

export async function getAdminPayments(
  page: number,
  size: number,
  status?: string,
  search?: string,
): Promise<PageResult<PaymentAdminSummary> | null> {
  try {
    const params = new URLSearchParams({ page: String(page), size: String(size) });
    if (status) params.set('status', status);
    if (search?.trim()) params.set('search', search.trim());
    return await api.get<PageResult<PaymentAdminSummary>>(
      `/api/admin/payments?${params.toString()}`,
    );
  } catch {
    showToast('Unable to load payment queue.', 'error');
    return null;
  }
}

export async function getAdminPaymentDetail(id: number): Promise<PaymentAdminDetail | null> {
  try {
    return await api.get<PaymentAdminDetail>(`/api/admin/payments/${id}`);
  } catch {
    showToast('Unable to load payment detail.', 'error');
    return null;
  }
}

export async function adminVerifyPayment(id: number): Promise<PaymentVerifyResponse | null> {
  try {
    const result = await api.post<PaymentVerifyResponse>(`/api/admin/payments/${id}/verify`);
    showToast('Payment verified against Paystack.', 'success');
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Verification failed';
    showToast(message, 'error');
    return null;
  }
}

export async function adminRefundPayment(
  id: number,
  amount: number,
  reason: string,
): Promise<boolean> {
  try {
    await api.post(`/api/admin/payments/${id}/refund`, { amount, reason });
    showToast('Refund request sent to Paystack.', 'success');
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Refund failed';
    showToast(message, 'error');
    return false;
  }
}

export async function getAdminIssues(
  page: number,
  size: number,
  type?: string,
): Promise<PageResult<IssueView> | null> {
  try {
    const params = new URLSearchParams({ page: String(page), size: String(size) });
    if (type) params.set('type', type);
    return await api.get<PageResult<IssueView>>(
      `/api/admin/payments/issues?${params.toString()}`,
    );
  } catch {
    showToast('Unable to load payment issues.', 'error');
    return null;
  }
}

export async function adminResolveIssue(id: number, note?: string): Promise<boolean> {
  try {
    await api.post(`/api/admin/payments/issues/${id}/resolve`, { note: note || null });
    showToast('Issue marked as resolved.', 'success');
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to resolve issue';
    showToast(message, 'error');
    return false;
  }
}

export async function adminReprocessWebhook(id: number): Promise<boolean> {
  try {
    await api.post(`/api/admin/payments/webhooks/${id}/reprocess`);
    showToast('Webhook reprocessed.', 'success');
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Reprocess failed';
    showToast(message, 'error');
    return false;
  }
}

export async function getAdminPaymentAnalytics(): Promise<AdminPaymentAnalytics | null> {
  try {
    return await api.get<AdminPaymentAnalytics>('/api/admin/payments/analytics');
  } catch {
    return null;
  }
}
