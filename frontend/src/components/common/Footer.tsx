import React from 'react';
import { Anchor, Shield } from 'lucide-react';

interface FooterProps {
  onNavigate: (tab: string, param?: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
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
              The premier platform for flagship cruise ship tours, guaranteed stateroom reservations, and exclusive private maritime event charters worldwide.
            </p>
            <div className="flex items-center space-x-2 text-sky-800">
              <Shield className="w-4 h-4 text-sky-600" />
              <span className="text-[11px] font-bold uppercase tracking-wider">
                Certified Oceanic Operators
              </span>
            </div>
          </div>

          {/* Col 2: Destinations */}
          <div className="space-y-3">
            <h4 className="font-display font-bold text-sm text-slate-900 uppercase tracking-wider">
              Flagship Seas & Ports
            </h4>
            <ul className="space-y-2">
              {[
                'Caribbean Paradise Voyages',
                'Greek Isles & Mediterranean',
                'Norwegian Fjords & Arctic',
                'French Riviera & Monaco',
                'South Pacific & Tahiti',
                'Alaska Glacier Bay',
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
              Maritime Experiences
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
                  Stateroom & Suite Catalog
                </button>
              </li>
            </ul>
          </div>

          {/* Col 4: Operations & Assurance */}
          <div className="space-y-3">
            <h4 className="font-display font-bold text-sm text-slate-900 uppercase tracking-wider">
              Nautical Assurance
            </h4>
            <div className="p-4 rounded-2xl bg-white border border-sky-100 shadow-sm space-y-2">
              <span className="text-[11px] font-bold text-slate-900 block">
                Atomic Transaction Guarantee
              </span>
              <p className="text-[11px] text-slate-500 leading-normal font-medium">
                Double-booking prevention is enforced server-side via SQL locks. Digital boarding passes include tamper-evident cryptographic hashes.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Strip */}
        <div className="pt-8 border-t border-sky-200/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500 font-medium">
          <p>© {new Date().getFullYear()} Cross Hunt Maritime Inc. All Rights Reserved.</p>
          <div className="flex items-center space-x-6">
            <span>Maritime Safety Standards SOLAS</span>
            <span>Port Terminal Security</span>
            <span>Privacy & Passenger Bill of Rights</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
