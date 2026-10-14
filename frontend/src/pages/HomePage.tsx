import React, { useEffect, useState } from 'react';
import { RequirementSearch } from '../components/home/RequirementSearch';
import { CruiseCard } from '../components/cruises/CruiseCard';
import { getCruises } from '../api/cruises';
import { getTours } from '../api/tours';
import { Cruise, PublicTour } from '../api/types';
import { getPublicOperators, PublicOperator } from '../api/operators';
import {
  ArrowRight,
  Sparkles,
  Shield,
  ShieldCheck,
  Tag,
  Anchor,
  Award,
  Waves,
  Calendar,
  MapPin,
  Clock,
  Building2,
  Navigation,
  CheckCircle2,
  Play,
  Headphones,
  Users,
  Ship,
} from 'lucide-react';
import { formatINR } from '../utils/currency';

interface HomePageProps {
  onNavigate: (tab: string, param?: string) => void;
  onSelectCruise: (cruise: Cruise) => void;
  onBookCruise: (cruise: Cruise, cabin?: string) => void;
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
  const [operators, setOperators] = useState<PublicOperator[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getCruises({ sort_by: 'rating' }),
      getTours(),
      getPublicOperators()
    ])
      .then(([cruiseRes, toursRes, opRes]) => {
        setFeaturedCruises(cruiseRes.cruises.slice(0, 6));
        setUpcomingTours(toursRes.tours.slice(0, 3));
        setOperators(opRes.operators || []);
      })
      .catch((err) => console.error('Failed to load homepage data:', err))
      .finally(() => setLoading(false));
  }, []);

  // Reveal homepage sections as they enter the viewport, without adding an animation dependency.
  useEffect(() => {
    const root = document.querySelector('.cross-hunt-home');
    if (!root) return;

    const sections = Array.from(root.querySelectorAll<HTMLElement>('section:not(:first-child)'));
    if (!('IntersectionObserver' in window)) {
      sections.forEach((section) => section.classList.add('ch-is-visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('ch-is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );

    sections.forEach((section, index) => {
      section.classList.add('ch-scroll-reveal');
      section.style.setProperty('--ch-reveal-delay', `${Math.min(index % 3, 2) * 70}ms`);
      observer.observe(section);
    });

    return () => observer.disconnect();
  }, [loading, upcomingTours.length, featuredCruises.length, operators.length]);

  const handleRequirementSearch = (filters: any) => {
    if (filters.search_mode === 'PUBLIC_CRUISE') {
      const q = new URLSearchParams();
      if (filters.departure_port) q.set('departure_port', filters.departure_port);
      if (filters.destination) q.set('destination', filters.destination);
      if (filters.departureDate) q.set('date', filters.departureDate);
      const qs = q.toString();
      onNavigate('tours', qs ? `?${qs}` : '');
    } else {
      onNavigate('explore', JSON.stringify(filters));
    }
  };

  return (
    <div className="cross-hunt-home relative min-h-screen bg-[#f8f6ef]">
      {/* ============================================================ */}
      {/* 1. CINEMATIC LUXURY OCEAN HERO SECTION                       */}
      {/* ============================================================ */}
      <section
        className="relative z-10 min-h-[96vh] flex flex-col justify-center pt-24 pb-12 overflow-hidden bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url('/hero_luxury_ocean_bg.jpg')` }}
      >
        {/* Soft coastal ocean gradient overlay for crystal clear contrast & vibrant sunshine */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/30 via-transparent to-slate-950/45 pointer-events-none" />

        {/* Decorative Top-Right Elements (Script + Watch Video) */}
        <div className="hidden lg:flex flex-col items-end gap-3 absolute right-8 xl:right-16 top-28 z-20">
          <div
            className="text-3xl xl:text-4xl text-white drop-shadow-lg rotate-[-6deg] tracking-wider"
            style={{ fontFamily: "'Caveat', cursive" }}
          >
            Explore India by Sea
          </div>
          <button
            type="button"
            onClick={() => onNavigate('tours')}
            className="flex items-center gap-2.5 bg-slate-950/60 hover:bg-slate-900/80 backdrop-blur-md border border-white/25 text-white rounded-full pl-2 pr-4 py-1.5 shadow-2xl transition-all cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-full bg-sky-500 text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
              <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
            </div>
            <div className="text-left">
              <div className="text-xs font-bold leading-tight">Watch Video</div>
              <div className="text-[9px] text-sky-200">Discover Experiences</div>
            </div>
          </button>
        </div>



        {/* Main Content Area */}
        <div className="relative z-10 max-w-[1360px] mx-auto w-full px-4 sm:px-6 lg:px-8 space-y-5 pt-3 sm:pt-4">
          {/* Top Crown Pill Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/60 backdrop-blur-md border border-white/20 text-white text-xs sm:text-sm font-semibold shadow-lg">
            <span>👑</span>
            <span>India's No.1 Ship & Boat Rental Platform</span>
          </div>

          {/* Hero Headline & Subtitle */}
          <div className="space-y-3 max-w-3xl text-left">
            <h1
              className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight leading-[1.08] drop-shadow-lg"
              style={{ fontFamily: "'Outfit', 'Plus Jakarta Sans', sans-serif" }}
            >
              Book Your Ship. <br />
              Create The Journey.
            </h1>
            <p className="text-sm sm:text-base text-white/90 font-normal max-w-2xl leading-relaxed drop-shadow">
              Explore scheduled public cruises or book private yachts and boats for family trips, parties, and special events across India.
            </p>

            {/* 4 Trust Badges Row (Matching reference circular glowing style) */}
            <div className="flex flex-wrap items-center gap-5 sm:gap-7 pt-2">
              {/* Badge 1: Real Ships */}
              <div className="flex items-center gap-3">
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center text-white shrink-0"
                  style={{
                    background: 'radial-gradient(circle at 35% 35%, #0284c7 0%, #034f84 55%, #022b54 100%)',
                    border: '1.5px solid rgba(255, 255, 255, 0.95)',
                    boxShadow: '0 0 0 2px rgba(56, 189, 248, 0.75), 0 0 20px rgba(56, 189, 248, 0.9), inset 0 0 10px rgba(255, 255, 255, 0.4)',
                  }}
                >
                  <Ship className="w-5 h-5 text-white drop-shadow" />
                </div>
                <div className="text-left">
                  <div className="text-sm font-bold text-white leading-tight drop-shadow-md tracking-wide">Real Ships</div>
                  <div className="text-xs text-sky-200 font-medium drop-shadow-sm">Real Experiences</div>
                </div>
              </div>

              {/* Badge 2: Verified Operators */}
              <div className="flex items-center gap-3">
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center text-white shrink-0"
                  style={{
                    background: 'radial-gradient(circle at 35% 35%, #0284c7 0%, #034f84 55%, #022b54 100%)',
                    border: '1.5px solid rgba(255, 255, 255, 0.95)',
                    boxShadow: '0 0 0 2px rgba(56, 189, 248, 0.75), 0 0 20px rgba(56, 189, 248, 0.9), inset 0 0 10px rgba(255, 255, 255, 0.4)',
                  }}
                >
                  <ShieldCheck className="w-5 h-5 text-white drop-shadow" />
                </div>
                <div className="text-left">
                  <div className="text-sm font-bold text-white leading-tight drop-shadow-md tracking-wide">Verified</div>
                  <div className="text-xs text-sky-200 font-medium drop-shadow-sm">Operators</div>
                </div>
              </div>

              {/* Badge 3: Best Price */}
              <div className="flex items-center gap-3">
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center text-white shrink-0"
                  style={{
                    background: 'radial-gradient(circle at 35% 35%, #0284c7 0%, #034f84 55%, #022b54 100%)',
                    border: '1.5px solid rgba(255, 255, 255, 0.95)',
                    boxShadow: '0 0 0 2px rgba(56, 189, 248, 0.75), 0 0 20px rgba(56, 189, 248, 0.9), inset 0 0 10px rgba(255, 255, 255, 0.4)',
                  }}
                >
                  <Tag className="w-5 h-5 text-white drop-shadow" />
                </div>
                <div className="text-left">
                  <div className="text-sm font-bold text-white leading-tight drop-shadow-md tracking-wide">Best Price</div>
                  <div className="text-xs text-sky-200 font-medium drop-shadow-sm">& Transparent</div>
                </div>
              </div>

              {/* Badge 4: Safe & Secure */}
              <div className="flex items-center gap-3">
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center text-white shrink-0"
                  style={{
                    background: 'radial-gradient(circle at 35% 35%, #0284c7 0%, #034f84 55%, #022b54 100%)',
                    border: '1.5px solid rgba(255, 255, 255, 0.95)',
                    boxShadow: '0 0 0 2px rgba(56, 189, 248, 0.75), 0 0 20px rgba(56, 189, 248, 0.9), inset 0 0 10px rgba(255, 255, 255, 0.4)',
                  }}
                >
                  <Users className="w-5 h-5 text-white drop-shadow" />
                </div>
                <div className="text-left">
                  <div className="text-sm font-bold text-white leading-tight drop-shadow-md tracking-wide">Safe & Secure</div>
                  <div className="text-xs text-sky-200 font-medium drop-shadow-sm">Booking</div>
                </div>
              </div>
            </div>
          </div>

          {/* Glassmorphic Search Widget (Moved to the left to give the Dolphin full visibility) */}
          <div className="pt-1 max-w-3xl lg:max-w-[840px] xl:max-w-[880px] 2xl:max-w-[920px] w-full mr-auto">
            <RequirementSearch onSearch={handleRequirementSearch} />
          </div>
        </div>

      </section>


      {/* ============================================================ */}
      {/* 2. UPCOMING PUBLIC CRUISE TOURS (PRODUCT B)                  */}
      {/* ============================================================ */}
      {upcomingTours.length > 0 && (
        <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
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
                className="group bg-white/95 backdrop-blur-md rounded-3xl border border-sky-100 hover:border-sky-300 overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
              >
                <div className="relative h-52 overflow-hidden bg-slate-100">
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
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-transparent to-black/10" />
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
              Product A — Private Ships & Milestones
            </div>
            <h2 className="text-3xl sm:text-4xl font-display font-extrabold text-slate-900 tracking-tight font-serif">
              Featured Flagship Fleet
            </h2>
            <p className="text-slate-500 text-sm max-w-xl mt-1">
              Privately charter ocean ships and boats configured for grand weddings, executive conclaves, and milestone gatherings.
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
      {/* 3B. POPULAR COASTAL PORTS & MARITIME HUBS                    */}
      {/* ============================================================ */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 border-t border-slate-200/60">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold uppercase tracking-wider mb-2 border border-emerald-200">
              <Navigation className="w-3.5 h-3.5 text-emerald-600" />
              Verified Coastal Port Gateways
            </div>
            <h2 className="text-3xl sm:text-4xl font-display font-extrabold text-slate-900 tracking-tight font-serif">
              Popular Maritime Hubs
            </h2>
            <p className="text-slate-500 text-sm max-w-xl mt-1">
              Select your departure port to instantly discover available charter boats, private catamarans, and scheduled passenger liners.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {[
            { name: 'Goa', port: 'Mandovi River & Mormugao', count: '10+ Ships', image: '/static/images/vessels/mandovi_river_cruise.jpg' },
            { name: 'Mumbai', port: 'International Cruise Terminal', count: '6+ Ships', image: '/static/images/vessels/cordelia_empress.jpg' },
            { name: 'Andaman & Nicobar', port: 'Port Blair, Havelock & Neil', count: '8+ Ships', image: '/static/images/vessels/nautika_catamaran.jpg' },
            { name: 'Lakshadweep', port: 'Agatti, Bangaram & Kavaratti', count: '4+ Ships', image: '/static/images/vessels/lacadives_catamaran.jpg' },
            { name: 'Kochi', port: 'Willingdon Island & Backwaters', count: '4+ Ships', image: '/static/images/vessels/swastik_cruise.jpg' },
          ].map((hub) => (
            <button
              key={hub.name}
              onClick={() => onNavigate('explore', JSON.stringify({ location: hub.name }))}
              className="group text-left bg-white rounded-2xl border border-slate-200 hover:border-sky-400 overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col"
            >
              <div className="h-28 overflow-hidden relative bg-slate-100">
                <img
                  src={hub.image}
                  alt={hub.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  onError={(e) => {
                    e.currentTarget.src = '/static/images/vessels/cordelia_empress.jpg';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />
                <span className="absolute bottom-2 left-2 text-[10px] font-bold text-sky-200 bg-slate-950/60 px-2 py-0.5 rounded backdrop-blur-sm">
                  {hub.count}
                </span>
              </div>
              <div className="p-3">
                <h3 className="font-bold text-sm text-slate-900 group-hover:text-sky-700 transition font-serif">{hub.name}</h3>
                <p className="text-[11px] text-slate-500 truncate mt-0.5">{hub.port}</p>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* ============================================================ */}
      {/* 3C. VERIFIED MARITIME OPERATORS & CRUISE LINES               */}
      {/* ============================================================ */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 border-t border-slate-200/60">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-bold uppercase tracking-wider mb-2 border border-blue-200">
              <Building2 className="w-3.5 h-3.5 text-blue-600" />
              Direct Marine Operator Catalogue
            </div>
            <h2 className="text-3xl sm:text-4xl font-display font-extrabold text-slate-900 tracking-tight font-serif">
              Verified Coastal Fleet Operators
            </h2>
            <p className="text-slate-500 text-sm max-w-xl mt-1">
              Browse official fleet specifications and direct charter contacts for India's 11 verified cruise lines and boat rental companies.
            </p>
          </div>

          <button
            onClick={() => onNavigate('explore')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold shadow-sm transition cursor-pointer self-start md:self-auto"
          >
            <span>View Full Fleet Directory</span>
            <ArrowRight className="w-4 h-4 text-slate-600" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {operators.slice(0, 6).map((op) => (
            <div
              key={op.id}
              className="bg-white rounded-3xl border border-slate-200/90 hover:border-sky-300 p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-200 uppercase">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Verified Operator
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">
                    {op.vessels_count} Ships Registered
                  </span>
                </div>
                <h3 className="font-bold text-lg text-slate-900 font-serif">{op.name}</h3>
                <p className="text-xs text-sky-700 font-semibold flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3 text-sky-600" />
                  {op.location}
                </p>
                <p className="text-xs text-slate-600 mt-2 line-clamp-2 leading-relaxed">
                  {op.description}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-500">
                  {op.tours_count ? `${op.tours_count} Scheduled Tours` : 'Private Charters'}
                </span>
                <button
                  onClick={() => onNavigate('explore', JSON.stringify({ q: op.name }))}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition cursor-pointer"
                >
                  Explore Ships →
                </button>
              </div>
            </div>
          ))}
        </div>
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
                  From sunset deck weddings with coastal views to corporate retreats and private DJ parties, our boat and ship rental services make every celebration unforgettable.
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
                  src="/static/images/vessels/navora_yacht.jpg"
                  alt="Private Luxury Yacht Event"
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
            Built for Safe & Comfortable Trips
          </h2>
          <p className="text-slate-500 text-xs sm:text-sm">
            Every boat and ship on Cross-Hunt is safety verified with transparent pricing in INR (₹).
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-8 rounded-3xl bg-white border border-slate-200/80 shadow-sm space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-sky-100 border border-sky-200 flex items-center justify-center text-sky-700">
              <Shield className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 font-serif">Guaranteed Booking</h3>
            <p className="text-slate-500 text-xs leading-relaxed">
              Real-time slot locking prevents double bookings. Your boat booking or cruise ticket is instantly confirmed.
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-white border border-slate-200/80 shadow-sm space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-700">
              <Award className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 font-serif">Food & Refreshments</h3>
            <p className="text-slate-500 text-xs leading-relaxed">
              Enjoy fresh meals, regional specialties, tea, snacks, and catering packages on all trips.
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-white border border-slate-200/80 shadow-sm space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-700">
              <Anchor className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 font-serif">Verified Licensed Captains</h3>
            <p className="text-slate-500 text-xs leading-relaxed">
              Licensed operators and certified captains with experienced crew across Goa, Andaman, Kochi, and Mumbai.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
