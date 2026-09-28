import React from 'react';
import { Star, Users, MapPin, Anchor, ArrowRight } from 'lucide-react';
import { Cruise } from '../../api/types';

interface CruiseCardProps {
  cruise: Cruise;
  onSelect: (cruise: Cruise) => void;
  onBookNow?: (cruise: Cruise) => void;
}

export const CruiseCard: React.FC<CruiseCardProps> = ({ cruise, onSelect, onBookNow }) => {
  return (
    <div className="group rounded-3xl bg-white border border-sky-100 hover:border-sky-300 overflow-hidden transition-all duration-300 flex flex-col justify-between shadow-md hover:shadow-xl hover:shadow-sky-900/5">
      {/* Ship Image Container */}
      <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
        <img
          src={cruise.image || '/static/images/placeholder.png'}
          alt={cruise.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src =
              'https://images.unsplash.com/photo-1548574505-5e239809ee19?auto=format&fit=crop&w=1200&q=80';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent" />

        {/* Top Badges */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
          <span className="px-3 py-1 rounded-full bg-white/90 backdrop-blur-md border border-sky-200 text-sky-800 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
            <Anchor className="w-3.5 h-3.5 text-sky-600" />
            {cruise.category || 'Luxury Ocean Liner'}
          </span>

          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/95 backdrop-blur-md border border-amber-200 text-amber-700 text-xs font-bold shadow-sm">
            <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
            <span>{cruise.average_rating > 0 ? cruise.average_rating.toFixed(1) : '5.0'}</span>
            <span className="text-slate-400 text-[10px] font-normal">({cruise.review_count || 12})</span>
          </div>
        </div>

        {/* Bottom Destination & Route Banner */}
        <div className="absolute bottom-4 left-4 right-4">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-sky-300">
            <MapPin className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span className="truncate">{cruise.destination || cruise.location}</span>
          </div>
          <h3 className="font-display font-bold text-xl sm:text-2xl text-white tracking-tight group-hover:text-sky-200 transition-colors mt-0.5">
            {cruise.title}
          </h3>
        </div>
      </div>

      {/* Ship Specification & Metadata */}
      <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-4">
          {/* Quick Specs Grid */}
          <div className="grid grid-cols-3 gap-2 py-3 px-3.5 rounded-2xl bg-sky-50/70 border border-sky-100 text-center">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Duration</p>
              <p className="text-sm font-bold text-slate-900">{cruise.duration_days || 7} Days</p>
            </div>
            <div className="border-x border-sky-200/80">
              <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Capacity</p>
              <p className="text-sm font-bold text-slate-900 flex items-center justify-center gap-1">
                <Users className="w-3.5 h-3.5 text-slate-500" />
                {cruise.capacity}
              </p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Decks</p>
              <p className="text-sm font-bold text-slate-900">{cruise.decks_count || 12} Decks</p>
            </div>
          </div>

          {/* Route & Port */}
          <div className="text-xs text-slate-600 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Departure Port:</span>
              <span className="font-semibold text-slate-800">{cruise.departure_port || 'Port Everglades'}</span>
            </div>
            {cruise.route && (
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Voyage Route:</span>
                <span className="font-medium text-sky-700 truncate max-w-[190px]">{cruise.route}</span>
              </div>
            )}
          </div>

          {/* Facilities preview chips */}
          {cruise.facilities && cruise.facilities.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {cruise.facilities.slice(0, 3).map((f, i) => (
                <span
                  key={i}
                  className="px-2.5 py-0.5 rounded-lg bg-slate-100 border border-slate-200 text-[11px] text-slate-700 font-semibold"
                >
                  {f}
                </span>
              ))}
              {cruise.facilities.length > 3 && (
                <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-[10px] text-slate-500 font-medium">
                  +{cruise.facilities.length - 3} more
                </span>
              )}
            </div>
          )}
        </div>

        {/* Price & Actions Row */}
        <div className="pt-4 mt-2 border-t border-slate-100 flex items-center justify-between">
          <div>
            <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block">From</span>
            <div className="flex items-baseline gap-1">
              <span className="font-display text-2xl font-black text-amber-600">
                ${Number(cruise.price_per_day).toLocaleString()}
              </span>
              <span className="text-xs text-slate-500">/ day</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onSelect(cruise)}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold border border-slate-200 transition cursor-pointer"
            >
              Details
            </button>
            <button
              onClick={() => (onBookNow ? onBookNow(cruise) : onSelect(cruise))}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white text-xs font-bold tracking-wide flex items-center gap-1.5 shadow-md shadow-sky-500/20 transition cursor-pointer"
            >
              <span>Book Voyage</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
