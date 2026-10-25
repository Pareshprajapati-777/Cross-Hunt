import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Compass,
  Waves,
  Zap,
  Wind,
  Anchor,
  Navigation,
  Sparkles,
  Eye,
  Flame,
  ArrowDown,
  Ship,
  Activity as ActivityIcon,
  Search,
  MapPin,
  Clock,
  Users,
  ShieldCheck,
  Star,
  ArrowRight,
  Filter,
  Calendar,
  Fish,
  Sun,
  Crown,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import { ActivityItem, ActivityCategory } from '../api/types';
import { getActivities } from '../api/activities';
import { formatINR } from '../utils/currency';
import { ActivityBookingModal } from '../components/activities/ActivityBookingModal';
import { PortRouteMapModal } from '../components/navigation/PortRouteMapModal';
import { WhatsAppIcon } from '../components/common/WhatsAppIcon';
import { useAuth } from '../context/AuthContext';
import { useAuthModal } from '../context/AuthModalContext';

const CATEGORY_ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  ALL: Waves,
  SCUBA: Compass,
  JET_SKIING: Zap,
  PARASAILING: Wind,
  SURFING: Waves,
  FISHING: Anchor,
  DEEP_SEA_FISHING: Anchor,
  BOAT_FISHING: Fish,
  FISHING_CHARTER: Ship,
  RAFTING: Navigation,
  KITE_SURFING: Sparkles,
  SNORKELING: Eye,
  WATER_SKIING: Flame,
  CLIFF_DIVING: ArrowDown,
  ROWING: Ship,
  WATER_POLO: ActivityIcon,
  YACHT_RENTAL: Crown,
  SPEEDBOAT_RIDE: Zap,
  PRIVATE_BOAT_CHARTER: Navigation,
  SUNSET_CRUISE: Sun,
  GROUP_BOAT_TRIPS: Users,
};

const CATEGORY_GROUPS = [
  { id: 'ALL', label: 'All Experiences', icon: Layers, count: 18 },
  { id: 'WATER_SPORTS', label: 'Water Sports', icon: Waves, count: 10 },
  { id: 'FISHING', label: 'Fishing Experiences', icon: Fish, count: 3 },
  { id: 'BOAT_SHIP', label: 'Boat & Ship Experiences', icon: Ship, count: 5 },
];

