import React from 'react';
import { Star, Users, MapPin, Anchor, ArrowRight, ShieldCheck, Clock, Building2 } from 'lucide-react';
import { Cruise } from '../../api/types';
import { formatINR } from '../../utils/currency';

interface CruiseCardProps {
  cruise: Cruise;
  onSelect: (cruise: Cruise) => void;
  onBookNow?: (cruise: Cruise) => void;
}

export const CruiseCard: React.FC<CruiseCardProps> = ({ cruise, onSelect, onBookNow }) => {
  const isPrivate = cruise.listing_type !== 'PUBLIC_CRUISE';
  const isQuoteBased = cruise.is_quote_based || cruise.price <= 0;

  // Format Price & Basis strictly
  const renderPricing = () => {
    if (isQuoteBased) {
      return (
        <div>
          <span className="text-[11px] uppercase tracking-wider text-amber-700 font-bold block">Quotation Basis</span>
          <span className="font-display text-xl font-black text-amber-600">Price on Request</span>
          <span className="text-[11px] text-slate-500 block">Contact operator for custom quote</span>
        </div>
      );
    }

    const priceText = formatINR(cruise.price);
    const basisText = cruise.formatted_price_basis || (cruise.price_unit === 'PER_PERSON' ? '/ person' : '/ charter');

    return (
      <div>
        <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block">Rate</span>
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <span className="font-display text-2xl font-black text-sky-800">{priceText}</span>
          <span className="text-xs font-bold text-slate-700">{basisText}</span>
        </div>
        {cruise.price_unit === 'PER_BOAT' && (
          <span className="text-[10px] text-emerald-700 font-semibold block">Whole Boat Charter</span>
        )}
      </div>
    );
  };

  // Capacity display
  const capacityDisplay = cruise.has_unknown_capacity || cruise.capacity <= 0
    ? 'Capacity: Contact operator'
    : `Up to ${cruise.capacity} guests`;

  return (
    <div className="group rounded-3xl bg-white border border-sky-100 hover:border-sky-300 overflow-hidden transition-all duration-300 flex flex-col justify-between shadow-md hover:shadow-xl hover:shadow-sky-900/5">
      {/* Ship Image Container */}
      <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
        <img
          src={cruise.display_image_url || cruise.image_url || cruise.image || '/static/images/placeholder.png'}
          alt={cruise.title || cruise.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src =
              '/static/images/placeholder.png';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-900/30 to-transparent" />

        {/* Top Badges */}
        <div className="absolute top-3.5 left-3.5 right-3.5 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Private vs Public Badge */}
            <span className={`px-2.5 py-1 rounded-full backdrop-blur-md text-[11px] font-black uppercase tracking-wider shadow-sm border ${
              isPrivate
                ? 'bg-sky-600/90 text-white border-sky-400/50'
                : 'bg-emerald-600/90 text-white border-emerald-400/50'
            }`}>
              {isPrivate ? 'PRIVATE' : 'PUBLIC'}
            </span>

            {/* Whole Boat / Per Person */}
            {cruise.price_unit === 'PER_BOAT' && (
              <span className="px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-amber-300 text-[10px] font-black uppercase tracking-wider border border-amber-300/30">
                WHOLE BOAT
              </span>
            )}
            {cruise.price_unit === 'PER_PERSON' && (
              <span className="px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-sky-200 text-[10px] font-black uppercase tracking-wider border border-sky-300/30">
                PER PERSON
              </span>
            )}

            {/* Vessel Category */}
            <span className="px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-md border border-slate-200 text-slate-800 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-sm">
              <Anchor className="w-3 h-3 text-sky-600" />
              {cruise.vessel_category || cruise.category || 'Vessel'}
            </span>
          </div>

          {/* Rating */}
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/95 backdrop-blur-md border border-amber-200 text-amber-700 text-xs font-bold shadow-sm">
            <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
            <span>{cruise.average_rating > 0 ? cruise.average_rating.toFixed(1) : '5.0'}</span>
          </div>
        </div>

        {/* Bottom Destination & Ship Banner */}
        <div className="absolute bottom-3.5 left-3.5 right-3.5 text-white">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-sky-300">
            <MapPin className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span className="truncate">{cruise.location || cruise.departure_port || cruise.destination}</span>
          </div>
          <h3 className="font-display font-bold text-xl sm:text-2xl text-white tracking-tight group-hover:text-sky-200 transition-colors mt-0.5 line-clamp-1 font-serif">
            {cruise.title || cruise.name}
          </h3>

          {cruise.operator_name && (
            <div className="flex items-center gap-1 text-[11px] text-slate-300 mt-0.5 font-medium">
              <Building2 className="w-3 h-3 text-sky-400 shrink-0" />
              <span className="truncate">Operator: {cruise.operator_name}</span>
            </div>
          )}
        </div>
      </div>

      {/* Ship Specification & Metadata */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-3.5">
          {/* Quick Specs Grid */}
          <div className="grid grid-cols-2 gap-2 py-2.5 px-3 rounded-2xl bg-sky-50/70 border border-sky-100 text-center">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Duration</p>
              <p className="text-xs font-black text-slate-900 mt-0.5 flex items-center justify-center gap-1">
                <Clock className="w-3.5 h-3.5 text-sky-600" />
                {cruise.duration_display || `${cruise.duration_days || 1} Days`}
              </p>
            </div>
            <div className="border-l border-sky-200/80">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Capacity</p>
              <p className="text-xs font-black text-slate-900 mt-0.5 flex items-center justify-center gap-1">
                <Users className="w-3.5 h-3.5 text-sky-600" />
                {capacityDisplay}
              </p>
            </div>
          </div>

          {/* Separate Tax & Permit Notes (Requirement 14) */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px] font-bold">
            {cruise.tax_note ? (
              <span className="px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-800">
                {cruise.tax_note}
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-600">
                GST 18% extra
              </span>
            )}

            {cruise.permit_note && (
              <span className="px-2 py-0.5 rounded-md bg-rose-50 border border-rose-200 text-rose-800">
                {cruise.permit_note}
              </span>
            )}

            {cruise.source_checked && (
              <span className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                Source Verified
              </span>
            )}
          </div>

          {/* Description snippet */}
          <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
            {cruise.description}
          </p>
        </div>

        {/* Price & Actions Row */}
        <div className="pt-3.5 mt-2 border-t border-slate-100 flex items-center justify-between gap-3">
          {renderPricing()}

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onSelect(cruise)}
              className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold border border-slate-200 transition cursor-pointer"
            >
              Details
            </button>
            <button
              onClick={() => (onBookNow ? onBookNow(cruise) : onSelect(cruise))}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white text-xs font-bold tracking-wide flex items-center gap-1.5 shadow-md shadow-sky-500/20 transition cursor-pointer"
            >
              <span>{isQuoteBased ? 'Enquire' : 'Book'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
