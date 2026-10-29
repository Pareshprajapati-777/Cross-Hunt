import { apiRequest } from './client';

export interface WalletTransactionItem {
  id: number;
  user_id: number;
  booking_id: number | null;
  booking_code: string;
  transaction_type: 'CREDIT' | 'DEBIT';
  amount: number;
  balance_after: number;
  source: string;
  description: string;
  reference_id: string;
  status: string;
  created_at: string;
}

export interface WalletSummaryResponse {
  success: boolean;
  wallet_balance: number;
  currency: string;
  currency_symbol: string;
  total_credits: number;
  total_debits: number;
  total_refunds_received: number;
  transactions_count: number;
  transactions: WalletTransactionItem[];
}

export async function getWalletSummary(): Promise<WalletSummaryResponse> {
  return apiRequest<WalletSummaryResponse>('/api/wallet/summary', { bypassCache: true });
}

export async function getWalletTransactions(
  limit = 50,
  offset = 0
): Promise<{
  success: boolean;
  total: number;
  wallet_balance: number;
  transactions: WalletTransactionItem[];
}> {
  return apiRequest(`/api/wallet/transactions?limit=${limit}&offset=${offset}`, { bypassCache: true });
}

export async function topupWallet(
  amount: number,
  paymentMethod = 'UPI / NetBanking',
  referenceId?: string
): Promise<{
  success: boolean;
  message: string;
  wallet_balance: number;
  transaction?: WalletTransactionItem;
}> {
  const res = await apiRequest('/api/wallet/topup', {
    method: 'POST',
    body: JSON.stringify({
      amount,
      payment_method: paymentMethod,
      reference_id: referenceId,
    }),
  });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('wallet-updated', { detail: res }));
  }
  return res;
}
