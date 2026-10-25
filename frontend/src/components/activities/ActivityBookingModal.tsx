import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  Clock,
  Users,
  ShieldCheck,
  CheckCircle2,
  Anchor,
  Compass,
  MapPin,
  Tag,
  AlertCircle,
  Navigation,
  ExternalLink,
  QrCode,
  Sparkles,
  Ticket,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { ActivityItem } from '../../api/types';
import { bookActivity } from '../../api/activities';
import { validateCoupon, CouponValidationResult } from '../../api/offers';
import { formatINR } from '../../utils/currency';
import { useAuth } from '../../context/AuthContext';
import { WhatsAppIcon } from '../common/WhatsAppIcon';

interface ActivityBookingModalProps {
  activity: ActivityItem;
  isOpen: boolean;
  onClose: () => void;
  onBookingSuccess: (bookingId: string) => void;
  onOpenPortMap?: (departurePort: string, location: string) => void;
}

export const ActivityBookingModal: React.FC<ActivityBookingModalProps> = ({
  activity,
  isOpen,
  onClose,
  onBookingSuccess,
  onOpenPortMap,
}) => {
  const { user } = useAuth();

  // State
  const [bookingDate, setBookingDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [selectedSlot, setSelectedSlot] = useState(
    activity.time_slots && activity.time_slots.length > 0 ? activity.time_slots[0] : '10:00 AM'
  );
  const [participants, setParticipants] = useState(1);
  const [whatsappMobile, setWhatsappMobile] = useState(user?.phone || '');
  const [specialRequest, setSpecialRequest] = useState('');

  // Promo code
  const [promoCode, setPromoCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponResult, setCouponResult] = useState<CouponValidationResult | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  // Additional options / Addons
  const defaultAddons = [
    { id: 'gopro', name: '4K GoPro Action Video & Photo Package', price: 499 },
    { id: 'vest', name: 'Pro Impact Neoprene Vest & Gloves', price: 199 },
    { id: 'pickup', name: 'Hotel Pickup & Return Drop Transfer', price: 799 },
    { id: 'refresh', name: 'Fresh Coconut & Post-Ride Energy Pack', price: 149 },
  ];
  const availableAddons =
    activity.additional_options && activity.additional_options.length > 0
      ? activity.additional_options
      : defaultAddons;

  const [selectedAddons, setSelectedAddons] = useState<Array<{ id: string; name: string; price: number }>>([]);

  // Submitting
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<any | null>(null);

  // Payment method selection
  const [paymentMethod, setPaymentMethod] = useState<'UPI_QR' | 'RAZORPAY'>('UPI_QR');

  useEffect(() => {
    if (activity.time_slots && activity.time_slots.length > 0) {
      setSelectedSlot(activity.time_slots[0]);
    }
  }, [activity]);

  if (!isOpen) return null;

  // Price calculations with additional options
  const unitPrice = activity.price;
  const addonsTotal = selectedAddons.reduce((sum, item) => sum + item.price, 0);
  const subtotal = Math.round(unitPrice * participants) + addonsTotal;
  const discountAmount = couponResult?.valid ? couponResult.discount_amount : 0;
  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const taxAmount = Math.round(taxableAmount * 0.05); // 5% GST
  const finalTotal = taxableAmount + taxAmount;

  const toggleAddon = (addon: { id: string; name: string; price: number }) => {
    if (selectedAddons.some((a) => a.id === addon.id)) {
      setSelectedAddons(selectedAddons.filter((a) => a.id !== addon.id));
    } else {
      setSelectedAddons([...selectedAddons, addon]);
    }
  };

  const handleApplyCoupon = async () => {
    if (!promoCode.trim()) return;
    setCouponLoading(true);
    setCouponError(null);
    try {
      const res = await validateCoupon(promoCode.trim().toUpperCase(), subtotal);
      if (res.valid) {
        setCouponResult(res);
      } else {
        setCouponError(res.error || 'Invalid promotional voucher');
        setCouponResult(null);
      }
    } catch (err: any) {
      setCouponError(err.message || 'Promo code validation failed');
      setCouponResult(null);
    } finally {
      setCouponLoading(false);
    }
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await bookActivity({
        activity_id: activity.id,
        booking_date: bookingDate,
        time_slot: selectedSlot,
        participants,
        selected_addons: selectedAddons.length > 0 ? selectedAddons : undefined,
        customer_whatsapp: whatsappMobile,
        promo_code: couponResult?.valid ? couponResult.code : undefined,
        special_request: specialRequest.trim() || undefined,
        payment_method: paymentMethod === 'UPI_QR' ? 'Instant UPI QR (Razorpay)' : 'Razorpay Secure Checkout',
      });

      if (res.success && res.booking) {
        setConfirmedBooking(res.booking);
        try {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#0284c7', '#06b6d4', '#10b981', '#f59e0b'],
          });
        } catch {
          // ignore
        }
      } else {
        setErrorMsg('Booking failed. Please try again.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to complete activity booking.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-2xl my-6 bg-white rounded-3xl shadow-2xl border border-sky-400/30 overflow-hidden text-slate-800 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-[#051833] text-white flex items-center justify-between border-b border-sky-500/20 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-400 font-bold shrink-0">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-400/30">
                  {activity.category_label || activity.activity_type}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  ★ {activity.rating} Verified Ride
                </span>
              </div>
              <h3 className="font-serif font-black text-base text-white tracking-wide truncate max-w-sm mt-0.5">
                {activity.title}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
          {confirmedBooking ? (
            /* SUCCESS CONFIRMATION VIEW */
            <div className="text-center py-6 space-y-5">
              <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shadow-lg shadow-emerald-600/10">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                  Adventure Slot Confirmed &amp; Locked
                </span>
                <h3 className="text-xl sm:text-2xl font-serif font-black text-[#051833] mt-2">
                  You’re Ready to Ride!
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  Your ticket and official boarding pass have been generated. Slot locked on host vessel{' '}
                  <strong className="text-slate-800">{confirmedBooking.host_ship_name}</strong>.
                </p>
              </div>

              {/* Ticket Code Box */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-2 max-w-md mx-auto text-xs">
                <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                  <span className="text-slate-500 font-medium">Digital Pass Code:</span>
                  <span className="font-mono font-bold text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded border border-sky-200">
                    {confirmedBooking.ticket_code}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Activity &amp; Slot:</span>
                  <span className="font-bold text-slate-900">
                    {confirmedBooking.booking_date} • {confirmedBooking.time_slot}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Participants:</span>
                  <span className="font-bold text-slate-900">{confirmedBooking.participants} Guests</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Boarding Jetty / Port:</span>
                  <span className="font-bold text-slate-900 text-right">{confirmedBooking.departure_port}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-200 text-sm">
                  <span className="font-bold text-slate-900">Total Paid:</span>
                  <span className="font-black text-emerald-700 font-mono-numbers">
                    {formatINR(confirmedBooking.total_price)}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => onBookingSuccess(confirmedBooking.booking_id)}
                  className="w-full sm:w-auto px-6 py-3 rounded-full bg-[#051833] hover:bg-[#0a2548] text-[#fff8dc] text-xs font-black transition flex items-center justify-center gap-2 shadow-md cursor-pointer"
                >
                  <Ticket className="w-4 h-4 text-[#fff8dc]" />
                  <span>View Pass in Dashboard</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onOpenPortMap) {
                      onOpenPortMap(confirmedBooking.departure_port, confirmedBooking.location);
                    }
                  }}
                  className="w-full sm:w-auto px-6 py-3 rounded-full bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-md cursor-pointer"
                >
                  <Navigation className="w-4 h-4" />
                  <span>Open Port GPS Route</span>
                </button>
              </div>
            </div>
          ) : (
            /* BOOKING FORM */
            <form onSubmit={handleBookingSubmit} className="space-y-5">
              {/* Experience Requirement Entity Banner (Vessel vs Beach) */}
              <div
                className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between gap-3 shadow-xs ${
                  activity.requires_boat
                    ? 'bg-sky-50/80 border-sky-200 text-sky-900'
                    : 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${
                      activity.requires_boat
                        ? 'bg-sky-600/10 border-sky-500/20 text-sky-600'
                        : 'bg-emerald-600/10 border-emerald-500/20 text-emerald-600'
                    }`}
                  >
                    {activity.requires_boat ? (
                      <Anchor className="w-4 h-4" />
                    ) : (
                      <Compass className="w-4 h-4" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider block ${
                        activity.requires_boat ? 'text-sky-700' : 'text-emerald-700'
                      }`}
                    >
                      {activity.requires_boat ? 'Vessel Transport Included' : 'Beach & Shore-Based Experience'}
                    </span>
                    <p className="font-bold text-slate-900 truncate">
                      {activity.vessel_requirement_note ||
                        (activity.requires_boat
                          ? `${activity.host_ship_name || 'Boat Transport'} (${activity.host_ship_category || 'Cruiser'})`
                          : 'No ship required • Direct shore/beach access')}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                    {activity.requires_boat ? 'Boarding Jetty' : 'Location Point'}
                  </span>
                  <span className="font-bold text-slate-800 text-xs truncate max-w-[150px] block">
                    {activity.departure_port}
                  </span>
                </div>
              </div>

              {/* Schedule: Date & Time Slot */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-sky-600" />
                    <span>Adventure Date</span>
                  </label>
                  <input
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-semibold text-xs focus:outline-none focus:border-sky-500 transition cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-sky-600" />
                    <span>Participants (Max: {activity.capacity_per_slot})</span>
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 overflow-hidden w-full">
                      <button
                        type="button"
                        onClick={() => setParticipants((p) => Math.max(1, p - 1))}
                        className="px-3 py-2 text-slate-700 hover:bg-slate-200 font-black text-sm cursor-pointer transition"
                      >
                        -
                      </button>
                      <span className="flex-1 text-center font-bold text-xs font-mono-numbers">
                        {participants} {participants === 1 ? 'Guest' : 'Guests'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setParticipants((p) => Math.min(activity.capacity_per_slot, p + 1))}
                        className="px-3 py-2 text-slate-700 hover:bg-slate-200 font-black text-sm cursor-pointer transition"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Time Slots Selector */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-sky-600" />
                  <span>Choose Time Slot ({activity.duration_display})</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {activity.time_slots.map((slot) => {
                    const isSelected = selectedSlot === slot;
                    return (
                      <button
                        type="button"
                        key={slot}
                        onClick={() => setSelectedSlot(slot)}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold transition text-center cursor-pointer ${
                          isSelected
                            ? 'bg-[#051833] text-[#fff8dc] border-[#051833] shadow-sm font-black'
                            : 'bg-slate-50 hover:bg-sky-50 text-slate-700 border-slate-200'
                        }`}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Customer Contact & WhatsApp Reminder */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                  <WhatsAppIcon className="w-3.5 h-3.5 text-emerald-600" variant="solid" />
                  <span>WhatsApp Mobile (For 24h Slot Reminder &amp; Port Directions)</span>
                </label>
                <input
                  type="tel"
                  placeholder="+91 98200 12345"
                  value={whatsappMobile}
                  onChange={(e) => setWhatsappMobile(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-semibold text-xs focus:outline-none focus:border-emerald-500 transition"
                />
              </div>

              {/* Additional Options (Addons) */}
              <div className="space-y-2 p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                    <span>Additional Options &amp; Add-ons (Optional)</span>
                  </span>
                  {selectedAddons.length > 0 && (
                    <span className="text-[11px] font-bold text-sky-700">
                      +{formatINR(addonsTotal)}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {availableAddons.map((addon) => {
                    const isChecked = selectedAddons.some((a) => a.id === addon.id);
                    return (
                      <button
                        type="button"
                        key={addon.id}
                        onClick={() => toggleAddon(addon)}
                        className={`p-2.5 rounded-xl border text-left transition flex items-center justify-between gap-2 cursor-pointer ${
                          isChecked
                            ? 'bg-sky-50 border-sky-400 text-sky-950 shadow-xs'
                            : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}} // handled by button click
                            className="w-3.5 h-3.5 rounded text-sky-600 focus:ring-sky-500 cursor-pointer pointer-events-none"
                          />
                          <span className="text-xs font-semibold truncate">{addon.name}</span>
                        </div>
                        <span className="text-[11px] font-mono font-bold text-slate-900 shrink-0">
                          +{formatINR(addon.price)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Promo Coupon Code */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-sky-600" />
                    Have a Promo Voucher?
                  </span>
                  {couponResult?.valid && (
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      ✓ Promo Applied: {formatINR(couponResult.discount_amount)} OFF
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter Coupon (e.g. SAVE10)"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-mono font-bold tracking-wider uppercase focus:outline-none focus:border-sky-500"
                  />
                  <button
                    type="button"
                    disabled={couponLoading || !promoCode.trim()}
                    onClick={handleApplyCoupon}
                    className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition disabled:opacity-50 cursor-pointer"
                  >
                    {couponLoading ? 'Checking...' : 'Apply'}
                  </button>
                </div>
                {couponError && <p className="text-[11px] text-rose-600 font-semibold">{couponError}</p>}
              </div>

              {/* Quotation Breakdown */}
              <div className="p-4 rounded-2xl bg-[#051833] text-white space-y-2 text-xs">
                <div className="flex justify-between items-center text-slate-300">
                  <span>
                    Ride Fee ({participants} × {formatINR(unitPrice)}):
                  </span>
                  <span className="font-mono-numbers">{formatINR(subtotal)}</span>
                </div>

                {discountAmount > 0 && (
                  <div className="flex justify-between items-center text-emerald-400 font-bold">
                    <span>Discount Voucher:</span>
                    <span className="font-mono-numbers">- {formatINR(discountAmount)}</span>
                  </div>
                )}

                <div className="flex justify-between items-center text-slate-300">
                  <span>Marine Recreation Tax (GST 5%):</span>
                  <span className="font-mono-numbers">{formatINR(taxAmount)}</span>
                </div>

                <div className="pt-2 border-t border-white/10 flex justify-between items-center text-sm">
                  <div>
                    <span className="font-bold text-white block">Total Payable</span>
                    <span className="text-[10px] text-slate-400">All pier fees &amp; safety gear included</span>
                  </div>
                  <span className="font-mono-numbers text-xl font-black text-[#fff8dc]">
                    {formatINR(finalTotal)}
                  </span>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div className="space-y-1.5 text-xs">
                <span className="font-bold text-slate-700 block">Select Instant Payment Mode</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('UPI_QR')}
                    className={`p-3 rounded-xl border flex items-center gap-2.5 transition cursor-pointer text-left ${
                      paymentMethod === 'UPI_QR'
                        ? 'bg-sky-50 border-sky-400 ring-2 ring-sky-300/50'
                        : 'bg-slate-50 border-slate-200 hover:bg-white'
                    }`}
                  >
                    <QrCode className="w-5 h-5 text-sky-600 shrink-0" />
                    <div>
                      <span className="font-bold text-slate-900 block text-xs">Instant UPI QR</span>
                      <span className="text-[10px] text-slate-500">Scan via GPay / PhonePe / Paytm</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('RAZORPAY')}
                    className={`p-3 rounded-xl border flex items-center gap-2.5 transition cursor-pointer text-left ${
                      paymentMethod === 'RAZORPAY'
                        ? 'bg-sky-50 border-sky-400 ring-2 ring-sky-300/50'
                        : 'bg-slate-50 border-slate-200 hover:bg-white'
                    }`}
                  >
                    <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <span className="font-bold text-slate-900 block text-xs">Cards / NetBanking</span>
                      <span className="text-[10px] text-slate-500">100% Encrypted Gateway</span>
                    </div>
                  </button>
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-sky-600 to-[#051833] hover:from-sky-700 hover:to-[#0a2548] text-white font-extrabold text-sm shadow-lg shadow-sky-600/25 transition cursor-pointer flex items-center justify-center gap-2 text-center disabled:opacity-50"
              >
                {loading ? (
                  <span>Locking Slot &amp; Generating Pass...</span>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-sky-300" />
                    <span>CONFIRM &amp; BOOK ADVENTURE ({formatINR(finalTotal)})</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Slot locked on vessel • 100% Weather Refund Guarantee</span>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
