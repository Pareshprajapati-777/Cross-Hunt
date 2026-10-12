import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getCruises, matchShips, CruiseFilterParams } from '../api/cruises';
import { Cruise } from '../api/types';
import { CruiseCard } from '../components/cruises/CruiseCard';
import { Search, Compass, SlidersHorizontal, RotateCcw, Sparkles, CheckCircle2, AlertCircle, Anchor, Filter } from 'lucide-react';
import { formatINR } from '../utils/currency';

interface ExplorePageProps {
  initialFilterQuery?: string;
  onSelectCruise: (cruise: Cruise) => void;
  onBookCruise: (cruise: Cruise) => void;
}

const CONTROLLED_CATEGORIES = [
  { id: '', label: 'All Controlled Categories' },
  { id: 'YACHT', label: 'Private Yacht' },
  { id: 'BOAT', label: 'Boat / Speedboat' },
  { id: 'PARTY_BOAT', label: 'Party Boat' },
  { id: 'RIVER_CRUISE', label: 'River Cruise Ship' },
  { id: 'SEA_CRUISE', label: 'Sea Cruise Liner' },
  { id: 'FERRY', label: 'Inter-Island Ferry' },
  { id: 'PASSENGER_CRUISE_SHIP', label: 'Passenger Cruise Ship' },
];

const CITIES = [
  { id: '', label: 'All Cities & Regions' },
  { id: 'Goa', label: 'Goa' },
  { id: 'Andaman', label: 'Andaman & Nicobar' },
  { id: 'Kochi', label: 'Kochi / Kerala' },
  { id: 'Mumbai', label: 'Mumbai' },
  { id: 'Lakshadweep', label: 'Lakshadweep' },
];

