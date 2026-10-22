import React, { useState } from 'react';
import { Sparkles, Users, Calendar, ArrowRight, ShieldCheck, GlassWater, Camera, Music, Anchor } from 'lucide-react';
import { formatINR } from '../../utils/currency';

interface EventType {
  id: string;
  name: string;
  baseFare: number;
  description: string;
}

const EVENT_TYPES: EventType[] = [
  { id: 'wedding', name: 'Wedding at Sea', baseFare: 450000, description: 'Ceremony on the bow terrace with floral arches and private reception' },
  { id: 'summit', name: 'Corporate Summit', baseFare: 380000, description: 'Executive retreat with AV conference facilities and gala dinner' },
  { id: 'anniversary', name: 'Milestone Celebration', baseFare: 320000, description: 'Private soiree under the stars with live music and banquet catering' },
  { id: 'film', name: 'Film & Editorial Charter', baseFare: 520000, description: 'Exclusive full-vessel charter for cinematography and VIP activations' },
];

interface OpenDesignPrivateEventsProps {
  onInquireEvent?: (details: any) => void;
  onNavigateToEvents?: () => void;
}

export const OpenDesignPrivateEvents: React.FC<OpenDesignPrivateEventsProps> = ({
  onInquireEvent,
  onNavigateToEvents,
}) => {
  const [selectedType, setSelectedType] = useState<string>('wedding');
  const [guests, setGuests] = useState<number>(45);
  const [packageTier, setPackageTier] = useState<'sapphire' | 'emerald' | 'diamond'>('emerald');
  const [includeDrone, setIncludeDrone] = useState<boolean>(true);
  const [includeOpenBar, setIncludeOpenBar] = useState<boolean>(true);

  const currentType = EVENT_TYPES.find((t) => t.id === selectedType) || EVENT_TYPES[0];

  // Pricing calculations
  const cateringPerGuest = packageTier === 'diamond' ? 8500 : packageTier === 'emerald' ? 5500 : 3500;
  const cateringTotal = guests * cateringPerGuest;
  const droneCost = includeDrone ? 45000 : 0;
  const barCost = includeOpenBar ? guests * 2500 : 0;
  const estimatedTotal = currentType.baseFare + cateringTotal + droneCost + barCost;

  const handleBookInquiry = () => {
    onInquireEvent?.({
      eventType: currentType.name,
      guests,
      packageTier,
      includeDrone,
      includeOpenBar,
      estimatedTotal,
    });
    onNavigateToEvents?.();
  };

  return (
    <section className="relative py-24 bg-[#f8f9fa] text-[#051833] overflow-hidden border-t border-[#0284c7]/15">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-sky-50 border border-[#0284c7]/30 text-[#0284c7] text-xs font-semibold tracking-widest uppercase">
            <Anchor className="w-3.5 h-3.5 text-[#0284c7]" />
            Bespoke Maritime Charters
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display text-[#051833] mt-4 tracking-tight">
            Private Milestone <span className="italic text-[#0284c7]">Events at Sea</span>
          </h2>
          <p className="text-slate-600 text-sm sm:text-base mt-3 font-medium">
            Charter an entire flagship vessel for weddings, executive leadership summits, and bespoke private celebrations.
          </p>
        </div>

        {/* 2-Column Interactive Planner */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Visual Showcase Card */}
          <div className="lg:col-span-5 relative rounded-3xl overflow-hidden border border-[#0284c7]/20 shadow-xl bg-white">
            <div className="aspect-[4/3] relative">
              <img
                src="/assets/dining-sunset.jpg"
                alt="Private Maritime Event"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/static/images/cruises/cruise_4.png';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#051833]/90 via-[#051833]/30 to-transparent" />
              <div className="absolute bottom-6 left-6 right-6">
                <span className="text-xs uppercase tracking-widest text-sky-300 font-semibold block mb-1 text-stroke-white-subtle">
                  Private Vessel Charter
                </span>
                <p className="text-lg font-display text-white italic leading-snug text-stroke-white">
                  "An unforgettable evening under the starlit ocean skies, where luxury knows no shore."
                </p>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 text-xs text-slate-700 font-medium">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Exclusivity guaranteed: Single event on board per booking</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-700 font-medium">
                <GlassWater className="w-4 h-4 text-[#0284c7]" />
                <span>Dedicated sommelier &amp; award-winning culinary team</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-700 font-medium">
                <Camera className="w-4 h-4 text-[#0284c7]" />
                <span>FAA licensed aerial 4K drone cinematography available</span>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Event Calculator & Customizer */}
          <div className="lg:col-span-7 bg-white border border-[#0284c7]/20 rounded-3xl p-6 sm:p-8 text-[#051833] shadow-xl">
            <h3 className="text-xl font-display text-[#051833] font-bold mb-6">
              Customize Your Oceanic Milestone
            </h3>

            {/* Event Category Chips */}
            <div className="mb-6">
              <label className="block text-xs font-mono uppercase tracking-wider text-orange-600 font-semibold mb-2.5">
                1. Select Occasion
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {EVENT_TYPES.map((type) => {
                  const isSelected = selectedType === type.id;
                  return (
                    <button
                      key={type.id}
                      onClick={() => setSelectedType(type.id)}
                      className={`p-3 rounded-2xl text-left border-2 transition-all cursor-pointer ${
                        isSelected
                          ? 'border-orange-500 bg-orange-50/80 text-orange-950 shadow-md shadow-orange-500/10 font-bold ring-2 ring-orange-500/20'
                          : 'border-slate-200 bg-[#f8f9fa] text-slate-600 hover:text-[#051833] hover:border-orange-300'
                      }`}
                    >
                      <span className="block text-xs font-semibold">{type.name}</span>
                      <span className="block text-[10px] text-orange-600 font-mono mt-1 font-semibold">
                        Base {formatINR(type.baseFare)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Guest Slider */}
            <div className="mb-6">
              <div className="flex justify-between items-baseline mb-2">
                <label className="text-xs font-mono uppercase tracking-wider text-orange-600 font-semibold">
                  2. Passenger Capacity
                </label>
                <span className="text-xl font-display text-[#051833] font-black">
                  {guests} <span className="text-xs font-sans text-slate-500 font-normal">Guests</span>
                </span>
              </div>
              <input
                type="range"
                min="10"
                max="150"
                step="5"
                value={guests}
                onChange={(e) => setGuests(parseInt(e.target.value, 10))}
                className="w-full accent-orange-500 cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-slate-500 font-mono mt-1">
                <span>10 Intimate</span>
                <span>75 Gala</span>
                <span>150 Full Fleet</span>
              </div>
            </div>

            {/* Package Tier Radio */}
            <div className="mb-6">
              <label className="block text-xs font-mono uppercase tracking-wider text-orange-600 font-semibold mb-2.5">
                3. Catering &amp; Service Tier
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { id: 'sapphire', name: 'Sapphire Wave', price: '₹3,500/guest', desc: 'Canapés & Buffet' },
                  { id: 'emerald', name: 'Emerald Horizon', price: '₹5,500/guest', desc: '4-Course Plated Gala' },
                  { id: 'diamond', name: 'Diamond Royal', price: '₹8,500/guest', desc: '7-Course Tasting & Caviar' },
                ].map((tier) => (
                  <button
                    key={tier.id}
                    onClick={() => setPackageTier(tier.id as any)}
                    className={`p-3 rounded-2xl text-left border-2 transition-all cursor-pointer ${
                      packageTier === tier.id
                        ? 'border-orange-500 bg-orange-50/80 text-orange-950 font-bold shadow-md shadow-orange-500/10 ring-2 ring-orange-500/20'
                        : 'border-slate-200 bg-[#f8f9fa] text-slate-600 hover:border-orange-300'
                    }`}
                  >
                    <span className="block text-xs font-semibold">{tier.name}</span>
                    <span className="block text-[10px] text-orange-600 font-mono mt-0.5 font-bold">{tier.price}</span>
                    <span className="block text-[10px] text-slate-500 mt-1 truncate">{tier.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Premium Add-ons Toggles */}
            <div className="mb-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex items-center gap-3 p-3 rounded-2xl border border-slate-200 bg-[#f8f9fa] cursor-pointer hover:border-[#0284c7]/40 transition-colors">
                <input
                  type="checkbox"
                  checked={includeOpenBar}
                  onChange={(e) => setIncludeOpenBar(e.target.checked)}
                  className="rounded border-slate-300 text-[#0284c7] focus:ring-0"
                />
                <div className="text-xs">
                  <span className="text-[#051833] block font-semibold">Premium Open Bar</span>
                  <span className="text-slate-500 text-[10px]">Top-shelf spirits &amp; champagne</span>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-2xl border border-slate-200 bg-[#f8f9fa] cursor-pointer hover:border-[#0284c7]/40 transition-colors">
                <input
                  type="checkbox"
                  checked={includeDrone}
                  onChange={(e) => setIncludeDrone(e.target.checked)}
                  className="rounded border-slate-300 text-[#0284c7] focus:ring-0"
                />
                <div className="text-xs">
                  <span className="text-[#051833] block font-semibold">4K Aerial Cinematography</span>
                  <span className="text-slate-500 text-[10px]">Drone video crew &amp; recap reel</span>
                </div>
              </label>
            </div>

            {/* Estimated Total Bar & Booking Action */}
            <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 block font-semibold">
                  Estimated Charter Charge
                </span>
                <span className="text-3xl font-display text-[#051833] font-black">
                  {formatINR(estimatedTotal)}
                </span>
                <span className="block text-[11px] text-slate-500 mt-0.5">
                  Includes vessel crew, fuel, docking fees &amp; catering
                </span>
              </div>

              <button
                onClick={handleBookInquiry}
                className="px-7 py-3.5 text-sm font-black flex items-center justify-center gap-2 rounded-full bg-[#051833] hover:bg-[#0a2548] text-[#fff8dc] shadow-md shadow-[#051833]/15 cursor-pointer transition-all"
              >
                Inquire &amp; Reserve Venue
                <ArrowRight className="w-4 h-4 text-[#fff8dc]" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
