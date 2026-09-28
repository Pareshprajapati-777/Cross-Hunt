import React, { useEffect, useState } from 'react';
import { OceanHeroScene } from '../components/three/OceanHeroScene';
import { RequirementSearch } from '../components/home/RequirementSearch';
import { CruiseCard } from '../components/cruises/CruiseCard';
import { getCruises } from '../api/cruises';
import { getTours } from '../api/tours';
import { Cruise, PublicTour } from '../api/types';
import { ArrowRight, Compass, Sparkles, Shield, Anchor, Award, Waves, Calendar, MapPin, Clock } from 'lucide-react';
import { formatINR } from '../utils/currency';

interface HomePageProps {
  onNavigate: (tab: string, param?: string) => void;
  onSelectCruise: (cruise: Cruise) => void;
  onBookCruise: (cruise: Cruise) => void;
  onSelectTour?: (tour: PublicTour) => void;
  onBookTour?: (tour: PublicTour) => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  onNavigate,
  onSelectCruise,
  onBookCruise,
  onSelectTour,
  onBookTour,
}) => {
  const [featuredCruises, setFeaturedCruises] = useState<Cruise[]>([]);
  const [upcomingTours, setUpcomingTours] = useState<PublicTour[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getCruises({ sort_by: 'rating' }),
      getTours()
    ])
      .then(([cruiseRes, toursRes]) => {
        setFeaturedCruises(cruiseRes.cruises.slice(0, 6));
        setUpcomingTours(toursRes.tours.slice(0, 3));
      })
      .catch((err) => console.error('Failed to load homepage data:', err))
      .finally(() => setLoading(false));
  }, []);

  const handleRequirementSearch = (filters: any) => {
    onNavigate('explore', JSON.stringify(filters));
  };

  return (
    <div className="relative min-h-screen bg-slate-50/70">
      {/* ============================================================ */}
      {/* 1. CINEMATIC HERO SECTION                                    */}
      {/* ============================================================ */}
      <section className="relative min-h-[92vh] flex items-center justify-center pt-24 pb-16 overflow-hidden">
        {/* 3D Ocean Waves & Floating Vessel Scene */}
        <OceanHeroScene />

        {/* Ambient Atmosphere Gradients */}
        <div className="absolute inset-0 bg-gradient-to-b from-sky-100/40 via-transparent to-slate-50/70 pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          {/* Subtle Nautical Pill */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/95 border border-sky-300 text-sky-800 text-xs sm:text-sm font-bold tracking-wide backdrop-blur-md shadow-sm">
            <Anchor className="w-3.5 h-3.5 text-sky-600" />
            <span>The Premier Indian Cruise & Maritime Charter Platform</span>
          </div>

          {/* Hero Copy */}
          <div className="space-y-4 max-w-4xl mx-auto">
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-display font-black text-slate-900 tracking-tight leading-[1.08] font-serif">
              BOOK THE SHIP. <br />
              <span className="bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent">
                CREATE THE JOURNEY.
              </span>
            </h1>
            <p className="text-base sm:text-xl text-slate-600 font-medium max-w-2xl mx-auto leading-relaxed">
              Explore scheduled public ocean tours or privately charter luxury vessels for weddings, milestone parties, and executive summits.
            </p>
          </div>

          {/* Primary Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <button
              onClick={() => onNavigate('explore')}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-display font-bold text-sm tracking-wide flex items-center justify-center gap-2.5 shadow-xl shadow-sky-500/25 transition-all duration-200 hover:scale-105 cursor-pointer"
            >
              <Compass className="w-4 h-4 text-sky-100" />
              <span>FIND A SHIP</span>
            </button>

            <button
              onClick={() => onNavigate('tours')}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white/95 border border-sky-300 hover:border-sky-400 text-sky-900 font-display font-bold text-sm tracking-wide flex items-center justify-center gap-2.5 transition-all duration-200 hover:bg-sky-50 shadow-sm cursor-pointer"
            >
              <Waves className="w-4 h-4 text-sky-600" />
              <span>EXPLORE UPCOMING TOURS</span>
            </button>

            <button
              onClick={() => onNavigate('events')}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white/95 border border-amber-400 hover:border-amber-500 text-amber-900 font-display font-bold text-sm tracking-wide flex items-center justify-center gap-2.5 transition-all duration-200 hover:bg-amber-50 shadow-sm cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>PLAN A PRIVATE EVENT</span>
            </button>
          </div>

          {/* Requirement Search Bar (Signature Interaction) */}
          <div className="pt-8">
            <RequirementSearch onSearch={handleRequirementSearch} />
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 2. UPCOMING PUBLIC CRUISE TOURS (PRODUCT B)                  */}
      {/* ============================================================ */}
      {upcomingTours.length > 0 && (
        <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 border-t border-slate-200/60">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-100 text-sky-800 text-xs font-bold uppercase tracking-wider mb-2 border border-sky-200">
                <Waves className="w-3.5 h-3.5 text-sky-600" />
                Product B — Scheduled Departures
              </div>
              <h2 className="text-3xl sm:text-4xl font-display font-extrabold text-slate-900 tracking-tight font-serif">
                Upcoming Public Cruise Tours
              </h2>
              <p className="text-slate-500 text-sm max-w-xl mt-1">
                Purchase individual ticket seats on scheduled departures. All gourmet buffets, ocean deck shows, and island excursions included.
              </p>
            </div>

            <button
              onClick={() => onNavigate('tours')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-sky-50 border border-sky-200 text-sky-800 text-xs font-bold shadow-sm transition cursor-pointer self-start md:self-auto"
            >
              <span>Explore All Tours</span>
              <ArrowRight className="w-4 h-4 text-sky-600" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {upcomingTours.map((tour) => (
              <div
                key={tour.id}
                className="group bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-sm hover:shadow-xl hover:border-sky-300 transition-all duration-300 flex flex-col justify-between"
              >
                <div className="relative h-52 overflow-hidden bg-slate-900">
                  <img
                    src={tour.ship_image || 'https://images.unsplash.com/photo-1548574505-5e239809ee19?auto=format&fit=crop&w=600&q=80'}
                    alt={tour.tour_title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/20" />
                  <div className="absolute top-3 left-3 right-3 flex justify-between items-center">
                    <span className="px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-wider">
                      {tour.ship_name}
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/90 text-white text-[10px] font-bold uppercase tracking-wider">
                      {tour.remaining_capacity} Seats Left
                    </span>
                  </div>
                  <div className="absolute bottom-3 left-3 right-3 text-white">
                    <p className="text-[11px] font-bold text-sky-300 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {tour.departure_port} → {tour.destination}
                    </p>
                    <h3 className="font-bold text-sm font-serif line-clamp-1">{tour.tour_title}</h3>
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="flex items-center gap-1 text-slate-600">
                      <Calendar className="w-3.5 h-3.5 text-sky-500" />
                      {tour.departure_date}
                    </span>
                    <span className="flex items-center gap-1 text-slate-600">
                      <Clock className="w-3.5 h-3.5 text-sky-500" />
                      {tour.duration_days} Days
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">From</span>
                      <span className="text-lg font-black text-slate-900">{formatINR(tour.adult_price)}</span>
                      <span className="text-[10px] text-slate-400 block">/ adult</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onSelectTour ? onSelectTour(tour) : onNavigate('tours')}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                      >
                        Itinerary
                      </button>
                      <button
                        onClick={() => onBookTour ? onBookTour(tour) : onNavigate('tours')}
                        className="px-3.5 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold transition shadow-sm cursor-pointer"
                      >
                        Book Ticket
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ============================================================ */}
      {/* 3. FEATURED LUXURY SHIPS SECTION (PRODUCT A)                 */}
      {/* ============================================================ */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 border-t border-slate-200/60">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-100 text-sky-800 text-xs font-bold uppercase tracking-wider mb-2 border border-sky-200">
              <Anchor className="w-3.5 h-3.5 text-sky-600" />
              Product A — Private Vessels & Milestones
            </div>
            <h2 className="text-3xl sm:text-4xl font-display font-extrabold text-slate-900 tracking-tight font-serif">
              Featured Flagship Fleet
            </h2>
            <p className="text-slate-500 text-sm max-w-xl mt-1">
              Privately charter ocean vessels configured for grand weddings, executive conclaves, and milestone gatherings.
            </p>
          </div>

          <button
            onClick={() => onNavigate('explore')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-sky-50 border border-sky-200 text-sky-800 text-xs font-bold shadow-sm transition cursor-pointer self-start md:self-auto"
          >
            <span>View All Ships</span>
            <ArrowRight className="w-4 h-4 text-sky-600" />
          </button>
        </div>

        {/* Ships Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-96 rounded-3xl bg-slate-200/60 border border-slate-200 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuredCruises.map((cruise) => (
              <CruiseCard
                key={cruise.id}
                cruise={cruise}
                onSelect={onSelectCruise}
                onBookNow={onBookCruise}
              />
            ))}
          </div>
        )}
      </section>

      {/* ============================================================ */}
      {/* 4. PRIVATE MARITIME EVENTS TEASER                            */}
      {/* ============================================================ */}
      <section className="py-20 relative overflow-hidden bg-gradient-to-b from-[#f0f9ff] via-[#e0f2fe]/40 to-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="bg-white rounded-3xl p-8 sm:p-12 border border-sky-200 shadow-xl relative overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
              <div className="space-y-6">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 border border-amber-300 text-amber-800 text-xs font-bold uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  Exclusive Private Charters
                </span>
                <h2 className="text-3xl sm:text-5xl font-display font-extrabold text-slate-900 leading-tight font-serif">
                  Host Your Milestone Moment at Sea
                </h2>
                <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                  From sunset deck wedding vows with a coastal mandap to private corporate leadership retreats and high-energy DJ parties, our bespoke maritime services redefine celebration.
                </p>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="p-4 rounded-2xl bg-sky-50 border border-sky-100">
                    <p className="font-display font-bold text-2xl text-sky-800 font-serif">30 - 350</p>
                    <p className="text-xs text-slate-500 mt-0.5 font-medium">Guest Capacities</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100">
                    <p className="font-display font-bold text-2xl text-amber-700 font-serif">3 Curated</p>
                    <p className="text-xs text-slate-500 mt-0.5 font-medium">Luxury Event Packages</p>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => onNavigate('events')}
                    className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-display font-bold text-xs tracking-wide shadow-md shadow-amber-500/20 transition cursor-pointer"
                  >
                    Explore Event Packages
                  </button>
                </div>
              </div>

              <div className="relative rounded-2xl overflow-hidden aspect-[4/3] border border-slate-200 shadow-xl">
                <img
                  src="https://images.unsplash.com/photo-1511527661048-7fe73d85e9a4?auto=format&fit=crop&w=1200&q=80"
                  alt="Private Yacht Event"
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent" />
                <div className="absolute bottom-6 left-6 right-6">
                  <p className="text-xs font-semibold uppercase tracking-widest text-sky-300">
                    Signature Event Package
                  </p>
                  <p className="text-xl font-display font-bold text-white mt-1 font-serif">
                    Diamond Horizon Royal Gala
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 5. FLEET EXCELLENCE & STANDARDS                              */}
      {/* ============================================================ */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <h2 className="text-3xl font-display font-extrabold text-slate-900 tracking-tight font-serif">
            Crafted for Unmatched Maritime Elegance
          </h2>
          <p className="text-slate-500 text-xs sm:text-sm">
            Every vessel on Cross-Hunt conforms to stringent nautical standards, verified safety equipment, and server-calculated transparent pricing in INR (₹).
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-8 rounded-3xl bg-white border border-slate-200/80 shadow-sm space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-sky-100 border border-sky-200 flex items-center justify-center text-sky-700">
              <Shield className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 font-serif">Anti-Double Booking Guarantee</h3>
            <p className="text-slate-500 text-xs leading-relaxed">
              Atomic transactional locking prevents booking conflicts. Your vessel charter slot or public tour seat is guaranteed on the server.
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-white border border-slate-200/80 shadow-sm space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-700">
              <Award className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 font-serif">Fine Coastal & Global Dining</h3>
            <p className="text-slate-500 text-xs leading-relaxed">
              Indulge in coastal seafood grills, multi-course regional banquets, live culinary stations, and complimentary tea on all voyages.
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-white border border-slate-200/80 shadow-sm space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-700">
              <Anchor className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 font-serif">Verified Fleet Masters</h3>
            <p className="text-slate-500 text-xs leading-relaxed">
              Licensed ship operators and certified captains with navigational mastery across the Arabian Sea, Malabar, and Andaman.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
