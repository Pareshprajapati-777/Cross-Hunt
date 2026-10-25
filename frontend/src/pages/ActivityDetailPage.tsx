import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Waves,
  MapPin,
  Clock,
  Users,
  ShieldCheck,
  Star,
  ArrowRight,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Share2,
  Ship,
  Navigation,
  Compass,
  Tag,
  Check,
} from 'lucide-react';
import { ActivityItem } from '../api/types';
import { getActivity, bookActivity } from '../api/activities';
import { formatINR } from '../utils/currency';
import { validateCoupon, CouponValidationResult } from '../api/offers';
import { PortRouteMapModal } from '../components/navigation/PortRouteMapModal';
import { WhatsAppIcon } from '../components/common/WhatsAppIcon';
import { useAuth } from '../context/AuthContext';
import { useAuthModal } from '../context/AuthModalContext';
import confetti from 'canvas-confetti';

export const ActivityDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { openLoginModal } = useAuthModal();

  const [activity, setActivity] = useState<ActivityItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Booking Widget State
  const [bookingDate, setBookingDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [selectedSlot, setSelectedSlot] = useState('');
  const [participants, setParticipants] = useState(1);
  const [selectedAddons, setSelectedAddons] = useState<Array<{ id: string; name: string; price: number }>>([]);
  const [whatsappMobile, setWhatsappMobile] = useState(user?.phone || '');
  const [specialRequest, setSpecialRequest] = useState('');

  // Promo code
  const [promoCode, setPromoCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponResult, setCouponResult] = useState<CouponValidationResult | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  // Submission & modals
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [mapBookingMock, setMapBookingMock] = useState<any | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    getActivity(slug)
      .then((res) => {
        setActivity(res);
        if (res.time_slots && res.time_slots.length > 0) {
          setSelectedSlot(res.time_slots[0]);
        }
      })
      .catch((err) => {
        console.error('Failed to load activity details:', err);
        setError('Activity not found or currently unavailable.');
      })
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FCFF] flex flex-col items-center justify-center py-24 text-slate-500 space-y-4">
        <div className="w-12 h-12 border-4 border-sky-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Loading Experience Details...</p>
      </div>
    );
  }

  if (error || !activity) {
    return (
      <div className="min-h-screen bg-[#F8FCFF] flex flex-col items-center justify-center py-20 px-4 text-center">
        <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 font-serif">Experience Not Found</h2>
        <p className="text-xs text-slate-500 max-w-sm mt-1">{error || 'The requested activity could not be loaded.'}</p>
        <button
          onClick={() => navigate('/activities')}
          className="mt-6 px-6 py-2.5 rounded-full bg-[#051833] text-white text-xs font-bold shadow-md hover:bg-sky-900 transition"
        >
          Back to All Activities
        </button>
      </div>
    );
  }

  // Addons setup
  const defaultAddons = [
    { id: 'gopro', name: '4K GoPro Action Video & Photo Package', price: 499 },
    { id: 'vest', name: 'Pro Impact Neoprene Vest & Safety Gloves', price: 199 },
    { id: 'pickup', name: 'Hotel Pickup & Return Drop Transfer', price: 799 },
    { id: 'refresh', name: 'Fresh Coconut & Post-Ride Energy Pack', price: 149 },
  ];
  const availableAddons =
    activity.additional_options && activity.additional_options.length > 0
      ? activity.additional_options
      : defaultAddons;

  const toggleAddon = (addon: { id: string; name: string; price: number }) => {
    if (selectedAddons.some((a) => a.id === addon.id)) {
      setSelectedAddons(selectedAddons.filter((a) => a.id !== addon.id));
    } else {
      setSelectedAddons([...selectedAddons, addon]);
    }
  };

  // Price calculations
  const unitPrice = activity.price;
  const addonsTotal = selectedAddons.reduce((sum, item) => sum + item.price, 0);
  const subtotal = Math.round(unitPrice * participants) + addonsTotal;
  const discountAmount = couponResult?.valid ? couponResult.discount_amount : 0;
  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const taxAmount = Math.round(taxableAmount * 0.05); // 5% GST
  const finalTotal = taxableAmount + taxAmount;

  const handleApplyCoupon = async () => {
    if (!promoCode.trim()) return;
    setCouponLoading(true);
    setCouponError(null);
    try {
      const res = await validateCoupon(promoCode.trim().toUpperCase(), subtotal);
      if (res.valid) {
        setCouponResult(res);
      } else {
        setCouponError(res.error || 'Invalid promo voucher code');
        setCouponResult(null);
      }
    } catch (err: any) {
      setCouponError(err.message || 'Promo validation failed');
      setCouponResult(null);
    } finally {
      setCouponLoading(false);
    }
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      openLoginModal({
        title: 'Sign In to Book Water Sports & Rides',
        featureName: activity.title,
        description: 'Login or create an account to book this experience and receive your digital boarding pass.',
      });
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await bookActivity({
        activity_id: activity.id,
        booking_date: bookingDate,
        time_slot: selectedSlot || (activity.time_slots[0] || '10:00 AM'),
        participants,
        selected_addons: selectedAddons.length > 0 ? selectedAddons : undefined,
        customer_whatsapp: whatsappMobile || user.phone || undefined,
        promo_code: couponResult?.valid ? couponResult.code : undefined,
        special_request: specialRequest.trim() || undefined,
        payment_method: 'Instant UPI QR (Razorpay)',
      });

      if (res.success && res.booking) {
        try {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#0284c7', '#06b6d4', '#10b981', '#f59e0b'],
          });
        } catch {
          // ignore
        }
        navigate(`/dashboard?booking_id=${res.booking.booking_id}&openPass=true`);
      } else {
        setSubmitError('Booking could not be finalized. Please try again.');
      }
    } catch (err: any) {
      setSubmitError(err.message || 'Booking failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenPortMap = () => {
    setMapBookingMock({
      id: activity.id,
      booking_id: `ACT-PREVIEW-${activity.id}`,
      cruise_name: activity.host_ship_name || activity.title,
      cruise_title: activity.title,
      departure_port: activity.departure_port,
      destination: activity.location,
      booking_date: bookingDate,
      status: 'CONFIRMED',
    });
  };

  const getOwnerChatUrl = () => {
    const rawPhone = activity.owner_phone || '+919820012345';
    const digits = rawPhone.replace(/\D/g, '');
    const phone = digits.length === 10 ? `91${digits}` : digits;
    const custName = user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : 'Guest';
    const boatText = activity.requires_boat && activity.host_ship_name ? ` (Host Vessel: ${activity.host_ship_name})` : '';
    const msg = `Hello ${activity.owner_name},\nMy name is ${custName}.\nI am inquiring about booking "${activity.title}" on Cross Hunt${boatText}.\nLocation: ${activity.location}.\nStarting Price: ${formatINR(activity.starting_price || activity.price)}/person.\nPlease let me know about slot availability. Thank you!`;
    return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className="min-h-screen bg-[#F8FCFF] text-slate-800 pb-28">
      {/* 1. TOP BREADCRUMB & BANNER */}
      <div className="bg-[#051833] text-white pt-6 pb-8 px-4 sm:px-6 lg:px-8 border-b border-sky-950">
        <div className="max-w-7xl mx-auto space-y-4">
          {/* Breadcrumb row */}
          <div className="flex items-center justify-between">
            <Link
              to="/activities"
              className="inline-flex items-center gap-2 text-xs font-bold text-sky-300 hover:text-white transition cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to All Activities &amp; Water Sports</span>
            </Link>

            <button
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>{copiedLink ? 'Link Copied!' : 'Share Activity'}</span>
            </button>
          </div>

          {/* Title and Badges */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-sky-500/20 text-sky-300 border border-sky-400/30 text-[11px] font-black uppercase tracking-wider">
                {activity.category_group || 'Water Sports'}
              </span>
              <span className="px-3 py-1 rounded-full bg-emerald-500 text-white text-[11px] font-bold shadow-xs flex items-center gap-1">
                ★ {activity.rating} ({activity.reviews_count} Verified Reviews)
              </span>
              <span
                className={`px-3 py-1 rounded-full text-[11px] font-bold border flex items-center gap-1.5 ${
                  activity.requires_boat
                    ? 'bg-sky-400/10 border-sky-400/30 text-sky-200'
                    : 'bg-emerald-400/10 border-emerald-400/30 text-emerald-200'
                }`}
              >
                {activity.requires_boat ? (
                  <Ship className="w-3.5 h-3.5 text-sky-300" />
                ) : (
                  <Waves className="w-3.5 h-3.5 text-emerald-300" />
                )}
                <span>
                  {activity.vessel_requirement_note ||
                    (activity.requires_boat ? 'Boat Transport Included' : 'Beach & Shore-Based (No Boat Needed)')}
                </span>
              </span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-black font-serif text-white tracking-tight leading-tight">
              {activity.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 pt-1">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-sky-400" />
                <span>{activity.departure_port} • {activity.location}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-sky-400" />
                <span>{activity.duration_display}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-sky-400" />
                <span>Max {activity.capacity_per_slot} People / Slot</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. MAIN 2-COLUMN LAYOUT */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT COLUMN: Image & Full Details (7 cols) */}
          <div className="lg:col-span-7 space-y-8">
            {/* Action Photograph Banner */}
            <div className="relative rounded-3xl overflow-hidden shadow-xl border border-slate-200/80 bg-slate-900 aspect-video">
              <img
                src={activity.image || '/static/images/placeholder.png'}
                alt={activity.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-black/20" />
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-white text-xs">
                <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/30 font-bold uppercase tracking-wider text-[11px]">
                  {activity.difficulty_level}
                </span>
                <span className="px-3 py-1 rounded-full bg-slate-950/70 backdrop-blur-md text-sky-300 font-mono text-xs">
                  {activity.operating_hours}
                </span>
              </div>
            </div>

            {/* COMPLETE DETAILS SPECIFICATION TABLE (Matching User Table Requirement) */}
            <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-xl font-black font-serif text-[#051833]">Activity Specifications</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Operator-configured pricing, capacity, gear, and official safety policies.
                  </p>
                </div>
                <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0" />
              </div>

              {/* Specification Grid Table */}
              <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-2xl overflow-hidden text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 p-3.5 bg-slate-50/70">
                  <span className="font-bold text-slate-500 uppercase text-[11px]">Activity</span>
                  <span className="sm:col-span-2 font-black text-slate-900 text-sm">{activity.title}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 p-3.5">
                  <span className="font-bold text-slate-500 uppercase text-[11px]">Location</span>
                  <span className="sm:col-span-2 font-semibold text-slate-800">
                    {activity.departure_port} • {activity.location}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 p-3.5 bg-slate-50/70">
                  <span className="font-bold text-slate-500 uppercase text-[11px]">Duration</span>
                  <span className="sm:col-span-2 font-semibold text-slate-800">{activity.duration_display}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 p-3.5">
                  <span className="font-bold text-slate-500 uppercase text-[11px]">Starting Price</span>
                  <span className="sm:col-span-2 font-black text-[#051833] text-sm">
                    {formatINR(activity.starting_price || activity.price)} per person
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 p-3.5 bg-slate-50/70">
                  <span className="font-bold text-slate-500 uppercase text-[11px]">Capacity</span>
                  <span className="sm:col-span-2 font-semibold text-slate-800">
                    1–{activity.capacity_per_slot} people, subject to operator limits
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 p-3.5">
                  <span className="font-bold text-slate-500 uppercase text-[11px]">Difficulty</span>
                  <span className="sm:col-span-2 font-semibold text-slate-800">
                    {activity.difficulty_level}-friendly, subject to ocean and weather conditions
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 p-3.5 bg-slate-50/70">
                  <span className="font-bold text-slate-500 uppercase text-[11px]">Equipment Included</span>
                  <span className="sm:col-span-2 font-semibold text-slate-800">
                    {activity.included_gear.join(', ') || 'Certified Life Jacket, Safety Tether, Marine Equipment'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 p-3.5">
                  <span className="font-bold text-slate-500 uppercase text-[11px]">Instructor / Pilot</span>
                  <span className="sm:col-span-2 font-semibold text-emerald-700 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>{activity.instructor_details || 'Available • Certified Master Instructor on-site'}</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 p-3.5 bg-slate-50/70">
                  <span className="font-bold text-slate-500 uppercase text-[11px]">Age Restrictions</span>
                  <span className="sm:col-span-2 font-semibold text-slate-800">
                    {activity.age_restrictions || activity.requirements || 'Operator-defined (Age 10+ recommended)'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 p-3.5">
                  <span className="font-bold text-slate-500 uppercase text-[11px]">Cancellation Policy</span>
                  <span className="sm:col-span-2 font-semibold text-slate-800">
                    {activity.cancellation_policy || "Free cancellation up to 24 hours before start time (Operator's published policy)"}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 p-3.5 bg-slate-50/70">
                  <span className="font-bold text-slate-500 uppercase text-[11px]">Vessel Requirement</span>
                  <span className="sm:col-span-2 font-semibold text-slate-800">
                    {activity.requires_boat
                      ? `🚤 Boat Transport Included: ${activity.host_ship_name || 'Host Cruiser'}`
                      : '🏖️ Beach & Shore-Based (No ship required • Direct shore access)'}
                  </span>
                </div>
              </div>
            </div>

            {/* DESCRIPTION & HIGHLIGHTS */}
            <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-xs space-y-5">
              <h2 className="text-xl font-black font-serif text-[#051833]">Experience Overview</h2>
              <p className="text-sm text-slate-600 leading-relaxed">{activity.description}</p>

              {activity.highlights.length > 0 && (
                <div className="pt-2 space-y-3">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                    Key Highlights &amp; Inclusions
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {activity.highlights.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-2.5 text-xs text-slate-700"
                      >
                        <Check className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                        <span className="font-medium">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* SAFETY GUIDELINES & LOCATION MAP */}
            <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-xs space-y-4">
              <h2 className="text-xl font-black font-serif text-[#051833]">Safety Guidelines &amp; Port Access</h2>
              <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900 space-y-1.5">
                <span className="font-bold flex items-center gap-1.5 uppercase text-[11px]">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  Important Safety Information
                </span>
                <p className="leading-relaxed">
                  {activity.safety_guidelines ||
                    'Certified Coast Guard approved life jackets are provided. Professional master instructors escort all rides.'}
                </p>
              </div>

              {/* Action Buttons Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleOpenPortMap}
                  className="py-3 px-4 rounded-2xl bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Navigation className="w-4 h-4 text-sky-600" />
                  <span>Open Port GPS Route Map</span>
                </button>

                <a
                  href={getOwnerChatUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-3 px-4 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer text-center"
                >
                  <WhatsAppIcon className="w-4 h-4 text-emerald-600" variant="solid" />
                  <span>Chat with Operator on WhatsApp</span>
                </a>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Interactive Live Booking Widget (5 cols) */}
          <div className="lg:col-span-5 sticky top-20">
            <div className="bg-white rounded-3xl border-2 border-sky-400/40 shadow-2xl p-6 sm:p-7 space-y-5">
              {/* Widget Header & Price */}
              <div className="flex items-baseline justify-between border-b border-slate-100 pb-4">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                    Starting Price
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-black text-[#051833] font-mono-numbers">
                      {formatINR(unitPrice)}
                    </span>
                    <span className="text-xs text-slate-500 font-semibold">/ person</span>
                  </div>
                </div>

                <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  Instant Confirmation
                </span>
              </div>

              {/* Booking Form */}
              <form onSubmit={handleBookingSubmit} className="space-y-4">
                {/* 1. Date Selector */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-sky-600" />
                    <span>Select Date</span>
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

                {/* 2. Time Slot Selector */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-sky-600" />
                    <span>Select Time Slot</span>
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {activity.time_slots.map((slot) => {
                      const isSelected = selectedSlot === slot;
                      return (
                        <button
                          type="button"
                          key={slot}
                          onClick={() => setSelectedSlot(slot)}
                          className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition text-center cursor-pointer ${
                            isSelected
                              ? 'bg-[#051833] text-[#fff8dc] border-[#051833] shadow-xs'
                              : 'bg-slate-50 hover:bg-sky-50 text-slate-700 border-slate-200'
                          }`}
                        >
                          {slot}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Participants Counter */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-sky-600" />
                    <span>Number of Participants</span>
                  </label>
                  <div className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-slate-50">
                    <span className="text-xs font-semibold text-slate-700">
                      {participants} {participants === 1 ? 'Person' : 'People'} (Max {activity.capacity_per_slot})
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={participants <= 1}
                        onClick={() => setParticipants((p) => Math.max(1, p - 1))}
                        className="w-7 h-7 rounded-lg bg-white border border-slate-300 font-bold text-xs flex items-center justify-center hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                      >
                        -
                      </button>
                      <span className="font-bold text-sm text-slate-900 w-5 text-center">{participants}</span>
                      <button
                        type="button"
                        disabled={participants >= activity.capacity_per_slot}
                        onClick={() => setParticipants((p) => Math.min(activity.capacity_per_slot, p + 1))}
                        className="w-7 h-7 rounded-lg bg-white border border-slate-300 font-bold text-xs flex items-center justify-center hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* 4. Additional Options (Add-ons) Selector */}
                <div className="space-y-2 p-3.5 rounded-2xl bg-sky-50/60 border border-sky-100">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                      <span>Additional Options (Optional)</span>
                    </span>
                    {selectedAddons.length > 0 && (
                      <span className="text-[10px] font-bold text-sky-700">+{formatINR(addonsTotal)}</span>
                    )}
                  </div>
                  <div className="space-y-1.5 pt-1">
                    {availableAddons.map((addon) => {
                      const isChecked = selectedAddons.some((a) => a.id === addon.id);
                      return (
                        <button
                          type="button"
                          key={addon.id}
                          onClick={() => toggleAddon(addon)}
                          className={`w-full p-2.5 rounded-xl border text-left transition flex items-center justify-between gap-2 cursor-pointer ${
                            isChecked
                              ? 'bg-sky-100/80 border-sky-400 text-sky-950 font-semibold'
                              : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}}
                              className="w-3.5 h-3.5 rounded text-sky-600 pointer-events-none"
                            />
                            <span className="text-xs truncate">{addon.name}</span>
                          </div>
                          <span className="text-xs font-mono font-bold text-slate-900 shrink-0">
                            +{formatINR(addon.price)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 5. WhatsApp Mobile */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <WhatsAppIcon className="w-3.5 h-3.5 text-emerald-600" variant="solid" />
                    <span>WhatsApp Number (Ticket Pass &amp; Directions)</span>
                  </label>
                  <input
                    type="tel"
                    placeholder="+91 98200 12345"
                    value={whatsappMobile}
                    onChange={(e) => setWhatsappMobile(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-semibold text-xs focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>

                {/* 6. Promo Code */}
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700 flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-sky-600" />
                      Promo Voucher
                    </span>
                    {couponResult?.valid && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                        ✓ {formatINR(couponResult.discount_amount)} OFF
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Coupon Code"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                      className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-mono font-bold uppercase focus:outline-none focus:border-sky-500"
                    />
                    <button
                      type="button"
                      disabled={couponLoading || !promoCode.trim()}
                      onClick={handleApplyCoupon}
                      className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition disabled:opacity-50 cursor-pointer"
                    >
                      Apply
                    </button>
                  </div>
                  {couponError && <p className="text-[10px] text-rose-600 font-semibold">{couponError}</p>}
                </div>

                {/* 7. Live Price Summary */}
                <div className="pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span>
                      {formatINR(unitPrice)} × {participants} {participants === 1 ? 'person' : 'people'}
                    </span>
                    <span className="font-mono">{formatINR(unitPrice * participants)}</span>
                  </div>

                  {addonsTotal > 0 && (
                    <div className="flex justify-between text-sky-700 font-medium">
                      <span>Additional Options</span>
                      <span className="font-mono">+{formatINR(addonsTotal)}</span>
                    </div>
                  )}

                  {discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-600 font-medium">
                      <span>Promo Discount ({couponResult?.code})</span>
                      <span className="font-mono">-{formatINR(discountAmount)}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-slate-500">
                    <span>Marine Recreation GST (5%)</span>
                    <span className="font-mono">+{formatINR(taxAmount)}</span>
                  </div>

                  <div className="flex justify-between items-baseline pt-2 border-t border-slate-200 text-slate-900">
                    <span className="font-bold text-sm">Total Amount</span>
                    <span className="text-2xl font-black text-[#051833] font-mono-numbers">
                      {formatINR(finalTotal)}
                    </span>
                  </div>
                </div>

                {submitError && (
                  <p className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-200 font-semibold">
                    {submitError}
                  </p>
                )}

                {/* Book Now Button */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-sky-600 to-[#051833] hover:from-sky-700 hover:to-[#0a2548] text-white text-sm font-black shadow-lg shadow-sky-600/30 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Book Now • {formatINR(finalTotal)}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <p className="text-[10px] text-center text-slate-400">
                  🔒 Instant slot reservation • Digital Boarding Pass issued upon booking
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Port Route Map Modal */}
      {mapBookingMock && (
        <PortRouteMapModal
          isOpen={!!mapBookingMock}
          onClose={() => setMapBookingMock(null)}
          booking={mapBookingMock}
        />
      )}
    </div>
  );
};
