import React, { useState, useEffect } from 'react';
import {
  Wallet,
  X,
  ArrowDownLeft,
  ArrowUpRight,
  PlusCircle,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Clock,
  ExternalLink
} from 'lucide-react';
import { getWalletSummary, topupWallet, WalletSummaryResponse, WalletTransactionItem } from '../../api/wallet';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToBooking?: (bookingId: string) => void;
}

export const WalletModal: React.FC<WalletModalProps> = ({ isOpen, onClose, onNavigateToBooking }) => {
  const [data, setData] = useState<WalletSummaryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'ALL' | 'REFUND' | 'DEBIT'>('ALL');
  const [topupAmount, setTopupAmount] = useState<string>('');
  const [isTopupLoading, setIsTopupLoading] = useState(false);
  const [topupSuccessMsg, setTopupSuccessMsg] = useState<string | null>(null);
  const [topupErrorMsg, setTopupErrorMsg] = useState<string | null>(null);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const res = await getWalletSummary();
      setData(res);
    } catch (err) {
      console.error('Failed to load wallet summary', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSummary();
      setTopupSuccessMsg(null);
      setTopupErrorMsg(null);
    }
  }, [isOpen]);

  // Listen for global wallet updates
  useEffect(() => {
    const handleWalletUpdated = () => {
      fetchSummary();
    };
    window.addEventListener('wallet-updated', handleWalletUpdated);
    return () => {
      window.removeEventListener('wallet-updated', handleWalletUpdated);
    };
  }, []);

  if (!isOpen) return null;

  const handleTopup = async (amountToAdd?: number) => {
    const amt = amountToAdd ?? parseFloat(topupAmount);
    if (!amt || isNaN(amt) || amt <= 0) {
      setTopupErrorMsg('Please enter a valid amount greater than ₹0.');
      return;
    }
    setTopupErrorMsg(null);
    setTopupSuccessMsg(null);
    setIsTopupLoading(true);
    try {
      const res = await topupWallet(amt, 'UPI / Instant Bank');
      setTopupSuccessMsg(`₹${amt.toLocaleString('en-IN')} added to your wallet successfully!`);
      setTopupAmount('');
      await fetchSummary();
      setTimeout(() => setTopupSuccessMsg(null), 4000);
    } catch (err: any) {
      setTopupErrorMsg(err?.message || 'Failed to add funds to wallet.');
    } finally {
      setIsTopupLoading(false);
    }
  };

  const filteredTransactions = (data?.transactions || []).filter((tx) => {
    if (activeTab === 'REFUND') return tx.transaction_type === 'CREDIT' && tx.source.includes('REFUND');
    if (activeTab === 'DEBIT') return tx.transaction_type === 'DEBIT';
    return true;
  });

  const balance = data?.wallet_balance ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-sky-100 dark:border-slate-800 overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative px-6 py-5 bg-gradient-to-r from-sky-900 via-blue-900 to-indigo-950 text-white flex items-center justify-between border-b border-sky-700/30">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-amber-300 shadow-inner">
              <Wallet className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold tracking-tight text-white">Cruise-Hunt Wallet</h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                  Instant Refund Ready
                </span>
              </div>
              <p className="text-xs text-sky-200">Automatic refund for cancelled rides, tours &amp; fast checkout</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Hero Balance Card */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-700 to-cyan-800 p-6 text-white shadow-xl">
            <div className="absolute right-0 top-0 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none -mr-16 -mt-16" />
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-100 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  Available Wallet Money
                </span>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-emerald-200">₹</span>
                  <span className="text-4xl font-extrabold tracking-tight">
                    {balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-4 text-xs text-emerald-100/90 font-medium">
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" /> 100% Safe &amp; Verified
                  </span>
                  <span>•</span>
                  <span>₹0 Gateway Fees</span>
                </div>
              </div>

              {/* Total Refunds Counter */}
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/15 min-w-[170px]">
                <div className="flex items-center gap-1.5 text-xs text-emerald-200 font-medium">
                  <RotateCcw className="w-3.5 h-3.5 text-amber-300" />
                  <span>Ride Refunds Received</span>
                </div>
                <div className="mt-1 text-lg font-bold text-white">
                  ₹{(data?.total_refunds_received ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
                <div className="text-[10px] text-emerald-200/80">From cancelled rides &amp; tours</div>
              </div>
            </div>
          </div>

          {/* Refund Guarantee Badge */}
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-900 dark:text-amber-200 text-xs leading-relaxed">
            <RotateCcw className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold">Cancellation Refund Policy: </strong>
              Whenever you cancel an upcoming ride, vessel charter, or water tour, 100% of the refundable amount is instantly credited directly into this wallet balance without any waiting period.
            </div>
          </div>

          {/* Quick Top-up Section */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <PlusCircle className="w-4 h-4 text-emerald-600" />
                Add Money to Wallet
              </span>
              <span className="text-[11px] text-slate-500">Instant UPI &amp; Cards</span>
            </div>

            {/* Quick preset buttons */}
            <div className="grid grid-cols-4 gap-2">
              {[500, 1000, 2000, 5000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => handleTopup(amt)}
                  disabled={isTopupLoading}
                  className="py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-emerald-50 hover:border-emerald-400 dark:hover:bg-slate-700/80 text-xs font-bold text-slate-800 dark:text-slate-200 transition shadow-2xs hover:shadow-xs cursor-pointer text-center"
                >
                  +₹{amt.toLocaleString('en-IN')}
                </button>
              ))}
            </div>

            {/* Custom amount input */}
            <div className="flex items-center gap-2 pt-1">
              <div className="relative flex-1">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                <input
                  type="number"
                  placeholder="Custom amount (e.g. 2500)"
                  value={topupAmount}
                  onChange={(e) => setTopupAmount(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  min="1"
                />
              </div>
              <button
                type="button"
                onClick={() => handleTopup()}
                disabled={isTopupLoading}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5 shrink-0"
              >
                {isTopupLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Adding...</span>
                  </>
                ) : (
                  <>
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Add Funds</span>
                  </>
                )}
              </button>
            </div>

            {topupSuccessMsg && (
              <div className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/40 p-2 rounded-lg border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{topupSuccessMsg}</span>
              </div>
            )}
            {topupErrorMsg && (
              <div className="flex items-center gap-1.5 text-xs text-rose-700 dark:text-rose-400 font-semibold bg-rose-50 dark:bg-rose-950/40 p-2 rounded-lg border border-rose-200 dark:border-rose-800">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{topupErrorMsg}</span>
              </div>
            )}
          </div>

          {/* Transaction History */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-sky-600" />
                <span>Wallet History</span>
                <span className="text-xs font-normal text-slate-500">
                  ({data?.transactions_count ?? 0} transactions)
                </span>
              </h4>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setActiveTab('ALL')}
                  className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                    activeTab === 'ALL'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('REFUND')}
                  className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                    activeTab === 'REFUND'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-emerald-600'
                  }`}
                >
                  Refunds
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('DEBIT')}
                  className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                    activeTab === 'DEBIT'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Payments
                </button>
              </div>
            </div>

            {loading ? (
              <div className="py-8 flex flex-col items-center justify-center text-slate-400 gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-sky-600" />
                <span className="text-xs">Loading transaction history...</span>
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="py-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                <RotateCcw className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">No transactions found</p>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  When you cancel a ride, tour, or add money, your transactions will appear here instantly.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredTransactions.map((tx) => {
                  const isCredit = tx.transaction_type === 'CREDIT';
                  const isRefund = tx.source.includes('REFUND');
                  return (
                    <div
                      key={tx.id}
                      className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800/70 hover:border-slate-300 dark:hover:border-slate-700 transition flex items-center justify-between gap-3 shadow-2xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            isRefund
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400'
                              : isCredit
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                              : 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400'
                          }`}
                        >
                          {isCredit ? (
                            <ArrowDownLeft className="w-5 h-5" />
                          ) : (
                            <ArrowUpRight className="w-5 h-5" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                              {isRefund
                                ? 'Ride Cancellation Refund'
                                : tx.source === 'TOPUP'
                                ? 'Wallet Funds Added'
                                : 'Ride / Tour Payment'}
                            </span>
                            {isRefund && (
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                                Refund
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            {tx.description}
                          </p>
                          <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-1">
                            <span>
                              {tx.created_at ? new Date(tx.created_at).toLocaleString('en-IN', {
                                dateStyle: 'medium',
                                timeStyle: 'short'
                              }) : ''}
                            </span>
                            {tx.booking_code && (
                              <span className="font-mono text-sky-600 dark:text-sky-400">
                                #{tx.booking_code}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right Amount */}
                      <div className="text-right shrink-0">
                        <div
                          className={`text-sm font-extrabold ${
                            isCredit ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {isCredit ? '+' : '-'}₹{tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          Bal: ₹{tx.balance_after.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Money in your Cruise-Hunt wallet never expires.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs font-bold transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
