import React, { useState } from 'react';
import { Compass, Calendar, Users, Clock, ArrowRight, Sparkles } from 'lucide-react';

interface RequirementSearchProps {
  onSearch: (filters: {
    purpose: string;
    destination: string;
    departureDate: string;
    guests: number;
    budget: string;
    duration: string;
  }) => void;
}

const PURPOSES = [
  { id: 'LUXURY_CRUISE', label: 'Luxury Cruise', icon: '🚢', desc: 'Ocean voyages & coastal routes' },
  { id: 'WEDDING', label: 'Wedding at Sea', icon: '💍', desc: 'Royal deck ceremonies & mandap' },
  { id: 'PARTY', label: 'Private Yacht Party', icon: '🎉', desc: 'DJ rigs, sunset deck & open sea bar' },
  { id: 'BIRTHDAY', label: 'Milestone Birthday', icon: '🎂', desc: 'VIP saloon, custom cake & chef dining' },
  { id: 'CORPORATE', label: 'Corporate Summit', icon: '💼', desc: 'Keynote theatres & executive lounge' },
  { id: 'CONFERENCE', label: 'Maritime Conference', icon: '🎙️', desc: 'Multi-deck delegates & satellite AV' },
  { id: 'DINNER', label: 'Gala Dinner at Sea', icon: '🥂', desc: 'Starlight seating & five-course pairing' },
  { id: 'PUBLIC_TOUR', label: 'Public Tour Ticket', icon: '🎫', desc: 'Individual seats & scheduled departures' },
];

const DESTINATIONS = [
  'All Indian Coastal Destinations',
  'Mumbai & Arabian Sea',
  'Goa Coastal & Mormugao',
  'Lakshadweep Archipelago',
  'Kochi & Malabar Coast',
  'Andaman & Nicobar Islands',
];

export const RequirementSearch: React.FC<RequirementSearchProps> = ({ onSearch }) => {
  const [selectedPurpose, setSelectedPurpose] = useState('LUXURY_CRUISE');
  const [destination, setDestination] = useState('');
  const [departureDate, setDepartureDate] = useState('');
  const [guests, setGuests] = useState<number>(20);
  const [budget, setBudget] = useState('ANY');
  const [duration, setDuration] = useState('ANY');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch({
      purpose: selectedPurpose,
      destination: destination === 'All Indian Coastal Destinations' ? '' : destination,
      departureDate,
      guests,
      budget,
      duration,
    });
  };

  return (
    <div className="w-full max-w-5xl mx-auto bg-white/95 rounded-3xl p-6 sm:p-8 shadow-xl shadow-sky-900/5 border border-sky-200/90 relative overflow-hidden backdrop-blur-md">
      {/* Light sky-blue ambient aura */}
      <div className="absolute -top-24 -right-24 w-72 h-72 bg-sky-200/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-blue-100/50 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-sky-100 pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 border border-sky-300 text-sky-800 text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5 text-sky-600" />
            Vessel Requirement Matching Engine
          </div>
          <h2 className="text-2xl sm:text-3xl font-display font-extrabold text-slate-900 tracking-tight font-serif">
            What are you planning at sea?
          </h2>
        </div>
        <p className="text-slate-500 text-xs sm:text-sm max-w-xs md:text-right">
          Match your maritime voyage, public cruise tour, or private event to verified vessels in our Indian fleet.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Purpose Selector Grid */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
            Select Voyage or Event Experience
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {PURPOSES.map((item) => {
              const isSelected = selectedPurpose === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedPurpose(item.id)}
                  className={`p-3 rounded-xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-sky-50 border-sky-500 shadow-md shadow-sky-500/10 ring-1 ring-sky-400'
                      : 'bg-slate-50/70 border-slate-200 hover:bg-sky-50/50 hover:border-sky-300'
                  }`}
                >
                  <div className="text-xl mb-1.5">{item.icon}</div>
                  <div>
                    <div className={`text-sm font-bold ${isSelected ? 'text-sky-900' : 'text-slate-800'}`}>
                      {item.label}
                    </div>
                    <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                      {item.desc}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Filters Row: Where? When? Guests? Budget? Duration? */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 pt-2">
          {/* Where */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-sky-600" />
              Where?
            </label>
            <select
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-300 text-sm text-slate-800 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-400 transition"
            >
              <option value="">Any Port / Destination</option>
              {DESTINATIONS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* When */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-sky-600" />
              When?
            </label>
            <input
              type="date"
              value={departureDate}
              onChange={(e) => setDepartureDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-sm text-slate-800 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-400 transition"
            />
          </div>

          {/* Guests */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-sky-600" />
              Guests?
            </label>
            <input
              type="number"
              min="1"
              max="500"
              value={guests}
              onChange={(e) => setGuests(parseInt(e.target.value) || 1)}
              className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-300 text-sm text-slate-800 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-400 transition"
            />
          </div>

          {/* Budget in INR (₹) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <span className="font-bold text-sky-600">₹</span>
              Budget (INR)?
            </label>
            <select
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-300 text-sm text-slate-800 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-400 transition"
            >
              <option value="ANY">Any Budget</option>
              <option value="VALUE">Under ₹50,000</option>
              <option value="PREMIUM">₹50,000 - ₹1,00,000</option>
              <option value="ULTRA">Ultra Luxury (₹1,00,000+)</option>
            </select>
          </div>

          {/* Duration */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-sky-600" />
              Duration?
            </label>
            <select
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-300 text-sm text-slate-800 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-400 transition"
            >
              <option value="ANY">Any Duration</option>
              <option value="SHORT">1 - 3 Days (Weekend / Event)</option>
              <option value="MEDIUM">4 - 5 Days (Coastal Voyage)</option>
              <option value="LONG">6+ Days (Island Hopper)</option>
            </select>
          </div>
        </div>

        {/* CTA Button */}
        <div className="flex justify-end pt-3">
          <button
            type="submit"
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-display font-bold text-base tracking-wide flex items-center justify-center gap-2.5 shadow-lg shadow-sky-500/25 transition-all duration-200 hover:scale-[1.02] cursor-pointer"
          >
            <span>FIND MY SHIP</span>
            <ArrowRight className="w-5 h-5 text-sky-100" />
          </button>
        </div>
      </form>
    </div>
  );
};
