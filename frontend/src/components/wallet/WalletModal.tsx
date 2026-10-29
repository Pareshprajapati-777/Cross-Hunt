import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import confetti from 'canvas-confetti';
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
  Copy,
  Check,
  ArrowLeft,
  ArrowRight,
  Smartphone,
} from 'lucide-react';
import { getWalletSummary, topupWallet, WalletSummaryResponse } from '../../api/wallet';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'TRANSACTIONS' | 'ADD_FUNDS';
  onNavigateToBooking?: (bookingId: string) => void;
}

export const WalletModal: React.FC<WalletModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'TRANSACTIONS',
  onNavigateToBooking,
}) => {
  const [data, setData] = useState<WalletSummaryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'TRANSACTIONS' | 'ADD_FUNDS'>('TRANSACTIONS');
  const [activeTab, setActiveTab] = useState<'ALL' | 'REFUND' | 'DEBIT'>('ALL');
  const [topupAmount, setTopupAmount] = useState<string>('500');
  const [isTopupLoading, setIsTopupLoading] = useState(false);
  const [topupSuccessMsg, setTopupSuccessMsg] = useState<string | null>(null);
  const [topupErrorMsg, setTopupErrorMsg] = useState<string | null>(null);

  // QR Code payment flow states
  const [isQrStep, setIsQrStep] = useState(false);
  const [pendingAmount, setPendingAmount] = useState<number>(0);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [utrNumber, setUtrNumber] = useState('');
  const [timeLeft, setTimeLeft] = useState(600);

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
      setIsQrStep(false);
      setCopiedUpi(false);
      setTimeLeft(600);
      setUtrNumber('');
      if (initialTab) {
        setViewMode(initialTab);
      }
    }
  }, [isOpen, initialTab]);

  // 10-Minute countdown timer for Dynamic UPI QR
  useEffect(() => {
    if (!isOpen || !isQrStep || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, isQrStep, timeLeft]);

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

  const handleInitiateQr = (amountToAdd?: number) => {
    const amt = amountToAdd ?? parseFloat(topupAmount);
    if (!amt || isNaN(amt) || amt <= 0) {
      setTopupErrorMsg('Please enter a valid amount greater than ₹0.');
      return;
    }
    if (amt > 500000) {
      setTopupErrorMsg('Maximum single top-up limit cannot exceed ₹5,00,000.');
      return;
    }
    setTopupErrorMsg(null);
    setTopupSuccessMsg(null);
    setPendingAmount(amt);
    setTopupAmount(amt.toString());
    setTimeLeft(600);
    setIsQrStep(true);
  };

  const handlePaymentDone = async () => {
    if (!pendingAmount || pendingAmount <= 0) return;
    setIsTopupLoading(true);
    setTopupErrorMsg(null);
    try {
      const ref = utrNumber.trim() ? `UTR-${utrNumber.trim()}` : `UPI-${Date.now().toString(36).toUpperCase()}`;
      await topupWallet(pendingAmount, 'UPI QR Payment', ref);

      try {
        confetti({
          particleCount: 130,
          spread: 75,
          origin: { y: 0.5 },
          colors: ['#10b981', '#059669', '#34d399', '#38bdf8', '#0284c7'],
        });
      } catch {}

      setTopupSuccessMsg(`₹${pendingAmount.toLocaleString('en-IN')} has been added to your wallet successfully!`);
      setIsQrStep(false);
      setUtrNumber('');
      setTopupAmount('500');
      await fetchSummary();
      setTimeout(() => setTopupSuccessMsg(null), 5000);
    } catch (err: any) {
      setTopupErrorMsg(err?.message || 'Failed to add funds to wallet. Please try again.');
    } finally {
      setIsTopupLoading(false);
    }
  };

  const handleCopyUpi = () => {
    try {
      navigator.clipboard.writeText('cruisehunt@razorpay');
      setCopiedUpi(true);
      setTimeout(() => setCopiedUpi(false), 2000);
    } catch {}
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
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
        <div className="relative px-6 py-4 bg-gradient-to-r from-sky-900 via-blue-900 to-indigo-950 text-white flex items-center justify-between border-b border-sky-700/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-amber-300 shadow-inner">
              <Wallet className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold tracking-tight text-white">
                  {viewMode === 'TRANSACTIONS'
                    ? 'Wallet Transactions'
                    : isQrStep
                    ? `Scan & Pay ₹${pendingAmount.toLocaleString('en-IN')}`
                    : 'Add Funds to Wallet'}
                </h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                  {viewMode === 'TRANSACTIONS'
                    ? 'Live Ledger'
                    : isQrStep
                    ? 'UPI QR Code'
                    : 'Instant Top-Up'}
                </span>
              </div>
              <p className="text-xs text-sky-200">
                {viewMode === 'TRANSACTIONS'
                  ? 'Complete history of booking debits, top-ups & ride refunds'
                  : isQrStep
                  ? 'Scan the QR code and click "Payment Done" to credit your wallet'
                  : 'Fast checkout & zero gateway fee digital top-up'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">

          {/* Hero Balance Summary Card */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-700 to-cyan-800 p-5 text-white shadow-lg">
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-100 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  Available Wallet Money
                </span>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-xl font-bold text-emerald-200">₹</span>
                  <span className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                    {balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="mt-1.5 flex items-center gap-3 text-xs text-emerald-100/90 font-medium">
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" /> 100% Safe &amp; Verified
                  </span>
                  <span>•</span>
                  <span>₹0 Gateway Fees</span>
                </div>
              </div>

              {/* Total Refunds Counter */}
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/15 min-w-[170px] self-start sm:self-auto">
                <div className="flex items-center gap-1.5 text-xs text-emerald-200 font-medium">
                  <RotateCcw className="w-3.5 h-3.5 text-amber-300" />
                  <span>Ride Refunds Received</span>
                </div>
                <div className="mt-0.5 text-base sm:text-lg font-bold text-white">
                  ₹{(data?.total_refunds_received ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
                <div className="text-[10px] text-emerald-200/80">From cancelled rides &amp; tours</div>
              </div>
            </div>
          </div>

          {/* VIEW 1: ONLY TRANSACTIONS (When "View Transaction" is active) */}
          {viewMode === 'TRANSACTIONS' ? (
            <div className="space-y-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-sky-600" />
                  <span>Transaction History</span>
                  <span className="text-xs font-normal text-slate-500">
                    ({data?.transactions_count ?? 0})
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
                <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-sky-600" />
                  <span className="text-xs">Loading transaction history...</span>
                </div>
              ) : filteredTransactions.length === 0 ? (
                <div className="py-10 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                  <RotateCcw className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">No transactions found</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    When you cancel a ride, tour, or use your wallet for booking payments, all transaction records will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
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
                                {tx.created_at
                                  ? new Date(tx.created_at).toLocaleString('en-IN', {
                                      dateStyle: 'medium',
                                      timeStyle: 'short',
                                    })
                                  : ''}
                              </span>
                              {tx.booking_code && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (onNavigateToBooking && tx.booking_code) {
                                      onNavigateToBooking(tx.booking_code);
                                      onClose();
                                    }
                                  }}
                                  className="font-mono text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
                                >
                                  #{tx.booking_code}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right Amount */}
                        <div className="text-right shrink-0">
                          <div
                            className={`text-sm font-extrabold ${
                              isCredit
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {isCredit ? '+' : '-'}₹
                            {tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </div>
                          <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">
                            Bal: ₹{tx.balance_after.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* VIEW 2: ONLY ADD FUNDS (When "+ Add Funds" is active) */
            <div className="space-y-4 animate-fade-in">
              {isQrStep ? (
                /* QR STEP: SCAN QR & CLICK PAYMENT DONE */
                <div className="rounded-2xl border-2 border-emerald-400/50 bg-gradient-to-b from-sky-50/60 to-emerald-50/40 dark:from-slate-800/80 dark:to-slate-800/40 p-5 space-y-4 animate-fade-in text-center">
                  {/* Step Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => setIsQrStep(false)}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-700 hover:text-sky-800 dark:text-sky-400 cursor-pointer transition"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Change Amount</span>
                    </button>
                    <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-lg border border-amber-200 dark:border-amber-800">
                      <Clock className="w-3.5 h-3.5 text-amber-500" />
                      <span>QR Valid: {formatTimer(timeLeft)}</span>
                    </span>
                  </div>

                  {/* Amount Headline */}
                  <div>
                    <span className="text-[10px] uppercase font-mono font-black tracking-widest px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 inline-block">
                      UPI QR Top-Up
                    </span>
                    <div className="mt-2 text-3xl sm:text-4xl font-black text-slate-900 dark:text-white font-serif">
                      ₹{pendingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                      Scan the QR Code using any UPI App &amp; click <strong className="text-emerald-700 dark:text-emerald-300">&quot;Payment Done&quot;</strong> below
                    </p>
                  </div>

                  {/* QR Code Container */}
                  <div className="inline-block p-4 bg-white rounded-2xl shadow-md border-2 border-sky-200/80 mx-auto">
                    <QRCodeSVG
                      value={`upi://pay?pa=cruisehunt@razorpay&pn=Cruise%20Hunt%20Maritime&am=${pendingAmount}&cu=INR&tn=CruiseHunt%20Wallet%20Topup`}
                      size={190}
                      level="H"
                      marginSize={2}
                      fgColor="#051833"
                    />
                  </div>

                  {/* Supported UPI Apps */}
                  <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-slate-600 dark:text-slate-300 flex-wrap">
                    <span className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 shadow-2xs">Google Pay</span>
                    <span className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 shadow-2xs">PhonePe</span>
                    <span className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 shadow-2xs">Paytm</span>
                    <span className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 shadow-2xs">BHIM UPI</span>
                  </div>

                  {/* UPI ID Strip with Copy */}
                  <div className="bg-white dark:bg-slate-800/90 rounded-xl p-3 border border-slate-200 dark:border-slate-700 max-w-md mx-auto flex items-center justify-between gap-3 text-left shadow-2xs">
                    <div>
                      <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">
                        Official Merchant UPI ID
                      </span>
                      <span className="font-mono font-black text-xs text-slate-800 dark:text-slate-200">
                        cruisehunt@razorpay
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyUpi}
                      className="px-3 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-800 dark:bg-slate-700 dark:text-sky-300 text-xs font-bold transition flex items-center gap-1 cursor-pointer border border-sky-200 dark:border-slate-600"
                    >
                      {copiedUpi ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>



                  {topupErrorMsg && (
                    <div className="flex items-center gap-1.5 text-xs text-rose-700 dark:text-rose-400 font-semibold bg-rose-50 dark:bg-rose-950/40 p-3 rounded-xl border border-rose-200 dark:border-rose-800 animate-fade-in text-left">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                      <span>{topupErrorMsg}</span>
                    </div>
                  )}

                  {/* PROMINENT "Payment Done" BUTTON */}
                  <div className="pt-2 max-w-md mx-auto">
                    <button
                      type="button"
                      onClick={handlePaymentDone}
                      disabled={isTopupLoading}
                      className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-sm shadow-lg shadow-emerald-600/30 transition transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer flex items-center justify-center gap-2.5 disabled:opacity-50"
                    >
                      {isTopupLoading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin text-white" />
                          <span>Verifying Payment &amp; Adding Funds...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-5 h-5 text-emerald-200" />
                          <span>Payment Done</span>
                        </>
                      )}
                    </button>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-2">
                      Click &quot;Payment Done&quot; immediately after making payment to credit ₹{pendingAmount.toLocaleString('en-IN')} to your wallet.
                    </p>
                  </div>
                </div>
              ) : (
                /* STEP 1: SELECT AMOUNT */
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <PlusCircle className="w-4 h-4 text-emerald-600" />
                      Add Money to Cruise-Hunt Wallet
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium">Instant UPI QR Payment</span>
                  </div>

                  {/* Quick preset buttons */}
                  <div>
                    <span className="text-[11px] font-semibold text-slate-500 block mb-2">
                      Choose Preset Amount:
                    </span>
                    <div className="grid grid-cols-4 gap-2">
                      {[500, 1000, 2000, 5000].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => handleInitiateQr(amt)}
                          className="py-2.5 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-emerald-50 hover:border-emerald-400 dark:hover:bg-slate-700/80 text-xs font-bold text-slate-800 dark:text-slate-200 transition shadow-2xs hover:shadow-xs cursor-pointer text-center"
                        >
                          +₹{amt.toLocaleString('en-IN')}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom amount input */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-500 block">
                      Or Enter Custom Amount:
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                          ₹
                        </span>
                        <input
                          type="number"
                          placeholder="e.g. 2500"
                          value={topupAmount}
                          onChange={(e) => setTopupAmount(e.target.value)}
                          className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                          min="1"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleInitiateQr()}
                        className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition cursor-pointer flex items-center gap-1.5 shrink-0"
                      >
                        <span>Proceed to Pay</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {topupSuccessMsg && (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800 animate-fade-in">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                      <span>{topupSuccessMsg}</span>
                    </div>
                  )}
                  {topupErrorMsg && (
                    <div className="flex items-center gap-1.5 text-xs text-rose-700 dark:text-rose-400 font-semibold bg-rose-50 dark:bg-rose-950/40 p-3 rounded-xl border border-rose-200 dark:border-rose-800 animate-fade-in">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                      <span>{topupErrorMsg}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Policy Explainer */}
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-900 dark:text-amber-200 text-xs leading-relaxed">
                <RotateCcw className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold">Cancellation Refund Policy: </strong>
                  Whenever you cancel an upcoming ride, vessel charter, or water tour, 100% of the refundable amount is instantly credited directly into this wallet balance without any waiting period.
                </div>
              </div>
            </div>
          )}
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
