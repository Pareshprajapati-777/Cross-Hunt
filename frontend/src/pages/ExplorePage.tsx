import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getCruises, matchShips, CruiseFilterParams } from '../api/cruises';
import { Cruise } from '../api/types';
import { CruiseCard } from '../components/cruises/CruiseCard';
import { Search, Compass, SlidersHorizontal, RotateCcw, Sparkles, CheckCircle2, AlertCircle, Anchor, Filter, X } from 'lucide-react';
import { formatINR } from '../utils/currency';

interface ExplorePageProps {
  initialFilterQuery?: string;
  onSelectCruise: (cruise: Cruise) => void;
  onBookCruise: (cruise: Cruise) => void;
}

const CONTROLLED_CATEGORIES = [
  { id: '', label: 'All Controlled Categories' },
  { id: 'YACHT', label: 'Private Yacht & Catamaran' },
  { id: 'BOAT', label: 'Boat / Speedboat' },
  { id: 'PARTY_BOAT', label: 'Party & Celebration Boat' },
  { id: 'RIVER_CRUISE', label: 'River Cruise Ship' },
  { id: 'SEA_CRUISE', label: 'Sea & Coastal Cruise' },
  { id: 'FERRY', label: 'Inter-Island Passenger Ferry' },
  { id: 'PASSENGER_CRUISE_SHIP', label: 'Passenger Cruise Ship & Liner' },
];

const CITIES = [
  { id: '', label: 'All Cities & Regions' },
  { id: 'Goa', label: 'Goa' },
  { id: 'Andaman', label: 'Andaman & Nicobar' },
  { id: 'Kochi', label: 'Kochi / Kerala' },
  { id: 'Mumbai', label: 'Mumbai' },
  { id: 'Lakshadweep', label: 'Lakshadweep' },
  { id: 'International', label: 'International & High Seas' },
];

export const sortCruises = (list: Cruise[], sortType: string): Cruise[] => {
  const items = [...list];
  const getCleanPrice = (c: Cruise): number => {
    const val = Number(c.price);
    return isNaN(val) || val <= 0 || c.is_quote_based ? 0 : val;
  };

  switch (sortType) {
    case 'price_asc':
      return items.sort((a, b) => {
        const pA = getCleanPrice(a);
        const pB = getCleanPrice(b);
        if (pA === 0 && pB === 0) return 0;
        if (pA === 0) return 1; // Put quote-based / 0 price at the end
        if (pB === 0) return -1;
        return pA - pB;
      });

    case 'price_desc':
      return items.sort((a, b) => {
        const pA = getCleanPrice(a);
        const pB = getCleanPrice(b);
        if (pA === 0 && pB === 0) return 0;
        if (pA === 0) return 1;
        if (pB === 0) return -1;
        return pB - pA;
      });

    case 'capacity_desc':
      return items.sort((a, b) => (Number(b.capacity) || 0) - (Number(a.capacity) || 0));

    case 'capacity_asc':
      return items.sort((a, b) => {
        const cA = Number(a.capacity) || 0;
        const cB = Number(b.capacity) || 0;
        if (cA === 0 && cB === 0) return 0;
        if (cA === 0) return 1;
        if (cB === 0) return -1;
        return cA - cB;
      });

    case 'rating_desc':
      return items.sort((a, b) => {
        const rDiff = (Number(b.average_rating) || 0) - (Number(a.average_rating) || 0);
        if (rDiff !== 0) return rDiff;
        return (Number(b.review_count) || 0) - (Number(a.review_count) || 0);
      });

    case 'name_asc':
      return items.sort((a, b) => (a.name || a.title || '').localeCompare(b.name || b.title || ''));

    case 'popular':
    default:
      return items.sort((a, b) => {
        const scoreA = ((Number(a.review_count) || 0) * 10) + ((Number(a.average_rating) || 4.8) * 10) + (a.is_approved ? 5 : 0);
        const scoreB = ((Number(b.review_count) || 0) * 10) + ((Number(b.average_rating) || 4.8) * 10) + (b.is_approved ? 5 : 0);
        if (scoreB !== scoreA) return scoreB - scoreA;
        return (Number(b.capacity) || 0) - (Number(a.capacity) || 0);
      });
  }
};

