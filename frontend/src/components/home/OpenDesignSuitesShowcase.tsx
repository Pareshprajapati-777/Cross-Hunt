import React from 'react';
import { Sparkles, ShieldCheck, Check, ArrowRight, Bed, Bath, Maximize2 } from 'lucide-react';
import { formatINR } from '../../utils/currency';

interface SuiteTier {
  id: string;
  name: string;
  tagline: string;
  pricePerNight: number;
  area: string;
  guests: string;
  image: string;
  amenities: string[];
  featured?: boolean;
}

const SUITE_TIERS: SuiteTier[] = [
  {
    id: 'grand-presidential',
    name: 'Grand Presidential Ocean Suite',
    tagline: 'Top-tier master veranda with private whirlpool spa & personal butler',
    pricePerNight: 85000,
    area: '1,420 sq ft',
    guests: 'Up to 4 Guests',
    image: '/assets/suite-grand.jpg',
    featured: true,
    amenities: [
      '24/7 dedicated private butler',
      'Wrap-around 180° teak balcony',
      'Italian Carrara marble spa bath',
      'Complimentary vintage champagne',
      'Priority helicopter & tender access',
      'In-suite private dining chef option',
    ],
  },
  {
    id: 'royal-balcony',
    name: 'Royal Panoramic Balcony',
    tagline: 'Floor-to-ceiling panoramic glass framing infinite horizon vistas',
    pricePerNight: 48000,
    area: '780 sq ft',
    guests: 'Up to 3 Guests',
    image: '/assets/suite-balcony.jpg',
    amenities: [
      'Full glass panoramic balcony',
      'King-sized organic plush mattress',
      'Luxury soundproof acoustic isolation',
      'Rainfall hydrotherapy shower',
      'Twice-daily housekeeping service',
      'Curated minibar & espresso station',
    ],
  },
  {
    id: 'deluxe-oceanview',
    name: 'Deluxe Oceanview Stateroom',
    tagline: 'Expansive ocean-view portal with comfortable lounge styling',
    pricePerNight: 28000,
    area: '420 sq ft',
    guests: 'Up to 2 Guests',
    image: '/assets/suite-king.jpg',
    amenities: [
      'Oversized architectural ocean portal',
      'Executive desk & salon lounge',
      'Egyptian cotton high-thread linens',
      'Smart maritime concierge tablet',
      'High-speed satellite connectivity',
    ],
  },
  {
    id: 'signature-interior',
    name: 'Signature Interior Stateroom',
    tagline: 'Tranquil ambient retreat engineered for rejuvenating deep rest',
    pricePerNight: 16000,
    area: '310 sq ft',
    guests: 'Up to 2 Guests',
    image: '/assets/suite-glass.jpg',
    amenities: [
      'Dynamic circadean circadian lighting',
      'Acoustic soundproof architectural build',
      'Plush queen bed retreat',
      'Full marble vanity shower',
    ],
  },
];

interface OpenDesignSuitesShowcaseProps {
  onSelectCabin?: (cabinName: string) => void;
  onBookNow?: () => void;
}

