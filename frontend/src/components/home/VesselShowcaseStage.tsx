import React, { useState } from 'react';
import {
  Ship,
  Anchor,
  Users,
  Compass,
  Zap,
  Clock,
  Calendar,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Award,
  ChevronRight,
  Info
} from 'lucide-react';
import { formatINR } from '../../utils/currency';

interface ShowcaseVessel {
  id: string;
  name: string;
  categoryName: string;
  badge: string;
  tagline: string;
  image: string;
  specs: {
    length: string;
    speed: string;
    capacity: number;
    cabins: number;
    crew: number;
  };
  baseHourlyRate: number;
  location: string;
  pier: string;
  features: string[];
}

const SHOWCASE_FLEET: ShowcaseVessel[] = [
  {
    id: 'navora-yacht',
    name: 'Navora 55 Grand Oceanic',
    categoryName: 'Private Yacht',
    badge: 'Flagship Charter',
    tagline: 'Italian engineering meets private coastal luxury with open sunbeds and full staterooms.',
    image: '/static/images/vessels/navora_yacht.jpg',
    specs: {
      length: '55 ft / 16.8m',
      speed: '28 Knots',
      capacity: 15,
      cabins: 2,
      crew: 3,
    },
    baseHourlyRate: 14500,
    location: 'Goa (Mandovi River)',
    pier: 'Britona Yacht Pier, Jetty 4',
    features: ['Flybridge Sun Deck', 'Steward & Captain', 'Snorkel Equipment', 'Bluetooth Sound Deck'],
  },
  {
    id: 'nautika-catamaran',
    name: 'Nautika Platinum Catamaran',
    categoryName: 'Twin-Hull Catamaran',
    badge: 'Smooth Stability',
    tagline: 'Ultra-wide twin hull design engineered for zero sea-sickness and panoramic island runs.',
    image: '/static/images/vessels/nautika_catamaran.jpg',
    specs: {
      length: '62 ft / 18.9m',
      speed: '22 Knots',
      capacity: 35,
      cabins: 3,
      crew: 4,
    },
    baseHourlyRate: 19800,
    location: 'Andaman & Nicobar',
    pier: 'Port Blair Phoenix Bay Jetty',
    features: ['Twin-Hull Wave Piercing', 'Panoramic Trampoline Nets', 'AC Indoor Lounge', 'Kitchenette'],
  },
  {
    id: 'cordelia-empress',
    name: 'The Empress Ocean Sovereign',
    categoryName: 'Luxury Ocean Liner',
    badge: 'Multi-Day Liner',
    tagline: 'Full stateroom ocean liner cruising between Mumbai, Goa, and the Lakshadweep archipelago.',
    image: '/static/images/vessels/cordelia_empress.jpg',
    specs: {
      length: '692 ft / 211m',
      speed: '21 Knots',
      capacity: 1800,
      cabins: 796,
      crew: 650,
    },
    baseHourlyRate: 28500,
    location: 'Mumbai & Goa',
    pier: 'Mumbai International Cruise Terminal',
    features: ['5 Dining Restaurants', 'Casino & Theatre', 'Swimming Pool & Spa', 'Sea-Facing Balconies'],
  },
  {
    id: 'mandovi-party-cruiser',
    name: 'Mandovi Royal Party Cruiser',
    categoryName: 'Celebration Boat',
    badge: 'Event Ready',
    tagline: 'High-energy celebration vessel fitted with open dance deck, club laser lighting, and live DJ setup.',
    image: '/static/images/vessels/mandovi_pride.jpg',
    specs: {
      length: '78 ft / 23.8m',
      speed: '16 Knots',
      capacity: 120,
      cabins: 1,
      crew: 6,
    },
    baseHourlyRate: 22000,
    location: 'Panaji, Goa',
    pier: 'Captain of Ports Jetty, Panaji',
    features: ['Concert Grade Sound', 'Full Bar Counter', 'Open Sunset Terrace', 'DJ Console Equipped'],
  },
];

interface VesselShowcaseStageProps {
  onBookVessel: (vesselId: string, bookingDetails?: any) => void;
  onExploreAll: () => void;
}

