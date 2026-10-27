import React, { useState, useEffect } from 'react';
import { getEventPackages, EventPackagesResponse } from '../api/events';
import { createBooking } from '../api/bookings';
import { validateCoupon, CouponValidationResult, getActiveOffers } from '../api/offers';
import { useAuth } from '../context/AuthContext';
import { Booking, CharterShip, Offer } from '../api/types';
import confetti from 'canvas-confetti';
import { formatINR } from '../utils/currency';
import { useNavigate } from 'react-router-dom';
import { TicketPass } from '../components/ticket/TicketPass';
import { WhatsAppIcon } from '../components/common/WhatsAppIcon';
import {
  Sparkles,
  Anchor,
  CheckCircle2,
  ArrowRight,
  AlertCircle,
  Gem,
  Printer,
  Calendar,
  Clock,
  Users,
  MapPin,
  Ship,
  ShieldCheck,
  MessageCircle,
  AlertTriangle,
  Check,
  Lock,
  Tag,
  Percent,
  X,
} from 'lucide-react';

interface PrivateEventsPageProps {
  onSuccess: (booking: Booking) => void;
  onNeedLogin: () => void;
}

const VIP_PRESETS = [
  '🌸 Floral Deck Arch & Mandap',
  '🥂 Welcome Champagne Toast',
  '🎧 Live DJ & Audiovisual Rig',
  '🚁 4K Aerial Drone Coverage',
  '🎂 Customized Celebration Cake',
  '🎙️ Wireless Mic & Speech Podium',
];

