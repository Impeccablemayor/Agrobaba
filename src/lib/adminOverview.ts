import { showToast } from './toastBus';
import { api } from './api';
import type { AdminOverview, AuditLogEntry } from '../types';

interface ApiPaymentSubmission {
  orderId: number;
  invoiceNumber: string;
  buyerName: string;
  total: number;
  paymentMode: string | null;
  transactionRef: string | null;
  paymentDate: string | null;
}

interface ApiFlashSaleSoon {
  id: number;
  title: string;
  startAt: string;
  endAt: string;
  phase: 'starting' | 'ending';
}

interface ApiAuditLogEntry {
  id: number;
  event: string;
  actor: string;
  detail: string;
  createdAt: string;
}

interface ApiOverview {
  pendingVerificationsCount: number;
  paymentSubmissionsCount: number;
  paymentSubmissions: ApiPaymentSubmission[];
  openTicketsCount: number;
  flashSalesSoon: ApiFlashSaleSoon[];
  recentActions: ApiAuditLogEntry[];
}

function mapAuditEntry(e: ApiAuditLogEntry): AuditLogEntry {
  return { id: String(e.id), event: e.event, actor: e.actor, detail: e.detail, createdAt: e.createdAt };
}

function mapOverview(data: ApiOverview): AdminOverview {
  return {
    pendingVerificationsCount: data.pendingVerificationsCount,
    paymentSubmissionsCount: data.paymentSubmissionsCount,
    paymentSubmissions: data.paymentSubmissions.map((p) => ({
      orderId: String(p.orderId),
      invoiceNumber: p.invoiceNumber,
      buyerName: p.buyerName,
      total: p.total,
      paymentMode: p.paymentMode,
      transactionRef: p.transactionRef,
      paymentDate: p.paymentDate,
    })),
    openTicketsCount: data.openTicketsCount,
    flashSalesSoon: data.flashSalesSoon.map((f) => ({
      id: String(f.id), title: f.title, startAt: f.startAt, endAt: f.endAt, phase: f.phase,
    })),
    recentActions: data.recentActions.map(mapAuditEntry),
  };
}

export async function getAdminOverview(): Promise<AdminOverview | null> {
  try {
    const data = await api.get<ApiOverview>('/api/admin/overview');
    return mapOverview(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load overview';
    showToast(message, 'error');
    return null;
  }
}

export async function getAuditLog(limit = 100): Promise<AuditLogEntry[]> {
  try {
    const data = await api.get<ApiAuditLogEntry[]>(`/api/admin/audit-log?limit=${limit}`);
    return (data || []).map(mapAuditEntry);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load admin activity';
    showToast(message, 'error');
    return [];
  }
}
