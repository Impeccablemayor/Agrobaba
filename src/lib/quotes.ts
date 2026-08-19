import { showToast } from './toastBus';
import { api } from './api';
import type { AcceptedQuote, QuoteRequest } from '../types';

export interface RequestQuoteInput {
  productId: string;
  requestedQuantity?: number | string | null;
  buyerNotes?: string;
  deliveryLocation?: string;
}

export interface SendOfferInput {
  quantity: number | string;
  pricePerUnit: number | string;
  deliveryFee?: number | string;
  additionalFees?: number | string;
  notes?: string;
  expiresAt?: string | null;
}

export async function requestQuote(data: RequestQuoteInput): Promise<QuoteRequest | false> {
  try {
    const quote = await api.post<QuoteRequest>('/api/quotes', {
      productId: Number(data.productId),
      requestedQuantity: data.requestedQuantity ? Number(data.requestedQuantity) : null,
      buyerNotes: data.buyerNotes || '',
      deliveryLocation: data.deliveryLocation || '',
    });
    showToast('Quote request sent!', 'success');
    return quote;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to send quote request';
    showToast(message, 'error');
    return false;
  }
}

export async function sendOffer(quoteId: string, data: SendOfferInput): Promise<QuoteRequest | false> {
  try {
    const quote = await api.post<QuoteRequest>(`/api/quotes/${quoteId}/offer`, {
      quantity: Number(data.quantity),
      pricePerUnit: Number(data.pricePerUnit),
      deliveryFee: data.deliveryFee ? Number(data.deliveryFee) : 0,
      additionalFees: data.additionalFees ? Number(data.additionalFees) : 0,
      notes: data.notes || '',
      expiresAt: data.expiresAt || null,
    });
    showToast('Offer sent!', 'success');
    return quote;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to send offer';
    showToast(message, 'error');
    return false;
  }
}

export async function acceptOffer(quoteId: string): Promise<AcceptedQuote | false> {
  try {
    const accepted = await api.post<AcceptedQuote>(`/api/quotes/${quoteId}/accept`);
    showToast('Offer accepted! Added to your cart.', 'success');
    return accepted;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to accept this offer';
    showToast(message, 'error');
    return false;
  }
}

export async function rejectOffer(quoteId: string): Promise<boolean> {
  try {
    await api.post(`/api/quotes/${quoteId}/reject`);
    showToast('Offer rejected.', 'info');
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to reject this offer';
    showToast(message, 'error');
    return false;
  }
}

export async function cancelQuote(quoteId: string): Promise<boolean> {
  try {
    await api.post(`/api/quotes/${quoteId}/cancel`);
    showToast('Quote request cancelled.', 'info');
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to cancel this quote request';
    showToast(message, 'error');
    return false;
  }
}

export async function getQuoteById(id: string): Promise<QuoteRequest | null> {
  try {
    return await api.get<QuoteRequest>(`/api/quotes/${id}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load quote request';
    showToast(message, 'error');
    return null;
  }
}

export async function getMyQuotes(): Promise<QuoteRequest[]> {
  try {
    return await api.get<QuoteRequest[]>('/api/quotes/me');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load your quote requests';
    showToast(message, 'error');
    return [];
  }
}

export async function getReceivedQuotes(): Promise<QuoteRequest[]> {
  try {
    return await api.get<QuoteRequest[]>('/api/quotes/received');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load received quote requests';
    showToast(message, 'error');
    return [];
  }
}
