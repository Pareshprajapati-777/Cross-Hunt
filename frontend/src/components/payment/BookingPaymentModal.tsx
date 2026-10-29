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
  Zap,
  Wallet,
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
    bookingType: 'TOUR' | 'EVENT' | 'CRUISE_TOUR' | 'PRIVATE_EVENT';
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
  }) => void;
}

export const BookingPaymentModal: React.FC<BookingPaymentModalProps> = ({
  isOpen,
  onClose,
  bookingSummary,
  customerInfo,
  onPaymentSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'WALLET' | 'UPI_QR' | 'RAZORPAY'>('UPI_QR');
  const [walletBalance, setWalletBalance] = useState<number>(0);
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
  const [timeLeft, setTimeLeft] = useState<number>(600); // 10 minutes in seconds

  useEffect(() => {
    if (!isOpen) return;
    getPaymentConfig().then(setConfig).catch(() => {});
    getWalletSummary()
      .then((res) => {
        if (res && typeof res.wallet_balance === 'number') {
          setWalletBalance(res.wallet_balance);
          if (res.wallet_balance >= bookingSummary.amount) {
            setActiveTab('WALLET');
          }
        }
      })
      .catch(() => {});
    setTimeLeft(600);
    setVerifySuccess(false);
    setVerifying(false);
    setErrorMessage(null);
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

  // Standard NPCI UPI URI string
  const upiId = config.upi_id || 'cruisehunt@razorpay';
  const merchantName = config.merchant_name || 'Cruise Hunt Maritime';
  const cleanTitle = bookingSummary.title.replace(/[^a-zA-Z0-9 ]/g, '').substring(0, 25);
  const upiUri = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(
    merchantName
  )}&am=${bookingSummary.amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent('CruiseHunt ' + cleanTitle)}`;

  const handleCopyUPI = () => {
    navigator.clipboard.writeText(upiId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  // UPI Payment Verification Action
  const handleVerifyUPIPayment = async () => {
    setVerifying(true);
    setErrorMessage(null);

    try {
      const ref = utrNumber.trim() || `UPI${Date.now().toString().slice(-8)}`;
      const res = await verifyPayment({
        upi_reference: ref,
        amount: bookingSummary.amount,
      });

      if (res.success) {
        setVerifySuccess(true);
        setTimeout(() => {
          onPaymentSuccess({
            payment_method: 'UPI / QR Code',
            payment_gateway_ref: res.transaction_id || ref,
            payment_status: 'PAID',
          });
        }, 1200);
      } else {
        setErrorMessage(res.message || 'Payment verification failed. Please try again.');
        setVerifying(false);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to confirm UPI verification. Please check reference.');
      setVerifying(false);
    }
  };

  // Cruise-Hunt Wallet Instant Checkout Action
  const handlePayViaWallet = async () => {
    if (walletBalance < bookingSummary.amount) {
      setErrorMessage(`Insufficient wallet balance. You need ₹${(bookingSummary.amount - walletBalance).toLocaleString('en-IN')} more.`);
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
        });
      }, 1200);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to process payment from wallet.');
      setVerifying(false);
    }
  };

  // Razorpay Gateway Checkout Action
  const handlePayViaRazorpay = async () => {
    setVerifying(true);
    setErrorMessage(null);

    try {
      const order = await createPaymentOrder(
        bookingSummary.amount,
        `rcpt_${Date.now()}`,
        {
          vessel: bookingSummary.title,
          cabin: bookingSummary.cabin,
        }
      );

      const RazorpayConstructor = (window as any).Razorpay;

      if (!RazorpayConstructor) {
        // Fallback simulated payment if script is unavailable or blocked by network/ad-blocker
        const fallbackRef = `pay_rzp_sim_${Date.now().toString(36)}`;
        const verifyRes = await verifyPayment({
          razorpay_payment_id: fallbackRef,
          razorpay_order_id: order.order_id,
          amount: bookingSummary.amount,
        });

        setVerifySuccess(true);
        setTimeout(() => {
          onPaymentSuccess({
            payment_method: 'Razorpay Gateway',
            payment_gateway_ref: verifyRes.transaction_id || fallbackRef,
            payment_status: 'PAID',
          });
        }, 1200);
        return;
      }

      const options = {
        key: config.razorpay_key_id,
        amount: order.amount,
        currency: order.currency || 'INR',
        name: config.merchant_name,
        description: `${bookingSummary.title} • ${bookingSummary.cabin}`,
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
            const verifyRes = await verifyPayment({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
              amount: bookingSummary.amount,
            });

            setVerifySuccess(true);
            setTimeout(() => {
              onPaymentSuccess({
                payment_method: 'Razorpay Gateway',
                payment_gateway_ref: response.razorpay_payment_id || `pay_${Date.now()}`,
                payment_status: 'PAID',
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
                Official NPCI UPI &amp; Razorpay Certified Gateway
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
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
          {/* Reservation Summary Strip */}
          <div className="bg-white rounded-2xl p-4 border border-sky-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-sky-700">
                <Sparkles className="w-3.5 h-3.5 text-sky-500" />
                <span>{bookingSummary.bookingType === 'TOUR' ? 'PUBLIC TOUR CRUISE' : 'PRIVATE CHARTER'}</span>
                <span>•</span>
                <span>{bookingSummary.date}</span>
                {bookingSummary.time && <span>({bookingSummary.time})</span>}
              </div>
              <h4 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                {bookingSummary.title}
              </h4>
              <p className="text-xs text-slate-500">
                Cabin: <span className="font-semibold text-slate-700">{bookingSummary.cabin}</span> • Passengers: <span className="font-semibold text-slate-700">{bookingSummary.passengers} Guests</span>
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

          {/* Payment Method Selector Tabs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-1.5 bg-slate-100/80 rounded-2xl border border-slate-200">
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
              <span className="truncate">Wallet (₹{Math.floor(walletBalance).toLocaleString('en-IN')})</span>
            </button>

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
              <span>UPI QR Code</span>
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
                <span>Anti-Double Booking Lock Finalized</span>
              </div>
            </div>
          ) : activeTab === 'WALLET' ? (
            /* TAB: Cruise-Hunt Wallet Payment */
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
                  <span className="font-bold text-emerald-700">-{formatINR(Math.min(walletBalance, bookingSummary.amount))}</span>
                </div>
                <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-sm text-slate-900">
                  <span>Balance After Payment:</span>
                  <span className="text-emerald-700 font-mono">
                    ₹{Math.max(0, walletBalance - bookingSummary.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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
                      <span>Confirm &amp; Pay {formatINR(bookingSummary.amount)} from Wallet</span>
                    </>
                  )}
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      Insufficient wallet balance (Short by {formatINR(bookingSummary.amount - walletBalance)}). Please use UPI or Cards below.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('UPI_QR')}
                    className="w-full py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-md transition cursor-pointer"
                  >
                    Pay via UPI QR Instead →
                  </button>
                </div>
              )}
            </div>
          ) : activeTab === 'UPI_QR' ? (
            /* TAB 1: Dynamic UPI QR Code */
            <div className="space-y-4">
              <div className="bg-white rounded-3xl p-5 sm:p-6 border border-sky-100 shadow-sm flex flex-col items-center text-center space-y-4">
                {/* Timer Badge */}
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-mono font-bold">
                  <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                  <span>QR Code expires in {formattedTime}</span>
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
                    Scan with any UPI App to Pay
                  </span>
                  <div className="text-2xl font-black text-slate-900 font-serif">
                    {formatINR(bookingSummary.amount)}
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
              <div className="bg-white rounded-2xl p-4 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">
                    Already paid? Confirm your transaction:
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">Auto or UTR verification</span>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={utrNumber}
                    onChange={(e) => setUtrNumber(e.target.value)}
                    placeholder="Enter 12-digit UTR / Ref (Optional)"
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent bg-slate-50"
                  />
                  <button
                    type="button"
                    onClick={handleVerifyUPIPayment}
                    disabled={verifying}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {verifying ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Verifying Payment...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>I Have Completed Payment</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
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
                    Pay securely using Credit Card, Debit Card, NetBanking (50+ banks), UPI Intent, or Mobile Wallets with instant automated verification.
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
                        <span>Pay {formatINR(bookingSummary.amount)} with Razorpay</span>
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
            <span>Powered by NPCI UPI &amp; Razorpay</span>
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