export const ExplorePage: React.FC<ExplorePageProps> = ({
  initialFilterQuery,
  onSelectCruise,
  onBookCruise,
}) => {
  const [searchParams] = useSearchParams();
  const [cruises, setCruises] = useState<Cruise[]>([]);
  const [exactMatches, setExactMatches] = useState<Cruise[]>([]);
  const [closeAlternatives, setCloseAlternatives] = useState<Cruise[]>([]);
  const [isRequirementMode, setIsRequirementMode] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [city, setCity] = useState('');
  const [listingType, setListingType] = useState('PRIVATE_CHARTER');
  const [vesselCategory, setVesselCategory] = useState('');
  const [duration, setDuration] = useState('');
  const [maxPrice, setMaxPrice] = useState<number>(300000);
  const [ordering, setOrdering] = useState('popular');
  const [availableDestinations, setAvailableDestinations] = useState<string[]>([]);

  // Unified query params handling
  useEffect(() => {
    const rawQuery = initialFilterQuery || searchParams.get('query') || searchParams.get('q');
    const dest = searchParams.get('destination') || searchParams.get('dest');
    const cat = searchParams.get('category') || searchParams.get('vessel_category');
    const type = searchParams.get('listing_type');

    if (dest) setCity(dest);
    if (cat) setVesselCategory(cat);
    if (type) setListingType(type);

    if (rawQuery) {
      try {
        const parsed = JSON.parse(rawQuery);
        if (parsed.search_mode || parsed.purpose || parsed.city) {
          setIsRequirementMode(true);
          setLoading(true);

          if (parsed.city) setCity(parsed.city);
          if (parsed.vessel_category) setVesselCategory(parsed.vessel_category);
          if (parsed.search_mode) setListingType(parsed.search_mode);

          matchShips({
            search_mode: parsed.search_mode || 'PRIVATE_CHARTER',
            purpose: parsed.purpose || 'PRIVATE_CHARTER',
            guests: parsed.passengers || parsed.guests || 10,
            city: parsed.city || '',
            location: parsed.city || parsed.destination || '',
            duration: parsed.duration ? parseInt(parsed.duration) : undefined,
            vessel_category: parsed.vessel_category,
            date: parsed.departureDate,
          })
            .then((res) => {
              setExactMatches(res.exact_matches || []);
              setCloseAlternatives(res.close_alternatives || []);
              setCruises(res.results || []);
              setTotalCount(res.results ? res.results.length : 0);
            })
            .catch((err) => {
              console.error('Match engine error:', err);
              fetchCruises();
            })
            .finally(() => setLoading(false));
          return;
        }
      } catch {
        setSearchTerm(rawQuery);
      }
    }
    fetchCruises();
  }, [initialFilterQuery, searchParams]);

  const fetchCruises = () => {
    setLoading(true);
    setIsRequirementMode(false);
    const params: CruiseFilterParams = {
      q: searchTerm || undefined,
      city: city || undefined,
      destination: city || undefined,
      vessel_category: vesselCategory || undefined,
      category: vesselCategory || undefined,
      listing_type: listingType || undefined,
      duration: duration || undefined,
      max_price: maxPrice < 300000 ? maxPrice : undefined,
      sort_by: ordering,
    };

    getCruises(params)
      .then((res) => {
        setCruises(res.cruises);
        setTotalCount(res.cruises.length);
        if (res.destinations) {
          setAvailableDestinations(res.destinations);
        }
      })
      .catch((err) => console.error('Error fetching cruises:', err))
      .finally(() => setLoading(false));
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setCity('');
    setListingType('');
    setVesselCategory('');
    setDuration('');
    setMaxPrice(300000);
    setOrdering('popular');
    setIsRequirementMode(false);
    fetchCruises();
  };

  return (
    <div className="min-h-screen pt-28 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 bg-slate-50/70">
      {/* Page Title & Breadcrumb Header */}
      <div className="mb-10 text-center max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 border border-sky-300 text-sky-800 text-xs font-bold uppercase tracking-wider mb-2">
          <Anchor className="w-3.5 h-3.5 text-sky-600" />
          Verified Boats & Ships
        </div>
        <h1 className="text-3xl sm:text-5xl font-display font-black text-slate-900 tracking-tight mt-1 font-serif">
          {isRequirementMode ? 'Matching Ships & Boats' : 'Explore Ships & Private Boats'}
        </h1>
        <p className="text-slate-500 text-xs sm:text-sm mt-2">
          {isRequirementMode
            ? 'Found matching boats and ships based on your group size, budget, and trip requirements.'
            : 'Browse verified private yachts, catamarans, party boats, and cruise trips across Goa, Andaman, Kochi, and Mumbai.'}
        </p>
      </div>

      {/* Main Container: Sidebar Filters + Ship Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* ============================================================ */}
        {/* LEFT COLUMN: FILTERS & SEARCH CONTROLS                       */}
        {/* ============================================================ */}
        <aside className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-display font-bold text-sm text-slate-900 flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-sky-600" />
                Filter Fleet
              </h3>
              <button
                onClick={handleResetFilters}
                className="text-[11px] text-slate-400 hover:text-slate-900 font-bold flex items-center gap-1 transition cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
            </div>

            {/* Keyword Search */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Search Ships & Operators</label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="e.g. Navora, Andaman Yacht, Kochi..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-sky-500 transition"
                />
              </div>
            </div>

            {/* Listing Type: Private vs All */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Listing Product</label>
              <select
                value={listingType}
                onChange={(e) => setListingType(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-sky-500 transition font-medium"
              >
                <option value="">All Inventory</option>
                <option value="PRIVATE_CHARTER">Private Charter (Whole Boat)</option>
                <option value="PUBLIC_CRUISE">Public Cruise (Shared Ticket)</option>
              </select>
            </div>

            {/* Controlled Ship Category */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Ship Category</label>
              <select
                value={vesselCategory}
                onChange={(e) => setVesselCategory(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-sky-500 transition font-medium"
              >
                {CONTROLLED_CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* City / Destination */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">City / Base Port</label>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-sky-500 transition font-medium"
              >
                {CITIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Apply Action */}
            <button
              onClick={fetchCruises}
              className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-sm transition cursor-pointer"
            >
              Apply Filter
            </button>
          </div>
        </aside>

        {/* ============================================================ */}
        {/* RIGHT COLUMN: CRUISE RESULTS GRID                            */}
        {/* ============================================================ */}
        <main className="lg:col-span-3 space-y-6">
          <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200/80 text-xs">
            <span className="text-slate-500 font-bold">
              Showing <span className="text-slate-900 font-black">{totalCount}</span> verified vessels
            </span>
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-semibold">Sort by:</span>
              <select
                value={ordering}
                onChange={(e) => setOrdering(e.target.value)}
                className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer"
              >
                <option value="popular">Most Popular</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="capacity_desc">Capacity: Highest</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="py-24 text-center">
              <div className="w-12 h-12 mx-auto border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-4 text-xs font-bold uppercase tracking-widest text-slate-400">Filtering database fleet...</p>
            </div>
          ) : cruises.length === 0 ? (
            <div className="py-20 text-center bg-white rounded-3xl border border-slate-200/80 p-8">
              <Compass className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <h3 className="text-lg font-bold text-slate-800">No vessels match your active filters</h3>
              <p className="text-xs text-slate-500 mt-1">Try resetting city, category, or listing type filters.</p>
              <button
                onClick={handleResetFilters}
                className="mt-4 px-4 py-2 rounded-xl bg-sky-500 text-white text-xs font-bold hover:bg-sky-600 transition cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {cruises.map((c) => (
                <CruiseCard
                  key={c.id}
                  cruise={c}
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
