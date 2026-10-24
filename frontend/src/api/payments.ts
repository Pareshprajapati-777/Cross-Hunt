import { apiRequest } from './client';

export interface PaymentConfig {
  razorpay_key_id: string;
  merchant_name: string;
  upi_id: string;
  currency: string;
  is_test_mode: boolean;
}

export interface PaymentOrder {
  success: boolean;
  order_id: string;
  amount: number;
  currency: string;
  key_id: string;
  merchant_name: string;
  receipt?: string;
}

export interface VerifyPaymentPayload {
  razorpay_payment_id?: string;
  razorpay_order_id?: string;
  razorpay_signature?: string;
  upi_reference?: string;
  amount?: number;
}

export interface VerifyPaymentResult {
  success: boolean;
  status: string;
  method: string;
  transaction_id: string;
  message: string;
}

export async function getPaymentConfig(): Promise<PaymentConfig> {
  try {
    return await apiRequest<PaymentConfig>('/api/payments/config/');
  } catch (e) {
    // Fallback safe defaults if offline/disconnected
    return {
      razorpay_key_id: 'rzp_test_CrossHuntMaritime',
      merchant_name: 'Cross Hunt Maritime',
      upi_id: 'crosshunt@razorpay',
      currency: 'INR',
      is_test_mode: true,
    };
  }
}

export async function createPaymentOrder(
  amount: number,
  receipt?: string,
  notes?: Record<string, any>
): Promise<PaymentOrder> {
  return apiRequest<PaymentOrder>('/api/payments/create-order/', {
    method: 'POST',
    body: JSON.stringify({ amount, receipt, notes }),
  });
}

export async function verifyPayment(
  payload: VerifyPaymentPayload
): Promise<VerifyPaymentResult> {
  return apiRequest<VerifyPaymentResult>('/api/payments/verify/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
