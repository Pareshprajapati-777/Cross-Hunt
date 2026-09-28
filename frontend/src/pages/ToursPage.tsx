import React, { useState, useEffect } from 'react';
import { getTours } from '../api/tours';
import { PublicTour } from '../api/types';
import { Compass, Calendar, Clock, MapPin, ArrowRight, ShieldCheck, Waves } from 'lucide-react';
import { formatINR } from '../utils/currency';

interface ToursPageProps {
  onSelectTour: (tour: PublicTour) => void;
  onBookTour: (tour: PublicTour) => void;
}

export const ToursPage: React.FC<ToursPageProps> = ({ onSelectTour, onBookTour }) => {
  const [tours, setTours] = useState<PublicTour[]>([]);
  const [loading, setLoading] = useState(true);
  const [destinationFilter, setDestinationFilter] = useState('');
  const [portFilter, setPortFilter] = useState('');

  useEffect(() => {
    setLoading(true);
    getTours({
      destination: destinationFilter || undefined,
      departure_port: portFilter || undefined,
    })
      .then((res) => {
        setTours(res.tours);
      })
      .catch((err) => console.error('Error fetching public tours:', err))
      .finally(() => setLoading(false));
  }, [destinationFilter, portFilter]);

  return (
    <div className="min-h-screen bg-slate-50/70 pt-28 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header Banner */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-sky-50 border border-sky-200/60 text-sky-800 text-xs font-bold uppercase tracking-wider mb-4">
            <Waves className="w-3.5 h-3.5 text-sky-600 animate-pulse" />
            <span>Product B — Public Scheduled Departures</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight font-serif mb-4">
            Upcoming Public Cruise Tours
          </h1>
          <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
            Reserve individual passenger staterooms on scheduled luxury voyages across the Arabian Sea,
            Malabar Coast, and Andaman Archipelago. All gourmet meals, deck parties, and port excursions included.
          </p>
        </div>

        {/* Filter Bar */}
        <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-200/80 mb-10 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-slate-50 border border-slate-200/60 text-xs font-bold text-slate-700">
              <MapPin className="w-4 h-4 text-sky-500" />
              <span>Port:</span>
              <select
                value={portFilter}
                onChange={(e) => setPortFilter(e.target.value)}
                className="bg-transparent text-slate-900 font-semibold outline-none cursor-pointer"
              >
                <option value="">All Ports</option>
                <option value="Mumbai">Mumbai</option>
                <option value="Goa">Goa</option>
                <option value="Kochi">Kochi</option>
                <option value="Port Blair">Port Blair</option>
              </select>
            </div>

            <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-slate-50 border border-slate-200/60 text-xs font-bold text-slate-700">
              <Compass className="w-4 h-4 text-sky-500" />
              <span>Destination:</span>
              <select
                value={destinationFilter}
                onChange={(e) => setDestinationFilter(e.target.value)}
                className="bg-transparent text-slate-900 font-semibold outline-none cursor-pointer"
              >
                <option value="">All Destinations</option>
                <option value="Goa">Goa</option>
                <option value="Lakshadweep">Lakshadweep</option>
                <option value="Karnataka">Karnataka Coastal</option>
                <option value="Andaman">Andaman Islands</option>
              </select>
            </div>
          </div>

          <div className="text-xs font-bold text-slate-500">
            Showing <span className="text-slate-900 font-black">{tours.length}</span> scheduled departures
          </div>
        </div>

        {/* Tours Grid */}
        {loading ? (
          <div className="py-24 text-center">
            <div className="w-12 h-12 mx-auto border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-xs font-bold uppercase tracking-widest text-slate-400">Loading Scheduled Departures...</p>
          </div>
        ) : tours.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-3xl border border-slate-200/80 p-8">
            <Compass className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <h3 className="text-lg font-bold text-slate-800">No scheduled departures match your filter</h3>
            <p className="text-xs text-slate-500 mt-1">Try resetting your embarkation port or destination filters.</p>
            <button
              onClick={() => { setPortFilter(''); setDestinationFilter(''); }}
              className="mt-4 px-4 py-2 rounded-xl bg-sky-500 text-white text-xs font-bold hover:bg-sky-600 transition"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {tours.map((tour) => {
              const isLowCapacity = tour.remaining_capacity <= 20;
              return (
                <div
                  key={tour.id}
                  className="group bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-sm hover:shadow-xl hover:border-sky-300 transition-all duration-300 flex flex-col justify-between"
                >
                  {/* Image & Status Badge */}
                  <div className="relative h-56 overflow-hidden">
                    <img
                      src={tour.ship_image || 'https://images.unsplash.com/photo-1548574505-5e239809ee19?auto=format&fit=crop&w=800&q=80'}
                      alt={tour.tour_title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-black/20" />

                    <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
                      <span className="px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-white text-[10px] font-black tracking-wider uppercase border border-white/20">
                        {tour.ship_name}
                      </span>
                      <span
                        className={`px-3 py-1 rounded-full text-[10px] font-black tracking-wider uppercase border backdrop-blur-md ${
                          isLowCapacity
                            ? 'bg-rose-500/90 text-white border-rose-400'
                            : 'bg-emerald-500/90 text-white border-emerald-400'
                        }`}
                      >
                        {tour.remaining_capacity} Seats Left
                      </span>
                    </div>

                    <div className="absolute bottom-4 left-4 right-4 text-white">
                      <div className="text-xs font-semibold text-sky-300 flex items-center gap-1.5 mb-1">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>{tour.departure_port} → {tour.destination}</span>
                      </div>
                      <h3 className="text-base font-bold leading-snug line-clamp-1 font-serif">
                        {tour.tour_title}
                      </h3>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-6 flex-1 flex flex-col justify-between space-y-5">
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-2xl border border-slate-100">
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <Calendar className="w-3.5 h-3.5 text-sky-500" />
                          <span>{tour.departure_date}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <Clock className="w-3.5 h-3.5 text-sky-500" />
                          <span>{tour.duration_days} Days Voyage</span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {tour.itinerary || tour.meals_included}
                      </p>

                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                        <span>{tour.meals_included}</span>
                      </div>
                    </div>

                    {/* Price & Actions */}
                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Fare per adult</div>
                        <div className="text-xl font-black text-slate-900">{formatINR(tour.adult_price)}</div>
                        <div className="text-[10px] text-slate-400">Child: {formatINR(tour.child_price)}</div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onSelectTour(tour)}
                          className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                        >
                          Itinerary
                        </button>
                        <button
                          onClick={() => onBookTour(tour)}
                          disabled={!tour.is_bookable}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold shadow-sm shadow-sky-500/20 transition cursor-pointer disabled:opacity-50"
                        >
                          <span>Book Ticket</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
