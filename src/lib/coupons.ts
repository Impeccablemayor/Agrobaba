import { api } from './api';
import { showToast } from './toastBus';
import type { Coupon } from '../types';

interface ApiCoupon {
  id: number;
  code: string;
  discountType: string;
  discountValue: number;
  maxUses: number | null;
  usedCount: number;
  expiresAt: string | null;
  active: boolean;
  createdAt: string;
}

function mapCoupon(c: ApiCoupon): Coupon {
  return {
    id: String(c.id),
    code: c.code,
    discountType: c.discountType as Coupon['discountType'],
    discountValue: c.discountValue,
    maxUses: c.maxUses,
    usedCount: c.usedCount,
    expiresAt: c.expiresAt,
    active: c.active,
    createdAt: c.createdAt,
  };
}

/** Validates a coupon for checkout preview — does not consume a use. Returns null (with a toast) if invalid. */
export async function previewCoupon(code: string): Promise<Coupon | null> {
  try {
    const data = await api.get<ApiCoupon>(`/api/coupons/validate/${encodeURIComponent(code)}`);
    return mapCoupon(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid coupon code';
    showToast(message, 'error');
    return null;
  }
}

export async function getAllCouponsAdmin(): Promise<Coupon[]> {
  try {
    const data = await api.get<ApiCoupon[]>('/api/admin/coupons');
    return (data || []).map(mapCoupon);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load coupons';
    showToast(message, 'error');
    return [];
  }
}

export interface CreateCouponInput {
  code: string;
  discountType: 'percent' | 'fixed';
  discountValue: number;
  maxUses: number | null;
  expiresAt: string | null;
}

export async function createCoupon(input: CreateCouponInput): Promise<Coupon | false> {
  try {
    const data = await api.post<ApiCoupon>('/api/admin/coupons', input);
    showToast('Coupon created!', 'success');
    return mapCoupon(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to create coupon';
    showToast(message, 'error');
    return false;
  }
}

export async function deleteCoupon(id: string): Promise<boolean> {
  try {
    await api.delete(`/api/admin/coupons/${id}`);
    showToast('Coupon removed.', 'success');
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to delete coupon';
    showToast(message, 'error');
    return false;
  }
}