export const ActivitiesPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { openLoginModal } = useAuthModal();

  // State
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [categories, setCategories] = useState<ActivityCategory[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedGroup, setSelectedGroup] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedLocation, setSelectedLocation] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<string>('popular');

  // Modals
  const [bookingActivity, setBookingActivity] = useState<ActivityItem | null>(null);
  const [mapBookingMock, setMapBookingMock] = useState<any | null>(null);

  const fetchActivitiesData = () => {
    setLoading(true);
    getActivities({
      category_group: selectedGroup === 'ALL' ? undefined : selectedGroup,
      activity_type: selectedCategory === 'ALL' ? undefined : selectedCategory,
      location: selectedLocation === 'ALL' ? undefined : selectedLocation,
      search: searchQuery.trim() || undefined,
      sort_by: sortBy,
    })
      .then((res) => {
        setActivities(res.activities || []);
        if (res.categories && res.categories.length > 0) {
          setCategories(res.categories);
        }
      })
      .catch((err) => console.error('Failed to load activities:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchActivitiesData();
  }, [selectedGroup, selectedCategory, selectedLocation, sortBy]);

  const handleGroupSelect = (groupId: string) => {
    setSelectedGroup(groupId);
    setSelectedCategory('ALL');
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchActivitiesData();
  };

  const handleStartBooking = (act: ActivityItem) => {
    if (!user) {
      openLoginModal({
        title: 'Sign In to Book Activities & Rides',
        featureName: act.title,
        description: 'Login or create an account to book this experience and receive your digital boarding pass.',
      });
      return;
    }
    setBookingActivity(act);
  };

  const handleOpenPortMapForActivity = (act: ActivityItem) => {
    setMapBookingMock({
      id: act.id,
      booking_id: `ACT-PREVIEW-${act.id}`,
      cruise_name: act.host_ship_name || act.title,
      cruise_title: act.title,
      departure_port: act.departure_port,
      destination: act.location,
      booking_date: new Date().toISOString().split('T')[0],
      status: 'CONFIRMED',
    });
  };

  const getOwnerChatUrl = (act: ActivityItem) => {
    const rawPhone = act.owner_phone || '+919820012345';
    const digits = rawPhone.replace(/\D/g, '');
    const phone = digits.length === 10 ? `91${digits}` : digits;
    const custName = user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : 'Guest';
    const boatText = act.requires_boat && act.host_ship_name ? ` (Host Vessel: ${act.host_ship_name})` : '';
    const msg = `Hello ${act.owner_name},\nMy name is ${custName}.\nI am interested in booking "${act.title}" on Cross Hunt${boatText}.\nStarting Price: ${formatINR(act.starting_price || act.price)}/person.\nPlease let me know about available dates and slots. Thank you!`;
    return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
  };

  // Filter categories according to active category group
  const visibleCategories = categories.filter((cat) => {
    if (selectedGroup === 'ALL') return true;
    if (cat.id === 'ALL') return true;
    return cat.group === selectedGroup;
  });

  return (
    <div className="min-h-screen bg-[#F8FCFF] text-slate-800 pb-24">
      {/* 1. HERO SECTION */}
      <section className="relative pt-12 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-[#051833] via-[#082F5B] to-[#0c3d75] text-white overflow-hidden">
        {/* Background ambient lighting */}
        <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:20px_20px]" />
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-sky-500/25 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-teal-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-6xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-sky-500/20 border border-sky-400/30 text-sky-300 text-xs font-bold uppercase tracking-wider backdrop-blur-md shadow-sm">
            <Sparkles className="w-4 h-4 text-sky-400" />
            <span>Water Sports • Fishing Experiences • Boat &amp; Ship Experiences</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black font-serif tracking-tight text-white max-w-4xl mx-auto leading-tight">
            Curated Ocean Rides &amp; Marine Experiences
          </h1>

          <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
            High-adrenaline water sports, big game deep-sea fishing charters, and luxury private boat rentals.
            Beach-based and vessel-based adventures with verified master instructors and licensed captains.
          </p>

          {/* Search Bar & City Selector */}
          <form
            onSubmit={handleSearchSubmit}
            className="pt-4 max-w-3xl mx-auto flex flex-col sm:flex-row items-center gap-2.5 p-2 rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl"
          >
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-sky-300 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search scuba, jet ski, surfing, deep sea fishing, yacht rental..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white/90 text-slate-900 placeholder-slate-400 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-sky-400 transition"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="px-4 py-3 rounded-2xl bg-white/90 text-slate-900 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-sky-400 transition cursor-pointer shrink-0 w-full sm:w-auto"
              >
                <option value="ALL">All Destinations</option>
                <option value="Goa">Goa Coastal &amp; Rivers</option>
                <option value="Panaji">Panaji Harbor &amp; Mandovi</option>
                <option value="Mumbai">Mumbai Harbor Offshore</option>
                <option value="Andaman">Andaman Islands</option>
              </select>

              <button
                type="submit"
                className="px-6 py-3 rounded-2xl bg-sky-500 hover:bg-sky-400 text-[#051833] text-xs font-black transition flex items-center justify-center gap-1.5 shadow-lg shadow-sky-500/25 cursor-pointer shrink-0 w-full sm:w-auto"
              >
                <span>Search</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* 2. PRIMARY CATEGORY GROUPS TABS */}
      <div className="bg-[#051833] border-b border-sky-950 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex items-center gap-2 sm:gap-4 overflow-x-auto scrollbar-none py-2.5">
          {CATEGORY_GROUPS.map((group) => {
            const isGroupActive = selectedGroup === group.id;
            const GroupIcon = group.icon;
            return (
              <button
                key={group.id}
                onClick={() => handleGroupSelect(group.id)}
                className={`px-4 sm:px-5 py-2.5 rounded-2xl whitespace-nowrap text-xs font-black transition-all duration-200 flex items-center gap-2 cursor-pointer ${
                  isGroupActive
                    ? 'bg-sky-500 text-[#051833] shadow-lg shadow-sky-500/30 scale-102'
                    : 'bg-white/10 hover:bg-white/15 text-slate-300 hover:text-white'
                }`}
              >
                <GroupIcon className="w-4 h-4 shrink-0" />
                <span>{group.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isGroupActive ? 'bg-[#051833] text-sky-300' : 'bg-white/10 text-slate-300'
                  }`}
                >
                  {group.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. DYNAMIC SUB-CATEGORY PILLS BAR */}
      <div className="sticky top-16 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs py-3 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-bold scrollbar-none py-1">
            {visibleCategories.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              const IconComp = CATEGORY_ICON_MAP[cat.id] || Waves;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3.5 py-1.5 rounded-full whitespace-nowrap transition-all duration-200 flex items-center gap-1.5 cursor-pointer text-xs font-bold ${
                    isSelected
                      ? 'bg-[#051833] text-[#fff8dc] shadow-md shadow-[#051833]/25 font-black scale-102'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  <IconComp className="w-3.5 h-3.5" />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          {/* Sort Selector */}
          <div className="hidden md:flex items-center gap-2 shrink-0">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Filter className="w-3 h-3 text-slate-500" /> Sort:
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-1.5 rounded-full border border-slate-200 bg-slate-50 text-slate-800 text-xs font-semibold focus:outline-none focus:border-sky-500 transition cursor-pointer"
            >
              <option value="popular">Recommended / Featured</option>
              <option value="rating">Top Rated (★ 4.9+)</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. ACTIVITY CARDS CATALOG GRID */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-200/80 gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-sky-100 text-sky-800 text-[10px] font-black uppercase tracking-wider">
                {selectedGroup === 'ALL'
                  ? 'All Experiences'
                  : CATEGORY_GROUPS.find((g) => g.id === selectedGroup)?.label}
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs font-bold text-slate-600">
                {activities.length} Available Activities
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black font-serif text-[#051833] mt-1">
              {selectedGroup === 'ALL'
                ? 'Curated Marine Adventures & Sports'
                : selectedGroup === 'WATER_SPORTS'
                ? 'Water Sports & Coastal Adventures'
                : selectedGroup === 'FISHING'
                ? 'Deep-Sea & Boat Fishing Charters'
                : 'Luxury Yachts & Speedboat Experiences'}
            </h2>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 self-start sm:self-auto">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-bold text-slate-700">Instant Booking Available</span>
          </div>
        </div>

        {loading ? (
          <div className="py-24 text-center">
            <div className="w-10 h-10 mx-auto border-4 border-sky-600 border-t-transparent rounded-full animate-spin" />
            <p className="mt-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
              Loading activities catalog...
            </p>
          </div>
        ) : activities.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-3xl border border-slate-200 p-8 space-y-3 mt-6">
            <Waves className="w-12 h-12 mx-auto text-slate-300" />
            <h3 className="text-base font-bold text-slate-800">No Experiences Found in this Filter</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Try selecting "All Experiences" or clearing your search keywords.
            </p>
            <button
              onClick={() => {
                setSelectedGroup('ALL');
                setSelectedCategory('ALL');
                setSearchQuery('');
                setSelectedLocation('ALL');
              }}
              className="mt-2 px-5 py-2 rounded-full bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow transition cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-6">
            {activities.map((act) => {
              return (
                <div
                  key={act.id}
                  className="bg-white rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-xl hover:border-sky-300 transition-all duration-300 flex flex-col overflow-hidden group"
                >
                  {/* 1. Activity Image Banner */}
                  <div
                    onClick={() => navigate(`/activities/${act.slug || act.id}`)}
                    className="relative h-56 w-full overflow-hidden bg-slate-100 cursor-pointer"
                    title={`View details for ${act.title}`}
                  >
                    <img
                      src={act.image || '/static/images/placeholder.png'}
                      alt={act.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => {
                        const target = e.currentTarget;
                        if (!target.src.includes('placeholder.png')) {
                          target.src = '/static/images/placeholder.png';
                        }
                      }}
                    />

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/20 to-black/30" />

                    {/* Top Badges: Category & Rating */}
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                      <span className="px-3 py-1 rounded-full bg-white/90 backdrop-blur-md text-[#051833] text-[10px] font-black uppercase tracking-wider shadow-sm truncate">
                        {act.category_group || act.category_label || act.activity_type}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500 text-white text-[11px] font-bold shadow-sm flex items-center gap-1 shrink-0">
                        ★ {act.rating} ({act.reviews_count})
                      </span>
                    </div>

                    {/* Bottom Image Overlay: Duration & Difficulty */}
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-xs">
                      <div className="flex items-center gap-1.5 font-bold drop-shadow-md">
                        <Clock className="w-3.5 h-3.5 text-sky-300" />
                        <span>{act.duration_display}</span>
                      </div>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-md bg-white/20 backdrop-blur-md border border-white/30 text-white shadow-xs">
                        {act.difficulty_level}
                      </span>
                    </div>
                  </div>

                  {/* 2. Card Content */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-3">
                      {/* Vessel / Shore Requirement Entity Badge */}
                      <div
                        className={`p-2 rounded-xl border text-[11px] flex items-center justify-between gap-2 ${
                          act.requires_boat
                            ? 'bg-sky-50/90 border-sky-200/80 text-sky-900'
                            : 'bg-emerald-50/90 border-emerald-200/80 text-emerald-900'
                        }`}
                      >
                        <span className="font-bold truncate flex items-center gap-1.5">
                          {act.requires_boat ? (
                            <Ship className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                          ) : (
                            <Waves className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          )}
                          <span className="truncate">
                            {act.vessel_requirement_note ||
                              (act.requires_boat
                                ? 'Boat Transport Included'
                                : 'Beach & Shore-Based (No Boat Needed)')}
                          </span>
                        </span>
                        <span
                          className={`text-[9px] uppercase font-mono px-1.5 py-0.5 rounded-md shrink-0 font-bold ${
                            act.requires_boat
                              ? 'bg-sky-200/60 text-sky-800'
                              : 'bg-emerald-200/60 text-emerald-800'
                          }`}
                        >
                          {act.requires_boat ? 'Vessel Included' : 'Shore / Beach'}
                        </span>
                      </div>

                      {/* Activity Name */}
                      <h3
                        onClick={() => navigate(`/activities/${act.slug || act.id}`)}
                        className="font-serif font-black text-lg text-slate-900 group-hover:text-sky-700 transition leading-snug line-clamp-1 cursor-pointer"
                        title="Click to view full details"
                      >
                        {act.title}
                      </h3>

                      {/* Location */}
                      <div className="flex items-center gap-1.5 text-xs text-slate-600">
                        <MapPin className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                        <span className="truncate">
                          {act.departure_port} • {act.location}
                        </span>
                      </div>

                      {/* Available Dates Badge */}
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-700">
                        <Calendar className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        <span className="font-semibold truncate">
                          {act.available_dates_summary || 'Available Daily • Today onwards'}
                        </span>
                      </div>

                      {/* Highlights / Description snippet */}
                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                        {act.description}
                      </p>

                      {/* Included Gear / Highlights Pills */}
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {act.included_gear.slice(0, 3).map((gear, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-medium border border-slate-200 truncate max-w-[170px]"
                          >
                            ✓ {gear}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* 3. Price & Action Row */}
                    <div className="pt-4 border-t border-slate-100 space-y-3">
                      {/* Starting Price */}
                      <div className="flex items-baseline justify-between">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                            Starting Price
                          </span>
                          <div className="flex items-baseline gap-1">
                            <span className="text-xs font-semibold text-slate-500">From</span>
                            <span className="text-2xl font-black text-[#051833] font-mono-numbers">
                              {formatINR(act.starting_price || act.price)}
                            </span>
                            <span className="text-[10px] text-slate-400 font-semibold">/ person</span>
                          </div>
                        </div>
                        <span className="text-[11px] font-bold text-slate-500">
                          Max {act.capacity_per_slot} / Slot
                        </span>
                      </div>

                      {/* Action Buttons: View Details & Book Now */}
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => navigate(`/activities/${act.slug || act.id}`)}
                            className="py-2.5 px-3 rounded-2xl bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 text-sky-600" />
                            <span>View Details</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleStartBooking(act)}
                            className="py-2.5 px-3 rounded-2xl bg-gradient-to-r from-sky-600 to-[#051833] hover:from-sky-700 hover:to-[#0a2548] text-white text-xs font-black shadow-md shadow-sky-600/25 transition flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <span>Book Now</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          {/* Live Port GPS Route Map Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenPortMapForActivity(act)}
                            className="py-2 px-3 rounded-xl bg-slate-50 hover:bg-sky-50 text-sky-800 border border-slate-200 hover:border-sky-300 text-[11px] font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                            title="Open map & live GPS route to location"
                          >
                            <Navigation className="w-3 h-3 text-sky-600" />
                            <span>Map &amp; Route</span>
                          </button>

                          {/* WhatsApp Chat with Owner */}
                          <a
                            href={getOwnerChatUrl(act)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-bold transition flex items-center justify-center gap-1.5 cursor-pointer text-center"
                            title={`Chat with ${act.owner_name} on WhatsApp`}
                          >
                            <WhatsAppIcon className="w-3 h-3 text-emerald-600" variant="solid" />
                            <span>WhatsApp</span>
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* 5. MODALS */}
      {bookingActivity && (
        <ActivityBookingModal
          activity={bookingActivity}
          isOpen={!!bookingActivity}
          onClose={() => setBookingActivity(null)}
          onBookingSuccess={(bookingId) => {
            setBookingActivity(null);
            navigate(`/dashboard?booking_id=${bookingId}&openPass=true`);
          }}
          onOpenPortMap={(port, loc) => {
            setBookingActivity(null);
            setMapBookingMock({
              id: 999,
              booking_id: `ACT-PORT-${bookingActivity.id}`,
              cruise_name: bookingActivity.host_ship_name || bookingActivity.title,
              cruise_title: bookingActivity.title,
              departure_port: port,
              destination: loc,
              booking_date: new Date().toISOString().split('T')[0],
              status: 'CONFIRMED',
            });
          }}
        />
      )}

      {mapBookingMock && (
        <PortRouteMapModal
          isOpen={!!mapBookingMock}
          onClose={() => setMapBookingMock(null)}
          booking={mapBookingMock}
        />
      )}
    </div>
  );
};
