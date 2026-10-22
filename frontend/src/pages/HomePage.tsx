import React, { useEffect, useState } from 'react';
import { RequirementSearch } from '../components/home/RequirementSearch';
import { CruiseCard } from '../components/cruises/CruiseCard';
import { CurvedMarqueeBanner } from '../components/home/CurvedMarqueeBanner';
import { VesselShowcaseStage } from '../components/home/VesselShowcaseStage';
import { VoyagerMediaSection } from '../components/home/VoyagerMediaSection';
import { OpenDesignDeckShowcase } from '../components/home/OpenDesignDeckShowcase';
import { OpenDesignPrivateEvents } from '../components/home/OpenDesignPrivateEvents';
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
  XCircle,
  Play,
  Users,
  Ship,
  HelpCircle,
  ChevronDown,
  Star,
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
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

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

  const handleVesselShowcaseBook = (vesselId: string, bookingDetails?: any) => {
    const matched = featuredCruises.find(
      (c) => (c.slug || c.id) === vesselId || c.title?.toLowerCase().includes(vesselId.replace(/-/g, ' '))
    );
    if (matched) {
      onBookCruise(matched);
    } else {
      onNavigate('explore', JSON.stringify({ vessel_id: vesselId, ...bookingDetails }));
    }
  };

  const faqs = [
    {
      q: 'How does real-time slot locking prevent double booking?',
      a: 'When you begin a charter reservation, Cross-Hunt locks the vessel for your chosen departure date and time window server-side. No other customer or operator can confirm an overlapping reservation on that ship.'
    },
    {
      q: 'What is the difference between Public Tours and Private Charters?',
      a: 'Public Tours allow you to book individual passenger tickets or cabin berths on scheduled itineraries with inclusive catering and entertainment. Private Charters give you exclusive whole-boat booking for weddings, parties, or corporate retreats.'
    },
    {
      q: 'Are all vessels and crew members licensed and verified?',
      a: 'Yes. Every vessel registered on Cross-Hunt undergoes inspection for maritime seaworthiness, valid marine insurance, and passenger safety certifications with verified licensed captains.'
    },
    {
      q: 'How do I receive my boarding pass and tax invoice?',
      a: 'Immediately upon booking confirmation, your digital boarding pass with a secure QR code and official itemized GST tax invoice are generated in your Traveler Passport and can be downloaded or sent via WhatsApp.'
    }
  ];

  return (
    <div className="relative min-h-screen bg-[#f8f9fa] text-[#051833] selection:bg-[#0284c7]/20 selection:text-[#051833]">
      {/* ============================================================ */}
      {/* 1. CINEMATIC LUXURY HERO SECTION (OD STUDIO)                */}
      {/* ============================================================ */}
      <section
        className="relative z-10 min-h-[96vh] flex flex-col justify-center pt-28 pb-20 overflow-hidden bg-[#f8f9fa]"
        style={{
          background: 'radial-gradient(circle at 80% 20%, rgba(2, 132, 199, 0.08) 0%, transparent 55%), radial-gradient(circle at 20% 80%, rgba(255, 248, 220, 0.6) 0%, transparent 60%), #f8f9fa',
        }}
      >
        {/* Full-bleed maritime background with clear ship visibility */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-80 sm:opacity-85">
          <img
            src="/assets/hero-ship-sunset.jpg"
            alt="Luxury Maritime Flagship"
            className="w-full h-full object-cover object-[75%_center] lg:object-[68%_center] animate-od-drift"
            onError={(e) => {
              const target = e.currentTarget;
              if (!target.src.includes('photo1_cruise_hero_bg.jpg')) {
                target.src = '/photo1_cruise_hero_bg.jpg';
              }
            }}
          />
        </div>

        {/* Soft directional gradient overlays:
            1. Left-to-right fade gives maximum text readability on the left while leaving the ship in full view on the right
            2. Subtle bottom fade blends seamlessly into the curved wave marquee */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#f8f9fa] via-[#f8f9fa]/85 md:via-[#f8f9fa]/60 to-transparent pointer-events-none z-0" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#f8f9fa] via-transparent to-transparent pointer-events-none z-0" />

        <div className="relative z-10 max-w-[1400px] mx-auto w-full px-4 sm:px-6 lg:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center mb-8">
            {/* Left Headline Area */}
            <div className="lg:col-span-8 space-y-5 text-left relative">
              {/* Massive Oversized Luxury Headline with Hand-Drawn Wavy Underline */}
              <h1 className="hero-heading-more text-5xl sm:text-7xl lg:text-8xl font-black text-[#051833] drop-shadow-sm font-serif text-stroke-dark">
                Charter The Seas.<br />
                <span className="text-[#0284c7] italic font-serif text-stroke-dark">Redefine Luxury.</span>
              </h1>

              <p className="text-sm sm:text-base text-slate-600 max-w-xl font-medium leading-relaxed">
                Cross Hunt OD Studio operates an exclusive verified fleet of luxury yachts, private party catamarans, and scheduled ocean trips across India’s premier coastal gateways.
              </p>

              {/* CTAs with OD Studio Luxury Buttons */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <button
                  onClick={() => onNavigate('explore')}
                  className="px-6 py-3 rounded-full bg-[#051833] hover:bg-[#0a2548] text-[#fff8dc] text-sm font-black transition flex items-center gap-2 shadow-lg shadow-[#051833]/15 cursor-pointer"
                >
                  <span>Explore Fleet & Ships</span>
                  <ArrowRight className="w-4 h-4 text-[#fff8dc]" />
                </button>

                <button
                  onClick={() => onNavigate('tours')}
                  className="px-6 py-3 rounded-full bg-white hover:bg-slate-50 text-[#051833] border border-[#0284c7]/25 text-sm font-bold shadow-sm transition flex items-center gap-2 cursor-pointer"
                >
                  <span>Public Tours</span>
                  <ArrowRight className="w-4 h-4 text-[#0284c7]" />
                </button>

                <button
                  onClick={() => onNavigate('events')}
                  className="px-6 py-3 rounded-full bg-sky-50 hover:bg-sky-100 text-[#0284c7] border border-[#0284c7]/30 text-sm font-semibold transition flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  <Sparkles className="w-4 h-4 text-[#0284c7]" />
                  <span>Private Events</span>
                </button>
              </div>
            </div>

            {/* Right: Floating Circular Fact Badges with Blue Light Glow */}
            <div className="lg:col-span-4 hidden lg:flex flex-col items-end gap-5">
              <div className="fact-circle-badge animate-float-1 bg-white/95 border-2 border-sky-400 shadow-[0_0_20px_rgba(14,165,233,0.35),0_0_40px_rgba(56,189,248,0.2)] ring-1 ring-sky-300/40 text-[#051833]">
                <span className="font-heading-more text-2xl font-black text-[#051833] leading-none">31+</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-1">Verified Fleet</span>
              </div>
              <div className="fact-circle-badge mr-8 animate-float-2 bg-white/95 border-2 border-sky-400 shadow-[0_0_20px_rgba(14,165,233,0.35),0_0_40px_rgba(56,189,248,0.2)] ring-1 ring-sky-300/40 text-[#051833]">
                <span className="font-heading-more text-2xl font-black text-[#0284c7] leading-none">100%</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-1">Licensed Crew</span>
              </div>
              <div className="fact-circle-badge animate-float-3 bg-white/95 border-2 border-sky-400 shadow-[0_0_20px_rgba(14,165,233,0.35),0_0_40px_rgba(56,189,248,0.2)] ring-1 ring-sky-300/40 text-[#051833]">
                <span className="font-heading-more text-2xl font-black text-[#051833] leading-none">0%</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-1">Overlap Risk</span>
              </div>
            </div>
          </div>

          {/* Integrated Search Widget */}
          <div className="pt-2 max-w-4xl mr-auto">
            <RequirementSearch onSearch={handleRequirementSearch} />
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 2. DYNAMIC CURVED WAVE MARQUEE TICKER (More-Nutrition Style) */}
      {/* ============================================================ */}
      <CurvedMarqueeBanner />

      {/* ============================================================ */}
      {/* 2. UPCOMING SCHEDULED PUBLIC CRUISE TOURS                    */}
      {/* ============================================================ */}
      {upcomingTours.length > 0 && (
        <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-sky-50 text-[#0284c7] text-xs font-bold uppercase tracking-wider mb-2 border border-[#0284c7]/30">
                <Waves className="w-3.5 h-3.5 text-[#0284c7]" />
                Scheduled Cruise Expeditions
              </div>
              <h2 className="section-heading-more text-3xl sm:text-5xl font-black tracking-tight font-serif text-[#051833]">
                Upcoming Public Tours
              </h2>
              <p className="text-slate-600 text-sm max-w-xl mt-2 font-medium">
                Reserve individual passenger tickets or cabin berths on scheduled departures with gourmet catering and island excursions.
              </p>
            </div>

            <button
              onClick={() => onNavigate('tours')}
              className="px-5 py-2.5 rounded-full bg-white border border-[#0284c7]/25 text-[#051833] hover:bg-slate-50 transition flex items-center gap-2 text-xs font-bold self-start md:self-auto cursor-pointer shadow-sm"
            >
              <span>Explore All Tours</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#0284c7]" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {upcomingTours.map((tour) => (
              <div
                key={tour.id}
                className="card-marine-soft group rounded-3xl bg-white border border-[#0284c7]/20 hover:border-[#0284c7]/50 text-[#051833] overflow-hidden flex flex-col justify-between shadow-md hover:shadow-xl transition-all duration-300"
              >
                <div className="relative h-56 overflow-hidden bg-slate-100">
                  <img
                    src={tour.tour_image || tour.ship_image || tour.image_url || '/static/images/placeholder.png'}
                    alt={tour.tour_title}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                    onError={(e) => {
                      const target = e.currentTarget;
                      if (!target.src.includes('placeholder.png')) {
                        target.src = '/static/images/placeholder.png';
                      }
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#051833]/90 via-[#051833]/25 to-transparent" />
                  <div className="absolute top-3.5 left-3.5 right-3.5 flex justify-between items-center">
                    <span className="px-2.5 py-1 rounded-full bg-white/95 backdrop-blur-md text-[#051833] text-[10px] font-bold uppercase tracking-wider border border-[#0284c7]/20 shadow-sm">
                      {tour.ship_name}
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-[#0284c7] text-[#fff8dc] text-[10px] font-black uppercase tracking-wider shadow-sm">
                      {tour.remaining_capacity} Seats Left
                    </span>
                  </div>
                  <div className="absolute bottom-3.5 left-3.5 right-3.5 text-white">
                    <p className="text-[11px] font-bold text-sky-300 flex items-center gap-1 text-stroke-white-subtle">
                      <MapPin className="w-3.5 h-3.5 text-sky-300" />
                      {tour.departure_port} → {tour.destination}
                    </p>
                    <h3 className="font-heading-more text-lg text-white font-bold line-clamp-1 mt-0.5 text-stroke-white">{tour.tour_title}</h3>
                  </div>
                </div>

                <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                  <div className="grid grid-cols-2 gap-2 text-xs bg-[#f8f9fa] p-2.5 rounded-2xl border border-slate-200">
                    <span className="flex items-center gap-1 text-slate-700 font-semibold">
                      <Calendar className="w-3.5 h-3.5 text-[#0284c7] shrink-0" />
                      <span className="font-mono-numbers">{tour.departure_date}</span>
                    </span>
                    <span className="flex items-center gap-1 text-slate-700 font-semibold">
                      <Clock className="w-3.5 h-3.5 text-[#0284c7] shrink-0" />
                      <span className="font-mono-numbers">{tour.duration_days} Days</span>
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">From</span>
                      <span className="font-mono-numbers text-xl font-black text-[#051833]">{formatINR(tour.adult_price)}</span>
                      <span className="text-[10px] text-slate-500 block">/ adult</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onSelectTour ? onSelectTour(tour) : onNavigate('tours')}
                        className="px-3.5 py-2 rounded-full border border-slate-200 bg-white text-xs font-bold text-[#051833] hover:bg-slate-50 transition cursor-pointer shadow-sm"
                      >
                        Itinerary
                      </button>
                      <button
                        onClick={() => onBookTour ? onBookTour(tour) : onNavigate('tours')}
                        className="px-4 py-2 rounded-full bg-[#051833] hover:bg-[#0a2548] text-[#fff8dc] text-xs font-black transition flex items-center gap-1.5 shadow-md shadow-[#051833]/15 cursor-pointer"
                      >
                        <span>Book Ticket</span>
                        <ArrowRight className="w-3 h-3 text-[#fff8dc]" />
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
      {/* 3. INTERACTIVE MORE-NUTRITION STYLE VESSEL SHOWCASE STAGE    */}
      {/* ============================================================ */}
      <VesselShowcaseStage
        onBookVessel={handleVesselShowcaseBook}
        onExploreAll={() => onNavigate('explore')}
      />

      {/* ============================================================ */}
      {/* 3B. OPEN DESIGN INTERACTIVE VESSEL DECK PLAN SHOWCASE        */}
      {/* ============================================================ */}
      <OpenDesignDeckShowcase
        onExploreSuite={(_deckId) => onNavigate('explore')}
        onBookVoyage={() => {
          if (featuredCruises.length > 0) {
            onBookCruise(featuredCruises[0]);
          } else {
            onNavigate('explore');
          }
        }}
      />


      {/* ============================================================ */}
      {/* 4. FEATURED LUXURY SHIPS SECTION (OD STUDIO FLEET)           */}
      {/* ============================================================ */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 border-t border-[#0284c7]/15">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-sky-50 text-[#0284c7] text-xs font-bold uppercase tracking-wider mb-2 border border-[#0284c7]/30">
              <Anchor className="w-3.5 h-3.5 text-[#0284c7]" />
              OD Studio Private Fleet
            </div>
            <h2 className="section-heading-more text-3xl sm:text-5xl font-black tracking-tight font-serif text-[#051833]">
              Featured Flagship Fleet
            </h2>
            <p className="text-slate-600 text-sm max-w-xl mt-2 font-medium">
              Privately charter ocean ships and boats configured for grand weddings, executive conclaves, and milestone celebrations.
            </p>
          </div>

          <button
            onClick={() => onNavigate('explore')}
            className="px-5 py-2.5 rounded-full bg-white border border-[#0284c7]/25 text-[#051833] hover:bg-slate-50 transition flex items-center gap-2 text-xs font-bold self-start md:self-auto cursor-pointer shadow-sm"
          >
            <span>View All Ships</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#0284c7]" />
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
      {/* 4B. OPEN DESIGN PRIVATE MARITIME EVENTS & CHARTER CALCULATOR */}
      {/* ============================================================ */}
      <OpenDesignPrivateEvents
        onNavigateToEvents={() => onNavigate('events')}
        onInquireEvent={(details) => {
          onNavigate('events', JSON.stringify(details));
        }}
      />

      {/* ============================================================ */}
      {/* 4. "SEE THE DIFFERENCE" — OD STUDIO MARITIME STANDARD        */}
      {/* ============================================================ */}
      <section className="py-20 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-sky-50 text-[#0284c7] text-xs font-bold uppercase tracking-wider mb-2 border border-[#0284c7]/30">
            <Award className="w-3.5 h-3.5 text-[#0284c7]" />
            Direct Maritime Standard
          </div>
          <h2 className="section-heading-more text-3xl sm:text-5xl font-black tracking-tight font-serif text-[#051833]">
            See The Difference.
          </h2>
          <p className="text-slate-600 text-sm mt-2 font-medium">
            How Cross-Hunt’s verified maritime booking platform compares to traditional unverified local agents.
          </p>
        </div>

        <div className="marine-compare-table rounded-3xl overflow-hidden border-2 border-sky-400 bg-white shadow-[0_0_30px_rgba(14,165,233,0.35),0_0_60px_rgba(56,189,248,0.2)] ring-1 ring-sky-300/40">
          {/* Header Row */}
          <div className="marine-compare-row bg-sky-50/80 text-[#051833] font-bold text-xs uppercase tracking-wider border-b border-[#0284c7]/20">
            <span>Platform Capabilities & Guarantees</span>
            <span className="text-center text-[#0284c7] font-black">Cross-Hunt OD Studio</span>
            <span className="text-center text-slate-500">Local Agents</span>
          </div>

          {/* Rows */}
          {[
            {
              title: 'Real-Time Direct Slot Locking',
              desc: 'Server-side timestamp reservation prevents double booking',
              cross: true,
              other: false,
            },
            {
              title: '100% Certified Captains & Seaworthy Audits',
              desc: 'Verified maritime licenses, marine insurance, and safety equipment',
              cross: true,
              other: false,
            },
            {
              title: 'Itemized GST Tax Invoice & Clear Pricing',
              desc: 'Official tax invoice with zero hidden pier charges or dock fees',
              cross: true,
              other: false,
            },
            {
              title: 'Live WhatsApp Reminders & GPS Boarding QR Pass',
              desc: 'Instant QR ticket scanning at jetty and automated departure updates',
              cross: true,
              other: false,
            },
            {
              title: 'Guaranteed Full Vessel or Stateroom Berth',
              desc: 'Direct contract ensuring your vessel is clean, fueled, and ready',
              cross: true,
              other: false,
            },
            {
              title: '24/7 AI Maritime Concierge',
              desc: 'Instant ticket lookup, weather checking, and itinerary assistance',
              cross: true,
              other: false,
            },
          ].map((item, idx) => (
            <div key={idx} className="marine-compare-row border-b border-slate-100 bg-white hover:bg-slate-50/60 transition-colors">
              <div>
                <h4 className="font-bold text-sm text-[#051833]">{item.title}</h4>
                <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
              </div>

              <div className="flex justify-center">
                <div className="w-8 h-8 rounded-full bg-sky-50 border border-[#0284c7]/30 flex items-center justify-center text-[#0284c7]">
                  <CheckCircle2 className="w-5 h-5 fill-[#0284c7]/10" />
                </div>
              </div>

              <div className="flex justify-center">
                <div className="w-8 h-8 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-500">
                  <XCircle className="w-5 h-5" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ============================================================ */}
      {/* 5. POPULAR COASTAL PORTS & MARITIME HUBS                    */}
      {/* ============================================================ */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 border-t border-[#0284c7]/15">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-sky-50 text-[#0284c7] text-xs font-bold uppercase tracking-wider mb-2 border border-[#0284c7]/30">
              <Navigation className="w-3.5 h-3.5 text-[#0284c7]" />
              Verified Coastal Gateways
            </div>
            <h2 className="section-heading-more text-3xl sm:text-5xl font-black tracking-tight font-serif text-[#051833]">
              Popular Maritime Hubs
            </h2>
            <p className="text-slate-600 text-sm max-w-xl mt-2 font-medium">
              Select your departure port to discover available charter boats, private catamarans, and scheduled passenger liners.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {[
            { name: 'Goa', port: 'Mandovi River & Mormugao', count: '10+ Ships', image: '/static/images/vessels/mandovi_pride.jpg' },
            { name: 'Mumbai', port: 'International Cruise Terminal', count: '6+ Ships', image: '/static/images/vessels/cordelia_empress.jpg' },
            { name: 'Andaman & Nicobar', port: 'Port Blair & Havelock', count: '8+ Ships', image: '/static/images/vessels/nautika_catamaran.jpg' },
            { name: 'Lakshadweep', port: 'Agatti & Kavaratti', count: '4+ Ships', image: '/static/images/vessels/lacadives_charter.jpg' },
            { name: 'Kochi', port: 'Marine Drive & Backwaters', count: '4+ Ships', image: '/static/images/vessels/swastik_voyager.jpg' },
          ].map((hub) => (
            <button
              key={hub.name}
              onClick={() => onNavigate('explore', JSON.stringify({ location: hub.name }))}
              className="card-marine-soft group text-left overflow-hidden cursor-pointer flex flex-col rounded-2xl bg-white border border-[#0284c7]/15 hover:border-[#0284c7]/60 shadow-md hover:shadow-xl transition-all"
            >
              <div className="h-32 overflow-hidden relative bg-slate-100">
                <img
                  src={hub.image}
                  alt={hub.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                  onError={(e) => {
                    e.currentTarget.src = '/static/images/vessels/cordelia_empress.jpg';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#051833]/80 via-transparent to-transparent" />
                <span className="absolute bottom-2 left-2 text-[10px] font-bold text-[#0284c7] bg-white/95 px-2 py-0.5 rounded-full backdrop-blur-sm border border-[#0284c7]/20 shadow-sm">
                  {hub.count}
                </span>
              </div>
              <div className="p-3.5">
                <h3 className="font-heading-more text-base text-[#051833] group-hover:text-[#0284c7] transition">{hub.name}</h3>
                <p className="text-[11px] text-slate-500 truncate mt-0.5">{hub.port}</p>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* ============================================================ */}
      {/* 6. PRIVATE MARITIME EVENTS & CURATED PACKAGES                */}
      {/* ============================================================ */}
      <section className="py-20 relative overflow-hidden bg-gradient-to-br from-sky-50 via-white to-sky-100 text-[#051833] border-t border-[#0284c7]/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white text-[#0284c7] border border-[#0284c7]/30 text-xs font-bold uppercase tracking-wider shadow-sm">
                <Sparkles className="w-3.5 h-3.5 text-[#0284c7]" />
                Exclusive Private Charters
              </span>
              <h2 className="hero-heading-more text-4xl sm:text-6xl font-black text-[#051833] leading-tight font-serif">
                Host Your Milestone at Sea.
              </h2>
              <p className="text-slate-700 text-sm sm:text-base leading-relaxed font-medium">
                From sunset deck weddings with panoramic coastal horizons to corporate retreats and private DJ parties, our maritime rental platform turns celebrations into unforgettable memories.
              </p>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="p-5 rounded-2xl bg-white border border-[#0284c7]/20 shadow-md">
                  <p className="font-mono-numbers font-black text-3xl text-[#0284c7]">30 – 350</p>
                  <p className="text-xs text-slate-500 mt-1 font-semibold">Guest Capacities</p>
                </div>
                <div className="p-5 rounded-2xl bg-white border border-[#0284c7]/20 shadow-md">
                  <p className="font-heading-more font-black text-3xl text-[#051833]">3 Curated</p>
                  <p className="text-xs text-slate-500 mt-1 font-semibold">Luxury Event Packages</p>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => onNavigate('events')}
                  className="px-6 py-3 rounded-full bg-[#051833] hover:bg-[#0a2548] text-[#fff8dc] text-sm font-black transition flex items-center gap-2 shadow-lg shadow-[#051833]/15 cursor-pointer"
                >
                  <span>Explore Event Packages</span>
                  <ArrowRight className="w-4 h-4 text-[#fff8dc]" />
                </button>
              </div>
            </div>

            <div className="relative rounded-3xl overflow-hidden aspect-[4/3] border border-[#0284c7]/30 shadow-2xl">
              <img
                src="/static/images/vessels/navora_yacht.jpg"
                alt="Private Luxury Yacht Event"
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-700 ease-out"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#051833]/90 via-transparent to-transparent" />
              <div className="absolute bottom-6 left-6 right-6">
                <p className="text-xs font-bold uppercase tracking-widest text-sky-300 text-stroke-white-subtle">
                  Signature Charter Package
                </p>
                <p className="text-2xl font-serif font-black text-white mt-1 text-stroke-white">
                  Diamond Horizon Royal Gala
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 7. CUSTOMER TESTIMONIALS & PASSENGER REVIEWS (MORE NUTRITION)*/}
      {/* ============================================================ */}
      <VoyagerMediaSection />

      {/* ============================================================ */}
      {/* 8. FREQUENTLY ASKED QUESTIONS (FAQ ACCORDION)                */}
      {/* ============================================================ */}
      <section className="py-20 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 border-t border-[#0284c7]/15">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-sky-50 text-[#0284c7] text-xs font-bold uppercase tracking-wider mb-2 border border-[#0284c7]/30">
            <HelpCircle className="w-3.5 h-3.5 text-[#0284c7]" />
            Everything You Need To Know
          </div>
          <h2 className="section-heading-more text-3xl sm:text-5xl font-black tracking-tight font-serif text-[#051833]">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = activeFaq === idx;
            return (
              <div
                key={idx}
                className="rounded-2xl bg-white border border-slate-200 overflow-hidden transition-all duration-200 hover:border-[#0284c7]/40 shadow-sm"
              >
                <button
                  type="button"
                  onClick={() => setActiveFaq(isOpen ? null : idx)}
                  className="w-full text-left p-5 flex items-center justify-between gap-4 font-bold text-sm text-[#051833] hover:text-[#0284c7] cursor-pointer"
                >
                  <span>{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-[#0284c7] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 text-xs text-slate-600 leading-relaxed font-medium border-t border-slate-100 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ============================================================ */}
      {/* 9. FINAL CINEMATIC CALL TO ACTION (OD Studio Deep Luxury)    */}
      {/* ============================================================ */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-[#0284c7]/15 relative">
        {/* Soft Ambient Blue Light Glow Aura */}
        <div className="absolute inset-x-6 sm:inset-x-12 top-20 bottom-20 rounded-[2.5rem] bg-gradient-to-r from-sky-400 via-blue-500 to-cyan-300 opacity-35 blur-2xl pointer-events-none" />

        <div className="rounded-[2.5rem] bg-gradient-to-r from-sky-50 via-white to-sky-100 p-10 sm:p-16 text-center text-[#051833] relative overflow-hidden border-2 border-sky-400 shadow-[0_0_30px_rgba(14,165,233,0.35),0_0_60px_rgba(56,189,248,0.2)] ring-1 ring-sky-300/40">
          {/* Background Ship Watermark */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
            <div className="absolute inset-0 w-full h-full opacity-30 sm:opacity-35 pointer-events-none">
              <img
                src="/assets/footer-cool-ship.jpg"
                alt="Luxury Cruise Ship Background"
                className="w-full h-full object-cover object-[center_42%] filter saturate-125"
                onError={(e) => {
                  const target = e.currentTarget;
                  if (!target.src.includes('hero-ship-sunset.jpg')) {
                    target.src = '/assets/hero-ship-sunset.jpg';
                  }
                }}
              />
            </div>
            {/* Soft luminous gradient overlay ensuring perfect text contrast */}
            <div className="absolute inset-0 bg-gradient-to-r from-sky-50/85 via-white/80 to-sky-100/85 pointer-events-none" />
          </div>

          <div className="relative z-10 max-w-2xl mx-auto space-y-6">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white backdrop-blur-md border border-[#0284c7]/30 text-[#0284c7] text-xs font-bold uppercase tracking-wider shadow-sm">
              Ready for the Ocean?
            </span>
            <h2 className="hero-heading-more text-4xl sm:text-6xl font-black font-serif text-[#051833]">
              Reserve Your Trip Today.
            </h2>
            <p className="text-sm sm:text-base text-slate-600 font-medium leading-relaxed">
              Explore 31+ luxury ocean vessels and scheduled cruise lines with verified crew, transparent tax invoices, and real-time slot locking.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
              <button
                onClick={() => onNavigate('explore')}
                className="px-6 py-3 rounded-full bg-[#051833] hover:bg-[#0a2548] text-[#fff8dc] text-sm font-black transition flex items-center gap-2 shadow-lg shadow-[#051833]/15 cursor-pointer"
              >
                <span>Charter a Ship</span>
                <ArrowRight className="w-4 h-4 text-[#fff8dc]" />
              </button>

              <button
                onClick={() => onNavigate('tours')}
                className="px-6 py-3 rounded-full bg-white hover:bg-slate-50 text-[#051833] border border-[#0284c7]/30 text-sm font-bold transition flex items-center gap-2 cursor-pointer shadow-sm"
              >
                <span>Explore Tours</span>
                <ArrowRight className="w-4 h-4 text-[#0284c7]" />
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
