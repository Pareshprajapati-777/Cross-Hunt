import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Cruise, CabinTier, Booking, ShipExtra } from '../api/types';
import { createBooking } from '../api/bookings';
import { validateCoupon, CouponValidationResult } from '../api/offers';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';
import confetti from 'canvas-confetti';
import {
  Calendar,
  Users,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  Tag,
  Check,
  Loader2,
  Anchor
} from 'lucide-react';
import { formatINR } from '../utils/currency';
import { WhatsAppReminderCard } from '../components/common/WhatsAppReminderCard';
import { TicketPass } from '../components/ticket/TicketPass';
import { BookingPaymentModal } from '../components/payment/BookingPaymentModal';
import { CheckCircle2, Printer, Clock, QrCode, Lock } from 'lucide-react';

interface BookTourPageProps {
  cruise?: Cruise | null;
  initialCabin?: string;
  onSuccess?: (booking: Booking) => void;
  onCancel?: () => void;
  onNeedLogin?: () => void;
}

export const BookTourPage: React.FC<BookTourPageProps> = ({
  cruise: initialCruise,
  initialCabin = 'OCEANVIEW',
  onSuccess,
  onCancel,
  onNeedLogin,
}) => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const shipId = id || searchParams.get('ship') || searchParams.get('cruise');
  const [cruise, setCruise] = useState<Cruise | null>(initialCruise || null);
  const [loading, setLoading] = useState<boolean>(!initialCruise);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!cruise) {
      setLoading(true);
      if (shipId) {
        apiRequest<{ cruise?: Cruise } & Cruise>(`/api/cruises/${shipId}/`)
          .then((res) => {
            const loaded = (res as any).cruise || res;
            setCruise(loaded);
            setLoading(false);
          })
          .catch((err) => {
            setLoadError(err.message || 'Failed to load ship details');
            setLoading(false);
          });
      } else {
        // Load first available ship if none specified
        apiRequest<{ cruises: Cruise[] }>('/api/cruises/')
          .then((res) => {
            if (res.cruises && res.cruises.length > 0) {
              setCruise(res.cruises[0]);
            } else {
              setLoadError('No cruise vessels available for charter.');
            }
            setLoading(false);
          })
          .catch((err) => {
            setLoadError(err.message || 'Failed to load cruise fleet');
            setLoading(false);
          });
      }
    }
  }, [shipId, cruise]);

  const handleBack = () => {
    if (onCancel) {
      onCancel();
    } else {
      navigate('/explore');
    }
  };

  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);

  const handleSuccess = (b: Booking) => {
    if (onSuccess) {
      onSuccess(b);
    } else {
      navigate(`/dashboard?booking_id=${b.booking_id}&openPass=true`);
    }
  };

  // Booking Flow Steps: 1: Date & Time -> 2: Guests -> 3: Extras -> 4: Review & Coupon
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Form State
  const [bookingDate, setBookingDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  });
  const [startTime, setStartTime] = useState<string>('16:00');
  const [endTime, setEndTime] = useState<string>('22:00');
  const [adultsCount, setAdultsCount] = useState<number>(2);
  const [childrenCount, setChildrenCount] = useState<number>(0);
  const [cabinType, setCabinType] = useState<string>(initialCabin);
  const [specialRequests, setSpecialRequests] = useState<string>('');
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);

  // WhatsApp Tour Reminder State
  const [customerWhatsApp, setCustomerWhatsApp] = useState<string>(() => user?.phone || (user as any)?.whatsapp_number || '');
  const [whatsappReminderOptIn, setWhatsappReminderOptIn] = useState<boolean>(true);

  // Promo Code State
  const [couponCode, setCouponCode] = useState<string>('');
  const [couponResult, setCouponResult] = useState<CouponValidationResult | null>(null);
  const [couponLoading, setCouponLoading] = useState<boolean>(false);
  const [couponError, setCouponError] = useState<string | null>(null);

  // Submitting and Error States
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center pt-24 pb-16">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 text-sky-600 animate-spin mx-auto" />
          <p className="text-slate-600 font-semibold">Loading charter booking...</p>
        </div>
      </div>
    );
  }

  if (loadError || !cruise) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center pt-24 pb-16 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl p-8 text-center shadow-lg border border-slate-200 space-y-4">
          <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto">
            <Anchor className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Vessel Not Found</h2>
          <p className="text-sm text-slate-600">{loadError || 'The requested vessel is not available for booking.'}</p>
          <button
            onClick={() => navigate('/explore')}
            className="w-full py-3 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-sm cursor-pointer transition"
          >
            Explore Fleet
          </button>
        </div>
      </div>
    );
  }

  const totalPassengers = adultsCount + childrenCount;
  const baseRate = cruise.price_per_day || cruise.price;

  const defaultCabins: CabinTier[] = cruise.cabins && cruise.cabins.length > 0
    ? cruise.cabins
    : [
        {
          id: 'PRESIDENTIAL',
          name: 'Grand Presidential Ocean Suite',
          multiplier: 1.8,
          description: 'Expansive private terrace, personal butler service, and jacuzzi overlooking the ocean.',
          price_per_day: baseRate * 1.8,
          amenities: ['Private Veranda', '24/7 Butler Service', 'Champagne Cellar'],
        },
        {
          id: 'ROYAL_BALCONY',
          name: 'Royal Ocean Balcony Cabin',
          multiplier: 1.3,
          description: 'Floor-to-ceiling glass doors opening directly to private sea breeze balcony.',
          price_per_day: baseRate * 1.3,
          amenities: ['Private Balcony', 'Comfortable King Bed'],
        },
        {
          id: 'OCEANVIEW',
          name: 'Deluxe Oceanview Cabin',
          multiplier: 1.1,
          description: 'Panoramic picture window with unobstructed oceanic horizons.',
          price_per_day: baseRate * 1.1,
          amenities: ['Panoramic Picture Window', 'Luxury Linens'],
        },
        {
          id: 'INTERIOR',
          name: 'Signature Interior Cabin',
          multiplier: 1.0,
          description: 'Cozy, whisper-quiet room with ambient warm lighting.',
          price_per_day: baseRate,
          amenities: ['Warm Lighting', 'Soundproofing'],
        },
      ];

  const selectedCabinObj = defaultCabins.find((c) => c.id === cabinType) || defaultCabins[1];

  // Live Extras Cost Calculation
  const availableExtras: ShipExtra[] = cruise.extras || [];
  let extrasCost = 0;
  for (const exName of selectedExtras) {
    const ex = availableExtras.find((e) => e.name === exName);
    if (ex) {
      if (ex.pricing_mode === 'PER_GUEST') {
        extrasCost += ex.price * Math.max(1, totalPassengers);
      } else {
        extrasCost += ex.price;
      }
    }
  }

  // Subtotal & Estimated Final Price in INR (₹)
  const isQuote = Boolean(cruise?.is_quote_based || cruise?.price_unit === 'QUOTE' || baseRate <= 0);
  const subtotal = Math.round(baseRate + extrasCost);
  const discountAmount = couponResult?.valid ? couponResult.discount_amount : 0;
  const taxableBase = Math.max(0, subtotal - discountAmount);
  const taxAmount = Math.round(taxableBase * 0.18); // 18% Maritime GST
  const estimatedTotal = taxableBase + taxAmount;

  const toggleExtra = (extraName: string) => {
    if (selectedExtras.includes(extraName)) {
      setSelectedExtras(selectedExtras.filter((e) => e !== extraName));
    } else {
      setSelectedExtras([...selectedExtras, extraName]);
    }
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponError(null);
    try {
      const res = await validateCoupon(couponCode.trim(), subtotal);
      if (res.valid) {
        setCouponResult(res);
      } else {
        setCouponError(res.error || 'Invalid coupon code');
        setCouponResult(null);
      }
    } catch (err: any) {
      setCouponError(err.message || 'Coupon validation failed');
      setCouponResult(null);
    } finally {
      setCouponLoading(false);
    }
  };

  const handleNext = () => {
    setErrorMessage(null);
    if (currentStep === 1 && !bookingDate) {
      setErrorMessage('Please select a valid trip departure date.');
      return;
    }
    if (currentStep === 2 && totalPassengers <= 0) {
      setErrorMessage('Please specify at least 1 adult passenger.');
      return;
    }
    if (currentStep === 4 && !user) {
      if (onNeedLogin) {
        onNeedLogin();
      } else {
        const returnUrl = `${window.location.pathname}${window.location.search}`;
        navigate(`/login?redirect=${encodeURIComponent(returnUrl)}`);
      }
      return;
    }
    setCurrentStep((prev) => Math.min(prev + 1, 4));
  };

  const handleStepBack = () => {
    setErrorMessage(null);
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleProceedToPayment = () => {
    if (!user) {
      if (onNeedLogin) {
        onNeedLogin();
      } else {
        const returnUrl = `${window.location.pathname}${window.location.search}`;
        navigate(`/login?redirect=${encodeURIComponent(returnUrl)}`);
      }
      return;
    }

    if (isQuote || estimatedTotal <= 0) {
      handleExecuteBooking({
        payment_method: 'Inquiry / Quote',
        payment_gateway_ref: `INQ-${Date.now()}`,
        payment_status: 'PENDING',
      });
      return;
    }

    setIsPaymentModalOpen(true);
  };

  const handleExecuteBooking = async (paymentDetails?: {
    payment_method: string;
    payment_gateway_ref: string;
    payment_status: string;
    use_wallet?: boolean;
    wallet_amount_to_use?: number;
  }) => {
    if (!cruise) return;

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await createBooking({
        cruise_id: cruise.id,
        booking_type: 'EVENT',
        booking_date: bookingDate,
        start_time: startTime,
        end_time: endTime,
        adults_count: adultsCount,
        children_count: childrenCount,
        passengers_count: totalPassengers,
        cabin_type: selectedCabinObj.name,
        selected_extras: selectedExtras.map((name) => ({ name })),
        promo_code: couponResult?.valid ? couponResult.code : undefined,
        special_requests: specialRequests,
        customer_whatsapp: customerWhatsApp.trim() || undefined,
        whatsapp_reminder_opt_in: whatsappReminderOptIn,
        payment_method: paymentDetails?.payment_method || 'UPI / QR Code',
        payment_gateway_ref: paymentDetails?.payment_gateway_ref,
        payment_status: paymentDetails?.payment_status || 'PAID',
        use_wallet: paymentDetails?.use_wallet,
        wallet_amount_to_use: paymentDetails?.wallet_amount_to_use,
      });

      setIsPaymentModalOpen(false);

      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.5 },
        colors: ['#0284c7', '#38bdf8', '#f59e0b', '#10b981'],
      });

      setConfirmedBooking(res.booking);
    } catch (err: any) {
      setErrorMessage(
        err.message || 'This vessel or charter slot is unavailable for the selected schedule. Please select another date.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (confirmedBooking) {
    const isPending = confirmedBooking.status === 'PENDING';
    return (
      <div className="min-h-screen pt-28 pb-20 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`bg-white rounded-3xl p-6 sm:p-8 border shadow-xl mb-6 text-center space-y-3 ${
          isPending ? 'border-amber-300 shadow-amber-500/5' : 'border-emerald-200'
        }`}>
          <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto ${
            isPending ? 'bg-amber-50 text-amber-600 border border-amber-200' : 'bg-emerald-100 text-emerald-600'
          }`}>
            {isPending ? <Clock className="w-8 h-8 animate-pulse text-amber-600" /> : <CheckCircle2 className="w-8 h-8" />}
          </div>
          <span className={`text-[11px] font-mono tracking-widest font-black uppercase px-3 py-1 rounded-full border inline-block ${
            isPending ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
          }`}>
            {isPending ? 'Charter Request Submitted • Awaiting Owner Approval' : 'Charter Confirmed'} • Ref #{confirmedBooking.booking_id}
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 font-serif">
            {isPending ? 'Reservation Request Submitted!' : 'Your Boarding Pass is Ready!'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto">
            {isPending
              ? 'Your private vessel charter reservation has been submitted to the ship owner. It is currently in PENDING status awaiting owner review. Once approved, your reservation and boarding pass will update to Confirmed.'
              : 'Your private vessel charter reservation has been confirmed and locked. The official gate QR code on your boarding pass will grant terminal embarkation access.'}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
            <button
              onClick={() => handleSuccess(confirmedBooking)}
              className="px-6 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs shadow-md transition cursor-pointer flex items-center gap-2"
            >
              <span>View in Passenger Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => window.print()}
              className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition cursor-pointer flex items-center gap-2"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>Print Boarding Pass</span>
            </button>
          </div>
        </div>

        <TicketPass
          booking={confirmedBooking}
          onViewInvoice={() => navigate(`/dashboard?booking_id=${confirmedBooking.booking_id}&tab=invoices`)}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-28 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 bg-slate-50/70">
      {/* Top Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <span className="text-xs uppercase font-bold text-sky-700 tracking-wider">
            Vessel Reservation & Event Customization
          </span>
          <h1 className="text-3xl font-display font-black text-slate-900 mt-1 font-serif">
            {cruise.title}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Home Port: {cruise.location} ({cruise.departure_port}) — Capacity: {cruise.capacity} Guests
          </p>
        </div>
        <button
          onClick={handleBack}
          className="text-xs text-slate-500 hover:text-slate-900 transition cursor-pointer self-start sm:self-auto font-bold"
        >
          Cancel & Return
        </button>
      </div>

      {/* Stepper Progress Bar */}
      <div className="mb-10">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          {[
            { num: 1, label: 'Schedule' },
            { num: 2, label: 'Guests' },
            { num: 3, label: 'Extras' },
            { num: 4, label: 'Review & Pay' },
          ].map((s) => (
            <div key={s.num} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  currentStep === s.num
                    ? 'bg-sky-500 text-white shadow-md shadow-sky-500/30'
                    : currentStep > s.num
                    ? 'bg-emerald-500 text-white'
                    : 'bg-white border border-slate-300 text-slate-400'
                }`}
              >
                {currentStep > s.num ? '✓' : s.num}
              </div>
              <span
                className={`hidden sm:inline text-xs font-bold ${
                  currentStep === s.num ? 'text-slate-900' : 'text-slate-400'
                }`}
              >
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Main Grid: Left Step Content vs Right Sticky Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Form Steps */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm">
          {!user && (
            <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 text-amber-950 text-xs font-semibold flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <AlertCircle className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-amber-950 text-xs sm:text-sm">Account Login Required</p>
                  <p className="text-[11px] text-amber-800">You must be logged into your account to book this ship charter.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const returnUrl = `${window.location.pathname}${window.location.search}`;
                  navigate(`/login?redirect=${encodeURIComponent(returnUrl)}`);
                }}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition cursor-pointer shadow-sm shrink-0"
              >
                Sign In
              </button>
            </div>
          )}

          {errorMessage && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* STEP 1: DATE & SCHEDULE */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold font-serif text-slate-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-sky-500" />
                Select Charter Schedule
              </h2>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">Trip Date</label>
                <input
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                  className="w-full p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 text-sm focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700">Departure Time</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 text-sm focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700">Return Time</label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 text-sm focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: GUEST PARTY */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold font-serif text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-sky-500" />
                Guests & Cabin Choice
              </h2>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <span className="text-xs font-bold text-slate-700">Adults (Age 12+)</span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setAdultsCount(Math.max(1, adultsCount - 1))}
                      className="w-8 h-8 rounded-lg bg-white border border-slate-300 font-bold text-slate-700"
                    >-</button>
                    <span className="text-base font-black text-slate-900">{adultsCount}</span>
                    <button
                      type="button"
                      onClick={() => setAdultsCount(Math.min(cruise.capacity, adultsCount + 1))}
                      className="w-8 h-8 rounded-lg bg-white border border-slate-300 font-bold text-slate-700"
                    >+</button>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <span className="text-xs font-bold text-slate-700">Children (Age 2-11)</span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setChildrenCount(Math.max(0, childrenCount - 1))}
                      className="w-8 h-8 rounded-lg bg-white border border-slate-300 font-bold text-slate-700"
                    >-</button>
                    <span className="text-base font-black text-slate-900">{childrenCount}</span>
                    <button
                      type="button"
                      onClick={() => setChildrenCount(Math.min(cruise.capacity - adultsCount, childrenCount + 1))}
                      className="w-8 h-8 rounded-lg bg-white border border-slate-300 font-bold text-slate-700"
                    >+</button>
                  </div>
                </div>
              </div>

              {/* Cabin Choice */}
              <div className="space-y-3 pt-4">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">Selected Cabin / Room</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {defaultCabins.map((cab) => (
                    <div
                      key={cab.id}
                      onClick={() => setCabinType(cab.id)}
                      className={`p-4 rounded-2xl border cursor-pointer transition flex items-center justify-between text-xs ${
                        cabinType === cab.id ? 'border-sky-500 bg-sky-50/50 shadow-sm' : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-slate-900">{cab.name}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{cab.description?.slice(0, 50)}...</div>
                      </div>
                      {cabinType === cab.id && <Check className="w-4 h-4 text-sky-600" />}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: EXTRAS & CUSTOMIZATIONS */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold font-serif text-slate-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-sky-500" />
                Customize Event Extras & Services
              </h2>
              <p className="text-xs text-slate-500">
                Enhance your private trip with catering, sound, decorations, and photography.
              </p>

              {availableExtras.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl">
                  No additional optional extras configured for this vessel. Standard amenities apply.
                </div>
              ) : (
                <div className="space-y-3">
                  {availableExtras.map((extra) => {
                    const isChecked = selectedExtras.includes(extra.name);
                    const calcAmount = extra.pricing_mode === 'PER_GUEST' ? extra.price * totalPassengers : extra.price;
                    return (
                      <div
                        key={extra.id}
                        onClick={() => toggleExtra(extra.name)}
                        className={`p-4 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
                          isChecked ? 'border-sky-500 bg-sky-50/50 shadow-sm' : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="font-bold text-sm text-slate-900 flex items-center gap-2">
                            <span>{extra.name}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold">
                              {extra.pricing_mode === 'PER_GUEST' ? 'Per Guest' : 'Flat Fee'}
                            </span>
                          </div>
                          {extra.description && (
                            <p className="text-xs text-slate-500">{extra.description}</p>
                          )}
                        </div>

                        <div className="text-right">
                          <span className="text-sm font-black text-sky-700">{formatINR(calcAmount)}</span>
                          <div className={`w-5 h-5 rounded-md border flex items-center justify-center ml-auto mt-1 ${
                            isChecked ? 'bg-sky-500 border-sky-500 text-white' : 'border-slate-300'
                          }`}>
                            {isChecked && <Check className="w-3.5 h-3.5" />}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Special Requests */}
              <div className="space-y-2 pt-4 border-t border-slate-100">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">Special Instructions / Requests</label>
                <textarea
                  rows={3}
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value)}
                  placeholder="e.g. Vegetarian catering requested for 20 guests, red carpet setup on deck 4..."
                  className="w-full p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>
          )}

          {/* STEP 4: REVIEW & PROMO CODE */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold font-serif text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-500" />
                Review & Confirm Reservation
              </h2>

              {!user && (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 text-xs font-bold flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-2.5">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>User login is required to complete and confirm your vessel booking.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const returnUrl = `${window.location.pathname}${window.location.search}`;
                      navigate(`/login?redirect=${encodeURIComponent(returnUrl)}`);
                    }}
                    className="px-4 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition cursor-pointer shrink-0"
                  >
                    Sign In
                  </button>
                </div>
              )}

              {/* Summary Details */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2.5 text-xs text-slate-700">
                <div className="flex justify-between">
                  <span className="text-slate-500">Vessel:</span>
                  <span className="font-bold text-slate-900">{cruise.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Schedule:</span>
                  <span className="font-semibold text-slate-900">{bookingDate} ({startTime} - {endTime})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Party Headcount:</span>
                  <span className="font-semibold text-slate-900">{adultsCount} Adults, {childrenCount} Children</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Selected Cabin:</span>
                  <span className="font-semibold text-slate-900">{selectedCabinObj.name}</span>
                </div>
                {selectedExtras.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Selected Extras ({selectedExtras.length}):</span>
                    <span className="font-semibold text-slate-900">{selectedExtras.join(', ')}</span>
                  </div>
                )}
              </div>

              {/* Promo Code Input */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-sky-500" />
                  Have a Promotional Offer / Coupon Code?
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    placeholder="e.g. TRIP10, ROYAL5000"
                    className="flex-1 px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs uppercase font-mono font-bold"
                  />
                  <button
                    type="button"
                    disabled={couponLoading || !couponCode.trim()}
                    onClick={handleApplyCoupon}
                    className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold disabled:opacity-50 transition cursor-pointer"
                  >
                    {couponLoading ? 'Validating...' : 'Apply'}
                  </button>
                </div>
                {couponError && (
                  <p className="text-xs text-rose-600 font-semibold">{couponError}</p>
                )}
                {couponResult?.valid && (
                  <p className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    Code {couponResult.code} applied! Instant discount of {formatINR(couponResult.discount_amount)}.
                  </p>
                )}
              </div>

              {/* WhatsApp Trip Reminder Input & Consent */}
              <WhatsAppReminderCard
                whatsappNumber={customerWhatsApp}
                onWhatsAppNumberChange={setCustomerWhatsApp}
                optIn={whatsappReminderOptIn}
                onOptInChange={setWhatsappReminderOptIn}
                userDefaultPhone={user?.phone || (user as any)?.whatsapp_number}
                disabled={submitting}
              />
            </div>
          )}

          {/* Stepper Navigation Buttons */}
          <div className="flex items-center justify-between pt-8 border-t border-slate-100 mt-8">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={handleStepBack}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                Previous Step
              </button>
            ) : <div />}

            {currentStep < 4 ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-6 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-md shadow-sky-500/20"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                disabled={submitting}
                onClick={handleProceedToPayment}
                className={`px-8 py-3 rounded-2xl text-white text-xs font-bold flex items-center gap-2 shadow-lg transition cursor-pointer disabled:opacity-50 ${
                  !user
                    ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/25'
                    : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/25'
                }`}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Confirming with Fleet...</span>
                  </>
                ) : !user ? (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>SIGN IN TO PAY & CONFIRM</span>
                  </>
                ) : (
                  <>
                    <QrCode className="w-4 h-4" />
                    <span>PROCEED TO PAY & CONFIRM ({formatINR(estimatedTotal)})</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Right Sticky Breakdown */}
        <aside className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-lg space-y-5 lg:sticky lg:top-28 h-fit text-xs">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Live Server Pricing</span>
            <h3 className="text-lg font-black font-serif text-slate-900 mt-0.5">Booking Investment</h3>
          </div>

          <div className="space-y-2.5 py-3 border-y border-slate-100 text-slate-600">
            <div className="flex justify-between">
              <span>Base Ship Charter:</span>
              <span className="font-bold text-slate-900">{formatINR(baseRate)}</span>
            </div>
            {extrasCost > 0 && (
              <div className="flex justify-between">
                <span>Selected Extras:</span>
                <span className="font-bold text-slate-900">{formatINR(extrasCost)}</span>
              </div>
            )}
            {discountAmount > 0 && (
              <div className="flex justify-between text-emerald-600 font-bold">
                <span>Coupon Discount:</span>
                <span>- {formatINR(discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>GST (18%):</span>
              <span className="font-bold text-slate-900">{formatINR(taxAmount)}</span>
            </div>
          </div>

          <div>
            <span className="text-slate-400 font-bold block text-[10px] uppercase tracking-wider">Final Total</span>
            <span className="text-2xl font-black text-sky-600 font-serif">
              {formatINR(estimatedTotal)}
            </span>
            <p className="text-[10px] text-slate-400 mt-1">
              Final amount calculated server-side in INR (₹). Guaranteed anti-double-booking lock.
            </p>
          </div>
        </aside>
      </div>

      {cruise && (
        <BookingPaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          bookingSummary={{
            title: cruise.name,
            date: bookingDate,
            time: `${startTime} – ${endTime}`,
            passengers: totalPassengers,
            cabin: selectedCabinObj.name,
            amount: estimatedTotal,
            bookingType: 'EVENT',
            promoDiscount: couponResult?.discount_amount,
          }}
          customerInfo={{
            name: user?.full_name,
            email: user?.email,
            phone: customerWhatsApp || user?.phone,
          }}
          onPaymentSuccess={handleExecuteBooking}
        />
      )}
    </div>
  );
};