interface FilterOverrides {
  search?: string;
  city?: string;
  vesselCategory?: string;
  listingType?: string;
  duration?: string;
  maxPrice?: number;
  sort?: string;
}

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
  const [city, setCity] = useState(searchParams.get('destination') || searchParams.get('city') || '');
  const [listingType, setListingType] = useState(searchParams.get('listing_type') || '');
  const [vesselCategory, setVesselCategory] = useState(searchParams.get('category') || searchParams.get('vessel_category') || '');
  const [duration, setDuration] = useState('');
  const [maxPrice, setMaxPrice] = useState<number>(300000);
  const [ordering, setOrdering] = useState('popular');
  const [availableDestinations, setAvailableDestinations] = useState<string[]>([]);

  const fetchCruises = (overrides?: FilterOverrides) => {
    setLoading(true);
    setIsRequirementMode(false);

    const effSearch = overrides?.search !== undefined ? overrides.search : searchTerm;
    const effCity = overrides?.city !== undefined ? overrides.city : city;
    const effCat = overrides?.vesselCategory !== undefined ? overrides.vesselCategory : vesselCategory;
    const effType = overrides?.listingType !== undefined ? overrides.listingType : listingType;
    const effDuration = overrides?.duration !== undefined ? overrides.duration : duration;
    const effMaxPrice = overrides?.maxPrice !== undefined ? overrides.maxPrice : maxPrice;
    const effSort = overrides?.sort !== undefined ? overrides.sort : ordering;

    const params: CruiseFilterParams = {
      q: effSearch || undefined,
      city: effCity || undefined,
      destination: effCity || undefined,
      vessel_category: effCat || undefined,
      category: effCat || undefined,
      listing_type: effType || undefined,
      duration: effDuration || undefined,
      max_price: effMaxPrice < 300000 ? effMaxPrice : undefined,
      sort_by: effSort,
    };

    getCruises(params)
      .then((res) => {
        const sorted = sortCruises(res.cruises, effSort);
        setCruises(sorted);
        setTotalCount(sorted.length);
        if (res.destinations) {
          setAvailableDestinations(res.destinations);
        }
      })
      .catch((err) => console.error('Error fetching cruises:', err))
      .finally(() => setLoading(false));
  };

  // Immediate sort handler with zero lag
  const handleSortChange = (newSort: string) => {
    setOrdering(newSort);
    setCruises((prev) => sortCruises(prev, newSort));
    setExactMatches((prev) => sortCruises(prev, newSort));
    setCloseAlternatives((prev) => sortCruises(prev, newSort));

    if (!isRequirementMode) {
      fetchCruises({ sort: newSort });
    }
  };

  // Explicit Apply Filter button handler
  const handleApplyFilters = () => {
    fetchCruises({
      search: searchTerm,
      city,
      vesselCategory,
      listingType,
      duration,
      maxPrice,
      sort: ordering,
    });
  };

  // Reset Filters handler
  const handleResetFilters = () => {
    setSearchTerm('');
    setCity('');
    setListingType('');
    setVesselCategory('');
    setDuration('');
    setMaxPrice(300000);
    setOrdering('popular');
    setIsRequirementMode(false);
    fetchCruises({
      search: '',
      city: '',
      vesselCategory: '',
      listingType: '',
      duration: '',
      maxPrice: 300000,
      sort: 'popular',
    });
  };

  // Unified query params handling on mount or searchParams change
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
              const matched = sortCruises(res.results || [], ordering);
              setExactMatches(sortCruises(res.exact_matches || [], ordering));
              setCloseAlternatives(sortCruises(res.close_alternatives || [], ordering));
              setCruises(matched);
              setTotalCount(matched.length);
            })
            .catch((err) => {
              console.error('Match engine error:', err);
              fetchCruises({
                city: dest || undefined,
                vesselCategory: cat || undefined,
                listingType: type || undefined,
              });
            })
            .finally(() => setLoading(false));
          return;
        }
      } catch {
        setSearchTerm(rawQuery);
      }
    }

    fetchCruises({
      city: dest || undefined,
      vesselCategory: cat || undefined,
      listingType: type || undefined,
      search: rawQuery || undefined,
      sort: ordering,
    });
  }, [initialFilterQuery, searchParams]);

  return (
    <div className="min-h-screen pt-28 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 bg-[#f8f9fa] text-[#051833]">
      {/* Page Title & Breadcrumb Header */}
      <div className="mb-10 text-center max-w-3xl mx-auto">
        <h1 className="text-3xl sm:text-5xl font-black text-[#051833] tracking-tight mt-1 font-serif text-stroke-dark">
          {isRequirementMode ? 'Matching Ships & Boats' : 'Explore Ships & Private Boats'}
        </h1>
        <p className="text-slate-600 text-xs sm:text-sm mt-2 font-medium">
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
          <div className="bg-white rounded-3xl p-6 border border-[#0284c7]/20 shadow-xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-serif font-bold text-sm text-[#051833] flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-[#0284c7]" />
                Filter Fleet
              </h3>
              <button
                onClick={handleResetFilters}
                className="text-[11px] text-slate-500 hover:text-[#0284c7] font-bold flex items-center gap-1 transition cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
            </div>

            {/* Keyword Search */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Search Ships & Operators</label>
              <div className="relative">
                <Search className="w-4 h-4 text-[#0284c7]/60 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      fetchCruises({ search: searchTerm });
                    }
                  }}
                  placeholder="e.g. Navora, Andaman Yacht..."
                  className="w-full pl-9 pr-8 py-2 rounded-xl bg-[#f8f9fa] border border-slate-200 text-xs text-[#051833] placeholder:text-slate-400 focus:outline-none focus:border-[#0284c7] transition"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm('');
                      fetchCruises({ search: '' });
                    }}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-rose-500 transition cursor-pointer"
                    title="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Controlled Ship Category */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Ship Category</label>
              <select
                value={vesselCategory}
                onChange={(e) => {
                  const val = e.target.value;
                  setVesselCategory(val);
                  fetchCruises({ vesselCategory: val });
                }}
                className="w-full p-2.5 rounded-xl bg-[#f8f9fa] border border-slate-200 text-xs text-[#051833] focus:outline-none focus:border-[#0284c7] transition font-medium cursor-pointer"
              >
                {CONTROLLED_CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id} className="bg-white">
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
                onChange={(e) => {
                  const val = e.target.value;
                  setCity(val);
                  fetchCruises({ city: val });
                }}
                className="w-full p-2.5 rounded-xl bg-[#f8f9fa] border border-slate-200 text-xs text-[#051833] focus:outline-none focus:border-[#0284c7] transition font-medium cursor-pointer"
              >
                {CITIES.map((c) => (
                  <option key={c.id} value={c.id} className="bg-white">
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Apply Action */}
            <button
              onClick={handleApplyFilters}
              className="w-full py-2.5 rounded-xl bg-[#051833] hover:bg-[#0a2548] text-[#fff8dc] font-black text-xs shadow-md shadow-[#051833]/15 transition cursor-pointer active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <Filter className="w-3.5 h-3.5 text-[#0284c7]" />
              <span>{loading ? 'Applying Filters...' : 'Apply Filter'}</span>
            </button>
          </div>
        </aside>

        {/* ============================================================ */}
        {/* RIGHT COLUMN: CRUISE RESULTS GRID                            */}
        {/* ============================================================ */}
        <main className="lg:col-span-3 space-y-5">
          <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-[#0284c7]/15 text-xs shadow-sm flex-wrap gap-3">
            <span className="text-slate-700 font-bold">
              Showing <span className="text-[#0284c7] font-black">{totalCount}</span> verified vessels
            </span>
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-semibold">Sort by:</span>
              <select
                value={ordering}
                onChange={(e) => handleSortChange(e.target.value)}
                className="bg-[#f8f9fa] border border-slate-200 rounded-lg px-2.5 py-1.5 text-[#051833] font-bold outline-none cursor-pointer focus:border-[#0284c7] hover:border-slate-300 transition"
              >
                <option value="popular" className="bg-white">Most Popular</option>
                <option value="price_asc" className="bg-white">Price: Low to High</option>
                <option value="price_desc" className="bg-white">Price: High to Low</option>
                <option value="capacity_desc" className="bg-white">Capacity: Highest</option>
                <option value="capacity_asc" className="bg-white">Capacity: Lowest</option>
                <option value="rating_desc" className="bg-white">Highest Rated</option>
                <option value="name_asc" className="bg-white">Name: A to Z</option>
              </select>
            </div>
          </div>

          {/* Active Filter Chips */}
          {(searchTerm || city || vesselCategory) && (
            <div className="flex flex-wrap items-center gap-2 px-1">
              <span className="text-[11px] font-bold text-slate-500">Active Filters:</span>
              {searchTerm && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 text-[#0284c7] border border-[#0284c7]/20 text-xs font-bold">
                  Search: "{searchTerm}"
                  <button
                    onClick={() => { setSearchTerm(''); fetchCruises({ search: '' }); }}
                    className="hover:text-rose-500 font-black cursor-pointer text-sm leading-none"
                    title="Remove keyword filter"
                  >
                    ×
                  </button>
                </span>
              )}
              {vesselCategory && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 text-[#0284c7] border border-[#0284c7]/20 text-xs font-bold">
                  {CONTROLLED_CATEGORIES.find(c => c.id === vesselCategory)?.label || vesselCategory}
                  <button
                    onClick={() => { setVesselCategory(''); fetchCruises({ vesselCategory: '' }); }}
                    className="hover:text-rose-500 font-black cursor-pointer text-sm leading-none"
                    title="Remove category filter"
                  >
                    ×
                  </button>
                </span>
              )}
              {city && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 text-[#0284c7] border border-[#0284c7]/20 text-xs font-bold">
                  {CITIES.find(c => c.id === city)?.label || city}
                  <button
                    onClick={() => { setCity(''); fetchCruises({ city: '' }); }}
                    className="hover:text-rose-500 font-black cursor-pointer text-sm leading-none"
                    title="Remove city filter"
                  >
                    ×
                  </button>
                </span>
              )}
              <button
                onClick={handleResetFilters}
                className="text-xs text-rose-600 hover:text-rose-800 underline font-bold ml-1 cursor-pointer"
              >
                Clear All
              </button>
            </div>
          )}

          {loading ? (
            <div className="py-24 text-center">
              <div className="w-12 h-12 mx-auto border-4 border-[#0284c7] border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-4 text-xs font-bold uppercase tracking-widest text-[#0284c7]">Filtering database fleet...</p>
            </div>
          ) : cruises.length === 0 ? (
            <div className="py-20 text-center bg-white rounded-3xl border border-[#0284c7]/20 p-8 shadow-sm">
              <Compass className="w-12 h-12 mx-auto text-[#0284c7]/50 mb-3" />
              <h3 className="text-lg font-bold text-[#051833]">No vessels match your active filters</h3>
              <p className="text-xs text-slate-500 mt-1">Try resetting city, category, or listing type filters.</p>
              <button
                onClick={handleResetFilters}
                className="mt-4 px-4 py-2 rounded-xl bg-[#051833] hover:bg-[#0a2548] text-[#fff8dc] text-xs font-black transition cursor-pointer shadow-md shadow-[#051833]/15"
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
