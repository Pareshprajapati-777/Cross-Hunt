import React, { useState, useEffect } from 'react';
import { getCruises, matchShips, CruiseFilterParams } from '../api/cruises';
import { Cruise } from '../api/types';
import { CruiseCard } from '../components/cruises/CruiseCard';
import { Search, Compass, SlidersHorizontal, RotateCcw, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { formatINR } from '../utils/currency';

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
  const [exactMatches, setExactMatches] = useState<Cruise[]>([]);
  const [closeAlternatives, setCloseAlternatives] = useState<Cruise[]>([]);
  const [isRequirementMode, setIsRequirementMode] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [destination, setDestination] = useState('');
  const [category, setCategory] = useState('');
  const [duration, setDuration] = useState('');
  const [maxPrice, setMaxPrice] = useState<number>(200000);
  const [ordering, setOrdering] = useState('popular');
  const [selectedFacility, setSelectedFacility] = useState('');

  // Available filter options from server
  const [availableDestinations, setAvailableDestinations] = useState<string[]>([]);

  // Parse initial query params if supplied
  useEffect(() => {
    if (initialFilterQuery) {
      try {
        const parsed = JSON.parse(initialFilterQuery);
        if (parsed.purpose) {
          setIsRequirementMode(true);
          setLoading(true);
          let budgetNum = 0;
          if (parsed.budget === 'VALUE') budgetNum = 50000;
          else if (parsed.budget === 'PREMIUM') budgetNum = 100000;
          else if (parsed.budget === 'ULTRA') budgetNum = 200000;

          matchShips({
            purpose: parsed.purpose,
            guests: parsed.guests || 20,
            budget: budgetNum,
            location: parsed.destination || '',
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
        setSearchTerm(initialFilterQuery);
      }
    }
    fetchCruises();
  }, [initialFilterQuery]);

  const fetchCruises = () => {
    setLoading(true);
    setIsRequirementMode(false);
    const params: CruiseFilterParams = {
      q: searchTerm || undefined,
      destination: destination || undefined,
      category: category || undefined,
      duration: duration || undefined,
      max_price: maxPrice < 200000 ? maxPrice : undefined,
      sort_by: ordering,
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
        if (res.destinations) {
          setAvailableDestinations(res.destinations);
        }
      })
      .catch((err) => console.error('Error fetching cruises:', err))
      .finally(() => setLoading(false));
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setDestination('');
    setCategory('');
    setDuration('');
    setMaxPrice(200000);
    setOrdering('popular');
    setSelectedFacility('');
    setIsRequirementMode(false);
    fetchCruises();
  };

  return (
    <div className="min-h-screen pt-28 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 bg-slate-50/70">
      {/* Page Title & Breadcrumb Header */}
      <div className="mb-10 text-center max-w-3xl mx-auto">
        <span className="text-xs uppercase font-bold text-sky-700 tracking-wider">
          Indian Maritime Cruise Fleet
        </span>
        <h1 className="text-3xl sm:text-5xl font-display font-black text-slate-900 tracking-tight mt-1 font-serif">
          {isRequirementMode ? 'Vessel Requirement Matches' : 'Explore Flagship Vessels'}
        </h1>
        <p className="text-slate-500 text-xs sm:text-sm mt-2">
          {isRequirementMode
            ? 'Our database engine matched the following verified vessels against your exact purpose, capacity, and budget requirements.'
            : 'Discover luxury ocean cruise liners, expedition vessels, and private megayachts available for charter and scheduled voyages.'}
        </p>
      </div>

      {/* Main Container: Sidebar Filters + Ship Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* ============================================================ */}
        {/* LEFT COLUMN: FILTERS & SEARCH CONTROLS                       */}
        {/* ============================================================ */}
        <aside className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-display font-bold text-sm text-slate-900 flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-sky-600" />
                Refine Fleet
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
              <label className="text-xs font-bold text-slate-700">Search Ships</label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="e.g. Ocean Pearl, Mumbai..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-sky-500 transition"
                />
              </div>
            </div>

            {/* Destination / Port */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Destination / Port</label>
              <select
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-sky-500 transition"
              >
                <option value="">All Destinations & Ports</option>
                {availableDestinations.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            {/* Vessel Category */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Vessel Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-sky-500 transition"
              >
                <option value="">All Categories</option>
                <option value="Luxury Ocean Cruise">Luxury Ocean Cruise</option>
                <option value="Mega Cruise Liner">Mega Cruise Liner</option>
                <option value="Expedition Cruise Vessel">Expedition Cruise Vessel</option>
                <option value="Scenic Coastal Cruise">Scenic Coastal Cruise</option>
                <option value="Private Charter Yacht">Private Charter Yacht</option>
              </select>
            </div>

            {/* Max Charter Rate (₹ INR) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700">Budget Limit</span>
                <span className="font-mono font-bold text-sky-700">
                  {maxPrice >= 200000 ? 'Any Budget' : formatINR(maxPrice)}
                </span>
              </div>
              <input
                type="range"
                min="40000"
                max="200000"
                step="5000"
                value={maxPrice}
                onChange={(e) => setMaxPrice(parseInt(e.target.value))}
                className="w-full accent-sky-500 cursor-pointer"
              />
            </div>

            {/* Apply Action */}
            <button
              onClick={fetchCruises}
              className="w-full py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs shadow-sm transition cursor-pointer"
            >
              Apply Filters
            </button>
          </div>
        </aside>

        {/* ============================================================ */}
        {/* RIGHT COLUMN: CRUISE RESULTS GRID                            */}
        {/* ============================================================ */}
        <main className="lg:col-span-3 space-y-6">
          <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200/80 text-xs">
            <span className="text-slate-500 font-bold">
              Showing <span className="text-slate-900 font-black">{totalCount}</span> vessels
            </span>
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-semibold">Sort by:</span>
              <select
                value={ordering}
                onChange={(e) => setOrdering(e.target.value)}
                className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer"
              >
                <option value="popular">Popularity</option>
                <option value="price_low">Price: Low to High</option>
                <option value="price_high">Price: High to Low</option>
                <option value="capacity">Capacity</option>
                <option value="rating">Top Rated</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="py-24 text-center">
              <div className="w-10 h-10 mx-auto border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Querying Fleet Database...</p>
            </div>
          ) : isRequirementMode ? (
            <div className="space-y-10">
              {/* Exact Matches */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  <h2 className="text-lg font-bold font-serif text-slate-900">
                    Exact Matches ({exactMatches.length})
                  </h2>
                </div>
                {exactMatches.length === 0 ? (
                  <div className="p-6 rounded-2xl bg-white border border-slate-200 text-center text-xs text-slate-500">
                    No vessel met 100% of your exact specifications, but we found close alternatives below!
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {exactMatches.map((cruise) => (
                      <CruiseCard
                        key={cruise.id}
                        cruise={cruise}
                        onSelect={onSelectCruise}
                        onBookNow={onBookCruise}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Close Alternatives */}
              {closeAlternatives.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="w-5 h-5 text-amber-500" />
                    <h2 className="text-lg font-bold font-serif text-slate-900">
                      Close Alternatives ({closeAlternatives.length})
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {closeAlternatives.map((cruise) => (
                      <CruiseCard
                        key={cruise.id}
                        cruise={cruise}
                        onSelect={onSelectCruise}
                        onBookNow={onBookCruise}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : cruises.length === 0 ? (
            <div className="py-20 text-center bg-white rounded-3xl border border-slate-200/80 p-8">
              <Compass className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <h3 className="text-lg font-bold text-slate-800">No vessels found</h3>
              <p className="text-xs text-slate-500 mt-1">Try relaxing your search terms or budget limits.</p>
              <button
                onClick={handleResetFilters}
                className="mt-4 px-4 py-2 rounded-xl bg-sky-500 text-white text-xs font-bold"
              >
                Reset Filters
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
