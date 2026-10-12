import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Anchor, Shield } from 'lucide-react';

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
    <footer className="border-t border-sky-200 bg-[#f0f9ff] relative overflow-hidden text-slate-600 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          {/* Col 1: Brand & Identity */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-white border-2 border-sky-400 flex items-center justify-center p-1.5 shadow-sm overflow-hidden">
                <img
                  src="/static/images/logo_icon.png"
                  alt="Emblem"
                  className="w-full h-full object-contain rounded-full filter drop-shadow"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = 'none';
                  }}
                />
                <Anchor className="w-5 h-5 text-sky-600" />
              </div>
              <span className="font-display font-black text-lg text-slate-900 tracking-wider">
                CROSS <span className="text-sky-600">HUNT</span>
              </span>
            </div>
            <p className="text-slate-600 text-xs leading-relaxed font-medium">
              The premier platform for cruise ship tours, guaranteed cabin bookings, and private boat rentals across India.
            </p>
            <div className="flex items-center space-x-2 text-sky-800">
              <Shield className="w-4 h-4 text-sky-600" />
              <span className="text-[11px] font-bold uppercase tracking-wider">
                Certified Boat & Cruise Operators
              </span>
            </div>
          </div>

          {/* Col 2: Destinations */}
          <div className="space-y-3">
            <h4 className="font-display font-bold text-sm text-slate-900 uppercase tracking-wider">
              Popular Ports & Destinations
            </h4>
            <ul className="space-y-2">
              {[
                'Mumbai & Arabian Sea',
                'Goa Coastal & Mormugao',
                'Lakshadweep Archipelago',
                'Kochi & Malabar Coast',
                'Andaman & Nicobar Islands',
                'Chennai & Bay of Bengal',
              ].map((dest, i) => (
                <li key={i}>
                  <button
                    onClick={() => onNavigate('explore', dest)}
                    className="hover:text-sky-700 transition cursor-pointer text-left font-medium"
                  >
                    {dest}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3: Charters & Events */}
          <div className="space-y-3">
            <h4 className="font-display font-bold text-sm text-slate-900 uppercase tracking-wider">
              Cruise & Boat Trips
            </h4>
            <ul className="space-y-2 font-medium">
              <li>
                <button
                  onClick={() => onNavigate('events')}
                  className="hover:text-sky-700 transition cursor-pointer"
                >
                  Weddings at Sea
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('events')}
                  className="hover:text-sky-700 transition cursor-pointer"
                >
                  Corporate Summits & Keynotes
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('events')}
                  className="hover:text-sky-700 transition cursor-pointer"
                >
                  Milestone Birthday Galas
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('events')}
                  className="hover:text-sky-700 transition cursor-pointer"
                >
                  Private Sunset Yacht Parties
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('explore')}
                  className="hover:text-sky-700 transition cursor-pointer"
                >
                  Cabin & Fleet Catalog
                </button>
              </li>
            </ul>
          </div>

          {/* Col 4: Operations & Assurance */}
          <div className="space-y-3">
            <h4 className="font-display font-bold text-sm text-slate-900 uppercase tracking-wider">
              Booking Guarantee
            </h4>
            <div className="p-4 rounded-2xl bg-white border border-sky-100 shadow-sm space-y-2">
              <span className="text-[11px] font-bold text-slate-900 block">
                Instant Confirmation
              </span>
              <p className="text-[11px] text-slate-500 leading-normal font-medium">
                No double-booking guaranteed. Instant digital boarding tickets and itemized GST tax invoices.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Strip */}
        <div className="pt-8 border-t border-sky-200/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500 font-medium">
          <p>© {new Date().getFullYear()} Cross Hunt Inc. All Rights Reserved.</p>
          <div className="flex items-center space-x-6">
            <span>Safety Standards & Certified Crew</span>
            <span>Port Terminal Security</span>
            <span>Privacy Policy</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
