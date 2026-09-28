import React, { useState, useEffect } from 'react';
import { getCruises, CruiseFilterParams } from '../api/cruises';
import { Cruise } from '../api/types';
import { CruiseCard } from '../components/cruises/CruiseCard';
import { Search, Compass, SlidersHorizontal, RotateCcw } from 'lucide-react';

interface ExplorePageProps {
  initialFilterQuery?: string;
  onSelectCruise: (cruise: Cruise) => void;
  onBookCruise: (cruise: Cruise) => void;
}

export const ExplorePage: React.FC<ExplorePageProps> = ({
  initialFilterQuery,
  onSelectCruise,
  onBookCruise,
}) => {
  const [cruises, setCruises] = useState<Cruise[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [destination, setDestination] = useState('');
  const [category, setCategory] = useState('');
  const [duration, setDuration] = useState('');
  const [maxPrice, setMaxPrice] = useState<number>(1000);
  const [ordering, setOrdering] = useState('price_asc');
  const [selectedFacility, setSelectedFacility] = useState('');

  // Available filter options from server
  const [availableDestinations, setAvailableDestinations] = useState<string[]>([]);

  // Parse initial query params if supplied
  useEffect(() => {
    if (initialFilterQuery) {
      try {
        const parsed = JSON.parse(initialFilterQuery);
        if (parsed.destination) setDestination(parsed.destination);
        if (parsed.budget === 'VALUE') setMaxPrice(250);
        else if (parsed.budget === 'PREMIUM') setMaxPrice(450);
        if (parsed.duration === 'SHORT') setDuration('3');
        else if (parsed.duration === 'MEDIUM') setDuration('7');
        else if (parsed.duration === 'LONG') setDuration('10');
      } catch {
        setSearchTerm(initialFilterQuery);
      }
    }
  }, [initialFilterQuery]);

  const fetchCruises = () => {
    setLoading(true);
    const params: CruiseFilterParams = {
      q: searchTerm || undefined,
      destination: destination || undefined,
      category: category || undefined,
      duration: duration || undefined,
      max_price: maxPrice < 1000 ? maxPrice : undefined,
      ordering,
    };

    getCruises(params)
      .then((res) => {
        let list = res.cruises;
        if (selectedFacility) {
          list = list.filter((c) =>
            c.facilities?.some((f) => f.toLowerCase().includes(selectedFacility.toLowerCase()))
          );
        }
        setCruises(list);
        setTotalCount(list.length);
        if (res.filters?.destinations) {
          setAvailableDestinations(res.filters.destinations);
        }
      })
      .catch((err) => console.error('Error fetching cruises:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCruises();
  }, [searchTerm, destination, category, duration, maxPrice, ordering, selectedFacility]);

  const resetFilters = () => {
    setSearchTerm('');
    setDestination('');
    setCategory('');
    setDuration('');
    setMaxPrice(1000);
    setOrdering('price_asc');
    setSelectedFacility('');
  };

  return (
    <div className="min-h-screen pt-28 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 bg-[#f8fafc]">
      {/* Top Banner */}
      <div className="mb-8 space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-100 border border-sky-200 text-sky-800 text-xs font-bold uppercase tracking-wider">
          <Compass className="w-3.5 h-3.5 text-sky-600" />
          Global Fleet Discovery
        </div>
        <h1 className="text-3xl sm:text-5xl font-display font-extrabold text-slate-900 tracking-tight">
          Explore Cruise Ships & Liners
        </h1>
        <p className="text-slate-500 text-base max-w-2xl">
          Browse luxury liners, private yachts, and expedition vessels across every ocean. Filter by itinerary, stateroom tiers, and onboard dining.
        </p>
      </div>

      {/* Main Grid: Left Filters + Right Ship Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        {/* ============================================================ */}
        {/* LEFT FILTER SIDEBAR                                          */}
        {/* ============================================================ */}
        <aside className="lg:col-span-1 bg-white rounded-3xl p-6 border border-sky-100 shadow-lg space-y-6 lg:sticky lg:top-28">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h2 className="font-display font-bold text-lg text-slate-900 flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-sky-600" />
              Filter Fleet
            </h2>
            <button
              onClick={resetFilters}
              className="text-xs text-slate-500 hover:text-sky-700 flex items-center gap-1 cursor-pointer transition font-semibold"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          </div>

          {/* Search by Name / Keyword */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Vessel Name / Keyword
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search liner, port..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-slate-300 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-sky-500 transition"
              />
            </div>
          </div>

          {/* Destination */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Destination Sea / Region
            </label>
            <select
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-sm text-slate-800 focus:outline-none focus:border-sky-500 transition"
            >
              <option value="">All Destinations</option>
              {availableDestinations.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Vessel Category */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Vessel Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-sm text-slate-800 focus:outline-none focus:border-sky-500 transition"
            >
              <option value="">All Vessel Types</option>
              <option value="Luxury Ocean Cruise">Luxury Ocean Cruise</option>
              <option value="Mega Cruise Liner">Mega Cruise Liner</option>
              <option value="Expedition Cruise">Expedition Cruise</option>
              <option value="Private Charter Yacht">Private Charter Yacht</option>
              <option value="Island Hopper Cruise">Island Hopper Cruise</option>
            </select>
          </div>

          {/* Duration */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Voyage Duration
            </label>
            <select
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-sm text-slate-800 focus:outline-none focus:border-sky-500 transition"
            >
              <option value="">Any Length</option>
              <option value="3">3 Days (Getaway)</option>
              <option value="5">5 Days (Discovery)</option>
              <option value="7">7 Days (Full Week)</option>
              <option value="10">10 Days (Grand Tour)</option>
              <option value="14">14 Days (Transoceanic)</option>
            </select>
          </div>

          {/* Max Price Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold uppercase tracking-wider text-slate-700">Max Price / Day</span>
              <span className="font-mono font-bold text-amber-600">
                {maxPrice >= 1000 ? 'Any Budget' : `$${maxPrice}`}
              </span>
            </div>
            <input
              type="range"
              min="100"
              max="1000"
              step="25"
              value={maxPrice}
              onChange={(e) => setMaxPrice(parseInt(e.target.value))}
              className="w-full accent-sky-600 cursor-pointer"
            />
          </div>

          {/* Facilities Filter */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Onboard Amenities
            </label>
            <div className="flex flex-wrap gap-1.5">
              {['Spa', 'Helipad', 'Casino', 'Infinity Pool', 'Theater', 'Butler'].map((fac) => {
                const active = selectedFacility.toLowerCase() === fac.toLowerCase();
                return (
                  <button
                    key={fac}
                    type="button"
                    onClick={() => setSelectedFacility(active ? '' : fac)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                      active
                        ? 'bg-sky-100 border-sky-400 text-sky-800'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {fac}
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* ============================================================ */}
        {/* MAIN SHIPS GRID                                              */}
        {/* ============================================================ */}
        <main className="lg:col-span-3 space-y-6">
          {/* Top Sort & Count Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-sky-100 shadow-sm">
            <p className="text-sm text-slate-600 font-semibold">
              Showing <span className="font-bold text-sky-700">{totalCount}</span> available vessel{totalCount === 1 ? '' : 's'}
            </p>

            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-500 font-medium">Sort By:</span>
              <select
                value={ordering}
                onChange={(e) => setOrdering(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-sky-500 transition"
              >
                <option value="price_asc">Price: Lowest First</option>
                <option value="price_desc">Price: Highest Luxury</option>
                <option value="-rating">Guest Rating</option>
                <option value="duration_asc">Duration: Shortest</option>
                <option value="duration_desc">Duration: Longest</option>
              </select>
            </div>
          </div>

          {/* Cards Loading or Content */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map((n) => (
                <div
                  key={n}
                  className="h-96 rounded-3xl bg-slate-200/60 border border-slate-200 animate-pulse"
                />
              ))}
            </div>
          ) : cruises.length === 0 ? (
            <div className="text-center py-20 rounded-3xl bg-white border border-sky-100 shadow-sm space-y-4">
              <Compass className="w-12 h-12 text-slate-400 mx-auto" />
              <h3 className="text-xl font-display font-bold text-slate-800">No Vessels Match Your Filters</h3>
              <p className="text-slate-500 text-sm max-w-sm mx-auto">
                Try widening your price range, clearing amenities, or picking 'All Destinations'.
              </p>
              <button
                onClick={resetFilters}
                className="px-5 py-2 rounded-xl bg-sky-100 border border-sky-300 text-sky-800 text-xs font-bold hover:bg-sky-200 transition cursor-pointer"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {cruises.map((cruise) => (
                <CruiseCard
                  key={cruise.id}
                  cruise={cruise}
                  onSelect={onSelectCruise}
                  onBookNow={onBookCruise}
                />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
