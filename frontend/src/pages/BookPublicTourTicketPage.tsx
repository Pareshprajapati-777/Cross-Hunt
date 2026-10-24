import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PublicTour, Booking } from '../api/types';
import { createBooking } from '../api/bookings';
import { validateCoupon, CouponValidationResult } from '../api/offers';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';
import confetti from 'canvas-confetti';
import {
  ShieldCheck,
  ArrowRight,
  ChevronLeft,
  Tag,
  Check,
  AlertCircle,
  Loader2,
  Anchor
} from 'lucide-react';
import { formatINR } from '../utils/currency';
import { WhatsAppReminderCard } from '../components/common/WhatsAppReminderCard';
import { TicketPass } from '../components/ticket/TicketPass';
import { BookingPaymentModal } from '../components/payment/BookingPaymentModal';
import { CheckCircle2, Printer, QrCode, Lock } from 'lucide-react';

interface BookPublicTourTicketPageProps {
  tour?: PublicTour | null;
  onSuccess?: (booking: Booking) => void;
  onCancel?: () => void;
  onNeedLogin?: () => void;
}

export const BookPublicTourTicketPage: React.FC<BookPublicTourTicketPageProps> = ({
  tour: initialTour,
  onSuccess,
  onCancel,
  onNeedLogin,
}) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [tour, setTour] = useState<PublicTour | null>(initialTour || null);
  const [loading, setLoading] = useState<boolean>(!initialTour && !!id);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!tour && id) {
      setLoading(true);
      apiRequest<{ tour?: PublicTour } & PublicTour>(`/api/tours/${id}/`)
        .then((res) => {
          const loaded = (res as any).tour || res;
          setTour(loaded);
          setLoading(false);
        })
        .catch((err) => {
          setLoadError(err.message || 'Failed to load tour details');
          setLoading(false);
        });
    }
  }, [id, tour]);

  const handleBack = () => {
    if (onCancel) {
      onCancel();
    } else {
      navigate('/tours');
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

  const [adultsCount, setAdultsCount] = useState<number>(2);
  const [childrenCount, setChildrenCount] = useState<number>(0);
  const [cabinTier, setCabinTier] = useState<string>('Royal Balcony Cabin');
  const [specialRequests, setSpecialRequests] = useState<string>('');

  // WhatsApp Tour Reminder State
  const [customerWhatsApp, setCustomerWhatsApp] = useState<string>(() => user?.phone || (user as any)?.whatsapp_number || '');
  const [whatsappReminderOptIn, setWhatsappReminderOptIn] = useState<boolean>(true);

  // Promo Code State
  const [couponCode, setCouponCode] = useState<string>('');
  const [couponResult, setCouponResult] = useState<CouponValidationResult | null>(null);
  const [couponLoading, setCouponLoading] = useState<boolean>(false);
  const [couponError, setCouponError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (tour?.cabins && tour.cabins.length > 0) {
      setCabinTier(tour.cabins[0].name);
    }
  }, [tour]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center pt-24 pb-16">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 text-sky-600 animate-spin mx-auto" />
          <p className="text-slate-600 font-semibold">Loading tour reservation...</p>
        </div>
      </div>
    );
  }

  if (loadError || !tour) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center pt-24 pb-16 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl p-8 text-center shadow-lg border border-slate-200 space-y-4">
          <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto">
            <Anchor className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Tour Not Found</h2>
          <p className="text-sm text-slate-600">{loadError || 'The requested cruise tour could not be found or has departed.'}</p>
          <button
            onClick={() => navigate('/tours')}
            className="w-full py-3 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-sm cursor-pointer transition"
          >
            Browse Public Tours
          </button>
        </div>
      </div>
    );
  }

  const totalPassengers = adultsCount + childrenCount;

  // Available cabins list from database
  const availableCabinTiers = tour.cabins && tour.cabins.length > 0
    ? tour.cabins.map((c) => ({
        name: c.name,
        desc: c.description || 'Verified cabin accommodation',
        surcharge: Math.max(0, c.price_per_person - tour.adult_price),
      }))
    : [
        { name: 'Standard Cabin', desc: 'Comfortable oceanview room', surcharge: 0 },
        { name: 'Royal Balcony Cabin', desc: 'Private veranda with sunset views', surcharge: 2500 },
        { name: 'Captain Presidential Suite', desc: 'Luxury suite with dedicated concierge', surcharge: 5000 },
      ];

  const selectedTierObj = availableCabinTiers.find((t) => t.name === cabinTier) || availableCabinTiers[0];

  // Pricing calculation
  const adultFare = tour.adult_price * adultsCount;
  const childFare = tour.child_price * childrenCount;
  const cabinSurcharge = selectedTierObj ? selectedTierObj.surcharge * adultsCount : 0;

  const subtotal = adultFare + childFare + cabinSurcharge;
  const discountAmount = couponResult?.valid ? couponResult.discount_amount : 0;
  const taxableBase = Math.max(0, subtotal - discountAmount);
  const taxAmount = Math.round(taxableBase * 0.18);
  const totalAmount = taxableBase + taxAmount;

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      if (onNeedLogin) {
        onNeedLogin();
      } else {
        const returnUrl = `${window.location.pathname}${window.location.search}`;
        navigate(`/login?redirect=${encodeURIComponent(returnUrl)}`);
      }
      return;
    }

    if (!tour) return;

    if (totalPassengers <= 0) {
      setErrorMessage('Please select at least 1 passenger.');
      return;
    }

    if (totalPassengers > tour.remaining_capacity) {
      setErrorMessage(`Only ${tour.remaining_capacity} seats remain on this departure.`);
      return;
    }

    if (totalAmount <= 0) {
      handleExecuteBooking({
        payment_method: 'Complimentary / Promo',
        payment_gateway_ref: `COMP-${Date.now()}`,
        payment_status: 'PAID',
      });
      return;
    }

    setIsPaymentModalOpen(true);
  };

  const handleExecuteBooking = async (paymentDetails?: {
    payment_method: string;
    payment_gateway_ref: string;
    payment_status: string;
  }) => {
    if (!tour) return;

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await createBooking({
        booking_type: 'TOUR',
        public_tour_id: tour.id,
        adults_count: adultsCount,
        children_count: childrenCount,
        passengers_count: totalPassengers,
        cabin_type: cabinTier,
        promo_code: couponResult?.valid ? couponResult.code : undefined,
        special_requests: specialRequests,
        customer_whatsapp: customerWhatsApp.trim() || undefined,
        whatsapp_reminder_opt_in: whatsappReminderOptIn,
        payment_method: paymentDetails?.payment_method || 'UPI / QR Code',
        payment_gateway_ref: paymentDetails?.payment_gateway_ref,
        payment_status: paymentDetails?.payment_status || 'PAID',
      });

      setIsPaymentModalOpen(false);

      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.5 },
        colors: ['#0284c7', '#38bdf8', '#10b981', '#f59e0b'],
      });

      setConfirmedBooking(res.booking);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to complete ticket reservation.');
    } finally {
      setSubmitting(false);
    }
  };

  if (confirmedBooking) {
    return (
      <div className="min-h-screen pt-28 pb-20 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-emerald-200 shadow-xl mb-6 text-center space-y-3">
          <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <span className="text-[11px] font-mono tracking-widest font-black uppercase text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 inline-block">
            Booking Confirmed • Ticket #{confirmedBooking.booking_id}
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 font-serif">
            Your Boarding Pass is Ready!
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto">
            Your reservation has been confirmed and locked. Use the official QR code on your boarding pass for gate boarding access, or view anytime in your passenger dashboard.
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
    <div className="min-h-screen pt-28 pb-20 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 bg-slate-50/70">
      <button
        onClick={handleBack}
        className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition mb-6 cursor-pointer"
      >
        <ChevronLeft className="w-4 h-4" />
        <span>Back to Tour Details</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left 2 Columns: Passenger & Cabin Booking Form */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600 bg-sky-50 px-2.5 py-1 rounded-full">
              Public Cruise Ticket
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 font-serif mt-2">
              Book Tickets: {tour.tour_title}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Ship: {tour.ship_name} • {tour.departure_port} → {tour.destination}
            </p>
          </div>

          {errorMessage && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {!user && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 text-xs font-bold flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>User account login is required to reserve your cruise tour ticket.</span>
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

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Passenger Selector */}
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">Passenger Count</label>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-700">Adults (12+)</span>
                    <span className="text-xs text-slate-500 font-semibold">{formatINR(tour.adult_price)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setAdultsCount(Math.max(1, adultsCount - 1))}
                      className="w-8 h-8 rounded-lg bg-white border border-slate-300 font-bold text-slate-700"
                    >-</button>
                    <span className="text-base font-black text-slate-900">{adultsCount}</span>
                    <button
                      type="button"
                      onClick={() => setAdultsCount(Math.min(tour.remaining_capacity, adultsCount + 1))}
                      className="w-8 h-8 rounded-lg bg-white border border-slate-300 font-bold text-slate-700"
                    >+</button>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-700">Children (2-11)</span>
                    <span className="text-xs text-slate-500 font-semibold">{formatINR(tour.child_price)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setChildrenCount(Math.max(0, childrenCount - 1))}
                      className="w-8 h-8 rounded-lg bg-white border border-slate-300 font-bold text-slate-700"
                    >-</button>
                    <span className="text-base font-black text-slate-900">{childrenCount}</span>
                    <button
                      type="button"
                      onClick={() => setChildrenCount(Math.min(tour.remaining_capacity - adultsCount, childrenCount + 1))}
                      className="w-8 h-8 rounded-lg bg-white border border-slate-300 font-bold text-slate-700"
                    >+</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Cabin Tier Choice */}
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">Cabin / Room Type</label>
              <div className="space-y-2">
                {availableCabinTiers.map((tier) => (
                  <div
                    key={tier.name}
                    onClick={() => setCabinTier(tier.name)}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition flex items-center justify-between text-xs ${
                      cabinTier === tier.name ? 'border-sky-500 bg-sky-50/50 shadow-sm' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-slate-900">{tier.name}</div>
                      <div className="text-[11px] text-slate-500">{tier.desc}</div>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-sky-700">
                        {tier.surcharge > 0 ? `+ ${formatINR(tier.surcharge)} / adult` : 'Included'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Coupon Code */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-sky-500" />
                Promotional Offer Coupon
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="e.g. TRIP10"
                  className="flex-1 px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs uppercase font-mono font-bold"
                />
                <button
                  type="button"
                  disabled={couponLoading || !couponCode.trim()}
                  onClick={handleApplyCoupon}
                  className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold disabled:opacity-50 transition cursor-pointer"
                >
                  {couponLoading ? 'Checking...' : 'Apply'}
                </button>
              </div>
              {couponError && <p className="text-xs text-rose-600 font-semibold">{couponError}</p>}
              {couponResult?.valid && (
                <p className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  Code {couponResult.code} applied! Instant discount of {formatINR(couponResult.discount_amount)}.
                </p>
              )}
            </div>

            {/* WhatsApp Tour Reminder Input & Consent */}
            <WhatsAppReminderCard
              whatsappNumber={customerWhatsApp}
              onWhatsAppNumberChange={setCustomerWhatsApp}
              optIn={whatsappReminderOptIn}
              onOptInChange={setWhatsappReminderOptIn}
              userDefaultPhone={user?.phone || (user as any)?.whatsapp_number}
              disabled={submitting}
            />

            {/* Special Instructions */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">Special Requests / Dietary Requirements</label>
              <textarea
                rows={2}
                value={specialRequests}
                onChange={(e) => setSpecialRequests(e.target.value)}
                placeholder="e.g. Vegetarian meals, anniversary celebration, assistance needed..."
                className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className={`w-full py-4 rounded-2xl text-white text-sm font-bold shadow-lg flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50 ${
                !user
                  ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/25'
                  : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/25'
              }`}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Confirming Booking...</span>
                </>
              ) : !user ? (
                <>
                  <Lock className="w-4 h-4" />
                  <span>SIGN IN TO PAY & CONFIRM TICKET</span>
                </>
              ) : (
                <>
                  <QrCode className="w-4 h-4" />
                  <span>PROCEED TO PAY & CONFIRM TICKET ({formatINR(totalAmount)})</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Sticky Summary */}
        <aside className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-lg space-y-5 lg:sticky lg:top-28 text-xs">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Trip Summary</span>
            <h3 className="text-base font-bold text-slate-900 mt-0.5">{tour.tour_title}</h3>
            <p className="text-slate-500 mt-1">Departs: {tour.departure_date} at {tour.departure_time}</p>
          </div>

          <div className="space-y-2.5 py-3 border-y border-slate-100 text-slate-600">
            <div className="flex justify-between">
              <span>Adult Fares ({adultsCount}x):</span>
              <span className="font-semibold text-slate-900">{formatINR(adultFare)}</span>
            </div>
            {childrenCount > 0 && (
              <div className="flex justify-between">
                <span>Child Fares ({childrenCount}x):</span>
                <span className="font-semibold text-slate-900">{formatINR(childFare)}</span>
              </div>
            )}
            {cabinSurcharge > 0 && (
              <div className="flex justify-between">
                <span>Cabin Surcharge:</span>
                <span className="font-semibold text-slate-900">{formatINR(cabinSurcharge)}</span>
              </div>
            )}
            {discountAmount > 0 && (
              <div className="flex justify-between text-emerald-600 font-bold">
                <span>Discount:</span>
                <span>- {formatINR(discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>GST (18%):</span>
              <span className="font-semibold text-slate-900">{formatINR(taxAmount)}</span>
            </div>
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Ticket Price</span>
            <span className="text-2xl font-black text-sky-600 font-serif">{formatINR(totalAmount)}</span>
            <p className="text-[10px] text-slate-400 mt-1">All gourmet meals, port excursions, and deck shows included.</p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2 text-[11px] text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Guaranteed capacity lock on server.</span>
          </div>
        </aside>
      </div>

      {tour && (
        <BookingPaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          bookingSummary={{
            title: tour.tour_title,
            date: tour.departure_date,
            time: tour.departure_time,
            passengers: totalPassengers,
            cabin: cabinTier,
            amount: totalAmount,
            bookingType: 'TOUR',
            promoDiscount: discountAmount,
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
