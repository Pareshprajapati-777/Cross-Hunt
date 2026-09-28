import React, { useState } from 'react';
import { PublicTour } from '../api/types';
import {
  MapPin,
  Calendar,
  Clock,
  ShieldCheck,
  ChevronLeft,
  ArrowRight,
  Utensils,
  CheckCircle2,
  Anchor
} from 'lucide-react';
import { formatINR } from '../utils/currency';

interface TourDetailPageProps {
  tour: PublicTour;
  onBack: () => void;
  onBookTourTicket: (tour: PublicTour) => void;
}

export const TourDetailPage: React.FC<TourDetailPageProps> = ({
  tour,
  onBack,
  onBookTourTicket,
}) => {
  const [selectedCabin, setSelectedCabin] = useState<'Standard Stateroom' | 'Oceanview Balcony Stateroom' | 'Captain Suite'>('Oceanview Balcony Stateroom');

  const itineraryLines = tour.itinerary_highlights && tour.itinerary_highlights.length > 0
    ? tour.itinerary_highlights
    : [
        `Day 1: Embarkation at ${tour.departure_port} at ${tour.departure_time} — Welcome Cocktail & Grand Buffet`,
        `Day 2: Coastal navigation past Konkan fortress islands & Sunset Lido Deck party`,
        `Day 3: Anchor at ${tour.destination} — Shore excursions, watersports, and gala starlight dinner`,
        `Day 4: Return docking and disembarkation at ${tour.return_time}`
      ];

  const isLowCapacity = tour.remaining_capacity <= 20;

  return (
    <div className="min-h-screen bg-slate-50/70 pt-28 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Back Button */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900 transition cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Scheduled Tours</span>
        </button>

        {/* Hero Banner */}
        <div className="relative rounded-3xl overflow-hidden shadow-xl border border-slate-200/80 bg-slate-900 text-white min-h-[380px] flex flex-col justify-end p-6 sm:p-10">
          <img
            src={tour.ship_image || 'https://images.unsplash.com/photo-1548574505-5e239809ee19?auto=format&fit=crop&w=1600&q=80'}
            alt={tour.tour_title}
            className="absolute inset-0 w-full h-full object-cover opacity-45"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/60 to-transparent" />

          <div className="relative z-10 space-y-4 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-sky-500/20 text-sky-300 text-xs font-bold tracking-wider uppercase border border-sky-400/30">
                {tour.ship_name}
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                isLowCapacity ? 'bg-rose-500/20 text-rose-300 border border-rose-400/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
              }`}>
                {tour.remaining_capacity} Seats Available
              </span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black font-serif tracking-tight leading-tight">
              {tour.tour_title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-slate-200">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-sky-400" />
                <span>{tour.departure_port} → {tour.destination}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-sky-400" />
                <span>{tour.departure_date} to {tour.return_date}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-sky-400" />
                <span>{tour.duration_days} Days / {tour.duration_days - 1} Nights</span>
              </div>
            </div>
          </div>
        </div>

        {/* Content & Booking Action Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Details & Itinerary */}
          <div className="lg:col-span-2 space-y-8">
            {/* Quick Specs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm text-center">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Capacity</div>
                <div className="text-lg font-black text-slate-900 mt-1">{tour.total_capacity} Guests</div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Seats Reserved</div>
                <div className="text-lg font-black text-sky-600 mt-1">{tour.booked_capacity}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Adult Fare</div>
                <div className="text-lg font-black text-slate-900 mt-1">{formatINR(tour.adult_price)}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Child Fare</div>
                <div className="text-lg font-black text-slate-900 mt-1">{formatINR(tour.child_price)}</div>
              </div>
            </div>

            {/* Itinerary Timeline */}
            <div className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-6">
              <div className="flex items-center gap-2">
                <Anchor className="w-5 h-5 text-sky-500" />
                <h2 className="text-xl font-black text-slate-900 font-serif">Voyage Itinerary & Port Calls</h2>
              </div>

              <div className="space-y-4">
                {itineraryLines.map((line, idx) => (
                  <div key={idx} className="flex items-start gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                    <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-600 flex items-center justify-center font-black text-xs shrink-0">
                      0{idx + 1}
                    </div>
                    <div className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium pt-1">
                      {line}
                    </div>
                  </div>
                ))}
              </div>

              {tour.ports_of_call && (
                <div className="p-4 rounded-2xl bg-sky-50/60 border border-sky-100 text-xs text-sky-900 font-medium">
                  <span className="font-bold">Ports of Call:</span> {tour.ports_of_call}
                </div>
              )}
            </div>

            {/* Inclusions */}
            <div className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <Utensils className="w-5 h-5 text-sky-500" />
                <h2 className="text-xl font-black text-slate-900 font-serif">Included In Your Ticket</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {[
                  tour.meals_included || 'All Gourmet Meals, High Tea & Midnight Snacks',
                  'Live Musical Broadway Shows & Cultural Amphitheatre',
                  'Access to Swimming Pools, Sun Decks & Jacuzzis',
                  'Port Fees, Maritime Safety Protocol & Lifeboat Briefings',
                  'Complimentary High-Speed Wi-Fi in Observation Lounges',
                  'Daily Morning Yoga & Wellness Deck Sessions'
                ].map((inc, i) => (
                  <div key={i} className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-100 text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>{inc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Cabin Tier & Booking Confirmation Box */}
          <div className="space-y-6">
            <div className="sticky top-28 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-lg space-y-6">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Starting Fare</div>
                <div className="text-3xl font-black text-slate-900 mt-1">{formatINR(tour.adult_price)}</div>
                <div className="text-xs text-slate-500">Per Adult (Taxes & Meals Included)</div>
              </div>

              {/* Cabin Tier Selector */}
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Select Cabin Tier</label>
                <div className="space-y-2">
                  {[
                    { id: 'Standard Stateroom', name: 'Signature Oceanview', surcharge: 0 },
                    { id: 'Oceanview Balcony Stateroom', name: 'Royal Balcony Stateroom', surcharge: 2500 },
                    { id: 'Captain Suite', name: 'Captain Presidential Suite', surcharge: 5000 },
                  ].map((cab) => (
                    <div
                      key={cab.id}
                      onClick={() => setSelectedCabin(cab.id as any)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between text-xs ${
                        selectedCabin === cab.id
                          ? 'border-sky-500 bg-sky-50/50 shadow-sm'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-slate-900">{cab.name}</div>
                        <div className="text-[11px] text-slate-500">
                          {cab.surcharge > 0 ? `+ ${formatINR(cab.surcharge)} surcharge` : 'Standard Included'}
                        </div>
                      </div>
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        selectedCabin === cab.id ? 'border-sky-600 bg-sky-600 text-white' : 'border-slate-300'
                      }`}>
                        {selectedCabin === cab.id && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Book Ticket Button */}
              <button
                onClick={() => onBookTourTicket(tour)}
                disabled={!tour.is_bookable}
                className="w-full py-4 rounded-2xl bg-sky-500 hover:bg-sky-600 text-white text-sm font-bold shadow-lg shadow-sky-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <span>Proceed to Book Passengers</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-2 text-[11px] text-slate-500">
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Instant Confirmation & Downloadable Digital Boarding Pass with QR code.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
