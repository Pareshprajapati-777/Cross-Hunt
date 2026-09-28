import React, { useEffect, useState } from 'react';
import { OceanHeroScene } from '../components/three/OceanHeroScene';
import { RequirementSearch } from '../components/home/RequirementSearch';
import { CruiseCard } from '../components/cruises/CruiseCard';
import { getCruises } from '../api/cruises';
import { Cruise } from '../api/types';
import { ArrowRight, Compass, Sparkles, Shield, Anchor, Award, Waves } from 'lucide-react';

interface HomePageProps {
  onNavigate: (tab: string, param?: string) => void;
  onSelectCruise: (cruise: Cruise) => void;
  onBookCruise: (cruise: Cruise) => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  onNavigate,
  onSelectCruise,
  onBookCruise,
}) => {
  const [featuredCruises, setFeaturedCruises] = useState<Cruise[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCruises({ ordering: '-rating' })
      .then((res) => {
        setFeaturedCruises(res.cruises.slice(0, 6));
      })
      .catch((err) => console.error('Failed to load featured cruises:', err))
      .finally(() => setLoading(false));
  }, []);

  const handleRequirementSearch = (filters: any) => {
    onNavigate('explore', JSON.stringify(filters));
  };

  return (
    <div className="relative min-h-screen bg-[#f8fafc]">
      {/* ============================================================ */}
      {/* 1. CINEMATIC HERO SECTION (BRIGHT MARITIME)                  */}
      {/* ============================================================ */}
      <section className="relative min-h-[92vh] flex items-center justify-center pt-24 pb-16 overflow-hidden">
        {/* 3D Ocean Waves & Floating Cruise Ship Canvas */}
        <OceanHeroScene />

        {/* Ambient atmosphere gradients */}
        <div className="absolute inset-0 bg-gradient-to-b from-sky-100/40 via-transparent to-[#f8fafc] pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          {/* Subtle Nautical Pill */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/95 border border-sky-300 text-sky-800 text-xs sm:text-sm font-bold tracking-wide backdrop-blur-md shadow-sm">
            <Anchor className="w-3.5 h-3.5 text-sky-600" />
            <span>The International Benchmark for Luxury Ocean Voyages</span>
          </div>

          {/* Hero Copy as specified in prompt */}
          <div className="space-y-4 max-w-4xl mx-auto">
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-display font-black text-slate-900 tracking-tight leading-[1.08]">
              BOOK THE SHIP. <br />
              <span className="bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent">
                CREATE THE JOURNEY.
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-slate-600 font-medium max-w-2xl mx-auto">
              Luxury cruises, private events and unforgettable experiences at sea.
            </p>
          </div>

          {/* Primary Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <button
              onClick={() => onNavigate('explore')}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-display font-bold text-base tracking-wide flex items-center justify-center gap-2.5 shadow-xl shadow-sky-500/25 transition-all duration-200 hover:scale-105 cursor-pointer"
            >
              <Compass className="w-5 h-5 text-sky-100" />
              <span>EXPLORE SHIPS</span>
            </button>

            <button
              onClick={() => onNavigate('events')}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white/95 border border-amber-400 hover:border-amber-500 text-amber-800 font-display font-bold text-base tracking-wide flex items-center justify-center gap-2.5 transition-all duration-200 hover:bg-amber-50 shadow-sm cursor-pointer"
            >
              <Sparkles className="w-5 h-5 text-amber-600" />
              <span>PLAN AN EVENT</span>
            </button>
          </div>

          {/* Requirement Search Bar (Signature Interaction) */}
          <div className="pt-8">
            <RequirementSearch onSearch={handleRequirementSearch} />
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 2. FEATURED LUXURY SHIPS SECTION                             */}
      {/* ============================================================ */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-100 text-sky-800 text-xs font-bold uppercase tracking-wider mb-2 border border-sky-200">
              <Waves className="w-3.5 h-3.5 text-sky-600" />
              Handcrafted Maritime Fleet
            </div>
            <h2 className="text-3xl sm:text-4xl font-display font-extrabold text-slate-900 tracking-tight">
              Featured Flagship Vessels
            </h2>
            <p className="text-slate-500 text-base max-w-xl mt-1">
              Select your stateroom on world-class ocean liners engineered for absolute comfort, gourmet dining, and panoramic vistas.
            </p>
          </div>

          <button
            onClick={() => onNavigate('explore')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-sky-50 border border-sky-200 text-sky-800 text-sm font-bold shadow-sm transition cursor-pointer self-start md:self-auto"
          >
            <span>View All Ships</span>
            <ArrowRight className="w-4 h-4 text-sky-600" />
          </button>
        </div>

        {/* Ships Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div
                key={n}
                className="h-96 rounded-3xl bg-slate-200/60 border border-slate-200 animate-pulse"
              />
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
      {/* 3. PRIVATE MARITIME EVENTS TEASER                            */}
      {/* ============================================================ */}
      <section className="py-20 relative overflow-hidden bg-gradient-to-b from-[#f0f9ff] via-[#e0f2fe]/40 to-[#f8fafc]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="bg-white rounded-3xl p-8 sm:p-12 border border-sky-200 shadow-xl relative overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
              <div className="space-y-6">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 border border-amber-300 text-amber-800 text-xs font-bold uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  Exclusive Private Charters
                </span>
                <h2 className="text-3xl sm:text-5xl font-display font-extrabold text-slate-900 leading-tight">
                  Host Your Milestone Moment at Sea
                </h2>
                <p className="text-slate-600 text-base leading-relaxed">
                  From rooftop sunset wedding vows and oceanfront corporate keynotes to private DJ yacht parties under starlight, our luxury charters redefine hospitality.
                </p>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="p-4 rounded-2xl bg-sky-50 border border-sky-100">
                    <p className="font-display font-bold text-2xl text-sky-800">100 - 2,400</p>
                    <p className="text-xs text-slate-500 mt-0.5 font-medium">Flexible Guest Capacities</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100">
                    <p className="font-display font-bold text-2xl text-amber-700">3 Curated</p>
                    <p className="text-xs text-slate-500 mt-0.5 font-medium">Luxury Event Packages</p>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => onNavigate('events')}
                    className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-display font-bold text-sm tracking-wide shadow-md shadow-amber-500/20 transition cursor-pointer"
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
                  <p className="text-xl font-display font-bold text-white mt-1">
                    Diamond Horizon Gala Experience
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 4. FLEET EXCELLENCE & STANDARDS                              */}
      {/* ============================================================ */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <h2 className="text-3xl font-display font-extrabold text-slate-900 tracking-tight">
            Crafted for Unmatched Maritime Elegance
          </h2>
          <p className="text-slate-500 text-base">
            Every voyage on Cross Hunt conforms to stringent nautical standards, verified staterooms, and transparent server-calculated pricing.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-8 rounded-3xl bg-white border border-sky-100 shadow-md space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-sky-100 border border-sky-200 flex items-center justify-center text-sky-700">
              <Shield className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-display font-bold text-slate-900">Guaranteed Staterooms</h3>
            <p className="text-slate-500 text-sm leading-relaxed">
              Atomic transactional locking prevents double-booking. Your chosen stateroom and embarkation schedule are guaranteed.
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-white border border-sky-100 shadow-md space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-700">
              <Award className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-display font-bold text-slate-900">Michelin-Trained Chefs</h3>
            <p className="text-slate-500 text-sm leading-relaxed">
              Indulge in panoramic fine dining, seafood cellars, and complimentary 24/7 stateroom room service on all ocean voyages.
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-white border border-sky-100 shadow-md space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-700">
              <Anchor className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-display font-bold text-slate-900">Verified Vessel Captains</h3>
            <p className="text-slate-500 text-sm leading-relaxed">
              Licensed maritime operators and masters with decades of navigational experience across the Mediterranean, Caribbean, and Arctic.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
