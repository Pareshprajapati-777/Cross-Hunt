import React, { useState } from 'react';
import { PublicTour, Booking } from '../api/types';
import { createBooking } from '../api/bookings';
import { validateCoupon, CouponValidationResult } from '../api/offers';
import { useAuth } from '../context/AuthContext';
import confetti from 'canvas-confetti';
import {
  ShieldCheck,
  ArrowRight,
  ChevronLeft,
  Tag,
  Check,
  AlertCircle
} from 'lucide-react';
import { formatINR } from '../utils/currency';

interface BookPublicTourTicketPageProps {
  tour: PublicTour;
  onSuccess: (booking: Booking) => void;
  onCancel: () => void;
  onNeedLogin: () => void;
}

export const BookPublicTourTicketPage: React.FC<BookPublicTourTicketPageProps> = ({
  tour,
  onSuccess,
  onCancel,
  onNeedLogin,
}) => {
  const { user } = useAuth();

  const [adultsCount, setAdultsCount] = useState<number>(2);
  const [childrenCount, setChildrenCount] = useState<number>(0);
  const [cabinTier, setCabinTier] = useState<string>('Royal Balcony Stateroom');
  const [specialRequests, setSpecialRequests] = useState<string>('');

  // Promo Code State
  const [couponCode, setCouponCode] = useState<string>('');
  const [couponResult, setCouponResult] = useState<CouponValidationResult | null>(null);
  const [couponLoading, setCouponLoading] = useState<boolean>(false);
  const [couponError, setCouponError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const totalPassengers = adultsCount + childrenCount;

  // Pricing calculation
  const adultFare = tour.adult_price * adultsCount;
  const childFare = tour.child_price * childrenCount;
  let cabinSurcharge = 0;
  if (cabinTier.includes('Suite')) cabinSurcharge = 5000 * adultsCount;
  else if (cabinTier.includes('Balcony')) cabinSurcharge = 2500 * adultsCount;

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onNeedLogin();
      return;
    }

    if (totalPassengers <= 0) {
      setErrorMessage('Please select at least 1 passenger.');
      return;
    }

    if (totalPassengers > tour.remaining_capacity) {
      setErrorMessage(`Only ${tour.remaining_capacity} seats remain on this departure.`);
      return;
    }

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
      });

      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#0284c7', '#38bdf8', '#10b981'],
      });

      onSuccess(res.booking);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to complete ticket reservation.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen pt-28 pb-20 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 bg-slate-50/70">
      <button
        onClick={onCancel}
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
              Product B — Public Cruise Tour Ticket
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 font-serif mt-2">
              Book Tickets: {tour.tour_title}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Vessel: {tour.ship_name} • {tour.departure_port} → {tour.destination}
            </p>
          </div>

          {errorMessage && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {!user && (
            <div className="p-4 rounded-2xl bg-sky-50 border border-sky-200 text-sky-900 text-xs font-bold flex items-center justify-between">
              <span>Sign in is required to issue your digital boarding pass.</span>
              <button onClick={onNeedLogin} className="px-3.5 py-1.5 rounded-xl bg-sky-500 text-white text-xs">
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
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">Stateroom Tier</label>
              <div className="space-y-2">
                {[
                  { name: 'Standard Stateroom', desc: 'Signature oceanview stateroom', surcharge: 0 },
                  { name: 'Royal Balcony Stateroom', desc: 'Private ocean veranda with sunset views', surcharge: 2500 },
                  { name: 'Captain Presidential Suite', desc: 'Luxury suite with dedicated concierge', surcharge: 5000 },
                ].map((tier) => (
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
                  placeholder="e.g. VOYAGE10"
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

            {/* Special Instructions */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">Special Requests / Dietary Requirements</label>
              <textarea
                rows={2}
                value={specialRequests}
                onChange={(e) => setSpecialRequests(e.target.value)}
                placeholder="e.g. Jain meals, anniversary celebration, mobility assistance..."
                className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 rounded-2xl bg-sky-500 hover:bg-sky-600 text-white text-sm font-bold shadow-lg shadow-sky-500/25 flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
            >
              <span>{submitting ? 'Confirming with Carrier...' : 'CONFIRM TICKET & ISSUE BOARDING PASS'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Right Sticky Summary */}
        <aside className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-lg space-y-5 lg:sticky lg:top-28 text-xs">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Voyage Overview</span>
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
              <span>Maritime GST (18%):</span>
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
    </div>
  );
};
