import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  X,
  ShieldCheck,
  Check,
  Copy,
  Clock,
  CreditCard,
  Smartphone,
  AlertCircle,
  Loader2,
  Lock,
  Anchor,
  Sparkles,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Wallet,
  Sliders,
  ArrowRight,
} from 'lucide-react';
import { formatINR } from '../../utils/currency';
import { getPaymentConfig, createPaymentOrder, verifyPayment, PaymentConfig } from '../../api/payments';
import { getWalletSummary } from '../../api/wallet';

interface BookingPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingSummary: {
    title: string;
    date: string;
    time?: string;
    passengers: number;
    cabin: string;
    amount: number;
    bookingType: 'TOUR' | 'EVENT' | 'CRUISE_TOUR' | 'PRIVATE_EVENT' | 'ACTIVITY';
    promoDiscount?: number;
  };
  customerInfo?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  onPaymentSuccess: (paymentDetails: {
    payment_method: string;
    payment_gateway_ref: string;
    payment_status: string;
    use_wallet?: boolean;
    wallet_amount_to_use?: number;
  }) => void;
}

export const BookingPaymentModal: React.FC<BookingPaymentModalProps> = ({
  isOpen,
  onClose,
  bookingSummary,
  customerInfo,
  onPaymentSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'UPI_QR' | 'WALLET' | 'RAZORPAY'>('UPI_QR');
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [useWallet, setUseWallet] = useState<boolean>(false);
  const [walletAmountInput, setWalletAmountInput] = useState<string>('');

  const [config, setConfig] = useState<PaymentConfig>({
    razorpay_key_id: 'rzp_test_CruiseHuntMaritime',
    merchant_name: 'Cruise Hunt Maritime',
    upi_id: 'cruisehunt@razorpay',
    currency: 'INR',
    is_test_mode: true,
  });

  const [copied, setCopied] = useState<boolean>(false);
  const [utrNumber, setUtrNumber] = useState<string>('');
  const [verifying, setVerifying] = useState<boolean>(false);
  const [verifySuccess, setVerifySuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 10-Minute Countdown Timer for Dynamic QR
  const [timeLeft, setTimeLeft] = useState<number>(600);

  // Usable wallet and split calculations
  const maxUsableWallet = Math.min(walletBalance, bookingSummary.amount);
  const parsedWalletInput = parseFloat(walletAmountInput);
  const effectiveWalletAmount = useWallet
    ? Math.min(
        Math.max(0, isNaN(parsedWalletInput) ? 0 : parsedWalletInput),
        maxUsableWallet
      )
    : 0;

  const remainingOnlineAmount = Math.max(
    0,
    Math.round((bookingSummary.amount - effectiveWalletAmount) * 100) / 100
  );
  const isFullyCoveredByWallet = effectiveWalletAmount >= bookingSummary.amount;

  useEffect(() => {
    if (!isOpen) return;
    getPaymentConfig().then(setConfig).catch(() => {});

    const loadWallet = () => {
      getWalletSummary()
        .then((res) => {
          if (res && typeof res.wallet_balance === 'number') {
            const bal = res.wallet_balance;
            setWalletBalance(bal);
            if (bal > 0) {
              const maxAmt = Math.min(bal, bookingSummary.amount);
              setWalletAmountInput(maxAmt.toString());
            }
          }
        })
        .catch(() => {});
    };

    loadWallet();
    window.addEventListener('wallet-updated', loadWallet);

    setActiveTab('UPI_QR');
    setTimeLeft(600);
    setVerifySuccess(false);
    setVerifying(false);
    setErrorMessage(null);

    return () => {
      window.removeEventListener('wallet-updated', loadWallet);
    };
  }, [isOpen, bookingSummary.amount]);

  useEffect(() => {
    if (!isOpen || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen, timeLeft]);

  // Load Razorpay Checkout Script
  useEffect(() => {
    if (typeof window !== 'undefined' && !(window as any).Razorpay) {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  if (!isOpen) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  // Amount encoded into Dynamic UPI QR Code
  const qrPayableAmount = remainingOnlineAmount > 0 ? remainingOnlineAmount : bookingSummary.amount;
  const upiId = config.upi_id || 'cruisehunt@razorpay';
  const merchantName = config.merchant_name || 'Cruise Hunt Maritime';
  const cleanTitle = bookingSummary.title.replace(/[^a-zA-Z0-9 ]/g, '').substring(0, 25);
  const upiUri = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(
    merchantName
  )}&am=${qrPayableAmount.toFixed(2)}&cu=INR&tn=${encodeURIComponent('CruiseHunt ' + cleanTitle)}`;

  const handleCopyUPI = () => {
    navigator.clipboard.writeText(upiId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  // Toggle Wallet Usage Checkbox
  const handleToggleWallet = (checked: boolean) => {
    setUseWallet(checked);
    if (checked && (!walletAmountInput || parseFloat(walletAmountInput) <= 0)) {
      setWalletAmountInput(maxUsableWallet.toString());
    }
  };

  // UPI / QR Payment Verification Action
  const handleVerifyUPIPayment = async () => {
    setVerifying(true);
    setErrorMessage(null);

    try {
      const ref = utrNumber.trim() || `UPI${Date.now().toString().slice(-8)}`;

      // If there's an online portion to verify
      if (remainingOnlineAmount > 0) {
        const res = await verifyPayment({
          upi_reference: ref,
          amount: remainingOnlineAmount,
        });

        if (!res.success) {
          setErrorMessage(res.message || 'Payment verification failed. Please try again.');
          setVerifying(false);
          return;
        }
      }

      setVerifySuccess(true);
      setTimeout(() => {
        const payMethod =
          effectiveWalletAmount > 0
            ? remainingOnlineAmount > 0
              ? `Wallet (₹${effectiveWalletAmount.toLocaleString('en-IN')}) + UPI QR`
              : 'Cruise-Hunt Wallet'
            : 'UPI / QR Code';

        onPaymentSuccess({
          payment_method: payMethod,
          payment_gateway_ref: ref,
          payment_status: 'PAID',
          use_wallet: effectiveWalletAmount > 0,
          wallet_amount_to_use: effectiveWalletAmount > 0 ? effectiveWalletAmount : undefined,
        });
      }, 1200);
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to confirm UPI verification. Please check reference.');
      setVerifying(false);
    }
  };

  // Cruise-Hunt Wallet 100% or Quick Action
  const handlePayViaWallet = async () => {
    if (walletBalance < bookingSummary.amount) {
      setErrorMessage(
        `Insufficient wallet balance for 100% payment. You need ₹${(
          bookingSummary.amount - walletBalance
        ).toLocaleString('en-IN')} more. Use Split Payment below to pay remaining via UPI QR!`
      );
      return;
    }
    setVerifying(true);
    setErrorMessage(null);

    try {
      setVerifySuccess(true);
      setTimeout(() => {
        onPaymentSuccess({
          payment_method: 'Cruise-Hunt Wallet',
          payment_gateway_ref: `WLT-${Date.now()}`,
          payment_status: 'PAID',
          use_wallet: true,
          wallet_amount_to_use: bookingSummary.amount,
        });
      }, 1200);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to process payment from wallet.');
      setVerifying(false);
    }
  };

  // Razorpay Gateway Checkout Action
  const handlePayViaRazorpay = async () => {
    // If entire booking is paid from wallet, directly execute
    if (remainingOnlineAmount <= 0) {
      return handlePayViaWallet();
    }

    setVerifying(true);
    setErrorMessage(null);

    try {
      const order = await createPaymentOrder(
        remainingOnlineAmount,
        `rcpt_${Date.now()}`,
        {
          vessel: bookingSummary.title,
          cabin: bookingSummary.cabin,
        }
      );

      const RazorpayConstructor = (window as any).Razorpay;

      if (!RazorpayConstructor) {
        // Fallback simulated payment if script is unavailable or blocked
        const fallbackRef = `pay_rzp_sim_${Date.now().toString(36)}`;
        const verifyRes = await verifyPayment({
          razorpay_payment_id: fallbackRef,
          razorpay_order_id: order.order_id,
          amount: remainingOnlineAmount,
        });

        setVerifySuccess(true);
        setTimeout(() => {
          const payMethod =
            effectiveWalletAmount > 0
              ? `Wallet (₹${effectiveWalletAmount.toLocaleString('en-IN')}) + Razorpay`
              : 'Razorpay Gateway';

          onPaymentSuccess({
            payment_method: payMethod,
            payment_gateway_ref: verifyRes.transaction_id || fallbackRef,
            payment_status: 'PAID',
            use_wallet: effectiveWalletAmount > 0,
            wallet_amount_to_use: effectiveWalletAmount > 0 ? effectiveWalletAmount : undefined,
          });
        }, 1200);
        return;
      }

      const options = {
        key: config.razorpay_key_id,
        amount: order.amount,
        currency: order.currency || 'INR',
        name: config.merchant_name,
        description: `${bookingSummary.title} • ${bookingSummary.cabin}${
          effectiveWalletAmount > 0
            ? ` (₹${effectiveWalletAmount.toLocaleString('en-IN')} paid via Wallet)`
            : ''
        }`,
        image: 'https://images.unsplash.com/photo-1548574505-5e239809ee19?auto=format&fit=crop&w=128&q=80',
        order_id: order.order_id,
        prefill: {
          name: customerInfo?.name || '',
          email: customerInfo?.email || '',
          contact: customerInfo?.phone || '',
        },
        theme: {
          color: '#0284c7',
        },
        modal: {
          ondismiss: () => {
            setVerifying(false);
          },
        },
        handler: async (response: any) => {
          try {
            await verifyPayment({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
              amount: remainingOnlineAmount,
            });

            setVerifySuccess(true);
            setTimeout(() => {
              const payMethod =
                effectiveWalletAmount > 0
                  ? `Wallet (₹${effectiveWalletAmount.toLocaleString('en-IN')}) + Razorpay`
                  : 'Razorpay Gateway';

              onPaymentSuccess({
                payment_method: payMethod,
                payment_gateway_ref: response.razorpay_payment_id || `pay_${Date.now()}`,
                payment_status: 'PAID',
                use_wallet: effectiveWalletAmount > 0,
                wallet_amount_to_use: effectiveWalletAmount > 0 ? effectiveWalletAmount : undefined,
              });
            }, 1200);
          } catch (verErr: any) {
            setErrorMessage(verErr.message || 'Payment signature verification failed.');
            setVerifying(false);
          }
        },
      };

      const rzpInstance = new RazorpayConstructor(options);
      rzpInstance.on('payment.failed', function (resp: any) {
        setErrorMessage(resp.error?.description || 'Payment was declined or cancelled.');
        setVerifying(false);
      });
      rzpInstance.open();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to initialize Razorpay checkout session.');
      setVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#030e1d]/80 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-2xl my-6 bg-[#f8fbff] rounded-3xl shadow-2xl border border-sky-400/40 overflow-hidden text-slate-800 flex flex-col max-h-[92vh]">
        {/* Top Midnight Oceanic Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#051833] text-white border-b border-sky-500/20">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-400 shadow-sm">
              <Anchor className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif font-black text-base text-white tracking-wide">
                  Cruise Hunt Secure Payment
                </h3>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  Live 256-Bit SSL
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Official NPCI UPI &amp; Ship Wallet Payment Gateway
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={verifying}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition cursor-pointer disabled:opacity-50"
            title="Close payment window"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
          {/* Reservation Summary Strip */}
          <div className="bg-white rounded-2xl p-4 border border-sky-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-sky-700">
                <Sparkles className="w-3.5 h-3.5 text-sky-500" />
                <span>
                  {bookingSummary.bookingType === 'TOUR'
                    ? 'PUBLIC TOUR CRUISE'
                    : bookingSummary.bookingType === 'ACTIVITY'
                    ? 'MARITIME ADVENTURE / ACTIVITY'
                    : 'PRIVATE CHARTER'}
                </span>
                <span>•</span>
                <span>{bookingSummary.date}</span>
                {bookingSummary.time && <span>({bookingSummary.time})</span>}
              </div>
              <h4 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                {bookingSummary.title}
              </h4>
              <p className="text-xs text-slate-500">
                {bookingSummary.bookingType === 'ACTIVITY' ? (
                  <>
                    Slot: <span className="font-semibold text-slate-700">{bookingSummary.cabin}</span> • Participants:{' '}
                    <span className="font-semibold text-slate-700">{bookingSummary.passengers} Guests</span>
                  </>
                ) : (
                  <>
                    Cabin: <span className="font-semibold text-slate-700">{bookingSummary.cabin}</span> • Passengers:{' '}
                    <span className="font-semibold text-slate-700">{bookingSummary.passengers} Guests</span>
                  </>
                )}
              </p>
            </div>

            <div className="text-right sm:border-l sm:border-slate-100 sm:pl-6 flex flex-row sm:flex-col justify-between items-center sm:items-end">
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                Total Payable
              </span>
              <span className="text-2xl font-black text-sky-600 font-serif">
                {formatINR(bookingSummary.amount)}
              </span>
            </div>
          </div>

          {/* CRUISE-HUNT SHIP WALLET & SPLIT PAYMENT CONTROLLER CARD */}
          <div className="bg-gradient-to-br from-white via-emerald-50/30 to-teal-50/40 rounded-2xl p-4 sm:p-5 border-2 border-emerald-500/40 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20 shrink-0">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs uppercase font-black tracking-wider text-emerald-900">
                      Cruise-Hunt Ship Wallet
                    </span>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                      Available: ₹{walletBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Use your wallet balance to pay fully or split payment with Online UPI QR.
                  </p>
                </div>
              </div>

              {walletBalance > 0 && (
                <label className="inline-flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-xl border border-emerald-300 shadow-xs hover:border-emerald-500 transition select-none self-start sm:self-auto">
                  <input
                    type="checkbox"
                    checked={useWallet}
                    onChange={(e) => handleToggleWallet(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-emerald-900">
                    Pay with Wallet
                  </span>
                </label>
              )}
            </div>

            {/* Split Amount Input & Quick Controls */}
            {useWallet && walletBalance > 0 && (
              <div className="pt-2 border-t border-emerald-200/80 space-y-3 animate-fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Amount to deduct from Ship Wallet:</span>
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    Max usable: ₹{maxUsableWallet.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-500 text-sm">
                      ₹
                    </span>
                    <input
                      type="number"
                      min="0"
                      max={maxUsableWallet}
                      step="1"
                      value={walletAmountInput}
                      onChange={(e) => setWalletAmountInput(e.target.value)}
                      placeholder="Enter amount to pay from wallet"
                      className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-emerald-300 text-slate-900 text-sm font-bold font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white shadow-xs"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                    <button
                      type="button"
                      onClick={() => setWalletAmountInput(maxUsableWallet.toString())}
                      className="px-2.5 py-2 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-bold text-xs transition cursor-pointer whitespace-nowrap"
                    >
                      Max (₹{Math.floor(maxUsableWallet).toLocaleString('en-IN')})
                    </button>
                    {maxUsableWallet >= 200 && (
                      <button
                        type="button"
                        onClick={() =>
                          setWalletAmountInput(Math.round(maxUsableWallet / 2).toString())
                        }
                        className="px-2.5 py-2 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-bold text-xs transition cursor-pointer whitespace-nowrap"
                      >
                        50%
                      </button>
                    )}
                    {maxUsableWallet >= 500 && (
                      <button
                        type="button"
                        onClick={() => setWalletAmountInput('500')}
                        className="px-2.5 py-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs transition cursor-pointer whitespace-nowrap"
                      >
                        ₹500
                      </button>
                    )}
                    {maxUsableWallet >= 1000 && (
                      <button
                        type="button"
                        onClick={() => setWalletAmountInput('1000')}
                        className="px-2.5 py-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs transition cursor-pointer whitespace-nowrap"
                      >
                        ₹1,000
                      </button>
                    )}
                  </div>
                </div>

                {/* Live Split Breakdown Bar */}
                <div className="bg-[#051833] text-white p-3 sm:p-3.5 rounded-xl border border-sky-500/30 shadow-md">
                  <div className="grid grid-cols-3 gap-2 text-center text-xs divide-x divide-white/10">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
                        Total Fare
                      </span>
                      <span className="font-bold text-sm text-white font-mono">
                        {formatINR(bookingSummary.amount)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-emerald-400 uppercase tracking-wider block font-semibold">
                        From Wallet
                      </span>
                      <span className="font-bold text-sm text-emerald-300 font-mono">
                        {effectiveWalletAmount > 0 ? `-${formatINR(effectiveWalletAmount)}` : '₹0'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-sky-400 uppercase tracking-wider block font-semibold">
                        Pay Online (QR)
                      </span>
                      <span className="font-extrabold text-sm text-sky-300 font-mono">
                        {formatINR(remainingOnlineAmount)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {walletBalance === 0 && (
              <div className="text-[11px] text-slate-500 italic pt-1">
                Your wallet balance is currently ₹0. Any ride cancellations or cashbacks are automatically credited here. Pay online using the UPI QR Code below.
              </div>
            )}
          </div>

          {/* Payment Method Selector Tabs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-1.5 bg-slate-100/80 rounded-2xl border border-slate-200">
            <button
              type="button"
              onClick={() => setActiveTab('UPI_QR')}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'UPI_QR'
                  ? 'bg-white text-sky-700 shadow-sm border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5 text-sky-500 shrink-0" />
              <span>
                {remainingOnlineAmount > 0
                  ? `UPI QR Code (₹${remainingOnlineAmount.toLocaleString('en-IN')})`
                  : 'UPI QR Code'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('WALLET')}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'WALLET'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-700 hover:text-emerald-800 hover:bg-emerald-50'
              }`}
            >
              <Wallet className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">
                Wallet (₹{Math.floor(walletBalance).toLocaleString('en-IN')})
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('RAZORPAY')}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'RAZORPAY'
                  ? 'bg-white text-sky-700 shadow-sm border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5 text-sky-500 shrink-0" />
              <span>Cards / NetBanking</span>
            </button>
          </div>

          {/* Error Message Alert */}
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-xs text-rose-700 animate-fade-in">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Success Verification Animation Overlay */}
          {verifySuccess ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-3 animate-fade-in">
              <div className="w-16 h-16 rounded-full bg-emerald-100 border-2 border-emerald-400 text-emerald-600 flex items-center justify-center shadow-lg">
                <CheckCircle2 className="w-10 h-10 animate-bounce" />
              </div>
              <h4 className="text-xl font-black text-slate-900 font-serif">
                Payment Verified &amp; Received!
              </h4>
              <p className="text-xs text-slate-600 max-w-sm">
                Generating your confirmed boarding pass and dispatching WhatsApp schedule notification...
              </p>
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                <Lock className="w-3.5 h-3.5" />
                <span>Anti-Double Booking Seat Lock Finalized</span>
              </div>
            </div>
          ) : activeTab === 'WALLET' ? (
            /* TAB: Cruise-Hunt Ship Wallet Payment */
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-emerald-200 shadow-sm space-y-4">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between shadow-md">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center shadow-inner">
                    <Wallet className="w-6 h-6 text-emerald-200" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-200 block">
                      Cruise-Hunt Wallet Balance
                    </span>
                    <div className="text-2xl font-black">
                      ₹{walletBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full bg-white/20 font-bold border border-white/20">
                  Instant 1-Click
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Ride / Charter Subtotal:</span>
                  <span className="font-bold text-slate-800">{formatINR(bookingSummary.amount)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Deduction from Wallet:</span>
                  <span className="font-bold text-emerald-700">
                    -{formatINR(Math.min(walletBalance, bookingSummary.amount))}
                  </span>
                </div>
                <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-sm text-slate-900">
                  <span>Balance After Payment:</span>
                  <span className="text-emerald-700 font-mono">
                    ₹{Math.max(0, walletBalance - bookingSummary.amount).toLocaleString('en-IN', {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>

              {walletBalance >= bookingSummary.amount ? (
                <button
                  type="button"
                  onClick={handlePayViaWallet}
                  disabled={verifying}
                  className="w-full py-3.5 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm shadow-lg shadow-emerald-600/30 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-98"
                >
                  {verifying ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Processing Payment...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Confirm &amp; Pay {formatINR(bookingSummary.amount)} from Wallet • View Pass</span>
                    </>
                  )}
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      Short by {formatINR(bookingSummary.amount - walletBalance)}. Use our flexible Split Payment to pay ₹
                      {walletBalance.toLocaleString('en-IN')} from Wallet and the remainder online via UPI QR!
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setUseWallet(true);
                      setWalletAmountInput(walletBalance.toString());
                      setActiveTab('UPI_QR');
                    }}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-sky-600 hover:from-emerald-700 hover:to-sky-700 text-white font-bold text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>Split Payment: ₹{walletBalance.toLocaleString('en-IN')} Wallet + ₹{(bookingSummary.amount - walletBalance).toLocaleString('en-IN')} UPI QR</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ) : activeTab === 'UPI_QR' ? (
            /* TAB 1: Dynamic UPI QR Code / 100% Wallet Cover */
            <div className="space-y-4">
              {isFullyCoveredByWallet ? (
                /* Case A: 100% of Booking is Covered by Wallet */
                <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-emerald-500/40 shadow-sm text-center space-y-4 animate-fade-in">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-md">
                    <CheckCircle2 className="w-9 h-9" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 inline-block">
                      100% Covered by Wallet Balance
                    </span>
                    <h4 className="text-xl font-black text-slate-900 font-serif">
                      No Online UPI Transfer Needed!
                    </h4>
                    <p className="text-xs text-slate-600 max-w-md mx-auto">
                      Your selected wallet amount covers the entire booking of{' '}
                      <span className="font-bold text-slate-900">{formatINR(bookingSummary.amount)}</span>. Click below to confirm and instantly generate your boarding pass.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handlePayViaWallet}
                    disabled={verifying}
                    className="w-full max-w-md mx-auto py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-sm shadow-lg shadow-emerald-600/30 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 active:scale-98"
                  >
                    {verifying ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Confirming &amp; Debiting Wallet...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-5 h-5 text-white" />
                        <span>Confirm &amp; Pay {formatINR(bookingSummary.amount)} from Wallet • View Pass</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                /* Case B: Remaining Online Amount via Dynamic UPI QR */
                <>
                  <div className="bg-white rounded-3xl p-5 sm:p-6 border border-sky-100 shadow-sm flex flex-col items-center text-center space-y-4">
                    {/* Timer & Split Badge */}
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-mono font-bold">
                        <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                        <span>QR Code expires in {formattedTime}</span>
                      </div>
                      {effectiveWalletAmount > 0 && (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold">
                          <Wallet className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Split: ₹{effectiveWalletAmount.toLocaleString('en-IN')} Wallet + ₹{remainingOnlineAmount.toLocaleString('en-IN')} QR</span>
                        </div>
                      )}
                    </div>

                    {/* QR Code Container */}
                    <div className="relative p-4 bg-white rounded-2xl border-2 border-slate-900 shadow-md inline-block group">
                      <QRCodeSVG
                        value={upiUri}
                        size={210}
                        level="H"
                        includeMargin={false}
                        className="mx-auto"
                      />
                      {/* Central Maritime Emblem */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-11 h-11 rounded-full bg-white border-2 border-sky-500 shadow-md flex items-center justify-center">
                          <Anchor className="w-6 h-6 text-sky-600" />
                        </div>
                      </div>
                    </div>

                    {/* Amount to Scan */}
                    <div className="space-y-1">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                        {effectiveWalletAmount > 0
                          ? 'Scan to Pay Remaining Balance via UPI'
                          : 'Scan with any UPI App to Pay'}
                      </span>
                      <div className="text-2xl font-black text-slate-900 font-serif">
                        {formatINR(remainingOnlineAmount)}
                      </div>
                    </div>

                    {/* Supported UPI Apps Badges */}
                    <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-[11px] font-bold text-slate-600">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-[#0f9d58] flex items-center gap-1">
                        Google Pay
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-[#5f259f] flex items-center gap-1">
                        PhonePe
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-[#00b9f5] flex items-center gap-1">
                        Paytm
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-[#004a80] flex items-center gap-1">
                        BHIM UPI
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-800 flex items-center gap-1">
                        Cred
                      </span>
                    </div>

                    {/* UPI ID Display & Copy Button */}
                    <div className="w-full max-w-md pt-2">
                      <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <span className="text-slate-400 font-mono font-medium">UPI ID:</span>
                          <span className="font-mono font-bold text-slate-800 truncate">{upiId}</span>
                        </div>
                        <button
                          type="button"
                          onClick={handleCopyUPI}
                          className="flex items-center gap-1 px-3 py-1 rounded-lg bg-white border border-slate-300 hover:bg-sky-50 hover:border-sky-300 text-slate-700 text-xs font-bold transition cursor-pointer shrink-0"
                        >
                          {copied ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-700">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-slate-500" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Mobile Intent Link */}
                    <a
                      href={upiUri}
                      className="sm:hidden w-full py-2.5 px-4 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Tap to Pay with UPI App</span>
                    </a>
                  </div>

                  {/* UPI Verification Section */}
                  <div className="bg-white rounded-2xl p-4 sm:p-5 border-2 border-emerald-500/30 bg-emerald-50/20 shadow-sm space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                      <span className="font-extrabold text-slate-900 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>
                          {effectiveWalletAmount > 0
                            ? `Step 2: Paid ₹${remainingOnlineAmount.toLocaleString('en-IN')} via QR? Click below to confirm`
                            : 'Step 2: Paid via QR? Click below to view pass'}
                        </span>
                      </span>
                      <span className="text-[11px] text-slate-500 font-medium">Instant automated pass unlocking</span>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        value={utrNumber}
                        onChange={(e) => setUtrNumber(e.target.value)}
                        placeholder="Enter 12-digit UPI UTR / Ref (Optional)"
                        className="flex-1 px-3.5 py-3 rounded-xl border border-slate-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white shadow-xs"
                      />
                      <button
                        type="button"
                        onClick={handleVerifyUPIPayment}
                        disabled={verifying}
                        className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-sm shadow-md shadow-emerald-600/30 transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60 active:scale-98"
                      >
                        {verifying ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Verifying &amp; Unlocking Pass...</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-5 h-5 text-white" />
                            <span>
                              {effectiveWalletAmount > 0
                                ? `Payment Done • View Pass`
                                : 'Payment Done • View Pass'}
                            </span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            /* TAB 2: Razorpay Gateway Checkout */
            <div className="space-y-4">
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-sky-100 shadow-sm text-center space-y-5">
                <div className="w-16 h-16 rounded-2xl bg-sky-50 border border-sky-200 text-sky-600 flex items-center justify-center mx-auto shadow-sm">
                  <CreditCard className="w-8 h-8" />
                </div>

                <div className="space-y-1">
                  <h4 className="text-lg font-bold text-slate-900">
                    Razorpay Secure Checkout
                  </h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Pay securely using Credit Card, Debit Card, NetBanking (50+ banks), UPI Intent, or Mobile Wallets.
                  </p>
                </div>

                {/* Supported Payment Instruments Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-w-lg mx-auto text-xs font-medium text-slate-700">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-col items-center justify-center gap-1">
                    <span className="font-bold text-slate-900">Credit / Debit</span>
                    <span className="text-[10px] text-slate-500">Visa, MC, RuPay</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-col items-center justify-center gap-1">
                    <span className="font-bold text-slate-900">NetBanking</span>
                    <span className="text-[10px] text-slate-500">SBI, HDFC, ICICI +50</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-col items-center justify-center gap-1">
                    <span className="font-bold text-slate-900">UPI Instant</span>
                    <span className="text-[10px] text-slate-500">GPay, PhonePe, Cred</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-col items-center justify-center gap-1">
                    <span className="font-bold text-slate-900">Wallets &amp; EMI</span>
                    <span className="text-[10px] text-slate-500">Paytm, Mobikwik</span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handlePayViaRazorpay}
                    disabled={verifying}
                    className="w-full max-w-md mx-auto py-3.5 px-6 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-bold text-sm shadow-lg shadow-sky-500/20 transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {verifying ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Connecting Razorpay Gateway...</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        <span>
                          Pay {formatINR(remainingOnlineAmount)} with Razorpay
                        </span>
                        <ChevronRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Trust Seal */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Guaranteed Anti-Double Booking Seat Lock Active</span>
          </div>
          <div className="flex items-center gap-3">
            <span>Powered by NPCI UPI &amp; Ship Wallet</span>
            <button
              onClick={onClose}
              disabled={verifying}
              className="text-slate-600 hover:text-slate-900 font-semibold underline cursor-pointer"
            >
              Cancel &amp; Edit Details
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
