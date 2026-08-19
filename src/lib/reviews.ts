import { showToast } from './toastBus';
import { api, ApiError } from './api';
import type { Review } from '../types';

export interface CreateReviewInput {
  orderId: string;
  productId: string;
  rating: number;
  comment?: string;
}

export async function createReview(input: CreateReviewInput): Promise<Review | false> {
  try {
    const review = await api.post<Review>('/api/reviews', input);
    showToast('Review submitted — thank you!', 'success');
    return review;
  } catch (error) {
    const message = error instanceof ApiError ? error.message : 'Unable to submit review';
    showToast(message, 'error');
    return false;
  }
}

export async function getProductReviews(productId: string): Promise<Review[]> {
  try {
    return await api.get<Review[]>(`/api/products/${productId}/reviews`);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load reviews';
    showToast(message, 'error');
    return [];
  }
}
