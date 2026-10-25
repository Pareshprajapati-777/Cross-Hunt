import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Anchor, ShieldCheck, Compass, Sparkles, MapPin, Waves } from 'lucide-react';

interface FooterProps {
  onNavigate?: (tab: string, param?: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate: propOnNavigate }) => {
  const navigate = useNavigate();

  const onNavigate = (tab: string, param?: string) => {
    if (propOnNavigate) {
      propOnNavigate(tab, param);
      return;
    }
    const routeMap: Record<string, string> = {
      home: '/',
      explore: param ? `/explore?query=${encodeURIComponent(param)}` : '/explore',
      tours: '/tours',
      activities: '/activities',
      events: '/events',
      dashboard: '/dashboard',
      owner: '/owner',
      'admin-panel': '/admin-panel',
      login: '/login',
      register: '/register',
    };
    if (routeMap[tab]) {
      navigate(routeMap[tab]);
    }
  };

  return (
    <footer className="relative overflow-hidden text-[#334155] text-xs bg-gradient-to-b from-[#f8f9fa] via-[#f1f5f9]/50 to-[#fff7ed]/40">
      {/* Feathered seamless top divider merging naturally with page */}
      <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-slate-300/40 to-transparent" />

      {/* Subtle Maritime Cruise Ship & Superyacht Background Image */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute inset-0 w-full h-full opacity-20 sm:opacity-25 pointer-events-none">
          <img
            src="/assets/footer-cool-ship.jpg"
            alt="Maritime Cruise Ship & Superyacht Ambient Backdrop"
            className="w-full h-full object-cover object-[center_42%] filter saturate-125"
            onError={(e) => {
              const target = e.currentTarget;
              if (!target.src.includes('hero-ship-sunset.jpg')) {
                target.src = '/assets/hero-ship-sunset.jpg';
              }
            }}
          />
        </div>

        {/* Seamless top & bottom gradient blend so the ship image merges smoothly into page with no hard cuts */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#f8f9fa] via-transparent to-[#f8f9fa]/70 pointer-events-none" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          {/* Col 1: Brand & Identity */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-sky-100 to-orange-100 border border-orange-200/90 flex items-center justify-center p-2 shadow-xs">
                <Anchor className="w-5 h-5 text-orange-500" />
              </div>
              <span className="font-heading-more text-lg text-[#051833] tracking-wider font-black">
                CROSS <span className="text-[#0284c7]">HUNT</span>
              </span>
            </div>
            <p className="text-[#475569] text-xs leading-relaxed font-medium">
              OD Studio · India's premier luxury maritime platform for verified ship tours, guaranteed private yacht charters, and cinematic ocean milestones.
            </p>
            <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-white/80 backdrop-blur-sm border border-orange-200 text-orange-800 shadow-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#051833]">
                100% Certified Coastal Fleet
              </span>
            </div>
          </div>

          {/* Col 2: Destinations */}
          <div className="space-y-3">
            <h4 className="font-heading-more font-bold text-sm text-[#051833] uppercase tracking-wider">
              Popular Ports & Gateways
            </h4>
            <ul className="space-y-2">
              {[
                'Mumbai & Arabian Sea',
                'Goa Coastal & Mandovi',
                'Lakshadweep Archipelago',
                'Kochi & Malabar Backwaters',
                'Andaman & Nicobar Islands',
                'Chennai & Bay of Bengal',
              ].map((dest, i) => (
                <li key={i}>
                  <button
                    onClick={() => onNavigate('explore', dest)}
                    className="hover:text-orange-600 hover:translate-x-0.5 transition-all cursor-pointer text-left font-medium text-[#334155] flex items-center gap-1.5"
                  >
                    <span className="text-orange-400 text-[10px]">›</span>
                    <span>{dest}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3: Charters & Events */}
          <div className="space-y-3">
            <h4 className="font-heading-more font-bold text-sm text-[#051833] uppercase tracking-wider">
              Maritime Experiences
            </h4>
            <ul className="space-y-2 font-medium text-[#334155]">
              <li>
                <button
                  onClick={() => onNavigate('events')}
                  className="hover:text-orange-600 hover:translate-x-0.5 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <span className="text-orange-400 text-[10px]">›</span>
                  <span>Weddings at Sea</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('events')}
                  className="hover:text-orange-600 hover:translate-x-0.5 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <span className="text-orange-400 text-[10px]">›</span>
                  <span>Corporate Summits & Conclaves</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('events')}
                  className="hover:text-orange-600 hover:translate-x-0.5 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <span className="text-orange-400 text-[10px]">›</span>
                  <span>Milestone Birthday Galas</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('events')}
                  className="hover:text-orange-600 hover:translate-x-0.5 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <span className="text-orange-400 text-[10px]">›</span>
                  <span>Sunset Yacht Charters</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('tours')}
                  className="hover:text-orange-600 hover:translate-x-0.5 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <span className="text-orange-400 text-[10px]">›</span>
                  <span>Scheduled Public Tours</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('activities')}
                  className="hover:text-orange-600 hover:translate-x-0.5 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <span className="text-orange-400 text-[10px]">›</span>
                  <span>Water Sports &amp; Coastal Rides</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Col 4: Operations & Assurance */}
          <div className="space-y-3">
            <h4 className="font-heading-more font-bold text-sm text-[#051833] uppercase tracking-wider">
              Maritime Guarantee
            </h4>
            <div className="p-4 rounded-2xl bg-white/85 backdrop-blur-sm border border-orange-200/90 shadow-md space-y-2.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-[#051833]">
                  Direct Slot Reservation
                </span>
              </div>
              <p className="text-[11px] text-[#475569] leading-relaxed font-medium">
                Server-side slot lock guarantees zero double-booking. Instant digital QR boarding passes and itemized GST tax invoices.
              </p>
              <div className="pt-1 flex items-center gap-1.5 text-[10px] text-orange-700 font-bold uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>24/7 Verified Port Clearance</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Strip */}
        <div className="pt-8 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500 font-medium">
          <p>© {new Date().getFullYear()} Cross Hunt Inc. · Luxury Coastal Maritime Platform.</p>
          <div className="flex items-center space-x-6 flex-wrap">
            <span className="hover:text-orange-600 cursor-pointer transition-colors">Safety Standards & Certified Crew</span>
            <span className="hover:text-orange-600 cursor-pointer transition-colors">Port Terminal Security</span>
            <span className="hover:text-orange-600 cursor-pointer transition-colors">Privacy Policy</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
