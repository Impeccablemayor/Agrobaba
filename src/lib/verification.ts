import { showToast } from './toastBus';
import { api } from './api';
import type { PendingVerification, VerificationStatusInfo } from '../types';

export interface SubmitVerificationInput {
  // Common
  idNumber: string;
  governmentIdDocument: string;
  selfieDocument?: string;
  bankAccountName: string;
  bankAccountNumber: string;
  bankName: string;
  declarationAccepted: boolean;
  // Farmer
  farmName?: string;
  cropsOrLivestock?: string;
  // Dealer / provider
  businessName?: string;
  businessAddress?: string;
  productCategoriesSold?: string;
  professionalCertificates?: string;
  portfolioDocument?: string;
  // Optional business/CAC track
  cacNumber?: string;
  cacDocument?: string;
}

interface ApiVerificationStatus {
  status: string | null;
  businessStatus: string | null;
  businessName: string | null;
  idNumber: string | null;
  governmentIdDocument: string | null;
  selfieDocument: string | null;
  farmName: string | null;
  cropsOrLivestock: string | null;
  businessAddress: string | null;
  productCategoriesSold: string | null;
  professionalCertificates: string | null;
  portfolioDocument: string | null;
  bankAccountName: string | null;
  bankAccountNumber: string | null;
  bankName: string | null;
  cacNumber: string | null;
  cacDocument: string | null;
  declarationAccepted: boolean;
  note: string | null;
  businessNote: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  businessReviewedAt: string | null;
  verified: boolean;
  businessVerified: boolean;
}

function mapStatus(r: ApiVerificationStatus): VerificationStatusInfo {
  return {
    status: (r.status as VerificationStatusInfo['status']) || 'unsubmitted',
    businessStatus: (r.businessStatus as VerificationStatusInfo['businessStatus']) || null,
    businessName: r.businessName,
    idNumber: r.idNumber,
    governmentIdDocument: r.governmentIdDocument,
    selfieDocument: r.selfieDocument,
    farmName: r.farmName,
    cropsOrLivestock: r.cropsOrLivestock,
    businessAddress: r.businessAddress,
    productCategoriesSold: r.productCategoriesSold,
    professionalCertificates: r.professionalCertificates,
    portfolioDocument: r.portfolioDocument,
    bankAccountName: r.bankAccountName,
    bankAccountNumber: r.bankAccountNumber,
    bankName: r.bankName,
    cacNumber: r.cacNumber,
    cacDocument: r.cacDocument,
    declarationAccepted: r.declarationAccepted,
    note: r.note,
    businessNote: r.businessNote,
    submittedAt: r.submittedAt,
    reviewedAt: r.reviewedAt,
    businessReviewedAt: r.businessReviewedAt,
    verified: r.verified,
    businessVerified: r.businessVerified,
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
  status: string | null;
  businessStatus: string | null;
  businessName: string | null;
  idNumber: string | null;
  governmentIdDocument: string | null;
  selfieDocument: string | null;
  farmName: string | null;
  cropsOrLivestock: string | null;
  businessAddress: string | null;
  productCategoriesSold: string | null;
  professionalCertificates: string | null;
  portfolioDocument: string | null;
  bankAccountName: string | null;
  bankAccountNumber: string | null;
  bankName: string | null;
  cacNumber: string | null;
  cacDocument: string | null;
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
      status: (v.status as PendingVerification['status']) || 'unsubmitted',
      businessStatus: (v.businessStatus as PendingVerification['businessStatus']) || null,
      businessName: v.businessName,
      idNumber: v.idNumber,
      governmentIdDocument: v.governmentIdDocument,
      selfieDocument: v.selfieDocument,
      farmName: v.farmName,
      cropsOrLivestock: v.cropsOrLivestock,
      businessAddress: v.businessAddress,
      productCategoriesSold: v.productCategoriesSold,
      professionalCertificates: v.professionalCertificates,
      portfolioDocument: v.portfolioDocument,
      bankAccountName: v.bankAccountName,
      bankAccountNumber: v.bankAccountNumber,
      bankName: v.bankName,
      cacNumber: v.cacNumber,
      cacDocument: v.cacDocument,
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
    showToast('Identity approved — Verified Seller badge granted.', 'success');
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
    showToast('Identity verification rejected.', 'info');
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to reject';
    showToast(message, 'error');
    return false;
  }
}

export async function approveBusinessVerification(userId: string): Promise<boolean> {
  try {
    await api.put(`/api/admin/verifications/${userId}/approve-business`);
    showToast('Business approved — Registered Business badge granted.', 'success');
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to approve';
    showToast(message, 'error');
    return false;
  }
}

export async function rejectBusinessVerification(userId: string, note: string): Promise<boolean> {
  try {
    await api.put(`/api/admin/verifications/${userId}/reject-business`, { note });
    showToast('Business verification rejected.', 'info');
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to reject';
    showToast(message, 'error');
    return false;
  }
}
