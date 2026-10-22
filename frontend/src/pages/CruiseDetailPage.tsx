import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Cruise, CabinTier, PrivateCharterRate } from '../api/types';
import { apiRequest } from '../api/client';
import {
  MapPin,
  Star,
  Users,
  Anchor,
  Layers,
  ArrowRight,
  ShieldCheck,
  ChevronLeft,
  Sparkles,
  Award,
  Loader2,
  Clock,
  Phone,
  Mail,
  Globe,
  Building2,
  CheckCircle2,
  FileText,
  Heart
} from 'lucide-react';
import { formatINR } from '../utils/currency';
import { ShipContactCard } from '../components/ship/ShipContactCard';
import { useAuth } from '../context/AuthContext';
import { useFavorites } from '../context/FavoritesContext';

interface CruiseDetailPageProps {
  cruise?: Cruise | null;
  onBack?: () => void;
  onBookTour?: (cruise: Cruise, preselectedCabin?: string) => void;
  onBookEvent?: (cruise: Cruise) => void;
}

export const CruiseDetailPage: React.FC<CruiseDetailPageProps> = ({
  cruise: initialCruise,
  onBack,
  onBookTour,
  onBookEvent,
}) => {
  const { user } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [cruise, setCruise] = useState<Cruise | null>(initialCruise || null);
  const [loading, setLoading] = useState<boolean>(!initialCruise && !!id);
  const [error, setError] = useState<string | null>(null);
  const [selectedRateId, setSelectedRateId] = useState<number | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);

  useEffect(() => {
    if (!cruise && id) {
      setLoading(true);
      apiRequest<{ cruise?: Cruise } & Cruise>(`/api/cruises/${id}/`)
        .then((res) => {
          const loaded = (res as any).cruise || res;
          setCruise(loaded);
          if (loaded.charter_rates && loaded.charter_rates.length > 0) {
            setSelectedRateId(loaded.charter_rates[0].id);
          }
          setLoading(false);
        })
        .catch((err) => {
          setError(err.message || 'Failed to load ship details');
          setLoading(false);
        });
    } else if (cruise && cruise.charter_rates && cruise.charter_rates.length > 0 && selectedRateId === null) {
      setSelectedRateId(cruise.charter_rates[0].id);
    }
  }, [id, cruise, selectedRateId]);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate('/explore');
    }
  };

  const handleBook = () => {
    const targetId = cruise?.slug || cruise?.id;
    const rateQuery = selectedRateId ? `?rate_id=${selectedRateId}` : '';
    const bookUrl = `/book-cruise/${targetId}${rateQuery}`;
    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent(bookUrl)}`, { state: { from: bookUrl, reason: 'booking' } });
      return;
    }
    navigate(bookUrl);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center pt-24 pb-16">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 text-sky-600 animate-spin mx-auto" />
          <p className="text-slate-600 font-semibold">Loading vessel details...</p>
        </div>
      </div>
    );
  }

  if (error || !cruise) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center pt-24 pb-16 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl p-8 text-center shadow-lg border border-slate-200 space-y-4">
          <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto">
            <Anchor className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Vessel Not Found</h2>
          <p className="text-sm text-slate-600">{error || 'The requested vessel could not be found or is inactive.'}</p>
          <button
            onClick={() => navigate('/explore')}
            className="w-full py-3 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-sm cursor-pointer transition"
          >
            Browse Fleet
          </button>
        </div>
      </div>
    );
  }

  const selectedRate = cruise.charter_rates?.find((r) => r.id === selectedRateId);
  const isQuoteBased = cruise.is_quote_based || (selectedRate ? selectedRate.is_quote_based : cruise.price <= 0);

  const displayRatePrice = selectedRate && selectedRate.price !== null
    ? selectedRate.price
    : cruise.price;

  const displayRateBasis = selectedRate
    ? selectedRate.formatted_display
    : (cruise.formatted_price_basis || (cruise.price_unit === 'PER_PERSON' ? '/ person' : '/ charter'));

  const capacityText = cruise.has_unknown_capacity || cruise.capacity <= 0
    ? 'Capacity: Contact operator'
    : `Up to ${cruise.capacity} Guests`;

  const gallery = cruise.gallery_images && cruise.gallery_images.length > 0
    ? cruise.gallery_images
    : [cruise.display_image_url || cruise.image_url || cruise.image || '/static/images/placeholder.png'];

  return (
    <div className="min-h-screen bg-slate-50/70 pt-28 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-10">
        {/* Navigation Top Bar */}
        <div className="flex items-center justify-between">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-900 transition cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back to Fleet</span>
          </button>

          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <span>Vessel Code:</span>
            <span className="font-mono font-bold text-slate-900 uppercase">{cruise.slug}</span>
          </div>
        </div>

        {/* HERO SECTION: Title, Badges, Header */}
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="px-3 py-1 rounded-full bg-sky-600 text-white text-xs font-black uppercase tracking-wider">
                  {cruise.listing_type === 'PUBLIC_CRUISE' ? 'PUBLIC CRUISE' : 'PRIVATE CHARTER'}
                </span>
                <span className="px-3 py-1 rounded-full bg-slate-900 text-amber-300 text-xs font-bold uppercase tracking-wider">
                  {cruise.vessel_category || cruise.category || 'Luxury Vessel'}
                </span>
                {cruise.source_checked && (
                  <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    Verified Operator Source
                  </span>
                )}
              </div>

              <h1 className="text-3xl sm:text-5xl font-display font-extrabold text-slate-900 tracking-tight font-serif">
                {cruise.title || cruise.name}
              </h1>

              <p className="text-slate-600 flex items-center gap-1.5 text-sm sm:text-base mt-2">
                <MapPin className="w-4 h-4 text-sky-500 shrink-0" />
                <span>Base Location: {cruise.location} ({cruise.departure_port})</span>
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => toggleFavorite(cruise)}
                title={isFavorite(cruise.id) ? 'Remove from Favorites' : 'Save to Favorites'}
                className={`px-4 py-3 rounded-2xl border transition shadow-sm flex items-center gap-2 text-xs font-bold cursor-pointer ${
                  isFavorite(cruise.id)
                    ? 'bg-rose-50 border-rose-300 text-rose-600'
                    : 'bg-white border-slate-200 text-slate-700 hover:text-rose-600 hover:border-rose-200'
                }`}
              >
                <Heart className={`w-4 h-4 ${isFavorite(cruise.id) ? 'fill-rose-500 text-rose-500' : ''}`} />
                <span>{isFavorite(cruise.id) ? 'Saved in Favorites' : 'Save to Favorites'}</span>
              </button>

              <button
                onClick={handleBook}
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-sky-500/20 transition cursor-pointer"
              >
                {isQuoteBased ? 'Request Quotation' : 'Reserve Charter'}
              </button>
            </div>
          </div>

          {/* Photo Gallery */}
          <div className="space-y-3">
            <div className="relative aspect-[21/9] max-h-[500px] w-full rounded-3xl overflow-hidden bg-slate-900 shadow-md">
              <img
                src={gallery[activeImageIndex] || gallery[0]}
                alt={cruise.title}
                className="w-full h-full object-cover transition-all duration-500"
              />
            </div>
            {gallery.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {gallery.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImageIndex(i)}
                    className={`relative w-20 h-14 rounded-xl overflow-hidden shrink-0 border-2 transition cursor-pointer ${
                      activeImageIndex === i ? 'border-sky-500 scale-105' : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt={`Thumb ${i}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Specs Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm text-center">
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Passenger Capacity</p>
            <p className="text-base font-black text-slate-900 mt-1 flex items-center justify-center gap-1">
              <Users className="w-4 h-4 text-sky-500" />
              {capacityText}
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm text-center">
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Standard Duration</p>
            <p className="text-base font-black text-slate-900 mt-1 flex items-center justify-center gap-1">
              <Clock className="w-4 h-4 text-sky-500" />
              {cruise.duration_display || `${cruise.duration_days || 1} Days`}
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm text-center">
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Vessel Category</p>
            <p className="text-base font-black text-slate-900 mt-1 flex items-center justify-center gap-1">
              <Anchor className="w-4 h-4 text-sky-500" />
              {cruise.vessel_category || cruise.category || 'Boat'}
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm text-center">
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Guest Rating</p>
            <p className="text-base font-black text-slate-900 mt-1 flex items-center justify-center gap-1">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              {cruise.average_rating > 0 ? cruise.average_rating.toFixed(1) : '5.0'} / 5.0
            </p>
          </div>
        </div>

        {/* Main Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
          {/* Left Column (2 Cols) */}
          <div className="lg:col-span-2 space-y-8">
            {/* 1. Verified Charter Rates & Packages (Requirement 3 & 10) */}
            {cruise.charter_rates && cruise.charter_rates.length > 0 && (
              <section className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-sky-600" />
                    <h2 className="text-xl font-bold font-serif text-slate-900">Verified Charter Packages & Durations</h2>
                  </div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Per Boat Basis</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                  {cruise.charter_rates.map((rate) => {
                    const isSelected = selectedRateId === rate.id;
                    return (
                      <div
                        key={rate.id}
                        onClick={() => setSelectedRateId(rate.id)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-sky-50/90 border-sky-500 shadow-md ring-1 ring-sky-400'
                            : 'bg-white border-slate-200 hover:border-sky-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                            <Clock className="w-4 h-4 text-sky-600" />
                            {rate.duration}
                          </span>
                          {isSelected && <CheckCircle2 className="w-5 h-5 text-sky-600" />}
                        </div>

                        <div className="mt-3 pt-2 border-t border-slate-100 flex items-baseline justify-between">
                          <span className="text-xs text-slate-500 font-medium">Rate:</span>
                          <span className="font-display font-black text-lg text-sky-800">
                            {rate.is_quote_based || rate.price === null ? 'Price on Request' : formatINR(rate.price)}
                          </span>
                        </div>

                        {rate.included && (
                          <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                            Includes: {rate.included}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* 2. Vessel Description */}
            <section className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
              <h2 className="text-xl font-display font-bold text-slate-900 font-serif">About This Vessel & Service</h2>
              <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-line">
                {cruise.description}
              </p>
            </section>

            {/* 3. Inclusions & Extra Charges (Requirement 14) */}
            <section className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
              <h2 className="text-xl font-display font-bold text-slate-900 font-serif">Inclusions & Additional Charges</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 space-y-2">
                  <span className="font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Included in Charter
                  </span>
                  <p className="text-slate-700 leading-relaxed">
                    {cruise.included || 'Crew, captain, standard safety equipment, fuel for specified duration.'}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 space-y-2">
                  <span className="font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-amber-600" />
                    Extra Charges & Taxes
                  </span>
                  <p className="text-slate-700 leading-relaxed">
                    {cruise.extra_charges || '18% GST applicable. Island permits or catering billed separately.'}
                  </p>
                  {cruise.tax_note && (
                    <div className="font-bold text-amber-800 text-[11px] pt-1">
                      {cruise.tax_note}
                    </div>
                  )}
                  {cruise.permit_note && (
                    <div className="font-bold text-rose-800 text-[11px]">
                      {cruise.permit_note}
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* 4. Operator & Management Contact Card (WhatsApp, Call, Direct Inquiry) */}
            <ShipContactCard cruise={cruise} />
          </div>

          {/* Right Sticky Sidebar (1 Col) */}
          <aside className="sticky top-28 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xl space-y-6">
            <div className="border-b border-slate-100 pb-5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pricing Basis</span>
              {isQuoteBased ? (
                <div className="mt-1">
                  <p className="text-2xl font-black text-amber-600 font-serif">Price on Request</p>
                  <p className="text-xs text-slate-500 mt-1">Submit requirements for customized operator quotation</p>
                </div>
              ) : (
                <div className="mt-1">
                  <div className="flex items-baseline gap-1.5 flex-wrap">
                    <span className="text-3xl font-black text-sky-900 font-serif">{formatINR(displayRatePrice)}</span>
                    <span className="text-sm font-bold text-slate-700">{displayRateBasis}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Base vessel charter rate (taxes billed separately)</p>
                </div>
              )}
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Vessel Type:</span>
                <span className="font-bold text-slate-900">{cruise.vessel_category || cruise.category}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Selected Package:</span>
                <span className="font-bold text-slate-900">{selectedRate ? selectedRate.duration : cruise.duration_display || 'Per Charter'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Guest Capacity:</span>
                <span className="font-bold text-slate-900">{capacityText}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Tax Breakdown:</span>
                <span className="font-bold text-amber-800">{cruise.tax_note || 'GST 18% extra'}</span>
              </div>
              {cruise.permit_note && (
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Permit:</span>
                  <span className="font-bold text-rose-800">{cruise.permit_note}</span>
                </div>
              )}
            </div>

            <div className="space-y-3 pt-2">
              <button
                onClick={handleBook}
                className={`w-full py-4 rounded-2xl text-white font-bold text-sm tracking-wide shadow-lg flex items-center justify-center gap-2 transition cursor-pointer ${
                  !user
                    ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/25'
                    : 'bg-sky-600 hover:bg-sky-700 shadow-sky-600/25'
                }`}
              >
                <span>{isQuoteBased ? 'REQUEST FORMAL QUOTATION' : !user ? 'SIGN IN TO RESERVE CHARTER' : 'RESERVE THIS CHARTER'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              {!user && (
                <p className="text-[11px] text-center text-slate-500 font-medium">
                  🔒 User account login is required to reserve this vessel
                </p>
              )}
            </div>

            {/* Quick Contact & WhatsApp in Sidebar */}
            <ShipContactCard cruise={cruise} compact={true} />

            <div className="pt-2 text-[11px] text-slate-400 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Verified operator charter record. Official invoice generated upon confirmation.</span>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};
