import React, { useState } from 'react';
import { Cruise, CabinTier } from '../api/types';
import {
  MapPin,
  Star,
  Users,
  Anchor,
  Layers,
  Utensils,
  Music,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  ChevronLeft,
  Sparkles,
  Maximize2,
  Award
} from 'lucide-react';
import { formatINR } from '../utils/currency';

interface CruiseDetailPageProps {
  cruise: Cruise;
  onBack: () => void;
  onBookTour: (cruise: Cruise, preselectedCabin?: string) => void;
  onBookEvent: (cruise: Cruise) => void;
}

export const CruiseDetailPage: React.FC<CruiseDetailPageProps> = ({
  cruise,
  onBack,
  onBookTour,
  onBookEvent,
}) => {
  const [selectedCabin, setSelectedCabin] = useState<string>('OCEANVIEW');

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
          amenities: ['Private Veranda', '24/7 Butler Service', 'Complimentary Champagne Cellar', 'Priority Embarkation'],
        },
        {
          id: 'ROYAL_BALCONY',
          name: 'Royal Ocean Balcony Stateroom',
          multiplier: 1.3,
          description: 'Floor-to-ceiling glass doors opening directly to private sea breeze balcony.',
          price_per_day: baseRate * 1.3,
          amenities: ['Private Balcony', 'King Stateroom Bed', 'Espresso Bar', 'Sunset Seating'],
        },
        {
          id: 'OCEANVIEW',
          name: 'Deluxe Oceanview Stateroom',
          multiplier: 1.1,
          description: 'Panoramic picture window with unobstructed oceanic horizons.',
          price_per_day: baseRate * 1.1,
          amenities: ['Panoramic Picture Window', 'Luxury Linens', 'En-suite Marble Bath', 'Smart Entertainment'],
        },
        {
          id: 'INTERIOR',
          name: 'Signature Interior Stateroom',
          multiplier: 1.0,
          description: 'Cozy, whisper-quiet stateroom with ambient circadian lighting and acoustic isolation.',
          price_per_day: baseRate,
          amenities: ['Circadian Lighting', 'Queen Bed', 'Soundproofing', 'Flat-screen Cinema'],
        },
      ];

  const itineraryItems = cruise.itinerary && cruise.itinerary.length > 0
    ? cruise.itinerary
    : [
        `Day 1: Embarkation at ${cruise.departure_port || 'Flagship Port'} & Sunset Sailaway Gala`,
        `Day 2: Coastal navigation past Konkan fortress islands & Lido Deck Sun Soiree`,
        `Day 3: Anchor at ${cruise.destination || 'Isle Harbor'} — Shoreline Excursion & Watersports`,
        `Day 4: Starlight Farewell Party with Masterchef banquet`,
        `Day 5: Return to port and disembarkation`,
      ];

  const diningVenues = cruise.dining_venues_list || (cruise.dining_venues && cruise.dining_venues.length > 0 ? cruise.dining_venues : [
    "The Captain's Table",
    "Oceanview Lido Buffet",
    "Konkan Spice Route",
    "Sapphire Cocktail Lounge",
    "Sunset Deck Bistro"
  ]);

  return (
    <div className="min-h-screen bg-slate-50/60 pt-28 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-10">
      {/* Navigation Top Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-900 transition cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Fleet</span>
        </button>

        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          <span>Fleet Code:</span>
          <span className="font-mono font-bold text-slate-900 uppercase">{cruise.slug}</span>
        </div>
      </div>

      {/* ============================================================ */}
      {/* HERO SECTION: SHIP TITLE, GALLERY, SPECIFICATIONS           */}
      {/* ============================================================ */}
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full bg-sky-100 text-sky-800 text-xs font-bold uppercase tracking-wider">
                {cruise.category || 'Luxury Ocean Liner'}
              </span>
              <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold uppercase tracking-wider">
                Active Vessel
              </span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-display font-extrabold text-slate-900 tracking-tight font-serif">
              {cruise.title}
            </h1>
            <p className="text-slate-600 flex items-center gap-1.5 text-sm sm:text-base mt-2">
              <MapPin className="w-4 h-4 text-sky-500 shrink-0" />
              <span>Base Port: {cruise.location} ({cruise.departure_port}) — Voyage Route: {cruise.route}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onBookEvent(cruise)}
              className="px-5 py-3 rounded-2xl bg-white border border-slate-300 text-slate-800 text-xs font-bold hover:bg-slate-50 transition cursor-pointer shadow-sm"
            >
              Charter for Event
            </button>
            <button
              onClick={() => onBookTour(cruise, selectedCabin)}
              className="px-6 py-3 rounded-2xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold shadow-md shadow-sky-500/20 transition cursor-pointer flex items-center gap-1.5"
            >
              <span>Book Voyage</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Cinematic Ship Imagery */}
        <div className="relative aspect-[21/9] sm:aspect-[2.5/1] rounded-3xl overflow-hidden border border-slate-200/80 shadow-xl bg-slate-900">
          <img
            src={cruise.image || 'https://images.unsplash.com/photo-1548574505-5e239809ee19?auto=format&fit=crop&w=1600&q=80'}
            alt={cruise.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/20" />

          <div className="absolute bottom-6 left-6 right-6 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 text-white">
            <div>
              <p className="text-xs uppercase tracking-widest text-sky-300 font-bold">Flagship Home Port</p>
              <p className="text-xl sm:text-2xl font-bold font-serif">{cruise.departure_port || cruise.location}</p>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-widest text-slate-300 font-bold">Starting Charter Rate</p>
              <p className="text-2xl sm:text-3xl font-black text-sky-300">{formatINR(cruise.price)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Vessel Specs Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm text-center">
          <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Guest Capacity</p>
          <p className="text-lg font-black text-slate-900 mt-1 flex items-center justify-center gap-1">
            <Users className="w-4 h-4 text-sky-500" />
            {cruise.capacity} Guests
          </p>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm text-center">
          <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Vessel Length</p>
          <p className="text-lg font-black text-slate-900 mt-1 flex items-center justify-center gap-1">
            <Maximize2 className="w-4 h-4 text-sky-500" />
            {cruise.ship_length_meters || 260} Meters
          </p>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm text-center">
          <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Passenger Decks</p>
          <p className="text-lg font-black text-slate-900 mt-1 flex items-center justify-center gap-1">
            <Layers className="w-4 h-4 text-sky-500" />
            {cruise.decks_count || 12} Decks
          </p>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm text-center">
          <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Total Staterooms</p>
          <p className="text-lg font-black text-slate-900 mt-1 flex items-center justify-center gap-1">
            <Anchor className="w-4 h-4 text-sky-500" />
            {cruise.cabin_count || 120} Suites
          </p>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm text-center">
          <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Guest Rating</p>
          <p className="text-lg font-black text-slate-900 mt-1 flex items-center justify-center gap-1">
            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
            {cruise.average_rating > 0 ? cruise.average_rating.toFixed(1) : '4.9'} / 5.0
          </p>
        </div>
      </div>

      {/* Booking Purpose Capabilities */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-sky-500" />
          <h2 className="text-xl font-bold font-serif text-slate-900">Supported Booking Purposes & Capabilities</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          {[
            { label: 'Private Ship Charter', enabled: cruise.supports_private_charter !== false },
            { label: 'Public Scheduled Tours', enabled: cruise.supports_public_tours !== false },
            { label: 'Ocean Weddings & Mandap', enabled: cruise.supports_weddings !== false },
            { label: 'Milestone Birthdays', enabled: cruise.supports_birthdays !== false },
            { label: 'Corporate Summits', enabled: cruise.supports_corporate !== false },
            { label: 'Keynote Conferences', enabled: cruise.supports_conferences === true },
            { label: 'DJ Decks & Parties', enabled: cruise.supports_parties !== false },
            { label: 'Private Gala Dinners', enabled: cruise.supports_dinners !== false },
          ].map((cap, i) => (
            <div
              key={i}
              className={`p-3 rounded-2xl border flex items-center justify-between font-bold ${
                cap.enabled ? 'bg-sky-50/50 border-sky-200 text-sky-900' : 'bg-slate-50 border-slate-200/60 text-slate-400 opacity-60'
              }`}
            >
              <span>{cap.label}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${cap.enabled ? 'bg-sky-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                {cap.enabled ? 'YES' : 'NO'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-10">
          {/* About The Vessel */}
          <section className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
            <h2 className="text-2xl font-display font-bold text-slate-900 font-serif">About The Vessel</h2>
            <p className="text-slate-600 text-sm sm:text-base leading-relaxed whitespace-pre-line">
              {cruise.description}
            </p>
          </section>

          {/* Owner Configured Extras */}
          {cruise.extras && cruise.extras.length > 0 && (
            <section className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-6">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-sky-500" />
                <h2 className="text-2xl font-bold font-serif text-slate-900">Customizable Extras & Services</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {cruise.extras.map((ex) => (
                  <div key={ex.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
                    <div>
                      <div className="font-bold text-sm text-slate-900">{ex.name}</div>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">{ex.description}</p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-semibold">Price:</span>
                      <span className="font-bold text-sky-700">
                        {formatINR(ex.price)} {ex.pricing_mode === 'PER_GUEST' ? '/ guest' : 'flat fee'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Cabins & Staterooms */}
          <section className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-6">
            <div>
              <h2 className="text-2xl font-display font-bold text-slate-900 font-serif">Cabins & Staterooms</h2>
              <p className="text-xs text-slate-500 mt-1">Select your desired suite tier for fare calculations.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {defaultCabins.map((cabin) => {
                const isSelected = selectedCabin === cabin.id;
                return (
                  <div
                    key={cabin.id}
                    onClick={() => setSelectedCabin(cabin.id)}
                    className={`p-5 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-sky-50/90 border-sky-500 shadow-md shadow-sky-500/10 ring-1 ring-sky-400'
                        : 'bg-white border-slate-200 hover:border-sky-300 shadow-sm'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-display font-bold text-base text-slate-900">{cabin.name}</h3>
                        {isSelected && <CheckCircle2 className="w-5 h-5 text-sky-600" />}
                      </div>
                      <p className="text-xs text-slate-500 mb-4">{cabin.description}</p>
                      <div className="space-y-1.5">
                        {(cabin.amenities || []).map((am, i) => (
                          <div key={i} className="text-xs text-slate-700 flex items-center gap-1.5 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                            <span>{am}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-4 mt-4 border-t border-slate-100 flex items-baseline justify-between">
                      <span className="text-xs text-slate-500 font-semibold">Tier Rate</span>
                      <span className="font-display text-lg font-black text-sky-700">
                        {formatINR(cabin.price_per_day)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Itinerary Timeline */}
          <section className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-6">
            <h2 className="text-2xl font-display font-bold text-slate-900 font-serif">Voyage Itinerary Highlights</h2>
            <div className="space-y-4">
              {itineraryItems.map((item, idx) => (
                <div key={idx} className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs sm:text-sm text-slate-700 font-medium">
                  <span className="w-7 h-7 rounded-xl bg-sky-500/10 text-sky-600 flex items-center justify-center font-bold text-xs shrink-0">
                    {idx + 1}
                  </span>
                  <span className="pt-0.5">{item}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Right Sticky Sidebar */}
        <aside className="sticky top-28 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xl space-y-6">
          <div className="border-b border-slate-100 pb-5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Starting Charter Rate</p>
            <p className="text-3xl font-black text-slate-900 mt-1 font-serif">{formatINR(cruise.price)}</p>
            <p className="text-xs text-slate-500 mt-0.5">Base Vessel Reservation (All taxes calculated at checkout)</p>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Selected Stateroom:</span>
              <span className="font-bold text-slate-900">{defaultCabins.find((c) => c.id === selectedCabin)?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Standard Duration:</span>
              <span className="font-bold text-slate-900">{cruise.duration_days || 3} Days</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Base Port:</span>
              <span className="font-bold text-slate-900">{cruise.departure_port || cruise.location}</span>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <button
              onClick={() => onBookTour(cruise, selectedCabin)}
              className="w-full py-4 rounded-2xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-sm tracking-wide shadow-lg shadow-sky-500/25 flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <span>CONTINUE TO RESERVATION</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => onBookEvent(cruise)}
              className="w-full py-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold hover:bg-slate-100 transition cursor-pointer"
            >
              Configure Private Maritime Event
            </button>
          </div>

          <div className="pt-2 text-[11px] text-slate-400 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Anti-double-booking verified on server. Official GST invoice in INR (₹).</span>
          </div>
        </aside>
      </div>
    </div>
  );
};
