import { showToast } from './toastBus';
import { api } from './api';
import type { PendingVerification, VerificationStatusInfo } from '../types';

export interface SubmitVerificationInput {
  businessName: string;
  idNumber: string;
  document: string;
}

interface ApiVerificationStatus {
  status: string | null;
  businessName: string | null;
  idNumber: string | null;
  note: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  verified: boolean;
}

function mapStatus(r: ApiVerificationStatus): VerificationStatusInfo {
  return {
    status: (r.status as VerificationStatusInfo['status']) || 'unsubmitted',
    businessName: r.businessName,
    idNumber: r.idNumber,
    note: r.note,
    submittedAt: r.submittedAt,
    reviewedAt: r.reviewedAt,
    verified: r.verified,
  };
}

export async function submitVerification(data: SubmitVerificationInput): Promise<VerificationStatusInfo | false> {
  try {
    const result = await api.post<ApiVerificationStatus>('/api/verification/submit', data);
    showToast('Verification submitted! An admin will review it shortly.', 'success');
    return mapStatus(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to submit verification';
    showToast(message, 'error');
    return false;
  }
}

export async function getMyVerificationStatus(): Promise<VerificationStatusInfo | null> {
  try {
    return mapStatus(await api.get<ApiVerificationStatus>('/api/verification/me'));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load verification status';
    showToast(message, 'error');
    return null;
  }
}

interface ApiPendingVerification {
  userId: number;
  name: string;
  email: string;
  role: string;
  businessName: string | null;
  idNumber: string | null;
  document: string | null;
  submittedAt: string;
}

export async function getPendingVerifications(): Promise<PendingVerification[]> {
  try {
    const list = await api.get<ApiPendingVerification[]>('/api/admin/verifications');
    return list.map((v) => ({
      userId: String(v.userId),
      name: v.name,
      email: v.email,
      role: v.role as PendingVerification['role'],
      businessName: v.businessName,
      idNumber: v.idNumber,
      document: v.document,
      submittedAt: v.submittedAt,
    }));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load pending verifications';
    showToast(message, 'error');
    return [];
  }
}

export async function approveVerification(userId: string): Promise<boolean> {
  try {
    await api.put(`/api/admin/verifications/${userId}/approve`);
    showToast('Account approved.', 'success');
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to approve';
    showToast(message, 'error');
    return false;
  }
}

export async function rejectVerification(userId: string, note: string): Promise<boolean> {
  try {
    await api.put(`/api/admin/verifications/${userId}/reject`, { note });
    showToast('Verification rejected.', 'info');
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to reject';
    showToast(message, 'error');
    return false;
  }
}
