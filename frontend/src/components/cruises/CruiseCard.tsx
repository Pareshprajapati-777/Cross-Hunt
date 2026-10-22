import React from 'react';
import { Star, Users, MapPin, Anchor, ArrowRight, ShieldCheck, Clock, Building2, Heart } from 'lucide-react';
import { Cruise } from '../../api/types';
import { formatINR } from '../../utils/currency';
import { useFavorites } from '../../context/FavoritesContext';

interface CruiseCardProps {
  cruise: Cruise;
  onSelect?: (cruise: Cruise) => void;
  onBookNow?: (cruise: Cruise) => void;
}

export const CruiseCard: React.FC<CruiseCardProps> = ({ cruise, onSelect, onBookNow }) => {
  const { isFavorite, toggleFavorite } = useFavorites();
  const favorited = isFavorite(cruise.id);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite(cruise);
  };
  const isPrivate = cruise.listing_type !== 'PUBLIC_CRUISE';
  const isQuoteBased = cruise.is_quote_based || cruise.price <= 0;

  // Format Price & Basis strictly
  const renderPricing = () => {
    if (isQuoteBased) {
      return (
        <div className="min-w-0 flex-1">
          <span className="text-[10px] uppercase tracking-wider text-[#0284c7] font-bold block">Quotation Basis</span>
          <span className="font-display text-lg sm:text-xl font-black text-[#051833] truncate block">Price on Request</span>
          <span className="text-[10px] text-[#64748b] block truncate">Contact operator</span>
        </div>
      );
    }

    const priceText = formatINR(cruise.price);
    const rawBasis = cruise.formatted_price_basis || '';
    // Strip redundant leading price prefix if formatted_price_basis already contains it (e.g. "₹28,000 / 2 hours")
    const cleanBasis = rawBasis.includes('/')
      ? `/${rawBasis.split('/').slice(1).join('/')}`
      : rawBasis.replace(/^₹[\d,.]+\s*/, '') || (cruise.price_unit === 'PER_PERSON' ? '/ person' : '/ charter');

    return (
      <div className="min-w-0 flex-1">
        <span className="text-[10px] uppercase tracking-wider text-[#64748b] font-bold block">Rate</span>
        <div className="flex flex-col">
          <span className="font-display text-xl sm:text-2xl font-black text-[#051833] font-mono-numbers leading-tight truncate">
            {priceText}
          </span>
          <span className="text-[11px] font-bold text-[#475569] truncate block mt-0.5" title={cleanBasis}>
            {cleanBasis}
          </span>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          {cruise.price_unit === 'PER_BOAT' && (
            <span className="text-[10px] text-emerald-700 font-bold whitespace-nowrap">Whole Boat Charter</span>
          )}
          {cruise.tax_note && (
            <span className="text-[10px] text-slate-500 font-medium truncate max-w-[140px]" title={cruise.tax_note}>
              • {cruise.tax_note}
            </span>
          )}
        </div>
      </div>
    );
  };

  // Capacity display
  const capacityDisplay = cruise.has_unknown_capacity || cruise.capacity <= 0
    ? 'Capacity: Contact operator'
    : `Up to ${cruise.capacity} guests`;

  // Check for valid permit requirement (only when genuinely needed, never showing "None")
  const hasValidPermit = Boolean(
    cruise.permit_note &&
    cruise.permit_note.trim() !== '' &&
    !cruise.permit_note.toLowerCase().startsWith('none') &&
    cruise.permit_note.toLowerCase() !== 'n/a' &&
    cruise.permit_note.toLowerCase() !== 'no'
  );

  return (
    <div className="group rounded-3xl bg-white border border-[#0284c7]/20 hover:border-[#0284c7]/50 text-[#051833] overflow-hidden transition-all duration-300 flex flex-col justify-between shadow-lg shadow-sky-950/5 hover:shadow-xl">
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
        <div className="absolute inset-0 bg-gradient-to-t from-[#051833]/90 via-[#051833]/20 to-transparent" />

        {/* Top Badges */}
        <div className="absolute top-3.5 left-3.5 right-3.5 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Private vs Public Badge */}
            <span className={`px-2.5 py-1 rounded-full backdrop-blur-md text-[10px] font-black uppercase tracking-wider shadow-sm border ${
              isPrivate
                ? 'bg-[#051833]/90 text-white border-white/20'
                : 'bg-[#0284c7]/90 text-white border-white/20'
            }`}>
              {isPrivate ? 'PRIVATE' : 'PUBLIC'}
            </span>

            {/* Whole Boat / Per Person */}
            {cruise.price_unit === 'PER_BOAT' && (
              <span className="px-2.5 py-1 rounded-full bg-[#051833]/90 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-wider border border-white/20">
                WHOLE BOAT
              </span>
            )}
            {cruise.price_unit === 'PER_PERSON' && (
              <span className="px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-md text-[#051833] text-[10px] font-black uppercase tracking-wider border border-slate-200">
                PER PERSON
              </span>
            )}

            {/* Vessel Category */}
            <span className="px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-md border border-slate-200 text-[#051833] text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-sm">
              <Anchor className="w-3 h-3 text-[#0284c7]" />
              {cruise.vessel_category || cruise.category || 'Vessel'}
            </span>

            {/* Verified Trust Badge */}
            {cruise.source_checked && (
              <span className="px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-md border border-slate-200 text-[#0284c7] text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm">
                <ShieldCheck className="w-3 h-3 text-[#0284c7]" />
                VERIFIED
              </span>
            )}
          </div>

          {/* Rating & Favorite Button */}
          <div className="flex items-center gap-1.5 ml-auto">
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-md border border-slate-200 text-[#051833] text-xs font-bold shadow-sm">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span>{cruise.average_rating > 0 ? cruise.average_rating.toFixed(1) : '5.0'}</span>
            </div>

            <button
              type="button"
              onClick={handleFavoriteClick}
              title={favorited ? 'Remove from Favorites' : 'Add to Favorites'}
              aria-label={favorited ? 'Remove from Favorites' : 'Add to Favorites'}
              className={`w-7 h-7 rounded-full flex items-center justify-center backdrop-blur-md transition-all shadow-sm cursor-pointer ${
                favorited
                  ? 'bg-rose-500 text-white hover:bg-rose-600 scale-105 ring-2 ring-rose-300'
                  : 'bg-white/90 text-slate-700 hover:text-rose-500 hover:bg-white border border-slate-200'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 transition-transform ${favorited ? 'fill-white text-white scale-110' : ''}`} />
            </button>
          </div>
        </div>

        {/* Bottom Destination & Ship Banner */}
        <div className="absolute bottom-3.5 left-3.5 right-3.5 text-white">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#38bdf8]">
            <MapPin className="w-3.5 h-3.5 text-[#38bdf8] shrink-0" />
            <span className="truncate text-stroke-white-subtle">{cruise.location || cruise.departure_port || cruise.destination}</span>
          </div>
          <h3 className="font-heading-more text-xl sm:text-2xl text-white tracking-tight group-hover:text-[#38bdf8] transition-colors mt-0.5 line-clamp-1 text-stroke-white">
            {cruise.title || cruise.name}
          </h3>

          {cruise.operator_name && (
            <div className="flex items-center gap-1 text-[11px] text-slate-200 mt-0.5 font-medium">
              <Building2 className="w-3 h-3 text-[#38bdf8] shrink-0" />
              <span className="truncate text-stroke-white-subtle">Operator: {cruise.operator_name}</span>
            </div>
          )}
        </div>
      </div>

      {/* Ship Specification & Metadata */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-3.5">
          {/* Quick Specs Grid */}
          <div className="grid grid-cols-2 gap-2 py-2.5 px-3 rounded-2xl bg-[#f8f9fa] border border-[#0284c7]/15 text-center">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[#64748b] font-bold">Duration</p>
              <p className="text-xs font-black text-[#051833] mt-0.5 flex items-center justify-center gap-1">
                <Clock className="w-3.5 h-3.5 text-[#0284c7]" />
                {cruise.duration_display || `${cruise.duration_days || 1} Days`}
              </p>
            </div>
            <div className="border-l border-slate-200">
              <p className="text-[10px] uppercase tracking-wider text-[#64748b] font-bold">Capacity</p>
              <p className="text-xs font-black text-[#051833] mt-0.5 flex items-center justify-center gap-1">
                <Users className="w-3.5 h-3.5 text-[#0284c7]" />
                {capacityDisplay}
              </p>
            </div>
          </div>

          {/* Subtle Valid Island Permit Indicator (Only if valid permit required, never shows "None") */}
          {hasValidPermit && (
            <div className="flex items-center gap-1.5 text-[11px] text-amber-900 bg-amber-50/90 border border-amber-200/60 px-3 py-1 rounded-xl font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
              <span className="truncate">{cruise.permit_note}</span>
            </div>
          )}

          {/* Description snippet */}
          <p className="text-xs text-[#475569] line-clamp-2 leading-relaxed font-normal">
            {cruise.description}
          </p>
        </div>

        {/* Price & Actions Row */}
        <div className="pt-3.5 mt-2 border-t border-slate-100 flex items-center justify-between gap-2.5">
          {renderPricing()}

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => onSelect?.(cruise)}
              className="px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-[#051833] text-xs font-bold border border-slate-200 transition cursor-pointer whitespace-nowrap"
            >
              Details
            </button>
            <button
              onClick={() => (onBookNow ? onBookNow(cruise) : onSelect?.(cruise))}
              className="px-3.5 py-1.5 rounded-full bg-[#051833] hover:bg-[#0a2548] text-[#fff8dc] text-xs font-black transition flex items-center gap-1 shadow-md shadow-[#051833]/20 cursor-pointer whitespace-nowrap"
            >
              <span>{isQuoteBased ? 'Enquire' : 'Book'}</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#fff8dc]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
