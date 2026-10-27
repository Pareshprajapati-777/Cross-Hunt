import React, { useState } from 'react';
import { Compass, Users, Clock, Sparkles, ArrowRight, ShieldCheck, Check } from 'lucide-react';

interface DeckInfo {
  id: string;
  deckNumber: number;
  tag: string;
  title: string;
  text: string;
  capacity: string;
  hours: string;
  suiteCount: string;
  image: string;
  features: string[];
}

const DECKS: Record<string, DeckInfo> = {
  sun: {
    id: 'sun',
    deckNumber: 1,
    tag: 'Deck 9 · Sun & Pool Deck',
    title: 'Sun Deck & Teak Terrace',
    text: 'Tiered teak terraces elevated high above the bow infinity pool, private day cabanas, and an oceanfront cocktail bar that remains open until the last guest retires.',
    capacity: '28 VIP guests',
    hours: '06:00 — Late',
    suiteCount: 'Panoramic Lounge',
    image: '/assets/hero-ocean-from-ship.jpg',
    features: ['Heated saltwater infinity pool', 'Dedicated sommelier service', 'Private shaded cabanas', 'Sunset acoustic quartet'],
  },
  observe: {
    id: 'observe',
    deckNumber: 2,
    tag: 'Deck 8 · Observation Gallery',
    title: 'Horizon Observation Gallery',
    text: 'A wrapped glazed panoramic promenade hovering right at the waterline — the quietest sanctuary aboard to read, gaze across oceanic horizons, and savor peace.',
    capacity: 'Seats 18 guests',
    hours: '24 Hours Access',
    suiteCount: 'Marine Library',
    image: '/assets/window-seat.jpg',
    features: ['Acoustic glass noise suppression', 'Navigational nautical charts', 'Espresso & single-malt bar', 'Telescopic stargazing array'],
  },
  atrium: {
    id: 'atrium',
    deckNumber: 3,
    tag: 'Deck 7 · The Grand Atrium',
    title: 'The Imperial Grand Atrium',
    text: 'A multi-tier cathedral of maritime luxury, lit by hand-blown artisanal crystal chandeliers and flanked by a sculptural spiral staircase in polished brushed brass.',
    capacity: '120 Guests Reception',
    hours: 'All Day',
    suiteCount: 'Central Concierge',
    image: '/assets/ship-atrium.jpg',
    features: ['Concierge guest services', 'Live harp & grand piano', 'Art gallery curated exhibits', 'Boutique maritime apothecary'],
  },
  dining: {
    id: 'dining',
    deckNumber: 4,
    tag: 'Deck 6 · Fine Dining',
    title: 'Celestial Ocean Dining & Salon',
    text: 'Seventeen reserved tables, one master seating, and an haute-cuisine menu rewritten every morning by the executive chef around the daily coastal harvest.',
    capacity: '34 Table Seating',
    hours: '19:30 Seating',
    suiteCount: 'Michelin Starred',
    image: '/assets/deck-dining.jpg',
    features: ['Seven-course tasting experience', 'Reserve vintage wine pairings', 'Caviar & champagne trolley', 'Direct ocean wake views'],
  },
  balcony: {
    id: 'balcony',
    deckNumber: 5,
    tag: 'Deck 5 · Suites & Balconies',
    title: 'Grand Presidential Suite Balconies',
    text: 'Expansive private verandas with frameless structural glass balustrades, integrated heated jacuzzis, and an unencumbered 180-degree vista of oceanic majesty.',
    capacity: '14 Master Suites',
    hours: 'Private Retreat',
    suiteCount: 'Butler On Demand',
    image: '/assets/suite-grand.jpg',
    features: ['Dedicated white-glove butler', 'Private whirlpool spa', 'Italian Carrara marble bath', 'Walk-in bespoke dressing room'],
  },
};

interface OpenDesignDeckShowcaseProps {
  onExploreSuite?: (deckId: string) => void;
  onBookVoyage?: () => void;
}

