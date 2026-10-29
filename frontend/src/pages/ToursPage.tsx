import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getTours } from '../api/tours';
import { PublicTour } from '../api/types';
import {
  Compass,
  Calendar,
  Clock,
  MapPin,
  ArrowRight,
  ShieldCheck,
  Waves,
  Ticket,
  Building2,
  AlertTriangle,
  Search,
  X,
  RotateCcw,
  ArrowUpDown,
  ChevronDown
} from 'lucide-react';
import { formatINR } from '../utils/currency';
import { getTourImageUrl } from '../utils/images';

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
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [debouncedSearch, setDebouncedSearch] = useState(searchParams.get('q') || '');
  const [sortBy, setSortBy] = useState('date_asc');

  useEffect(() => {
    const dest = searchParams.get('destination');
    const port = searchParams.get('departure_port');
    const q = searchParams.get('q');
    if (dest) setDestinationFilter(dest);
    if (port) setPortFilter(port);
    if (q) {
      setSearchQuery(q);
      setDebouncedSearch(q);
    }
  }, [searchParams]);

  // Debounce search query input to avoid spamming the backend
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    setLoading(true);
    getTours({
      destination: destinationFilter || undefined,
      departure_port: portFilter || undefined,
      q: debouncedSearch.trim() || undefined,
      sort_by: sortBy || undefined,
    })
      .then((res) => {
        setTours(res.tours);
      })
      .catch((err) => console.error('Error fetching public tours:', err))
      .finally(() => setLoading(false));
  }, [destinationFilter, portFilter, debouncedSearch, sortBy]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setDebouncedSearch('');
    setPortFilter('');
    setDestinationFilter('');
    setSortBy('date_asc');
  };

  const hasActiveFilters = Boolean(
    destinationFilter || portFilter || searchQuery.trim() || sortBy !== 'date_asc'
  );

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
    if (status === 'COMPLETED') {
      return (
        <span className="px-2.5 py-1 rounded-full bg-slate-500 text-white text-[10px] font-black uppercase tracking-wider">
          Completed
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
    <div className="min-h-screen bg-[#f8f9fa] text-[#051833] pt-28 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header Banner */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <h1 className="text-3xl sm:text-5xl font-black text-[#051833] tracking-tight font-serif mb-4 text-stroke-dark">
            Scheduled Public Cruises & Tours
          </h1>
          <p className="text-slate-600 text-sm sm:text-base leading-relaxed font-medium">
            Book individual cabin tickets and passenger passes across verified Indian routes:
            Cordelia multi-night trips, Mandovi river dinner cruises, Kochi harbour trips, and Andaman island ferries.
          </p>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl shadow-xl border border-[#0284c7]/20 mb-8 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Left Controls: Search + Port + Destination + Sort */}
            <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
              {/* Search Box */}
              <div className="relative min-w-[200px] sm:min-w-[240px] flex-1">
                <Search className="w-4 h-4 text-[#0284c7]/60 absolute left-3.5 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search tours, ships, or ports..."
                  className="w-full pl-9 pr-8 py-2 rounded-2xl bg-[#f8f9fa] border border-slate-200 text-xs font-semibold text-[#051833] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0284c7]/30 focus:border-[#0284c7] transition"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-rose-500 transition cursor-pointer"
                    title="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Port Filter Dropdown */}
              <div className="relative flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-[#f8f9fa] border border-slate-200 text-xs font-bold text-slate-700 hover:border-[#0284c7]/50 focus-within:ring-2 focus-within:ring-[#0284c7]/30 focus-within:border-[#0284c7] transition">
                <MapPin className="w-4 h-4 text-[#0284c7] shrink-0" />
                <span className="text-slate-500 font-medium">Port:</span>
                <select
                  value={portFilter}
                  onChange={(e) => setPortFilter(e.target.value)}
                  className="appearance-none bg-transparent text-[#051833] font-semibold text-xs border-0 outline-none focus:outline-none focus:ring-0 focus-visible:outline-none cursor-pointer pr-5 py-0"
                >
                  <option value="" className="bg-white">All Departure Ports</option>
                  <option value="Panaji" className="bg-white">Panaji / Goa</option>
                  <option value="Mumbai" className="bg-white">Mumbai</option>
                  <option value="Kochi" className="bg-white">Kochi</option>
                  <option value="Port Blair" className="bg-white">Port Blair (Andaman)</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
              </div>

              {/* Destination Filter Dropdown */}
              <div className="relative flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-[#f8f9fa] border border-slate-200 text-xs font-bold text-slate-700 hover:border-[#0284c7]/50 focus-within:ring-2 focus-within:ring-[#0284c7]/30 focus-within:border-[#0284c7] transition">
                <Compass className="w-4 h-4 text-[#0284c7] shrink-0" />
                <span className="text-slate-500 font-medium">Destination:</span>
                <select
                  value={destinationFilter}
                  onChange={(e) => setDestinationFilter(e.target.value)}
                  className="appearance-none bg-transparent text-[#051833] font-semibold text-xs border-0 outline-none focus:outline-none focus:ring-0 focus-visible:outline-none cursor-pointer pr-5 py-0"
                >
                  <option value="" className="bg-white">All Destinations</option>
                  <option value="Goa" className="bg-white">Mandovi River & Goa</option>
                  <option value="Swaraj Dweep" className="bg-white">Swaraj Dweep / Havelock</option>
                  <option value="Kochi" className="bg-white">Kochi Harbour & Coastal</option>
                  <option value="Lakshadweep" className="bg-white">Lakshadweep Islands</option>
                  <option value="Mumbai" className="bg-white">Mumbai & High Seas</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
              </div>

              {/* Sort Order Dropdown */}
              <div className="relative flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-[#f8f9fa] border border-slate-200 text-xs font-bold text-slate-700 hover:border-[#0284c7]/50 focus-within:ring-2 focus-within:ring-[#0284c7]/30 focus-within:border-[#0284c7] transition">
                <ArrowUpDown className="w-3.5 h-3.5 text-[#0284c7] shrink-0" />
                <span className="text-slate-500 font-medium">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="appearance-none bg-transparent text-[#051833] font-semibold text-xs border-0 outline-none focus:outline-none focus:ring-0 focus-visible:outline-none cursor-pointer pr-5 py-0"
                >
                  <option value="date_asc" className="bg-white">Departure: Earliest</option>
                  <option value="price_asc" className="bg-white">Price: Low to High</option>
                  <option value="price_desc" className="bg-white">Price: High to Low</option>
                  <option value="seats_desc" className="bg-white">Seats: Most Available</option>
                  <option value="duration_desc" className="bg-white">Duration: Longest</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {/* Right: Count and Reset button */}
            <div className="flex items-center gap-3 shrink-0 ml-auto">
              <div className="text-xs font-bold text-slate-600">
                Showing <span className="text-[#0284c7] font-black">{tours.length}</span> verified sailings
              </div>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                  title="Reset all filters"
                >
                  <RotateCcw className="w-3 h-3 text-slate-500" />
                  <span>Reset</span>
                </button>
              )}
            </div>
          </div>

          {/* Active Filter Chips */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active:</span>
              {searchQuery.trim() && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-50 border border-sky-200 text-sky-800 text-[11px] font-semibold">
                  <span>"{searchQuery.trim()}"</span>
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="hover:text-rose-600 transition cursor-pointer"
                    title="Remove keyword filter"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {portFilter && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-50 border border-sky-200 text-sky-800 text-[11px] font-semibold">
                  <span>Port: {portFilter === 'Panaji' ? 'Panaji / Goa' : portFilter === 'Port Blair' ? 'Port Blair (Andaman)' : portFilter}</span>
                  <button
                    type="button"
                    onClick={() => setPortFilter('')}
                    className="hover:text-rose-600 transition cursor-pointer"
                    title="Remove port filter"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {destinationFilter && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-50 border border-sky-200 text-sky-800 text-[11px] font-semibold">
                  <span>Dest: {destinationFilter === 'Goa' ? 'Goa / Mandovi' : destinationFilter === 'Swaraj Dweep' ? 'Swaraj Dweep / Havelock' : destinationFilter}</span>
                  <button
                    type="button"
                    onClick={() => setDestinationFilter('')}
                    className="hover:text-rose-600 transition cursor-pointer"
                    title="Remove destination filter"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {sortBy !== 'date_asc' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-50 border border-sky-200 text-sky-800 text-[11px] font-semibold">
                  <span>Sort: {sortBy === 'price_asc' ? 'Price: Low-High' : sortBy === 'price_desc' ? 'Price: High-Low' : sortBy === 'seats_desc' ? 'Most Seats' : 'Duration'}</span>
                  <button
                    type="button"
                    onClick={() => setSortBy('date_asc')}
                    className="hover:text-rose-600 transition cursor-pointer"
                    title="Reset sort to earliest date"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Tours Grid */}
        {loading ? (
          <div className="py-24 text-center">
            <div className="w-12 h-12 mx-auto border-4 border-[#0284c7] border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-xs font-bold uppercase tracking-widest text-[#0284c7]">Loading Scheduled Sailings...</p>
          </div>
        ) : tours.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-3xl border border-[#0284c7]/20 p-8 shadow-sm">
            <Compass className="w-12 h-12 mx-auto text-[#0284c7]/50 mb-3" />
            <h3 className="text-lg font-bold text-[#051833]">No scheduled departures match your filter</h3>
            <p className="text-xs text-slate-500 mt-1">Try resetting your departure port, destination, or search query.</p>
            <button
              onClick={handleResetFilters}
              className="mt-4 px-4 py-2 rounded-xl bg-[#051833] hover:bg-[#0a2548] text-[#fff8dc] text-xs font-black transition cursor-pointer shadow-md shadow-[#051833]/15"
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
                  className="group bg-white rounded-3xl border border-[#0284c7]/20 overflow-hidden shadow-md hover:shadow-xl hover:border-[#0284c7]/60 transition-all duration-300 flex flex-col justify-between"
                >
                  {/* Image & Status Badge */}
                  <div className="relative h-56 overflow-hidden bg-slate-100">
                    <img
                      src={getTourImageUrl(tour.tour_image || tour.ship_image || tour.image_url)}
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
                    <div className="absolute inset-0 bg-gradient-to-t from-[#051833]/90 via-[#051833]/25 to-transparent" />

                    {/* Top Badges */}
                    <div className="absolute top-3.5 left-3.5 right-3.5 flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-2.5 py-1 rounded-full bg-emerald-600/95 text-white text-[10px] font-black tracking-wider uppercase border border-emerald-400/50 shadow-sm">
                          PUBLIC
                        </span>
                        <span className="px-2.5 py-1 rounded-full bg-white/95 backdrop-blur-md text-[#0284c7] text-[10px] font-black uppercase tracking-wider border border-[#0284c7]/20 shadow-sm">
                          PER PERSON
                        </span>
                      </div>
                      {renderStatusBadge(tour.status, tour.remaining_capacity)}
                    </div>

                    {/* Bottom Info Banner */}
                    <div className="absolute bottom-3.5 left-3.5 right-3.5 text-white">
                      <div className="text-xs font-semibold text-sky-300 flex items-center gap-1.5 mb-0.5 text-stroke-white-subtle">
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{tour.departure_port} → {tour.destination}</span>
                      </div>
                      <h3 className="text-base font-bold leading-snug line-clamp-1 font-serif text-white group-hover:text-sky-200 transition-colors text-stroke-white">
                        {tour.tour_title}
                      </h3>
                      {tour.operator_name && (
                        <div className="flex items-center gap-1 text-[11px] text-slate-200 mt-0.5 text-stroke-white-subtle">
                          <Building2 className="w-3 h-3 text-sky-300 shrink-0" />
                          <span className="truncate">{tour.operator_name}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-3">
                      {/* Date & Duration Info */}
                      <div className="grid grid-cols-2 gap-2 text-xs bg-[#f8f9fa] p-2.5 rounded-2xl border border-slate-200">
                        <div className="flex items-center gap-1.5 text-slate-700 font-semibold truncate">
                          <Calendar className="w-3.5 h-3.5 text-[#0284c7] shrink-0" />
                          <span className="truncate">{tour.departure_date}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-700 font-semibold truncate">
                          <Clock className="w-3.5 h-3.5 text-[#0284c7] shrink-0" />
                          <span className="truncate">{tour.duration_display || `${tour.duration_days} Days`}</span>
                        </div>
                      </div>

                      {/* Inclusions & Itinerary Highlights */}
                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed font-medium">
                        {tour.itinerary || tour.meals_included}
                      </p>

                      {tour.tax_note && (
                        <p className="text-[11px] text-slate-500 font-medium pt-0.5">
                          • {tour.tax_note}
                        </p>
                      )}
                    </div>

                    {/* Price & Actions */}
                    <div className="pt-3.5 border-t border-slate-100 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          {tour.is_live_pricing ? 'Fares From' : 'Fare per ticket'}
                        </div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-xl font-black text-[#051833] font-mono-numbers">{formatINR(tour.adult_price)}</span>
                          <span className="text-xs font-bold text-slate-500">/ person</span>
                        </div>
                        {tour.is_live_pricing && (
                          <div className="text-[10px] text-[#0284c7] font-semibold">Varies by sailing / cabin</div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => onSelectTour(tour)}
                          className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-[#051833] hover:bg-slate-50 transition cursor-pointer shadow-sm"
                        >
                          Details
                        </button>
                        <button
                          onClick={() => onBookTour(tour)}
                          disabled={!tour.is_bookable || tour.status === 'SOLDOUT'}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#051833] hover:bg-[#0a2548] text-[#fff8dc] text-xs font-black shadow-md shadow-[#051833]/15 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