export const OpenDesignSuitesShowcase: React.FC<OpenDesignSuitesShowcaseProps> = ({
  onSelectCabin,
  onBookNow,
}) => {
  return (
    <section className="relative py-24 bg-[#f8f9fa] text-[#051833] overflow-hidden border-t border-[#0284c7]/15">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-sky-50 border border-[#0284c7]/30 text-[#0284c7] text-xs font-semibold tracking-widest uppercase">
            <Sparkles className="w-3.5 h-3.5 text-[#0284c7]" />
            Sanctuary At Sea
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display text-[#051833] mt-4 tracking-tight">
            Staterooms &amp; <span className="italic text-[#0284c7]">Presidential Suites</span>
          </h2>
          <p className="text-slate-600 text-sm sm:text-base mt-3 font-medium">
            Crafted with marine acoustic dampening, custom Italian millwork, and private ocean balconies engineered for unmatched serenity.
          </p>
        </div>

        {/* Featured Top Suite */}
        {SUITE_TIERS.filter((s) => s.featured).map((suite) => (
          <div
            key={suite.id}
            className="mb-14 rounded-3xl bg-white border border-[#0284c7]/20 p-6 sm:p-10 shadow-xl relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-80 h-80 bg-[#0284c7]/5 rounded-full blur-3xl pointer-events-none" />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* Media */}
              <div className="lg:col-span-7 relative rounded-2xl overflow-hidden aspect-[16/10] border border-[#0284c7]/20 group shadow-md">
                <img
                  src={suite.image}
                  alt={suite.name}
                  className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/static/images/cruises/cruise_2.png';
                  }}
                />
                <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-[#0284c7]/25 text-[#0284c7] text-xs font-bold uppercase tracking-wider shadow-sm">
                  Crown Suite
                </div>
              </div>

              {/* Details */}
              <div className="lg:col-span-5 flex flex-col justify-between">
                <div>
                  <h3 className="text-2xl sm:text-3xl font-display text-[#051833] font-bold">
                    {suite.name}
                  </h3>
                  <p className="text-slate-600 text-sm mt-2 leading-relaxed font-medium">
                    {suite.tagline}
                  </p>

                  <div className="flex items-center gap-6 mt-4 text-xs text-slate-700 font-mono py-3 border-y border-slate-100">
                    <span className="flex items-center gap-1.5">
                      <Maximize2 className="w-3.5 h-3.5 text-[#0284c7]" />
                      {suite.area}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Bed className="w-3.5 h-3.5 text-[#0284c7]" />
                      {suite.guests}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
                    {suite.amenities.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                        <Check className="w-3.5 h-3.5 text-[#0284c7] flex-shrink-0" />
                        <span className="truncate">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between gap-4">
                  <div>
                    <span className="text-[11px] uppercase tracking-wider text-slate-500 block font-semibold">Starting From</span>
                    <span className="text-2xl sm:text-3xl font-display text-[#051833] font-black">
                      {formatINR(suite.pricePerNight)}
                      <span className="text-xs text-slate-500 font-sans font-normal"> / trip night</span>
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      onSelectCabin?.(suite.name);
                      onBookNow?.();
                    }}
                    className="px-6 py-3 text-xs sm:text-sm font-black flex items-center gap-2 rounded-full bg-[#051833] hover:bg-[#0a2548] text-[#fff8dc] shadow-md shadow-[#051833]/15 cursor-pointer transition-all"
                  >
                    Select Suite
                    <ArrowRight className="w-4 h-4 text-[#fff8dc]" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* 3 Secondary Suites Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {SUITE_TIERS.filter((s) => !s.featured).map((suite) => (
            <div
              key={suite.id}
              className="rounded-3xl bg-white border border-[#0284c7]/20 hover:border-[#0284c7]/50 transition-all duration-300 overflow-hidden flex flex-col justify-between p-5 group shadow-md hover:shadow-xl"
            >
              <div>
                <div className="aspect-[16/10] rounded-2xl overflow-hidden mb-4 relative border border-[#0284c7]/15">
                  <img
                    src={suite.image}
                    alt={suite.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/static/images/cruises/cruise_3.png';
                    }}
                  />
                  <div className="absolute top-2.5 left-2.5 bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] text-[#051833] font-mono border border-slate-200 shadow-sm">
                    {suite.area}
                  </div>
                </div>

                <h4 className="text-lg font-display text-[#051833] font-bold">
                  {suite.name}
                </h4>
                <p className="text-slate-500 text-xs mt-1.5 line-clamp-2 leading-relaxed">
                  {suite.tagline}
                </p>

                <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5">
                  {suite.amenities.slice(0, 3).map((item, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 text-[11px] text-slate-700">
                      <Check className="w-3 h-3 text-[#0284c7] flex-shrink-0" />
                      <span className="truncate">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-semibold">Nightly</span>
                  <span className="text-lg font-display text-[#051833] font-black">
                    {formatINR(suite.pricePerNight)}
                  </span>
                </div>

                <button
                  onClick={() => {
                    onSelectCabin?.(suite.name);
                    onBookNow?.();
                  }}
                  className="px-4 py-2 text-xs font-bold flex items-center gap-1.5 rounded-full bg-white hover:bg-slate-50 text-[#051833] border border-[#0284c7]/30 hover:border-[#0284c7] transition-all cursor-pointer shadow-sm"
                >
                  Book Cabin
                  <ArrowRight className="w-3.5 h-3.5 text-[#0284c7]" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