export const OpenDesignDeckShowcase: React.FC<OpenDesignDeckShowcaseProps> = ({
  onExploreSuite,
  onBookVoyage,
}) => {
  const [activeDeck, setActiveDeck] = useState<string>('sun');
  const current = DECKS[activeDeck] || DECKS.sun;

  return (
    <section className="relative py-24 bg-[#f8f9fa] text-[#051833] overflow-hidden border-t border-[#0284c7]/15">
      {/* Background ambient lighting */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#0284c7]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-[#fff8dc]/70 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div>
            <div className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-sky-50 border border-[#0284c7]/30 text-[#0284c7] text-xs font-semibold tracking-widest uppercase">
              <Sparkles className="w-3.5 h-3.5 text-[#0284c7]" />
              Open Design Architecture
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display text-[#051833] mt-4 tracking-tight">
              Interactive Vessel <span className="italic text-[#0284c7]">Elevation &amp; Decks</span>
            </h2>
            <p className="text-slate-600 text-sm sm:text-base mt-2 max-w-xl font-medium">
              Select any deck level to inspect staterooms, acoustic galleries, and private maritime amenities aboard our flagship fleet.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold border border-[#0284c7]/30 text-[#0284c7] bg-sky-50">
              <Compass className="w-4 h-4 text-[#0284c7]" />
              Flagship Deck Plans
            </span>
          </div>
        </div>

        {/* Interactive Grid: Vector Ship on Left, Live Deck Stage on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left: Vector Ship Elevation with Interactive Deck Bands */}
          <div className="lg:col-span-7">
            <div className="shipmap-container relative bg-white border border-[#0284c7]/20 p-5 rounded-3xl shadow-lg">
              <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-200">
                <span className="text-xs uppercase tracking-widest text-[#0284c7] font-semibold flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#0284c7] animate-ping" />
                  CHV Meridian · Flagship Elevation
                </span>
                <span className="text-xs text-slate-500 font-mono">1,000 ft · 5 Deck Tiers</span>
              </div>

              {/* Vector SVG Vessel */}
              <div className="relative w-full aspect-[1000/360] select-none">
                <svg
                  viewBox="0 0 1000 360"
                  className="w-full h-full block"
                  role="img"
                  aria-label="Interactive side elevation of CHV Meridian"
                >
                  <defs>
                    <linearGradient id="seaFade" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0" stopColor="rgba(2, 132, 199, 0.2)" />
                      <stop offset="1" stopColor="rgba(2, 132, 199, 0)" />
                    </linearGradient>
                  </defs>

                  {/* Sea water surface */}
                  <rect x="20" y="296" width="960" height="58" fill="url(#seaFade)" />
                  <line x1="10" y1="296" x2="990" y2="296" stroke="rgba(2, 132, 199, 0.45)" strokeWidth="1.5" strokeDasharray="3 6" />

                  {/* Ship Superstructure & Hull */}
                  <path
                    className="ship-hull-shape"
                    d="M64 296 L98 226 L916 226 C950 230 962 254 964 278 L964 296 Z"
                    fill="#0a2548"
                  />
                  <line x1="70" y1="268" x2="960" y2="268" stroke="#0284c7" strokeWidth="1.5" opacity="0.6" />
                  <text x="148" y="252" fill="#94a3b8" fontSize="12" letterSpacing="4" fontFamily="Jost, sans-serif">
                    CHV MERIDIAN · CRUISE HUNT FLEET
                  </text>

                  {/* Funnel */}
                  <path d="M344 52 h60 v-28 a9 9 0 0 0 -9 -9 h-42 a9 9 0 0 0 -9 9 z" fill="#051833" stroke="#cbd5e1" strokeWidth="1" />
                  <line x1="344" y1="34" x2="404" y2="34" stroke="#0284c7" strokeWidth="1" />

                  {/* Deck Band 1: Sun Deck */}
                  <g
                    className="ship-deck-band"
                    data-active={activeDeck === 'sun'}
                    onClick={() => setActiveDeck('sun')}
                  >
                    <rect x="270" y="52" width="390" height="26" rx="4" />
                    <line x1="284" y1="62" x2="596" y2="62" stroke="rgba(255,255,255,0.4)" strokeWidth="1" strokeDasharray="11 7" />
                    <text x="626" y="72">1</text>
                  </g>

                  {/* Deck Band 2: Observation Deck */}
                  <g
                    className="ship-deck-band"
                    data-active={activeDeck === 'observe'}
                    onClick={() => setActiveDeck('observe')}
                  >
                    <rect x="236" y="84" width="470" height="28" rx="4" />
                    <line x1="250" y1="95" x2="642" y2="95" stroke="rgba(255,255,255,0.4)" strokeWidth="1" strokeDasharray="11 7" />
                    <text x="672" y="105">2</text>
                  </g>

                  {/* Deck Band 3: Grand Atrium */}
                  <g
                    className="ship-deck-band"
                    data-active={activeDeck === 'atrium'}
                    onClick={() => setActiveDeck('atrium')}
                  >
                    <rect x="204" y="118" width="536" height="30" rx="4" />
                    <line x1="218" y1="129" x2="676" y2="129" stroke="rgba(255,255,255,0.4)" strokeWidth="1" strokeDasharray="11 7" />
                    <text x="706" y="140">3</text>
                  </g>

                  {/* Deck Band 4: Dining Deck */}
                  <g
                    className="ship-deck-band"
                    data-active={activeDeck === 'dining'}
                    onClick={() => setActiveDeck('dining')}
                  >
                    <rect x="176" y="154" width="590" height="32" rx="4" />
                    <line x1="190" y1="166" x2="702" y2="166" stroke="rgba(255,255,255,0.4)" strokeWidth="1" strokeDasharray="11 7" />
                    <text x="732" y="177">4</text>
                  </g>

                  {/* Deck Band 5: Suites & Balconies */}
                  <g
                    className="ship-deck-band"
                    data-active={activeDeck === 'balcony'}
                    onClick={() => setActiveDeck('balcony')}
                  >
                    <rect x="160" y="192" width="620" height="34" rx="4" />
                    <line x1="174" y1="204" x2="716" y2="204" stroke="rgba(255,255,255,0.4)" strokeWidth="1" strokeDasharray="11 7" />
                    <text x="746" y="216">5</text>
                  </g>
                </svg>
              </div>

              {/* Interactive Deck Selector Tabs */}
              <div className="grid grid-cols-5 gap-2 mt-4 pt-3 border-t border-slate-200">
                {Object.values(DECKS).map((deck) => {
                  const isSelected = activeDeck === deck.id;
                  return (
                    <button
                      key={deck.id}
                      onClick={() => setActiveDeck(deck.id)}
                      className={`py-2 px-2 rounded-xl text-center transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#051833] border border-[#051833] text-[#fff8dc] font-black shadow-md shadow-[#051833]/15'
                          : 'bg-[#f8f9fa] border border-slate-200 text-slate-700 hover:text-[#051833] hover:border-[#0284c7]'
                      }`}
                    >
                      <span className="block text-[11px] font-mono tracking-wider font-bold">
                        DECK {deck.deckNumber}
                      </span>
                      <span className="block text-[10px] truncate opacity-90 mt-0.5">
                        {deck.id.toUpperCase()}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right: Live Deck Details Stage */}
          <div className="lg:col-span-5">
            <div className="od-surface rounded-3xl p-6 sm:p-7 relative overflow-hidden transition-all duration-300 bg-white border border-[#0284c7]/20 text-[#051833] shadow-xl">
              {/* Media Preview Image */}
              <div className="relative aspect-[16/10] rounded-2xl overflow-hidden mb-6 border border-[#0284c7]/20 shadow-md group">
                <img
                  src={current.image}
                  alt={current.title}
                  className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  onError={(e) => {
                    // Fallback to static cruise image if asset path fails
                    (e.target as HTMLImageElement).src = '/static/images/cruises/cruise_1.png';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#051833]/90 via-[#051833]/20 to-transparent pointer-events-none" />
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                  <span className="px-3 py-1 rounded-full bg-white/95 backdrop-blur-md border border-[#0284c7]/25 text-[#051833] text-xs font-bold tracking-wide shadow-sm">
                    {current.tag}
                  </span>
                  <span className="text-xs text-white font-mono bg-[#051833]/80 px-2.5 py-1 rounded-full border border-white/20">
                    {current.suiteCount}
                  </span>
                </div>
              </div>

              {/* Title & Description */}
              <h3 className="text-2xl font-display text-[#051833] font-bold">
                {current.title}
              </h3>
              <p className="text-slate-600 text-sm mt-2 leading-relaxed font-medium">
                {current.text}
              </p>

              {/* Highlights & Features */}
              <div className="grid grid-cols-2 gap-2.5 mt-4 pt-4 border-t border-slate-100">
                {current.features.map((feat, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                    <Check className="w-3.5 h-3.5 text-[#0284c7] flex-shrink-0" />
                    <span className="truncate">{feat}</span>
                  </div>
                ))}
              </div>

              {/* Operational Metrics */}
              <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-100 text-xs">
                <div className="flex items-center gap-2 text-slate-700 font-semibold">
                  <Users className="w-4 h-4 text-[#0284c7]" />
                  <span>{current.capacity}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700 font-semibold">
                  <Clock className="w-4 h-4 text-[#0284c7]" />
                  <span>{current.hours}</span>
                </div>
              </div>

              {/* CTA Action */}
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
                <button
                  onClick={() => onBookVoyage?.()}
                  className="px-6 py-3 text-xs sm:text-sm font-black flex items-center gap-2 flex-1 justify-center rounded-full bg-[#051833] hover:bg-[#0a2548] text-[#fff8dc] shadow-md shadow-[#051833]/15 cursor-pointer transition-all"
                >
                  Reserve Trip on This Deck
                  <ArrowRight className="w-4 h-4 text-[#fff8dc]" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
