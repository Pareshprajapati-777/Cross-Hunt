import { apiRequest } from './client';
import { Offer } from './types';

export interface CouponValidationResult {
  valid: boolean;
  code?: string;
  title?: string;
  description?: string;
  discount_amount: number;
  net_amount: number;
  error?: string;
}

export async function getActiveOffers(): Promise<Offer[]> {
  const res = await apiRequest<{ offers: Offer[] }>('/api/offers/');
  return res.offers || [];
}

export async function validateCoupon(code: string, amount: number): Promise<CouponValidationResult> {
  return apiRequest<CouponValidationResult>('/api/offers/validate/', {
    method: 'POST',
    body: JSON.stringify({ code, amount }),
  });
}
