import React, { useState } from 'react';
import {
  MapPin,
  Calendar,
  Users,
  Clock,
  Ship,
  Anchor,
  Search,
  ArrowRight,
  Sparkles,
  Gift,
  ChevronDown,
  Compass,
} from 'lucide-react';

interface RequirementSearchProps {
  onSearch: (filters: {
    search_mode: 'PRIVATE_CHARTER' | 'PUBLIC_CRUISE';
    city?: string;
    departure_port?: string;
    destination?: string;
    departureDate?: string;
    passengers?: number;
    guests?: number;
    duration?: string;
    vessel_category?: string;
    event_type?: string;
  }) => void;
}

const CITIES = [
  { id: '', label: 'All Cities / Harbours' },
  { id: 'Goa', label: 'Goa (Mandovi River & Panaji)' },
  { id: 'Mumbai', label: 'Mumbai (Arabian Sea Harbour)' },
  { id: 'Andaman', label: 'Andaman (Port Blair & Havelock)' },
  { id: 'Kochi', label: 'Kochi (Marine Drive & Backwaters)' },
  { id: 'Lakshadweep', label: 'Lakshadweep Archipelago' },
];

const DEPARTURE_PORTS = [
  { id: '', label: 'All Departure Ports' },
  { id: 'Mumbai', label: 'Mumbai Cruise Terminal' },
  { id: 'Panaji', label: 'Goa / Panaji Jetty' },
  { id: 'Kochi', label: 'Kochi Marine Drive' },
  { id: 'Port Blair', label: 'Port Blair Haddo Wharf' },
  { id: 'Swaraj Dweep', label: 'Havelock Jetty' },
];

const PUBLIC_DESTINATIONS = [
  { id: '', label: 'All Cruise Destinations' },
  { id: 'Goa', label: 'Goa (Mormugao Port)' },
  { id: 'Lakshadweep', label: 'Lakshadweep (Agatti / Kavaratti)' },
  { id: 'Mandovi River', label: 'Mandovi River (Sunset / Dinner)' },
  { id: 'Havelock', label: 'Swaraj Dweep (Havelock Island)' },
  { id: 'Cochin Harbour', label: 'Cochin Harbour' },
];

const VESSEL_CATEGORIES = [
  { id: '', label: 'All Categories' },
  { id: 'YACHT', label: 'Private Yacht' },
  { id: 'BOAT', label: 'Private Boat / Catamaran' },
  { id: 'PARTY_BOAT', label: 'Party Boat (DJ Deck)' },
  { id: 'RIVER_CRUISE', label: 'River Cruise Vessel' },
  { id: 'SEA_CRUISE', label: 'Sea Cruise Vessel' },
  { id: 'FERRY', label: 'High-Speed Ferry' },
];

const CHARTER_DURATIONS = [
  { id: '', label: 'Any Duration' },
  { id: '1 Hour', label: '1 Hour' },
  { id: '2.5 Hours', label: '2.5 Hours' },
  { id: '4 Hours', label: '4 Hours (Half Day)' },
  { id: 'Full Day', label: 'Full Day' },
  { id: 'Overnight', label: 'Overnight / Multi-Day' },
];

const POPULAR_SEARCHES = [
  { label: 'Goa Yacht', city: 'Goa', category: 'YACHT', image: '/static/images/vessels/navora_yacht.jpg', mode: 'PRIVATE_CHARTER' as const },
  { label: 'Mumbai Cruise', port: 'Mumbai', image: '/static/images/tours/cordelia_mumbai_goa.jpg', mode: 'PUBLIC_CRUISE' as const },
  { label: 'Andaman Boats', city: 'Andaman', category: 'BOAT', image: '/static/images/vessels/andaman_yacht.jpg', mode: 'PRIVATE_CHARTER' as const },
  { label: 'Kochi Backwaters', city: 'Kochi', image: '/static/images/vessels/classic_paradise.jpg', mode: 'PRIVATE_CHARTER' as const },
  { label: 'Lakshadweep', destination: 'Lakshadweep', image: '/static/images/tours/lakshadweep_coral_odyssey.jpg', mode: 'PUBLIC_CRUISE' as const },
  { label: 'Party Cruise', city: 'Goa', category: 'PARTY_BOAT', image: '/static/images/tours/mandovi_dj_party_boat.jpg', mode: 'PRIVATE_CHARTER' as const },
  { label: 'Sunset Cruise', destination: 'Mandovi River', image: '/static/images/tours/mandovi_sunset_cultural.jpg', mode: 'PUBLIC_CRUISE' as const },
];