export const PrivateEventsPage: React.FC<PrivateEventsPageProps> = ({
  onSuccess,
  onNeedLogin,
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<EventPackagesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);

  // Form State
  const [selectedEventType, setSelectedEventType] = useState('wedding');
  const [selectedShipId, setSelectedShipId] = useState<number>(0);
  const [selectedPackageId, setSelectedPackageId] = useState('diamond');
  const [eventDate, setEventDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 21); // 3 weeks out
    return d.toISOString().split('T')[0];
  });
  const [startTime, setStartTime] = useState('17:00');
  const [endTime, setEndTime] = useState('23:00');
  const [guestCount, setGuestCount] = useState<number>(50);
  const [specialRequests, setSpecialRequests] = useState('');

  // Promo Code & Voucher State
  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponResult, setCouponResult] = useState<CouponValidationResult | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [activeOffers, setActiveOffers] = useState<Offer[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    getEventPackages()
      .then((res) => {
        setData(res);
        if (res.charter_ships && res.charter_ships.length > 0) {
          setSelectedShipId(res.charter_ships[0].id);
        }
      })
      .catch((err) => console.error('Failed to load event packages:', err))
      .finally(() => setLoading(false));

    getActiveOffers()
      .then((offers) => setActiveOffers(offers.filter((o) => o.is_active)))
      .catch(() => {});
  }, []);

  const selectedPackage = data?.packages.find((p) => p.id === selectedPackageId);
  const selectedShip = data?.charter_ships.find((s) => s.id === selectedShipId) || data?.charter_ships?.[0];
  const maxCapacity = selectedShip ? selectedShip.capacity : 50;
  const minCapacity = Math.min(10, maxCapacity);

  // Automatically cap guestCount whenever a ship with smaller capacity is selected
  useEffect(() => {
    if (selectedShip && guestCount > selectedShip.capacity) {
      setGuestCount(selectedShip.capacity);
    }
  }, [selectedShipId, selectedShip]);

  const shipRate = selectedShip ? parseFloat(String(selectedShip.price)) || 65000 : 65000;
  const packageBase = selectedPackage ? selectedPackage.base_fee : 28000;
  const perGuest = selectedPackage ? selectedPackage.per_guest_fee : 950;
  const subtotal = Math.round(packageBase + perGuest * guestCount + shipRate);
  const discountAmount = couponResult?.valid ? couponResult.discount_amount : 0;
  const finalTotal = Math.max(0, subtotal - discountAmount);

  // Re-validate coupon if subtotal updates
  useEffect(() => {
    if (couponResult?.valid && couponCode) {
      validateCoupon(couponCode, subtotal)
        .then((res) => {
          if (res.valid) setCouponResult(res);
        })
        .catch(() => {});
    }
  }, [subtotal]);

  const handleApplyCoupon = async (codeOverride?: string) => {
    const code = (codeOverride || couponCode).trim().toUpperCase();
    if (!code) return;
    setCouponLoading(true);
    setCouponError(null);
    try {
      const res = await validateCoupon(code, subtotal);
      if (res.valid) {
        setCouponResult(res);
        setCouponCode(res.code || code);
      } else {
        setCouponError(res.error || 'Invalid or expired promo code');
        setCouponResult(null);
      }
    } catch (err: any) {
      setCouponError(err.message || 'Promo code validation failed');
      setCouponResult(null);
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setCouponCode('');
    setCouponResult(null);
    setCouponError(null);
  };

  // Generate dynamic presets strictly <= maxCapacity
  const getCapacityPresets = (cap: number) => {
    const candidatePresets = [10, 15, 20, 25, 30, 40, 50, 75, 100, 150, 200, 300, 500, 1000];
    const filtered = candidatePresets.filter((p) => p < cap && p >= minCapacity);
    if (filtered.length > 4) {
      return [
        filtered[0],
        filtered[Math.floor(filtered.length / 3)],
        filtered[Math.floor((filtered.length * 2) / 3)],
        filtered[filtered.length - 1],
      ];
    }
    if (filtered.length === 0 && cap > minCapacity) {
      const mid = Math.round((cap / 2) / 5) * 5 || Math.floor(cap / 2);
      return mid > minCapacity && mid < cap ? [mid] : [];
    }
    return filtered;
  };

  const calculateDuration = (start: string, end: string) => {
    if (!start || !end) return '6 Hours Charter';
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    let totalMin = (eh * 60 + (em || 0)) - (sh * 60 + (sm || 0));
    if (totalMin <= 0) totalMin += 24 * 60;
    const hours = Math.floor(totalMin / 60);
    const mins = totalMin % 60;
    return mins > 0 ? `${hours}h ${mins}m Charter Window` : `${hours} Hours Charter Window`;
  };

  const getOwnerWhatsAppLink = () => {
    if (!selectedShip) return '#';
    const rawOwnerPhone = selectedShip.whatsapp_number || selectedShip.contact_number || '+919820012345';
    const cleanOwnerPhone = rawOwnerPhone.replace(/[^0-9]/g, '');
    const normalizedPhone = cleanOwnerPhone.length === 10 ? `91${cleanOwnerPhone}` : cleanOwnerPhone;

    const customerName = user?.first_name
      ? `${user.first_name} ${user.last_name || ''}`.trim()
      : (user?.username || 'Customer');
    const vesselName = selectedShip.name || 'Private Vessel';
    const ownerDisplayName = selectedShip.owner_name || 'Vessel Owner / Operator';
    const departurePort = selectedShip.departure_port || selectedShip.location || 'Designated Harbor';
    const customerPhone = user?.phone ? `• Customer Phone: ${user.phone}\n` : '';

    const waIntroMessage = `Hello ${ownerDisplayName},
My name is ${customerName}.
I am interested in chartering your ship "${vesselName}" on Cruise Hunt for a ${selectedEventType.toUpperCase()} event.

📋 Inquired Voyage Details:
• Vessel: ${vesselName} (${selectedShip.category || 'Luxury Charter'})
• Port/Location: ${departurePort}
• Event Type: ${selectedEventType.charAt(0).toUpperCase() + selectedEventType.slice(1)}
• Date: ${eventDate}
• Time: ${startTime} to ${endTime} (${calculateDuration(startTime, endTime)})
• Guest Count: ${guestCount} Guests (Capacity: ${maxCapacity})
• Selected Tier: ${selectedPackage?.tier || selectedPackageId}
• Estimated Total: ${formatINR(finalTotal)}
• Customer Name: ${customerName}
${customerPhone}
Could you please confirm slot availability and discuss custom arrangements?
Thank you!
- ${customerName}`;

    return `https://web.whatsapp.com/send?phone=${normalizedPhone}&text=${encodeURIComponent(waIntroMessage)}`;
  };

  const toggleVipPreset = (preset: string) => {
    if (specialRequests.includes(preset)) {
      setSpecialRequests((prev) =>
        prev
          .split('\n')
          .filter((line) => !line.includes(preset))
          .join('\n')
          .trim()
      );
    } else {
      setSpecialRequests((prev) => (prev.trim() ? `${prev.trim()}\n• ${preset}` : `• ${preset}`));
    }
  };

  const getVesselImageUrl = (ship?: CharterShip) => {
    if (!ship) return '/photo1_cruise_hero_bg.jpg';
    if (ship.image && ship.image.trim()) {
      const img = ship.image.trim();
      return img.startsWith('/') ? img : `/static/images/vessels/${img}`;
    }
    const slug = ship.slug || ship.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    return `/static/images/vessels/${slug}.jpg`;
  };

  const handleBookEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      if (onNeedLogin) {
        onNeedLogin();
      } else {
        navigate('/login?redirect=/events');
      }
      return;
    }

    if (!selectedShipId) {
      setErrorMessage('Please select a boat or ship for your private charter.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await createBooking({
        cruise_id: selectedShipId,
        booking_type: 'PRIVATE_EVENT',
        booking_date: eventDate,
        start_time: startTime,
        end_time: endTime,
        passengers_count: guestCount,
        event_type: selectedEventType,
        event_package: selectedPackageId,
        promo_code: couponResult?.valid ? couponResult.code : undefined,
        special_requests: specialRequests,
      });

      confetti({
        particleCount: 140,
        spread: 90,
        origin: { y: 0.5 },
        colors: ['#f97316', '#f59e0b', '#0284c7', '#051833'],
      });

      setConfirmedBooking(res.booking);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit event reservation.');
    } finally {
      setSubmitting(false);
    }
  };

  if (confirmedBooking) {
    const isPending = confirmedBooking.status === 'PENDING';
    return (
      <div className="min-h-screen pt-28 pb-20 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 bg-[#f8f9fa] text-[#051833]">
        <div className={`bg-white rounded-3xl p-6 sm:p-8 border shadow-xl mb-6 text-center space-y-3 ${
          isPending ? 'border-amber-300 shadow-amber-500/5' : 'border-emerald-500/30'
        }`}>
          <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto border ${
            isPending ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'
          }`}>
            {isPending ? <Clock className="w-8 h-8 animate-pulse text-amber-600" /> : <CheckCircle2 className="w-8 h-8" />}
          </div>
          <span className={`text-[11px] font-mono tracking-widest font-black uppercase px-3 py-1 rounded-full border inline-block ${
            isPending ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
          }`}>
            {isPending ? 'Event Charter Request Submitted • Awaiting Owner Approval' : 'Event Charter Confirmed'} • Ref #{confirmedBooking.booking_id}
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-[#051833] font-serif">
            {isPending ? 'Charter Request Submitted!' : 'Your Boarding Pass is Ready!'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto font-medium">
            {isPending
              ? 'Your private event ship charter request has been submitted to the ship owner. It is currently in PENDING status awaiting owner review. Once approved, your reservation and boarding pass will be fully confirmed.'
              : 'Your private event ship charter has been confirmed. The digital QR gate code on your boarding pass will grant boarding authorization for your guest party.'}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
            <button
              onClick={() => onSuccess(confirmedBooking)}
              className="px-6 py-2.5 rounded-xl bg-[#051833] hover:bg-[#0a2548] text-[#fff8dc] font-black text-xs shadow-md shadow-[#051833]/15 transition cursor-pointer flex items-center gap-2"
            >
              <span>View in Passenger Dashboard</span>
              <ArrowRight className="w-4 h-4 text-[#fff8dc]" />
            </button>
            <button
              onClick={() => window.print()}
              className="px-5 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-[#051833] border border-slate-200 font-bold text-xs transition cursor-pointer flex items-center gap-2 shadow-sm"
            >
              <Printer className="w-4 h-4 text-[#0284c7]" />
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

  if (loading || !data) {
    return (
      <div className="min-h-screen pt-32 flex items-center justify-center bg-[#f8f9fa]">
        <div className="w-12 h-12 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen pt-24 sm:pt-28 pb-24 bg-[#f8f9fa] text-[#051833] overflow-x-hidden">
      {/* ============================================================ */}
      {/* FULL-BLEED HERO SUNSET BACKDROP (NO WHITE STRIPS ON SIDES)  */}
      {/* ============================================================ */}
      <div className="absolute top-0 left-0 right-0 w-full h-[640px] pointer-events-none overflow-hidden z-0">
        {/* 1. Hero Flagship Ship Silhouette & Sunset Light from Hero Section */}
        <div className="absolute inset-0 w-full h-full opacity-35 sm:opacity-40 mix-blend-multiply overflow-hidden pointer-events-none">
          <img
            src="/assets/hero-ship-sunset.jpg"
            alt="Maritime Charter Ship Sunset"
            className="w-full h-full object-cover object-[center_34%] filter saturate-150 scale-105"
            onError={(e) => {
              const target = e.currentTarget;
              if (!target.src.includes('photo1_cruise_hero_bg.jpg')) {
                target.src = '/photo1_cruise_hero_bg.jpg';
              }
            }}
          />
        </div>

        {/* 2. Full-bleed edge-to-edge warm sunset ambient gradient (130% width covers full viewport, eliminating any white strips) */}
        <div
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 130% 80% at 50% 12%, rgba(249, 115, 22, 0.40) 0%, rgba(251, 146, 60, 0.25) 38%, rgba(254, 215, 170, 0.14) 65%, rgba(248, 249, 250, 0.95) 95%), linear-gradient(to bottom, rgba(248, 249, 250, 0.15) 0%, rgba(248, 249, 250, 0.55) 60%, #f8f9fa 100%)',
          }}
        />

        {/* 3. Extreme-edge ambient blur lights spreading across outer browser bounds */}
        <div className="absolute -top-24 -left-28 w-[600px] h-[600px] bg-gradient-to-br from-amber-400/30 via-orange-500/20 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -top-24 -right-28 w-[600px] h-[600px] bg-gradient-to-bl from-orange-500/30 via-amber-300/20 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-24 left-1/2 -translate-x-1/2 w-[850px] h-[360px] bg-gradient-to-r from-orange-400/20 via-amber-400/25 to-orange-400/20 rounded-full blur-3xl pointer-events-none" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* ============================================================ */}
        {/* HERO TITLE                                                  */}
        {/* ============================================================ */}
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-4">
          <h1 className="text-4xl sm:text-6xl font-serif font-extrabold text-[#051833] tracking-tight text-stroke-dark leading-tight">
            Host Your Moment <span className="text-orange-600 italic font-serif">at Sea</span>
          </h1>

          <p className="text-slate-700 text-sm sm:text-base max-w-2xl mx-auto font-medium leading-relaxed drop-shadow-sm">
            Private wedding ceremonies, milestone anniversary galas, corporate leadership ocean retreats, and VIP productions aboard India's finest verified luxury yachts & catamarans.
          </p>

          {/* Step Guidance Pill */}
          <div className="pt-2 flex items-center justify-center gap-2 text-xs font-bold text-slate-600 flex-wrap">
            <span className="px-3 py-1 rounded-full bg-orange-100/90 text-orange-800 border border-orange-300">
              Step 1: Choose Package Tier
            </span>
            <span className="text-slate-400">→</span>
            <span className="px-3 py-1 rounded-full bg-white/90 text-slate-700 border border-slate-200">
              Step 2: Configure Ship & Schedule
            </span>
            <span className="text-slate-400">→</span>
            <span className="px-3 py-1 rounded-full bg-white/90 text-slate-700 border border-slate-200">
              Step 3: Instant Lock & Reserve
            </span>
          </div>
        </div>

        {/* ============================================================ */}
        {/* 1. PACKAGE COMPARISON CARDS (ORANGE BORDER ON SELECT)       */}
        {/* ============================================================ */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-14">
          {data.packages.map((pkg) => {
            const isSelected = selectedPackageId === pkg.id;
            return (
              <div
                key={pkg.id}
                onClick={() => setSelectedPackageId(pkg.id)}
                className={`p-6 sm:p-8 rounded-3xl border-2 transition-all duration-300 cursor-pointer flex flex-col justify-between relative bg-white/95 backdrop-blur-sm ${
                  isSelected
                    ? 'border-orange-500 shadow-2xl shadow-orange-500/20 ring-4 ring-orange-500/20 scale-[1.02]'
                    : 'border-slate-200 hover:border-orange-300 hover:shadow-lg shadow-md'
                }`}
              >
                {isSelected && (
                  <div className="absolute -top-3.5 right-6 px-3.5 py-1 rounded-full bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 text-white font-black text-[10px] uppercase tracking-wider shadow-md shadow-orange-500/30 flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-white" />
                    Selected Tier
                  </div>
                )}

                <div>
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-colors ${
                      isSelected
                        ? 'bg-orange-50 border border-orange-300 text-orange-600 shadow-inner'
                        : 'bg-slate-50 border border-slate-200 text-[#0284c7]'
                    }`}
                  >
                    <Gem className="w-6 h-6" />
                  </div>
                  <h3 className="font-serif font-bold text-xl text-[#051833]">{pkg.tier}</h3>
                  <p className={`text-xs mt-1 font-semibold ${isSelected ? 'text-orange-600 font-bold' : 'text-[#0284c7]'}`}>
                    {pkg.recommended_for}
                  </p>

                  <div className="my-5 pt-4 border-t border-slate-100">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-display font-black text-[#051833] font-mono-numbers">
                        {formatINR(pkg.base_fee)}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">base setup fee</span>
                    </div>
                    <span className="text-xs text-slate-600 block mt-0.5 font-semibold">
                      + {formatINR(pkg.per_guest_fee)} / guest hospitality
                    </span>
                  </div>

                  <div className="space-y-2.5 pt-2">
                    {pkg.highlights.map((h, i) => (
                      <div key={i} className="text-xs text-slate-700 flex items-start gap-2 font-medium">
                        <CheckCircle2
                          className={`w-4 h-4 shrink-0 mt-0.5 transition-colors ${
                            isSelected ? 'text-orange-500' : 'text-[#0284c7]'
                          }`}
                        />
                        <span>{h}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-6 mt-6 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setSelectedPackageId(pkg.id)}
                    className={`w-full py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition cursor-pointer ${
                      isSelected
                        ? 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black shadow-md shadow-orange-500/25'
                        : 'bg-white hover:bg-orange-50/50 text-[#051833] border border-slate-200 hover:border-orange-200 shadow-sm'
                    }`}
                  >
                    {isSelected ? 'Active Selection' : 'Select Tier'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* ============================================================ */}
        {/* 2. SMART CONCIERGE CHARTER BUILDER (2-COLUMN INTERACTIVE UI) */}
        {/* ============================================================ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* ---------------------------------------------------------- */}
          {/* LEFT COLUMN: INTERACTIVE CONFIGURATION FORM (8 COLS)       */}
          {/* ---------------------------------------------------------- */}
          <div className="lg:col-span-7 xl:col-span-8 bg-white/95 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-orange-500/25 shadow-xl space-y-7">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#051833] flex items-center gap-2.5">
                <Anchor className="w-5 h-5 text-orange-500" />
                Charter Specification
              </h2>
              <span className="text-[11px] font-bold text-orange-600 bg-orange-50 border border-orange-200 px-3 py-1 rounded-full uppercase tracking-wider">
                Step 2 of 3
              </span>
            </div>

            {errorMessage && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleBookEvent} className="space-y-6">
              {/* SECTION 1: VESSEL SELECTION WITH SMART VISUAL PREVIEW CARD */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs uppercase font-black text-slate-700 tracking-wider">
                    1. Select Charter Vessel
                  </label>
                  <span className="text-[11px] text-slate-500 font-semibold">
                    {data.charter_ships.length} ships available
                  </span>
                </div>

                <select
                  value={selectedShipId}
                  onChange={(e) => setSelectedShipId(parseInt(e.target.value))}
                  className="w-full px-4 py-3 rounded-2xl bg-[#f8f9fa] border border-slate-200 text-[#051833] font-semibold text-xs sm:text-sm focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-400/20 transition cursor-pointer"
                >
                  {data.charter_ships.map((ship) => (
                    <option key={ship.id} value={ship.id} className="bg-white text-[#051833]">
                      {ship.name} — {ship.category} (Cap: {ship.capacity} guests | {ship.location})
                    </option>
                  ))}
                </select>

                {/* Smart Live Vessel Preview Card */}
                {selectedShip && (
                  <div className="rounded-2xl border border-orange-200/90 bg-gradient-to-r from-orange-50/50 via-white to-amber-50/30 p-3.5 flex flex-col sm:flex-row items-center gap-4 shadow-sm">
                    <div className="relative w-full sm:w-28 h-20 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                      <img
                        src={getVesselImageUrl(selectedShip)}
                        alt={selectedShip.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.currentTarget;
                          if (!target.src.includes('photo1_cruise_hero_bg.jpg')) {
                            target.src = '/photo1_cruise_hero_bg.jpg';
                          }
                        }}
                      />
                      <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/70 text-[9px] text-white font-mono font-bold">
                        {selectedShip.capacity} Max
                      </span>
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 text-[10px] font-black uppercase tracking-wider">
                          {selectedShip.category}
                        </span>
                        <div className="flex items-center gap-1 text-[11px] text-slate-500 font-semibold truncate">
                          <MapPin className="w-3 h-3 text-orange-500 shrink-0" />
                          <span className="truncate">{selectedShip.location}</span>
                        </div>
                      </div>
                      <h4 className="font-serif font-bold text-base text-[#051833] truncate">
                        {selectedShip.name}
                      </h4>
                      <p className="text-xs text-slate-600 font-medium">
                        Base Vessel Charter Rate:{' '}
                        <span className="font-black text-[#051833] font-mono-numbers">
                          {formatINR(parseFloat(String(selectedShip.price)) || 65000)}
                        </span>
                      </p>
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <span className="text-[10px] text-emerald-900 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                          <WhatsAppIcon className="w-3 h-3 text-emerald-600" variant="solid" />
                          <span>Owner: {selectedShip.owner_name || 'Verified Owner'}</span>
                        </span>
                        <a
                          href={getOwnerWhatsAppLink()}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition inline-flex items-center gap-1 cursor-pointer shadow-xs"
                          title={`Chat with ${selectedShip.owner_name || 'Owner'} on WhatsApp`}
                        >
                          <WhatsAppIcon className="w-3 h-3" variant="solid" />
                          <span>Chat on WhatsApp</span>
                        </a>
                      </div>
                    </div>

                    {guestCount > selectedShip.capacity && (
                      <div className="w-full sm:w-auto px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-bold flex items-center gap-1.5 shrink-0">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>Exceeds capacity</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* SECTION 2: DATE & SCHEDULE WINDOW */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs uppercase font-black text-slate-700 tracking-wider">
                    2. Charter Schedule & Timing
                  </label>
                  <span className="text-[11px] font-bold text-orange-600 bg-orange-50 px-2.5 py-0.5 rounded-full border border-orange-200 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {calculateDuration(startTime, endTime)}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500">Charter Date</label>
                    <div className="relative">
                      <input
                        type="date"
                        value={eventDate}
                        min={new Date().toISOString().split('T')[0]}
                        onChange={(e) => setEventDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-[#f8f9fa] border border-slate-200 text-[#051833] text-xs font-semibold focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-400/20 transition cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500">Departure Time</label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#f8f9fa] border border-slate-200 text-[#051833] text-xs font-semibold focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-400/20 transition cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500">Return Time</label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#f8f9fa] border border-slate-200 text-[#051833] text-xs font-semibold focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-400/20 transition cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 3: GUEST CAPACITY & PRESETS */}
              <div className="space-y-2.5">
                <div className="flex justify-between items-center text-xs">
                  <label className="uppercase font-black text-slate-700 tracking-wider">
                    3. Guest Count & Catering Hospitality
                  </label>
                  <span className="font-black text-orange-600 text-sm font-mono-numbers">
                    {guestCount} Guests{' '}
                    <span className="text-xs text-slate-500 font-normal">
                      (@ {formatINR(perGuest)}/head)
                    </span>
                  </span>
                </div>

                <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold px-0.5">
                  <span>Min: {minCapacity} Guests</span>
                  <span className="text-orange-600 font-extrabold">Max Capacity: {maxCapacity} Guests</span>
                </div>

                <input
                  type="range"
                  min={minCapacity}
                  max={maxCapacity}
                  step={maxCapacity > 200 ? 5 : 1}
                  value={Math.min(guestCount, maxCapacity)}
                  onChange={(e) => setGuestCount(Math.min(parseInt(e.target.value) || minCapacity, maxCapacity))}
                  className="w-full accent-orange-500 cursor-pointer"
                />

                {/* Quick Presets strictly within maxCapacity */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                    Quick Presets:
                  </span>
                  {getCapacityPresets(maxCapacity).map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setGuestCount(num)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                        guestCount === num
                          ? 'bg-orange-500 text-white shadow-sm'
                          : 'bg-[#f8f9fa] border border-slate-200 text-slate-600 hover:border-orange-300'
                      }`}
                    >
                      {num} Guests
                    </button>
                  ))}
                  {/* Max Capacity Button strictly = maxCapacity */}
                  <button
                    type="button"
                    onClick={() => setGuestCount(maxCapacity)}
                    className={`px-3 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ml-auto ${
                      guestCount === maxCapacity
                        ? 'bg-orange-500 text-white shadow-sm ring-2 ring-orange-300'
                        : 'bg-amber-50 border border-amber-300 text-amber-900 hover:bg-amber-100'
                    }`}
                  >
                    Max Capacity ({maxCapacity})
                  </button>
                </div>
              </div>

              {/* SECTION 4: BESPOKE VIP PRESETS & SPECIAL REQUESTS */}
              <div className="space-y-2">
                <label className="block text-xs uppercase font-black text-slate-700 tracking-wider">
                  4. VIP Inclusions & Special Requests
                </label>

                {/* Clickable VIP Tag Pills */}
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {VIP_PRESETS.map((preset) => {
                    const isChecked = specialRequests.includes(preset);
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => toggleVipPreset(preset)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition cursor-pointer flex items-center gap-1 ${
                          isChecked
                            ? 'bg-orange-500 text-white shadow-sm'
                            : 'bg-white border border-slate-200 text-slate-600 hover:border-orange-300 hover:bg-orange-50/40'
                        }`}
                      >
                        {isChecked && <Check className="w-3 h-3 text-white" />}
                        <span>{preset}</span>
                      </button>
                    );
                  })}
                </div>

                <textarea
                  rows={3}
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value)}
                  placeholder="e.g. Red carpet on gangway, specific catering preferences (Jain / Vegan / Seafood), keynote AV setup..."
                  className="w-full p-3.5 rounded-2xl bg-[#f8f9fa] border border-slate-200 text-[#051833] text-xs font-medium placeholder:text-slate-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-400/20 transition"
                />
              </div>

              {/* SECTION 5: PROMO CODE & SPECIAL OFFERS */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-orange-50/70 to-amber-50/70 border border-orange-200/90 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs uppercase font-black text-slate-800 tracking-wider flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-orange-600" />
                    <span>5. Promo Code / Corporate Voucher</span>
                  </label>
                  {couponResult?.valid && (
                    <button
                      type="button"
                      onClick={handleRemoveCoupon}
                      className="text-[11px] text-rose-600 hover:underline font-bold flex items-center gap-0.5 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                      <span>Remove</span>
                    </button>
                  )}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => {
                      setCouponCode(e.target.value.toUpperCase());
                      if (couponError) setCouponError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleApplyCoupon();
                      }
                    }}
                    placeholder="Enter promo code (e.g. ROYAL5000, VOYAGE10)"
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-xs uppercase font-mono font-bold text-slate-900 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-400/20"
                  />
                  <button
                    type="button"
                    disabled={couponLoading || !couponCode.trim()}
                    onClick={() => handleApplyCoupon()}
                    className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs transition cursor-pointer disabled:opacity-50 shadow-sm shadow-orange-500/20"
                  >
                    {couponLoading ? 'Checking...' : 'Apply Code'}
                  </button>
                </div>

                {/* Available Offers Quick Badges */}
                {activeOffers.length > 0 && !couponResult?.valid && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold block">
                      Active Deals (Tap code to apply):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {activeOffers.map((offer) => (
                        <button
                          key={offer.id}
                          type="button"
                          onClick={() => {
                            setCouponCode(offer.code);
                            handleApplyCoupon(offer.code);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-white hover:bg-orange-100 text-orange-900 border border-orange-300 text-[10px] font-mono font-bold transition cursor-pointer flex items-center gap-1 shadow-xs"
                        >
                          <Percent className="w-2.5 h-2.5 text-orange-600" />
                          <span>{offer.code}</span>
                          <span className="text-[9px] text-orange-600 font-semibold">
                            ({offer.discount_type === 'PERCENTAGE' ? `${offer.discount_value}% OFF` : `₹${offer.discount_value} OFF`})
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Feedback Alerts */}
                {couponError && (
                  <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    <span>{couponError}</span>
                  </div>
                )}

                {couponResult?.valid && (
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Code <strong>{couponResult.code}</strong> applied! You save {formatINR(couponResult.discount_amount)}</span>
                    </div>
                    <span className="text-emerald-700 font-mono-numbers text-sm">
                      - {formatINR(couponResult.discount_amount)}
                    </span>
                  </div>
                )}
              </div>

              {/* Small screens CTA */}
              <div className="lg:hidden pt-4 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">Estimated Total</span>
                  <div className="flex items-baseline gap-2">
                    {discountAmount > 0 && (
                      <span className="text-xs text-slate-400 line-through font-mono-numbers">
                        {formatINR(subtotal)}
                      </span>
                    )}
                    <span className="text-2xl font-black text-[#051833] font-mono-numbers">
                      {formatINR(finalTotal)}
                    </span>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-3 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-serif font-black text-xs shadow-lg shadow-orange-500/25 flex items-center gap-1.5"
                >
                  <span>{submitting ? 'Submitting...' : 'Request Charter'}</span>
                  <ArrowRight className="w-4 h-4 text-white" />
                </button>
              </div>
            </form>
          </div>

          {/* ---------------------------------------------------------- */}
          {/* RIGHT COLUMN: STICKY LIVE ESTIMATE & SUMMARY (4-5 COLS)     */}
          {/* ---------------------------------------------------------- */}
          <div className="lg:col-span-5 xl:col-span-4 lg:sticky lg:top-28 space-y-4">
            {/* Live Pricing Breakdown Card */}
            <div className="bg-white/95 backdrop-blur-md rounded-3xl p-6 border-2 border-orange-500/30 shadow-2xl shadow-orange-500/10 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-orange-600 font-bold block">
                    Live Calculation
                  </span>
                  <h3 className="font-serif font-bold text-lg text-[#051833]">Quotation Breakdown</h3>
                </div>
                <div className="w-8 h-8 rounded-full bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-500">
                  <Sparkles className="w-4 h-4" />
                </div>
              </div>

              {/* Itemized Calculation */}
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between text-slate-600 font-medium">
                  <div className="flex items-center gap-1.5">
                    <Gem className="w-3.5 h-3.5 text-orange-500" />
                    <span className="truncate max-w-[160px] font-bold text-[#051833]">
                      {selectedPackage?.tier.split('(')[0] || 'Selected Package'}
                    </span>
                  </div>
                  <span className="font-mono-numbers font-bold text-[#051833]">
                    {formatINR(packageBase)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-600 font-medium">
                  <div className="flex items-center gap-1.5">
                    <Ship className="w-3.5 h-3.5 text-orange-500" />
                    <span className="truncate max-w-[160px] text-slate-700">
                      {selectedShip?.name || 'Vessel Rate'}
                    </span>
                  </div>
                  <span className="font-mono-numbers font-bold text-[#051833]">
                    {formatINR(shipRate)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-600 font-medium">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-orange-500" />
                    <span>
                      Catering ({guestCount} × {formatINR(perGuest)})
                    </span>
                  </div>
                  <span className="font-mono-numbers font-bold text-[#051833]">
                    {formatINR(perGuest * guestCount)}
                  </span>
                </div>

                {/* Subtotal if discount applied */}
                {discountAmount > 0 && (
                  <div className="flex items-center justify-between text-slate-500 pt-1 border-t border-slate-100">
                    <span>Gross Subtotal</span>
                    <span className="font-mono-numbers">{formatINR(subtotal)}</span>
                  </div>
                )}

                {/* Promo Code Discount Row */}
                {discountAmount > 0 && (
                  <div className="flex items-center justify-between text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1.5 rounded-xl border border-emerald-200">
                    <div className="flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Promo Discount ({couponResult?.code})</span>
                    </div>
                    <span className="font-mono-numbers">- {formatINR(discountAmount)}</span>
                  </div>
                )}

                {/* Promo Code Input in Sidebar */}
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                      <Tag className="w-3 h-3 text-orange-500" />
                      Promo Code / Voucher
                    </span>
                    {couponResult?.valid && (
                      <button
                        type="button"
                        onClick={handleRemoveCoupon}
                        className="text-[10px] text-rose-600 hover:underline font-bold cursor-pointer"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => {
                        setCouponCode(e.target.value.toUpperCase());
                        if (couponError) setCouponError(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleApplyCoupon();
                        }
                      }}
                      placeholder="e.g. ROYAL5000"
                      className="flex-1 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono font-bold uppercase text-slate-900 focus:outline-none focus:border-orange-500"
                    />
                    <button
                      type="button"
                      disabled={couponLoading || !couponCode.trim()}
                      onClick={() => handleApplyCoupon()}
                      className="px-3 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs transition cursor-pointer disabled:opacity-50"
                    >
                      {couponLoading ? '...' : 'Apply'}
                    </button>
                  </div>
                  {couponError && (
                    <p className="text-[10px] text-rose-600 font-semibold">{couponError}</p>
                  )}
                  {couponResult?.valid && (
                    <p className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      Saved {formatINR(couponResult.discount_amount)} with code {couponResult.code}!
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 font-bold block">
                        Estimated Charter Total
                      </span>
                      <div className="flex items-baseline gap-2">
                        {discountAmount > 0 && (
                          <span className="text-sm text-slate-400 line-through font-mono-numbers">
                            {formatINR(subtotal)}
                          </span>
                        )}
                        <span className="text-3xl font-display font-black text-[#051833] font-mono-numbers">
                          {formatINR(finalTotal)}
                        </span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black uppercase tracking-wider">
                      GST Inclusive
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 font-medium">
                    Includes certified captain, hospitality deck crew, standard docking charges & itinerary clearance.
                  </p>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="button"
                onClick={handleBookEvent}
                disabled={submitting}
                className={`w-full py-3.5 rounded-2xl text-white font-serif font-black text-sm tracking-wide shadow-xl flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer ${
                  !user
                    ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 shadow-amber-600/25'
                    : 'bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-amber-600 shadow-orange-500/25'
                }`}
              >
                <span>{submitting ? 'Securing Charter...' : !user ? 'SIGN IN TO RESERVE CHARTER' : 'CONFIRM & RESERVE CHARTER'}</span>
                <ArrowRight className="w-4 h-4 text-white" />
              </button>
              {!user && (
                <p className="text-[11px] text-center text-slate-500 font-medium">
                  🔒 User account login is required to reserve a private charter
                </p>
              )}

              {/* Trust Guarantees */}
              <div className="pt-3 border-t border-slate-100 space-y-2 text-[11px] text-slate-600 font-medium">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>100% Exclusive Whole-Ship Charter (No public ticketing)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Anchor className="w-4 h-4 text-orange-500 shrink-0" />
                  <span>Licensed Seaworthiness & Maritime Insurance Certified</span>
                </div>
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-[#0284c7] shrink-0" />
                  <span>Server-Side Real-Time Slot Locking Guarantee</span>
                </div>
              </div>
            </div>

            {/* Direct WhatsApp Vessel Owner Inquiry Card */}
            {selectedShip && (
              <div className="rounded-3xl p-4 bg-gradient-to-r from-emerald-50 via-teal-50/70 to-emerald-100/50 border border-emerald-300/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-600/20">
                    <WhatsAppIcon className="w-5 h-5" variant="solid" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-black text-emerald-950 font-serif truncate">
                        Chat Directly with Ship Owner
                      </h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-200/60 text-emerald-900 border border-emerald-300">
                        {selectedShip.owner_name || 'Vessel Owner'}
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-800 truncate mt-0.5">
                      Inquire about <strong className="font-bold">{selectedShip.name}</strong> • {selectedShip.departure_port || selectedShip.location || 'Port'}
                    </p>
                  </div>
                </div>
                <a
                  href={getOwnerWhatsAppLink()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition cursor-pointer shrink-0 shadow-sm inline-flex items-center justify-center gap-1.5 self-start sm:self-auto"
                  title={`Open WhatsApp chat with ${selectedShip.owner_name || 'Ship Owner'}`}
                >
                  <WhatsAppIcon className="w-3.5 h-3.5" variant="solid" />
                  <span>Chat Now</span>
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