export const VesselShowcaseStage: React.FC<VesselShowcaseStageProps> = ({
  onBookVessel,
  onExploreAll,
}) => {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const vessel = SHOWCASE_FLEET[selectedIdx];

  // Quick Calculator State
  const [selectedHours, setSelectedHours] = useState(2);
  const [guestCount, setGuestCount] = useState(6);
  const [timeSlot, setTimeSlot] = useState('GOLDEN_SUNSET');
  const [cateringTier, setCateringTier] = useState<'standard' | 'premium' | 'royal'>('premium');

  // Pricing calculation
  const cateringRates = {
    standard: 0,
    premium: 850,
    royal: 1750,
  };

  const charterCost = vessel.baseHourlyRate * selectedHours;
  const cateringCost = cateringRates[cateringTier] * guestCount;
  const subtotal = charterCost + cateringCost;
  const gst = Math.round(subtotal * 0.18);
  const totalAmount = subtotal + gst;

  const handleFastBook = () => {
    onBookVessel(vessel.id, {
      hours: selectedHours,
      guests: guestCount,
      slot: timeSlot,
      catering: cateringTier,
      total: totalAmount,
    });
  };

  return (
    <section className="py-20 bg-[#f8f9fa] text-[#051833] relative overflow-hidden border-t border-[#0284c7]/15">
      {/* Dynamic Ambient Background Gradients (Light Sky & Ivory Tilt) */}
      <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-sky-200/20 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-[#fff8dc]/40 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header with More-Nutrition style playful badge & typography */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-[#0284c7]/20 text-[#0284c7] text-xs font-bold tracking-wide shadow-sm mb-4">
            <Sparkles className="w-3.5 h-3.5 text-[#0284c7] animate-wiggle" />
            <span>Interactive Fleet Spotlight</span>
            <span className="w-1 h-1 rounded-full bg-[#0284c7]" />
            <span className="text-[#051833]/80">Real-Time Slot Engine</span>
          </div>

          <h2 className="hero-heading-more text-3xl sm:text-5xl lg:text-6xl font-black text-[#051833]">
            Meet Your <span className="text-[#0284c7]">Flagship Vessel.</span>
          </h2>
          <p className="text-[#475569] text-sm sm:text-base font-medium mt-3">
            Select a verified ship category, configure your charter hours, and experience live transparent pricing with guaranteed server-side slot locking.
          </p>

          {/* Interactive Vessel Category Switcher Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-8 p-1.5 bg-slate-100 rounded-full border border-slate-200 max-w-2xl mx-auto">
            {SHOWCASE_FLEET.map((item, idx) => {
              const isActive = selectedIdx === idx;
              return (
                <button
                  key={item.id}
                  onClick={() => setSelectedIdx(idx)}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all duration-300 cursor-pointer flex items-center gap-2 ${
                    isActive
                      ? 'bg-[#051833] text-[#fff8dc] shadow-md scale-105 font-black'
                      : 'text-[#334155] hover:text-[#051833] hover:bg-white'
                  }`}
                >
                  <Ship className="w-3.5 h-3.5" />
                  <span>{item.categoryName}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ============================================================ */}
        {/* MAIN STAGE: LEFT VISUAL SHOWCASE + RIGHT REAL-TIME CALCULATOR */}
        {/* ============================================================ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Left Column: Vessel Visual & Key Specifications (7 Cols) */}
          <div className="lg:col-span-7 flex flex-col justify-between rounded-3xl bg-white border border-[#0284c7]/20 p-6 sm:p-8 shadow-xl shadow-sky-950/5 relative overflow-hidden group">
            <div>
              {/* Vessel Header Information */}
              <div className="flex flex-wrap items-start justify-between gap-4 mb-4 relative z-10">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 border border-sky-200 text-[#0284c7] text-[11px] font-bold uppercase tracking-wider mb-2">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    {vessel.badge}
                  </div>
                  <h3 className="hero-heading-more text-2xl sm:text-4xl font-black text-[#051833]">
                    {vessel.name}
                  </h3>
                  <p className="text-xs sm:text-sm text-[#0284c7] font-semibold mt-1 flex items-center gap-1.5">
                    <Anchor className="w-3.5 h-3.5" />
                    {vessel.location} • <span className="text-[#475569]">{vessel.pier}</span>
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Charter Starting At</span>
                  <span className="font-mono-numbers text-2xl font-black text-[#051833]">
                    {formatINR(vessel.baseHourlyRate)}
                  </span>
                  <span className="text-[10px] text-slate-500 block font-semibold">/ hour</span>
                </div>
              </div>

              {/* Vessel Hero Image with Smooth Zoom */}
              <div className="relative rounded-2xl overflow-hidden aspect-[16/9] mb-6 border border-slate-200 shadow-sm">
                <img
                  src={vessel.image}
                  alt={vessel.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                  onError={(e) => {
                    e.currentTarget.src = '/static/images/placeholder.png';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#051833]/90 via-transparent to-transparent" />
                
                {/* Real-time Seaworthy Badge */}
                <div className="absolute top-3.5 right-3.5 px-3 py-1 rounded-full bg-white/90 backdrop-blur-md border border-slate-200 text-[#051833] text-[10px] font-bold uppercase flex items-center gap-1.5 shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Slot Engine Active
                </div>

                {/* Vessel Tagline */}
                <div className="absolute bottom-3 left-4 right-4 text-xs text-white/90 font-medium line-clamp-2 text-stroke-white-subtle">
                  {vessel.tagline}
                </div>
              </div>

              {/* Detailed Technical Specifications (Anti-Default Grid) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 relative z-10">
                <div className="p-3 rounded-2xl bg-[#f8f9fa] border border-slate-200 text-center">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Length</span>
                  <span className="font-mono-numbers text-sm sm:text-base font-bold text-[#051833] mt-0.5 block">{vessel.specs.length}</span>
                </div>
                <div className="p-3 rounded-2xl bg-[#f8f9fa] border border-slate-200 text-center">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Cruising Speed</span>
                  <span className="font-mono-numbers text-sm sm:text-base font-bold text-[#0284c7] mt-0.5 block">{vessel.specs.speed}</span>
                </div>
                <div className="p-3 rounded-2xl bg-[#f8f9fa] border border-slate-200 text-center">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Max Guests</span>
                  <span className="font-mono-numbers text-sm sm:text-base font-bold text-[#051833] mt-0.5 block">{vessel.specs.capacity} Guests</span>
                </div>
                <div className="p-3 rounded-2xl bg-[#f8f9fa] border border-slate-200 text-center">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Licensed Crew</span>
                  <span className="font-mono-numbers text-sm sm:text-base font-bold text-[#0284c7] mt-0.5 block">{vessel.specs.crew} Members</span>
                </div>
              </div>
            </div>

            {/* Vessel Key Inclusions */}
            <div className="pt-6 border-t border-slate-100 mt-6 flex flex-wrap items-center justify-between gap-4 relative z-10">
              <div className="flex flex-wrap items-center gap-2">
                {vessel.features.map((feat, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#f8f9fa] border border-slate-200 text-[11px] font-semibold text-[#334155]"
                  >
                    <CheckCircle2 className="w-3 h-3 text-[#0284c7]" />
                    {feat}
                  </span>
                ))}
              </div>

              <button
                onClick={onExploreAll}
                className="text-xs text-[#0284c7] hover:text-[#051833] font-bold inline-flex items-center gap-1 transition"
              >
                <span>View Full 31+ Fleet</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Right Column: Real-Time Fast Slot Lock & Live Fare Estimator (5 Cols) */}
          <div className="lg:col-span-5 rounded-3xl bg-white text-[#051833] p-6 sm:p-8 border border-[#0284c7]/20 shadow-xl shadow-sky-950/5 flex flex-col justify-between">
            <div className="space-y-5">
              {/* Box Header with Live Guarantee Status */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sky-50 text-[#0284c7] text-[10px] font-black uppercase tracking-wider border border-sky-200">
                    <Zap className="w-3 h-3 text-[#0284c7]" />
                    Smart Booking System
                  </span>
                  <h4 className="font-heading-more text-xl font-black text-[#051833] mt-1 font-serif">
                    Live Slot & Fare Calculator
                  </h4>
                </div>

                <div className="text-right">
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Available
                  </span>
                </div>
              </div>

              {/* 1. Charter Duration Selector */}
              <div>
                <label className="text-xs font-bold text-[#334155] flex items-center justify-between mb-2">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#0284c7]" />
                    Charter Duration
                  </span>
                  <span className="font-mono-numbers text-[#051833] font-bold">{selectedHours} Hours</span>
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 4, 8].map((hrs) => (
                    <button
                      key={hrs}
                      type="button"
                      onClick={() => setSelectedHours(hrs)}
                      className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        selectedHours === hrs
                          ? 'bg-[#051833] text-[#fff8dc] font-black shadow-md'
                          : 'bg-[#f8f9fa] text-[#334155] border border-slate-200 hover:text-[#051833] hover:bg-slate-100'
                      }`}
                    >
                      {hrs === 8 ? 'Full Day' : `${hrs}h`}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Departure Time Slot Selector */}
              <div>
                <label className="text-xs font-bold text-[#334155] flex items-center justify-between mb-2">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#0284c7]" />
                    Preferred Sailing Window
                  </span>
                </label>
                <div className="grid grid-cols-3 gap-2 text-center">
                  {[
                    { id: 'MORNING', title: 'Morning', time: '09:00 - 12:00' },
                    { id: 'GOLDEN_SUNSET', title: 'Sunset', time: '16:30 - 19:30' },
                    { id: 'STARLIGHT', title: 'Starlight', time: '20:00 - 23:00' },
                  ].map((slot) => (
                    <button
                      key={slot.id}
                      type="button"
                      onClick={() => setTimeSlot(slot.id)}
                      className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                        timeSlot === slot.id
                          ? 'border-[#0284c7] bg-sky-50 text-[#051833] shadow-xs'
                          : 'border-slate-200 bg-[#f8f9fa] text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      <p className="text-[11px] font-black text-[#051833]">{slot.title}</p>
                      <p className="text-[9px] text-slate-500 font-mono-numbers">{slot.time}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Passenger Count Counter */}
              <div>
                <label className="text-xs font-bold text-[#334155] flex items-center justify-between mb-2">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-[#0284c7]" />
                    Estimated Passengers
                  </span>
                  <span className="font-mono-numbers text-xs text-slate-500">Max {vessel.specs.capacity}</span>
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={1}
                    max={vessel.specs.capacity}
                    value={guestCount}
                    onChange={(e) => setGuestCount(Number(e.target.value))}
                    className="w-full accent-[#0284c7] cursor-pointer"
                  />
                  <div className="w-14 text-center font-mono-numbers font-black text-sm text-[#051833] py-1 bg-[#f8f9fa] rounded-lg border border-slate-200">
                    {guestCount}
                  </div>
                </div>
              </div>

              {/* 4. Onboard Catering Tier */}
              <div>
                <label className="text-xs font-bold text-[#334155] mb-2 block">
                  Onboard Hospitality Package
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'standard' as const, label: 'Welcome Drinks', price: 'Free' },
                    { id: 'premium' as const, label: 'Gourmet Tapas', price: '+₹850/p' },
                    { id: 'royal' as const, label: 'Seafood Gala', price: '+₹1,750/p' },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCateringTier(cat.id)}
                      className={`p-2 rounded-xl text-center border text-xs transition cursor-pointer ${
                        cateringTier === cat.id
                          ? 'border-[#0284c7] bg-sky-50 font-bold text-[#051833]'
                          : 'border-slate-200 bg-[#f8f9fa] text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      <p className="text-[10px] font-black line-clamp-1">{cat.label}</p>
                      <p className="text-[9px] text-[#0284c7] font-mono-numbers">{cat.price}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Itemized Fare Summary (GST & Server Lock Guarantees) */}
              <div className="p-3.5 rounded-2xl bg-[#f8f9fa] border border-slate-200 space-y-2">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Vessel Charter ({selectedHours}h × {formatINR(vessel.baseHourlyRate)}):</span>
                  <span className="font-mono-numbers font-bold text-[#051833]">{formatINR(charterCost)}</span>
                </div>
                {cateringCost > 0 && (
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Hospitality ({guestCount} guests):</span>
                    <span className="font-mono-numbers font-bold text-[#051833]">{formatINR(cateringCost)}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Marine GST & Port Cess (18%):</span>
                  <span className="font-mono-numbers font-bold text-[#051833]">{formatINR(gst)}</span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Total Guaranteed Fare</span>
                    <span className="text-[9px] text-emerald-600 font-semibold">Zero surprise pier charges</span>
                  </div>
                  <span className="font-mono-numbers text-2xl font-black text-[#051833]">
                    {formatINR(totalAmount)}
                  </span>
                </div>
              </div>
            </div>

            {/* Direct Booking CTA */}
            <div className="pt-5 mt-5 border-t border-slate-100 space-y-3">
              <button
                type="button"
                onClick={handleFastBook}
                className="w-full py-3.5 px-5 rounded-2xl bg-[#051833] hover:bg-[#0a2548] text-[#fff8dc] flex items-center justify-between cursor-pointer transition shadow-md shadow-[#051833]/25"
              >
                <div className="text-left">
                  <span className="block font-black text-sm">Lock Slot & Book Ship</span>
                  <span className="text-[10px] text-[#fff8dc]/75 font-medium">Instant Server Hold • Direct Pier Gate Access</span>
                </div>
                <div className="w-8 h-8 rounded-full bg-white/10 text-[#fff8dc] flex items-center justify-center">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </button>

              <div className="flex items-center justify-center gap-4 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  No Overlap
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-[#0284c7]" />
                  WhatsApp QR Pass
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
