import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getTours } from '../api/tours';
import { PublicTour } from '../api/types';
import { Compass, Calendar, Clock, MapPin, ArrowRight, ShieldCheck, Waves, Ticket, Building2, AlertTriangle } from 'lucide-react';
import { formatINR } from '../utils/currency';

interface ToursPageProps {
  onSelectTour: (tour: PublicTour) => void;
  onBookTour: (tour: PublicTour) => void;
}

export const ToursPage: React.FC<ToursPageProps> = ({ onSelectTour, onBookTour }) => {
  const [searchParams] = useSearchParams();
  const [tours, setTours] = useState<PublicTour[]>([]);
  const [loading, setLoading] = useState(true);
  const [destinationFilter, setDestinationFilter] = useState(searchParams.get('destination') || '');
  const [portFilter, setPortFilter] = useState(searchParams.get('departure_port') || '');

  useEffect(() => {
    const dest = searchParams.get('destination');
    const port = searchParams.get('departure_port');
    if (dest) setDestinationFilter(dest);
    if (port) setPortFilter(port);
  }, [searchParams]);

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

  const renderStatusBadge = (status: string, remaining: number) => {
    if (status === 'SOLDOUT' || remaining <= 0) {
      return (
        <span className="px-2.5 py-1 rounded-full bg-rose-600 text-white text-[10px] font-black uppercase tracking-wider">
          Sold Out
        </span>
      );
    }
    if (status === 'WEATHER_HOLD') {
      return (
        <span className="px-2.5 py-1 rounded-full bg-amber-600 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          Weather Hold
        </span>
      );
    }
    if (status === 'CANCELLED') {
      return (
        <span className="px-2.5 py-1 rounded-full bg-slate-600 text-white text-[10px] font-black uppercase tracking-wider">
          Cancelled
        </span>
      );
    }
    if (remaining <= 20) {
      return (
        <span className="px-2.5 py-1 rounded-full bg-amber-500 text-white text-[10px] font-black uppercase tracking-wider shadow-sm">
          {remaining} Seats Left
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded-full bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider shadow-sm">
        Available
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50/70 pt-28 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header Banner */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-sky-50 border border-sky-200/60 text-sky-800 text-xs font-bold uppercase tracking-wider mb-4">
            <Waves className="w-3.5 h-3.5 text-sky-600 animate-pulse" />
            <span>Public Cruise & Tour Inventory</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight font-serif mb-4">
            Scheduled Public Cruises & Tours
          </h1>
          <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
            Book individual cabin tickets and passenger passes across verified Indian routes:
            Cordelia multi-night trips, Mandovi river dinner cruises, Kochi harbour trips, and Andaman island ferries.
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
                <option value="">All Departure Ports</option>
                <option value="Mumbai">Mumbai</option>
                <option value="Kochi">Kochi</option>
                <option value="Panaji">Panaji / Goa</option>
                <option value="Port Blair">Port Blair</option>
                <option value="Swaraj Dweep">Swaraj Dweep</option>
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
                <option value="Maldives">Maldives & Sri Lanka</option>
                <option value="Mandovi River">Mandovi River</option>
                <option value="Cochin Harbour">Cochin Harbour</option>
                <option value="Swaraj Dweep">Swaraj Dweep / Havelock</option>
              </select>
            </div>
          </div>

          <div className="text-xs font-bold text-slate-500">
            Showing <span className="text-slate-900 font-black">{tours.length}</span> verified sailings
          </div>
        </div>

        {/* Tours Grid */}
        {loading ? (
          <div className="py-24 text-center">
            <div className="w-12 h-12 mx-auto border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-xs font-bold uppercase tracking-widest text-slate-400">Loading Scheduled Sailings...</p>
          </div>
        ) : tours.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-3xl border border-slate-200/80 p-8">
            <Compass className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <h3 className="text-lg font-bold text-slate-800">No scheduled departures match your filter</h3>
            <p className="text-xs text-slate-500 mt-1">Try resetting your departure port or destination filters.</p>
            <button
              onClick={() => { setPortFilter(''); setDestinationFilter(''); }}
              className="mt-4 px-4 py-2 rounded-xl bg-sky-500 text-white text-xs font-bold hover:bg-sky-600 transition cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {tours.map((tour) => {
              return (
                <div
                  key={tour.id}
                  className="group bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-sm hover:shadow-xl hover:border-sky-300 transition-all duration-300 flex flex-col justify-between"
                >
                  {/* Image & Status Badge */}
                  <div className="relative h-56 overflow-hidden bg-slate-100">
                    <img
                      src={tour.tour_image || tour.ship_image || tour.image_url || '/static/images/placeholder.png'}
                      alt={tour.tour_title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => {
                        const target = e.currentTarget;
                        if (!target.src.includes('placeholder.png')) {
                          target.src = '/static/images/placeholder.png';
                        }
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-900/20 to-black/10" />

                    {/* Top Badges */}
                    <div className="absolute top-3.5 left-3.5 right-3.5 flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-2.5 py-1 rounded-full bg-emerald-600/90 text-white text-[10px] font-black tracking-wider uppercase border border-emerald-400/50 shadow-sm">
                          PUBLIC
                        </span>
                        <span className="px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-sky-200 text-[10px] font-black uppercase tracking-wider border border-sky-300/30">
                          PER PERSON
                        </span>
                      </div>
                      {renderStatusBadge(tour.status, tour.remaining_capacity)}
                    </div>

                    {/* Bottom Info Banner */}
                    <div className="absolute bottom-3.5 left-3.5 right-3.5 text-white">
                      <div className="text-xs font-semibold text-sky-300 flex items-center gap-1.5 mb-0.5">
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{tour.departure_port} → {tour.destination}</span>
                      </div>
                      <h3 className="text-base font-bold leading-snug line-clamp-1 font-serif text-white group-hover:text-sky-200 transition-colors">
                        {tour.tour_title}
                      </h3>
                      {tour.operator_name && (
                        <div className="flex items-center gap-1 text-[11px] text-slate-300 mt-0.5">
                          <Building2 className="w-3 h-3 text-sky-400 shrink-0" />
                          <span className="truncate">{tour.operator_name}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-3">
                      {/* Date & Duration Info */}
                      <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
                        <div className="flex items-center gap-1.5 text-slate-700 font-semibold truncate">
                          <Calendar className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                          <span className="truncate">{tour.departure_date}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-700 font-semibold truncate">
                          <Clock className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                          <span className="truncate">{tour.duration_display || `${tour.duration_days} Days`}</span>
                        </div>
                      </div>

                      {/* Inclusions & Itinerary Highlights */}
                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                        {tour.itinerary || tour.meals_included}
                      </p>

                      <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px] font-bold">
                        {tour.meals_included && (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                            {tour.meals_included}
                          </span>
                        )}

                        {tour.tax_note ? (
                          <span className="px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-800">
                            {tour.tax_note}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-600">
                            GST extra
                          </span>
                        )}

                        {tour.source_checked && (
                          <span className="px-2 py-0.5 rounded-md bg-sky-50 border border-sky-200 text-sky-800">
                            Verified Source
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Price & Actions */}
                    <div className="pt-3.5 border-t border-slate-100 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {tour.is_live_pricing ? 'Fares From' : 'Fare per ticket'}
                        </div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-xl font-black text-sky-900">{formatINR(tour.adult_price)}</span>
                          <span className="text-xs font-bold text-slate-600">/ person</span>
                        </div>
                        {tour.is_live_pricing && (
                          <div className="text-[10px] text-amber-700 font-semibold">Varies by sailing / cabin</div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => onSelectTour(tour)}
                          className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                        >
                          Details
                        </button>
                        <button
                          onClick={() => onBookTour(tour)}
                          disabled={!tour.is_bookable || tour.status === 'SOLDOUT'}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-sm shadow-sky-600/20 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Ticket className="w-3.5 h-3.5" />
                          <span>Book Ticket</span>
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