export const RequirementSearch: React.FC<RequirementSearchProps> = ({ onSearch }) => {
  const [mode, setMode] = useState<'PRIVATE_CHARTER' | 'PUBLIC_CRUISE'>('PRIVATE_CHARTER');

  // Private Charter State
  const [city, setCity] = useState('');
  const [privateDate, setPrivateDate] = useState('');
  const [passengers, setPassengers] = useState<number>(10);
  const [duration, setDuration] = useState('');
  const [vesselCategory, setVesselCategory] = useState('');

  // Public Cruise State
  const [departurePort, setDeparturePort] = useState('');
  const [destination, setDestination] = useState('');
  const [publicDate, setPublicDate] = useState('');
  const [ticketCount, setTicketCount] = useState<number>(2);

  const [showEventMenu, setShowEventMenu] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'PRIVATE_CHARTER') {
      onSearch({
        search_mode: 'PRIVATE_CHARTER',
        city,
        departureDate: privateDate,
        passengers,
        guests: passengers,
        duration,
        vessel_category: vesselCategory,
      });
    } else {
      onSearch({
        search_mode: 'PUBLIC_CRUISE',
        departure_port: departurePort,
        destination,
        departureDate: publicDate,
        passengers: ticketCount,
        guests: ticketCount,
      });
    }
  };

  const handleQuickSearch = (item: typeof POPULAR_SEARCHES[0]) => {
    if (item.mode === 'PRIVATE_CHARTER') {
      setMode('PRIVATE_CHARTER');
      if (item.city) setCity(item.city);
      if (item.category) setVesselCategory(item.category);
      onSearch({
        search_mode: 'PRIVATE_CHARTER',
        city: item.city,
        vessel_category: item.category,
        guests: 10,
        passengers: 10,
      });
    } else {
      setMode('PUBLIC_CRUISE');
      if (item.port) setDeparturePort(item.port);
      if (item.destination) setDestination(item.destination);
      onSearch({
        search_mode: 'PUBLIC_CRUISE',
        departure_port: item.port,
        destination: item.destination,
        passengers: 2,
        guests: 2,
      });
    }
  };

  return (
    <div className="relative w-full text-left">
      {/* ========================================================== */}
      {/* 1. TOP STEPPED ROW: TAB DOCK ON LEFT + SPECIAL EVENTS ON RIGHT */}
      {/* ========================================================== */}
      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-3">
        {/* Left: Raised Glass Tab Dock */}
        <div
          className="inline-flex items-center gap-1.5 p-1.5 rounded-t-[26px] relative z-10 -mb-[2px]"
          style={{
            background: 'linear-gradient(135deg, rgba(235, 246, 255, 0.85) 0%, rgba(220, 242, 255, 0.75) 100%)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            borderTop: '2px solid rgba(255, 255, 255, 0.95)',
            borderLeft: '2px solid rgba(255, 255, 255, 0.95)',
            borderRight: '2px solid rgba(255, 255, 255, 0.95)',
            borderBottom: 'none',
            boxShadow: '0 -6px 20px rgba(56, 189, 248, 0.3)',
          }}
        >
          {/* Private Charter Tab */}
          <button
            type="button"
            onClick={() => setMode('PRIVATE_CHARTER')}
            className={`flex items-center gap-2.5 px-4 sm:px-5 py-2 rounded-2xl text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer ${
              mode === 'PRIVATE_CHARTER'
                ? 'bg-gradient-to-r from-[#0082f5] to-[#005cd8] text-white shadow-lg shadow-sky-500/35 border border-sky-300/40'
                : 'bg-transparent hover:bg-white/40 text-slate-800'
            }`}
          >
            <Anchor className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 stroke-[2.2]" />
            <div className="text-left leading-tight">
              <div className="text-xs sm:text-sm font-bold">Private Charter</div>
              <div className={`text-[10px] font-normal ${mode === 'PRIVATE_CHARTER' ? 'text-sky-100' : 'text-slate-500'}`}>
                (Whole Boat)
              </div>
            </div>
          </button>

          {/* Public Cruise Tab */}
          <button
            type="button"
            onClick={() => setMode('PUBLIC_CRUISE')}
            className={`flex items-center gap-2.5 px-4 sm:px-5 py-2 rounded-2xl text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer ${
              mode === 'PUBLIC_CRUISE'
                ? 'bg-gradient-to-r from-[#0082f5] to-[#005cd8] text-white shadow-lg shadow-sky-500/35 border border-sky-300/40'
                : 'bg-transparent hover:bg-white/40 text-slate-800'
            }`}
          >
            <Ship className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 stroke-[2.2]" />
            <div className="text-left leading-tight">
              <div className="text-xs sm:text-sm font-bold">Public Cruise</div>
              <div className={`text-[10px] font-normal ${mode === 'PUBLIC_CRUISE' ? 'text-sky-100' : 'text-slate-500'}`}>
                (Seat / Cabin)
              </div>
            </div>
          </button>
        </div>

        {/* Right: Floating Special Events Pill (Compact, leaving right clear for dolphin) */}
        <div className="relative shrink-0 pb-2">
          <button
            type="button"
            onClick={() => setShowEventMenu(!showEventMenu)}
            className="flex items-center gap-2 px-3.5 sm:px-4 py-1.5 rounded-full text-xs font-semibold text-slate-700 transition cursor-pointer hover:bg-white/90 whitespace-nowrap"
            style={{
              background: 'rgba(255, 255, 255, 0.65)',
              backdropFilter: 'blur(16px)',
              border: '1.5px solid rgba(255, 255, 255, 0.95)',
              boxShadow: '0 0 20px rgba(56, 189, 248, 0.65), inset 0 0 8px rgba(56, 189, 248, 0.25)',
            }}
          >
            <span className="font-bold text-slate-800 flex items-center gap-1">
              <span>🎁</span> Special Events
            </span>
            <span className="text-slate-300">|</span>
            <span>Birthday</span>
            <span className="text-slate-300">|</span>
            <span>Wedding</span>
            <span className="text-slate-300">|</span>
            <span>Corporate</span>
            <span className="text-slate-300">|</span>
            <span className="text-sky-600 font-bold flex items-center gap-0.5">
              More <ChevronDown className="w-3.5 h-3.5" />
            </span>
          </button>

          {/* Special Events Quick Menu */}
          {showEventMenu && (
            <div
              className="absolute right-0 mt-2 w-64 bg-white rounded-2xl p-2.5 shadow-2xl border border-sky-100 z-50 animate-in fade-in zoom-in-95"
              onMouseLeave={() => setShowEventMenu(false)}
            >
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold px-2 py-1">
                Special Celebration Packages
              </p>
              {[
                { label: '🎂 Birthday Party Cruise', event: 'Birthday', loc: 'Goa' },
                { label: '💍 Ocean Wedding & Reception', event: 'Wedding', loc: 'Goa' },
                { label: '💼 Corporate Gala & Retreat', event: 'Corporate', loc: 'Mumbai' },
                { label: '🌅 Sunset Cocktail Soiree', event: 'Party', loc: 'Goa' },
                { label: '🏝️ Family Island Day Out', event: 'Family', loc: 'Andaman' },
              ].map((pkg, pIdx) => (
                <button
                  key={pIdx}
                  type="button"
                  onClick={() => {
                    setShowEventMenu(false);
                    setMode('PRIVATE_CHARTER');
                    setCity(pkg.loc);
                    onSearch({
                      search_mode: 'PRIVATE_CHARTER',
                      city: pkg.loc,
                      event_type: pkg.event,
                      guests: 15,
                    });
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-sky-700 hover:bg-sky-50 transition flex items-center justify-between"
                >
                  <span>{pkg.label}</span>
                  <ArrowRight className="w-3 h-3 text-sky-400" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================== */}
      {/* 2. MAIN CARD BODY: Seamlessly Connected to Tab Dock Above  */}
      {/* ========================================================== */}
      <div
        className="relative rounded-b-[24px] sm:rounded-b-[28px] rounded-tr-[24px] sm:rounded-tr-[28px] rounded-tl-none p-4 sm:p-5 transition-all duration-300"
        style={{
          background: 'linear-gradient(135deg, rgba(235, 246, 255, 0.8) 0%, rgba(218, 240, 255, 0.7) 50%, rgba(238, 248, 255, 0.82) 100%)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '2px solid rgba(255, 255, 255, 0.95)',
          boxShadow: '0 0 35px rgba(56, 189, 248, 0.55), 0 20px 60px rgba(1, 30, 80, 0.25), inset 0 0 25px rgba(255, 255, 255, 0.45)',
        }}
      >
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* SEARCH INPUTS ROW */}
          {mode === 'PRIVATE_CHARTER' ? (
            <div className="flex flex-col lg:flex-row items-stretch lg:items-end gap-2">
              {/* City / Location */}
              <div className="flex-1 min-w-[130px]">
                <div className="text-[11px] font-bold text-slate-700 flex items-center gap-1 mb-1">
                  <MapPin className="w-3.5 h-3.5 text-[#0082f5]" />
                  <span>City / Location</span>
                </div>
                <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs px-2.5 py-1.5 flex items-center justify-between hover:border-sky-300 transition h-[42px]">
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full bg-transparent text-xs font-semibold text-slate-800 outline-none cursor-pointer pr-1"
                  >
                    {CITIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Charter Date */}
              <div className="flex-1 min-w-[125px]">
                <div className="text-[11px] font-bold text-slate-700 flex items-center gap-1 mb-1">
                  <Calendar className="w-3.5 h-3.5 text-[#0082f5]" />
                  <span>Charter Date</span>
                </div>
                <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs px-2.5 py-1.5 flex items-center gap-1.5 hover:border-sky-300 transition h-[42px]">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <input
                    type="date"
                    value={privateDate}
                    onChange={(e) => setPrivateDate(e.target.value)}
                    className="w-full bg-transparent text-xs font-semibold text-slate-800 outline-none cursor-pointer"
                    placeholder="dd-mm-yyyy"
                  />
                </div>
              </div>

              {/* Passengers / Guests */}
              <div className="w-full lg:w-[85px] shrink-0">
                <div className="text-[11px] font-bold text-slate-700 flex items-center gap-1 mb-1">
                  <Users className="w-3.5 h-3.5 text-[#0082f5]" />
                  <span>Guests</span>
                </div>
                <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs px-2.5 py-1.5 hover:border-sky-300 transition h-[42px] flex items-center">
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={passengers}
                    onChange={(e) => setPassengers(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-transparent text-xs font-semibold text-slate-800 outline-none text-center"
                    placeholder="10"
                  />
                </div>
              </div>

              {/* Duration */}
              <div className="flex-1 min-w-[115px]">
                <div className="text-[11px] font-bold text-slate-700 flex items-center gap-1 mb-1">
                  <Clock className="w-3.5 h-3.5 text-[#0082f5]" />
                  <span>Duration</span>
                </div>
                <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs px-2.5 py-1.5 flex items-center justify-between hover:border-sky-300 transition h-[42px]">
                  <select
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full bg-transparent text-xs font-semibold text-slate-800 outline-none cursor-pointer pr-1"
                  >
                    {CHARTER_DURATIONS.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Vessel Category */}
              <div className="flex-1 min-w-[125px]">
                <div className="text-[11px] font-bold text-slate-700 flex items-center gap-1 mb-1">
                  <Ship className="w-3.5 h-3.5 text-[#0082f5]" />
                  <span>Category</span>
                </div>
                <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs px-2.5 py-1.5 flex items-center justify-between hover:border-sky-300 transition h-[42px]">
                  <select
                    value={vesselCategory}
                    onChange={(e) => setVesselCategory(e.target.value)}
                    className="w-full bg-transparent text-xs font-semibold text-slate-800 outline-none cursor-pointer pr-1"
                  >
                    {VESSEL_CATEGORIES.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Search Ships Button */}
              <div className="w-full lg:w-auto shrink-0">
                <button
                  type="submit"
                  className="w-full lg:w-auto h-[42px] px-5 rounded-xl font-bold text-white text-xs sm:text-sm bg-gradient-to-r from-[#0082f5] to-[#005cd8] hover:from-[#0072e5] hover:to-[#004cc8] shadow-lg shadow-sky-500/40 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer active:scale-95 whitespace-nowrap"
                >
                  <Search className="w-4 h-4 stroke-[2.5]" />
                  <span>Search Ships</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col lg:flex-row items-stretch lg:items-end gap-2">
              {/* Departure Port */}
              <div className="flex-1 min-w-[140px]">
                <div className="text-[11px] font-bold text-slate-700 flex items-center gap-1 mb-1">
                  <MapPin className="w-3.5 h-3.5 text-[#0082f5]" />
                  <span>Departure Port</span>
                </div>
                <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs px-2.5 py-1.5 flex items-center justify-between hover:border-sky-300 transition h-[42px]">
                  <select
                    value={departurePort}
                    onChange={(e) => setDeparturePort(e.target.value)}
                    className="w-full bg-transparent text-xs font-semibold text-slate-800 outline-none cursor-pointer pr-1"
                  >
                    {DEPARTURE_PORTS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Destination */}
              <div className="flex-1 min-w-[140px]">
                <div className="text-[11px] font-bold text-slate-700 flex items-center gap-1 mb-1">
                  <Compass className="w-3.5 h-3.5 text-[#0082f5]" />
                  <span>Destination</span>
                </div>
                <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs px-2.5 py-1.5 flex items-center justify-between hover:border-sky-300 transition h-[42px]">
                  <select
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    className="w-full bg-transparent text-xs font-semibold text-slate-800 outline-none cursor-pointer pr-1"
                  >
                    {PUBLIC_DESTINATIONS.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Sailing Date */}
              <div className="flex-1 min-w-[125px]">
                <div className="text-[11px] font-bold text-slate-700 flex items-center gap-1 mb-1">
                  <Calendar className="w-3.5 h-3.5 text-[#0082f5]" />
                  <span>Sailing Date</span>
                </div>
                <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs px-2.5 py-1.5 flex items-center gap-1.5 hover:border-sky-300 transition h-[42px]">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <input
                    type="date"
                    value={publicDate}
                    onChange={(e) => setPublicDate(e.target.value)}
                    className="w-full bg-transparent text-xs font-semibold text-slate-800 outline-none cursor-pointer"
                    placeholder="dd-mm-yyyy"
                  />
                </div>
              </div>

              {/* Passenger Count */}
              <div className="w-full lg:w-[85px] shrink-0">
                <div className="text-[11px] font-bold text-slate-700 flex items-center gap-1 mb-1">
                  <Users className="w-3.5 h-3.5 text-[#0082f5]" />
                  <span>Passengers</span>
                </div>
                <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs px-2.5 py-1.5 hover:border-sky-300 transition h-[42px] flex items-center">
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={ticketCount}
                    onChange={(e) => setTicketCount(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-transparent text-xs font-semibold text-slate-800 outline-none text-center"
                    placeholder="2"
                  />
                </div>
              </div>

              {/* Search Button */}
              <div className="w-full lg:w-auto shrink-0">
                <button
                  type="submit"
                  className="w-full lg:w-auto h-[42px] px-5 rounded-xl font-bold text-white text-xs sm:text-sm bg-gradient-to-r from-[#0082f5] to-[#005cd8] hover:from-[#0072e5] hover:to-[#004cc8] shadow-lg shadow-sky-500/40 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer active:scale-95 whitespace-nowrap"
                >
                  <Search className="w-4 h-4 stroke-[2.5]" />
                  <span>Search Cruises</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* ========================================================== */}
          {/* 3. POPULAR SEARCHES CHIPS ROW (Matching Photo 1)           */}
          {/* ========================================================== */}
          <div className="pt-3 border-t border-sky-100/70 flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
            <span className="font-bold text-slate-800 flex items-center gap-1.5 text-xs sm:text-sm">
              🔥 Popular Searches:
            </span>

            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
              {POPULAR_SEARCHES.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleQuickSearch(item)}
                  className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/95 hover:bg-white text-slate-800 text-xs font-semibold transition-all shadow-xs border border-white/90 hover:border-sky-300 cursor-pointer hover:scale-105 active:scale-95 group"
                >
                  <img
                    src={item.image}
                    alt={item.label}
                    className="w-6 h-6 rounded-full object-cover shadow-xs border border-white group-hover:scale-110 transition-transform"
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = 'none';
                    }}
                  />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
