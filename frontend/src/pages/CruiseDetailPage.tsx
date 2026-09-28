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
} from 'lucide-react';

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

  const defaultCabins: CabinTier[] = cruise.cabins && cruise.cabins.length > 0
    ? cruise.cabins
    : [
        {
          id: 'PRESIDENTIAL',
          name: 'Presidential Sea Suite',
          multiplier: 2.2,
          description: 'Expansive private terrace, personal butler service, and jacuzzi overlooking the ocean.',
          price_per_day: cruise.price_per_day * 2.2,
          amenities: ['Private Veranda', '24/7 Butler Service', 'Complimentary Champagne Cellar', 'Priority Embarkation'],
        },
        {
          id: 'ROYAL_BALCONY',
          name: 'Royal Ocean Balcony',
          multiplier: 1.6,
          description: 'Floor-to-ceiling glass doors opening directly to private sea breeze balcony.',
          price_per_day: cruise.price_per_day * 1.6,
          amenities: ['Private Balcony', 'King Stateroom Bed', 'Espresso Bar', 'Sunset Seating'],
        },
        {
          id: 'OCEANVIEW',
          name: 'Premium Oceanview Stateroom',
          multiplier: 1.0,
          description: 'Panoramic picture window with unobstructed oceanic horizons.',
          price_per_day: cruise.price_per_day,
          amenities: ['Panoramic Picture Window', 'Luxury Linens', 'En-suite Marble Bath', 'Smart Entertainment'],
        },
        {
          id: 'INTERIOR',
          name: 'Deluxe Interior Haven',
          multiplier: 0.75,
          description: 'Cozy, whisper-quiet stateroom with ambient circadian lighting.',
          price_per_day: cruise.price_per_day * 0.75,
          amenities: ['Circadian Lighting', 'Queen Bed', 'Soundproofing', 'Flat-screen Cinema'],
        },
      ];

  const itineraryItems = cruise.itinerary && cruise.itinerary.length > 0
    ? cruise.itinerary
    : [
        `Day 1: Embarkation at ${cruise.departure_port || 'Flagship Port'} & Sunset Sailaway Gala`,
        'Day 2: Full Day Scenic Coastal Cruising & Culinary Masterclass',
        `Day 3: Anchor at ${cruise.destination || 'Isle Harbor'} — Shoreline Excursion & Kayaking`,
        'Day 4: Stargazing on Observation Promenade & Broadway-style Theatre',
        'Day 5: Island Port of Call — Historic Citadel & Sunset Vineyard Tour',
        'Day 6: At Sea — Wellness Thalassotherapy & Captain’s Gala Dinner',
        `Day 7: Disembarkation at ${cruise.departure_port || 'Flagship Port'}`,
      ];

  const diningVenues = cruise.dining_venues && cruise.dining_venues.length > 0
    ? cruise.dining_venues
    : [
        'The Horizon Main Dining Room',
        'Siren Seafood & Caviar Raw Bar',
        'Prime Coastal Steakhouse',
        'Terrace Gelato & Espresso Lounge',
      ];

  const entertainment = cruise.entertainment && cruise.entertainment.length > 0
    ? cruise.entertainment
    : [
        'Grand Celestial Theater (Broadway Cast Performances)',
        'Constellation Live Jazz & Whiskey Bar',
        'Casino Royal Ocean Club',
        'Under-the-Stars Open-Air Cinema',
      ];

  return (
    <div className="min-h-screen pt-24 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 bg-[#f8fafc]">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 mb-6 transition cursor-pointer font-semibold"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to Fleet Discovery
      </button>

      {/* ============================================================ */}
      {/* TOP: CINEMATIC SHIP GALLERY                                 */}
      {/* ============================================================ */}
      <div className="relative rounded-3xl overflow-hidden aspect-[21/9] min-h-[360px] bg-slate-100 border border-sky-200 shadow-xl">
        <img
          src={cruise.image || '/static/images/placeholder.png'}
          alt={cruise.title}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src =
              'https://images.unsplash.com/photo-1548574505-5e239809ee19?auto=format&fit=crop&w=1600&q=80';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/30 to-transparent" />

        <div className="absolute bottom-6 left-6 right-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-white/90 backdrop-blur-md border border-sky-300 text-sky-900 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
                <Anchor className="w-3.5 h-3.5 text-sky-600" />
                {cruise.category || 'Luxury Ocean Liner'}
              </span>
              <span className="px-3 py-1 rounded-full bg-white/80 backdrop-blur-md border border-white/20 text-slate-800 text-xs font-semibold shadow-sm">
                {cruise.duration_days || 7} Days Voyage
              </span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-display font-black text-white tracking-tight">
              {cruise.title}
            </h1>
            <div className="flex items-center gap-2 text-sky-200 text-sm font-medium">
              <MapPin className="w-4 h-4 text-sky-300" />
              <span>{cruise.destination || cruise.location}</span>
              <span>•</span>
              <span>Departure: {cruise.departure_port || 'Flagship Port'}</span>
            </div>
          </div>

          {/* Top Quick Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => onBookEvent(cruise)}
              className="px-5 py-3 rounded-2xl bg-white/95 border border-amber-400 text-amber-900 text-sm font-bold hover:bg-amber-50 transition cursor-pointer shadow-md"
            >
              Charter for Event
            </button>
            <button
              onClick={() => onBookTour(cruise, selectedCabin)}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-display font-bold text-sm tracking-wide shadow-xl shadow-sky-500/25 flex items-center gap-2 transition cursor-pointer"
            >
              <span>Book Voyage Ticket</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* QUICK SPECS BAR                                              */}
      {/* ============================================================ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 my-8">
        <div className="p-5 rounded-2xl bg-white border border-sky-100 shadow-sm text-center">
          <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Total Capacity</p>
          <p className="text-2xl font-display font-extrabold text-slate-900 mt-1 flex items-center justify-center gap-1.5">
            <Users className="w-5 h-5 text-sky-600" />
            {cruise.capacity} Guests
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-sky-100 shadow-sm text-center">
          <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Promenade Decks</p>
          <p className="text-2xl font-display font-extrabold text-slate-900 mt-1 flex items-center justify-center gap-1.5">
            <Layers className="w-5 h-5 text-sky-600" />
            {cruise.decks_count || 12} Decks
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-sky-100 shadow-sm text-center">
          <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Guest Rating</p>
          <p className="text-2xl font-display font-extrabold text-amber-600 mt-1 flex items-center justify-center gap-1.5">
            <Star className="w-5 h-5 fill-amber-500 text-amber-500" />
            {cruise.average_rating > 0 ? cruise.average_rating.toFixed(1) : '5.0'} / 5.0
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-sky-100 shadow-sm text-center">
          <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Starting Fare</p>
          <p className="text-2xl font-display font-extrabold text-slate-900 mt-1">
            ${Number(cruise.price_per_day).toLocaleString()} <span className="text-xs text-slate-500 font-normal">/ day</span>
          </p>
        </div>
      </div>

      {/* ============================================================ */}
      {/* MAIN CONTENT: ABOUT, STATEROOMS, ITINERARY, DINING           */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
        {/* Left 2 Columns */}
        <div className="lg:col-span-2 space-y-12">
          {/* About Section */}
          <section className="space-y-4">
            <h2 className="text-2xl font-display font-bold text-slate-900">About The Vessel</h2>
            <p className="text-slate-600 text-base leading-relaxed whitespace-pre-line">
              {cruise.description ||
                `The ${cruise.title} stands as one of the world's most sophisticated passenger liners. Engineered for serene stability across global oceans, the vessel features expansive observation lounges, open-air sun decks, curated culinary venues, and bespoke private suites designed for the modern connoisseur of travel.`}
            </p>
          </section>

          {/* Stateroom & Cabin Tier Selector */}
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-display font-bold text-slate-900">Cabins & Staterooms</h2>
                <p className="text-sm text-slate-500">
                  Select your desired suite tier for live fare calculations.
                </p>
              </div>
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
                        <h3 className="font-display font-bold text-lg text-slate-900">
                          {cabin.name}
                        </h3>
                        {isSelected && (
                          <CheckCircle2 className="w-5 h-5 text-sky-600" />
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mb-4">{cabin.description}</p>
                      
                      <div className="space-y-1.5">
                        {cabin.amenities.map((am, i) => (
                          <div key={i} className="text-xs text-slate-700 flex items-center gap-1.5 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                            <span>{am}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-5 mt-4 border-t border-slate-100 flex items-baseline justify-between">
                      <span className="text-xs text-slate-500 font-semibold">Total / Day</span>
                      <span className="font-display text-xl font-black text-amber-600">
                        ${Math.round(cabin.price_per_day).toLocaleString()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Day-by-Day Itinerary Timeline */}
          <section className="space-y-6">
            <h2 className="text-2xl font-display font-bold text-slate-900">Voyage Itinerary</h2>
            <div className="space-y-4 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-sky-200">
              {itineraryItems.map((item, idx) => (
                <div key={idx} className="relative flex items-start gap-4">
                  <div className="w-7 h-7 rounded-full bg-white border-2 border-sky-500 flex items-center justify-center text-xs font-bold text-sky-700 shrink-0 z-10 shadow-sm">
                    {idx + 1}
                  </div>
                  <div className="flex-1 p-4 rounded-2xl bg-white border border-sky-100 shadow-sm">
                    <p className="text-sm font-semibold text-slate-800">{item}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Dining Venues & Entertainment */}
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="p-6 rounded-3xl bg-white border border-sky-100 shadow-sm space-y-4">
              <h3 className="font-display font-bold text-xl text-slate-900 flex items-center gap-2">
                <Utensils className="w-5 h-5 text-amber-600" />
                Dining & Lounges
              </h3>
              <ul className="space-y-2 text-sm text-slate-700">
                {diningVenues.map((venue, idx) => (
                  <li key={idx} className="flex items-center gap-2 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    <span>{venue}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-6 rounded-3xl bg-white border border-sky-100 shadow-sm space-y-4">
              <h3 className="font-display font-bold text-xl text-slate-900 flex items-center gap-2">
                <Music className="w-5 h-5 text-sky-600" />
                Entertainment & Gala
              </h3>
              <ul className="space-y-2 text-sm text-slate-700">
                {entertainment.map((item, idx) => (
                  <li key={idx} className="flex items-center gap-2 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </div>

        {/* ============================================================ */}
        {/* RIGHT STICKY BOOKING SUMMARY PANEL                          */}
        {/* ============================================================ */}
        <aside className="lg:col-span-1 bg-white rounded-3xl p-6 border border-sky-200 shadow-xl space-y-6 lg:sticky lg:top-28">
          <div>
            <span className="text-xs uppercase font-bold text-sky-700 tracking-wider">
              Reserve Stateroom
            </span>
            <h3 className="text-2xl font-display font-extrabold text-slate-900 mt-1">
              Voyage Fare Summary
            </h3>
          </div>

          <div className="space-y-3 py-3 border-y border-slate-100 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Selected Stateroom:</span>
              <span className="font-bold text-slate-900">
                {defaultCabins.find((c) => c.id === selectedCabin)?.name || 'Oceanview'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Standard Duration:</span>
              <span className="font-bold text-slate-900">{cruise.duration_days || 7} Days</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Port Embarkation:</span>
              <span className="font-bold text-slate-900 truncate max-w-[150px]">
                {cruise.departure_port || 'Flagship Port'}
              </span>
            </div>
          </div>

          <div>
            <span className="text-xs text-slate-500 font-semibold block">Total Base Voyage Investment</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-display font-black text-amber-600">
                $
                {Math.round(
                  (defaultCabins.find((c) => c.id === selectedCabin)?.price_per_day || cruise.price_per_day) *
                    (cruise.duration_days || 7)
                ).toLocaleString()}
              </span>
              <span className="text-xs text-slate-500 font-medium">/ 1 guest</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Includes stateroom, fine dining, ocean passage, port tariffs, and entertainment.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <button
              onClick={() => onBookTour(cruise, selectedCabin)}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-display font-bold text-base tracking-wide shadow-xl shadow-sky-500/25 flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <span>CONTINUE TO BOOKING</span>
              <ArrowRight className="w-5 h-5 text-sky-100" />
            </button>

            <button
              onClick={() => onBookEvent(cruise)}
              className="w-full py-3 rounded-2xl bg-white border border-amber-400 text-amber-800 text-sm font-bold hover:bg-amber-50 transition cursor-pointer shadow-sm"
            >
              Charter for Private Maritime Event
            </button>
          </div>

          <div className="pt-2 text-xs text-slate-500 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-sky-600 shrink-0" />
            <span>Guaranteed transactional stateroom reservation lock.</span>
          </div>
        </aside>
      </div>
    </div>
  );
};
