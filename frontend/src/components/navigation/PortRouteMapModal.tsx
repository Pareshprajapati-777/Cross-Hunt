import React, { useState, useEffect } from 'react';
import {
  X,
  MapPin,
  Navigation,
  Compass,
  Anchor,
  Clock,
  Car,
  ShieldCheck,
  ExternalLink,
  Copy,
  Check,
  AlertCircle,
  Loader2,
  Calendar,
  Sparkles,
  Info,
} from 'lucide-react';
import { Booking } from '../../api/types';
import {
  getPortDetails,
  calculateDistanceKm,
  formatDistanceAndDriving,
  getGoogleMapsLiveRouteUrl,
  getAppleMapsLiveRouteUrl,
  getGoogleMapsEmbedUrl,
  PortInfo,
} from '../../utils/ports';

interface PortRouteMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking | null;
}

export const PortRouteMapModal: React.FC<PortRouteMapModalProps> = ({
  isOpen,
  onClose,
  booking,
}) => {
  const [port, setPort] = useState<PortInfo | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState<boolean>(true);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen || !booking) return;

    // Resolve port details from booking data
    const p = getPortDetails(booking.departure_port, booking.destination, (booking as any).location);
    setPort(p);

    // Request user's live device location
    setLocating(true);
    setLocationError(null);

    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setLocating(false);
        },
        (error) => {
          console.warn('Geolocation error:', error);
          let msg = 'Location access not permitted. Using device default for navigation.';
          if (error.code === error.TIMEOUT) {
            msg = 'GPS location timed out. You can still navigate via Google Maps.';
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            msg = 'GPS position unavailable. You can still navigate via Google Maps.';
          }
          setLocationError(msg);
          setLocating(false);
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
      );
    } else {
      setLocationError('Geolocation not supported on this browser.');
      setLocating(false);
    }
  }, [isOpen, booking]);

  if (!isOpen || !booking || !port) return null;

  // Calculate live distance if user coordinates are available
  let distanceKm: number | null = null;
  let drivingInfo: { distanceStr: string; durationStr: string } | null = null;

  if (userLocation) {
    distanceKm = calculateDistanceKm(
      userLocation.lat,
      userLocation.lng,
      port.lat,
      port.lng
    );
    drivingInfo = formatDistanceAndDriving(distanceKm);
  }

  const googleMapsUrl = getGoogleMapsLiveRouteUrl(port, userLocation);
  const appleMapsUrl = getAppleMapsLiveRouteUrl(port, userLocation);
  const mapEmbedUrl = getGoogleMapsEmbedUrl(port);

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(`${port.officialTerminalName}, ${port.address}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const retryGeolocation = () => {
    setLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      (err) => {
        setLocationError(err.message || 'Unable to retrieve location');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#030e1d]/80 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-3xl my-6 bg-[#f8fbff] rounded-3xl shadow-2xl border border-sky-400/35 overflow-hidden text-slate-800 flex flex-col max-h-[92vh]">
        {/* Header - Midnight Oceanic Theme */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#051833] text-white border-b border-sky-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-400 shadow-sm shrink-0">
              <Navigation className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-serif font-black text-base text-white tracking-wide">
                  Port Navigation &amp; Live Route
                </h3>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-400/30 flex items-center gap-1">
                  <Compass className="w-3 h-3 text-sky-400 animate-spin" />
                  Live GPS Route
                </span>
              </div>
              <p className="text-xs text-slate-300">
                {booking.cruise_title || booking.cruise_name} • Ref #{booking.booking_id}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition cursor-pointer"
            title="Close port map"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
          {/* Live GPS Status & Route Indicator Banner */}
          <div className="bg-white rounded-2xl p-4 border border-sky-100 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${locating ? 'bg-amber-400' : userLocation ? 'bg-emerald-400' : 'bg-slate-400'}`} />
                  <span className={`relative inline-flex rounded-full h-3 w-3 ${locating ? 'bg-amber-500' : userLocation ? 'bg-emerald-500' : 'bg-slate-500'}`} />
                </span>
                <span className="text-xs font-bold text-slate-800">
                  {locating
                    ? 'Detecting your live device GPS position...'
                    : userLocation
                    ? 'Live GPS Position Active'
                    : 'GPS Positioning Standby'}
                </span>
              </div>

              {userLocation && drivingInfo && (
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                  <Car className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{drivingInfo.distanceStr} to Port</span>
                  <span>•</span>
                  <span>{drivingInfo.durationStr}</span>
                </div>
              )}

              {locationError && (
                <div className="flex items-center gap-2 text-[11px] text-amber-700">
                  <span>{locationError}</span>
                  <button
                    type="button"
                    onClick={retryGeolocation}
                    className="underline font-bold hover:text-amber-900 cursor-pointer"
                  >
                    Retry
                  </button>
                </div>
              )}
            </div>

            {/* Origin to Destination Route Diagram */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center text-xs">
              {/* Origin */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold shrink-0 text-xs">
                  A
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                    Your Live Starting Point
                  </span>
                  <span className="font-bold text-slate-800 block truncate">
                    {userLocation
                      ? `GPS: ${userLocation.lat.toFixed(4)}° N, ${userLocation.lng.toFixed(4)}° E`
                      : 'Your Current Live Device Location'}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Real-time device origin
                  </span>
                </div>
              </div>

              {/* Destination Port */}
              <div className="p-3 bg-sky-50/80 rounded-xl border border-sky-200 flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-sky-600 text-white flex items-center justify-center font-bold shrink-0 text-xs">
                  B
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] uppercase font-bold text-sky-600 block tracking-wider">
                    Embarkation Port / Jetty
                  </span>
                  <span className="font-bold text-slate-900 block truncate">
                    {port.officialTerminalName}
                  </span>
                  <span className="text-[11px] text-slate-600 truncate block">
                    {port.gate}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Embedded Interactive Map Preview */}
          <div className="relative bg-white rounded-3xl border border-slate-200 shadow-md overflow-hidden">
            <div className="h-64 sm:h-72 w-full relative bg-slate-100">
              <iframe
                title="Port Live Route Map"
                src={mapEmbedUrl}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="w-full h-full"
              />
              {/* Floating Port Info Badge */}
              <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-md p-2.5 rounded-xl border border-slate-200 shadow-md text-xs max-w-xs pointer-events-none">
                <div className="flex items-center gap-1.5 font-bold text-slate-900">
                  <Anchor className="w-3.5 h-3.5 text-sky-600" />
                  <span className="truncate">{port.name}</span>
                </div>
                <p className="text-[11px] text-slate-500 truncate mt-0.5">
                  {port.city}, {port.state || port.country}
                </p>
              </div>
            </div>
          </div>

          {/* Primary Action Button: Launch Live Navigation in Google Maps */}
          <div className="space-y-2">
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-sky-600 hover:from-emerald-700 hover:to-sky-700 text-white font-extrabold text-sm sm:text-base shadow-lg shadow-emerald-600/25 transition cursor-pointer flex items-center justify-center gap-2.5 text-center group"
            >
              <Navigation className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span>START LIVE GPS TURN-BY-TURN ROUTE (GOOGLE MAPS)</span>
              <ExternalLink className="w-4 h-4 ml-1 opacity-80" />
            </a>

            <div className="flex items-center justify-center gap-3 text-xs">
              <a
                href={appleMapsUrl}
                className="text-slate-600 hover:text-slate-900 font-semibold underline inline-flex items-center gap-1 cursor-pointer py-1"
              >
                <span>Open in Apple Maps</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <span className="text-slate-300">•</span>
              <button
                type="button"
                onClick={handleCopyAddress}
                className="text-slate-600 hover:text-slate-900 font-semibold underline inline-flex items-center gap-1 cursor-pointer py-1"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span className="text-emerald-700">Address Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy Full Port Address</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Detailed Port Embarkation & Terminal Guide */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 space-y-3.5 text-xs">
            <h4 className="font-serif font-black text-sm text-slate-900 flex items-center gap-2">
              <Info className="w-4 h-4 text-sky-600" />
              <span>Embarkation Port &amp; Passenger Guidelines</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-700">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Official Terminal Address
                </span>
                <p className="font-semibold text-slate-800 leading-relaxed">
                  {port.address}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Passenger Boarding Gate
                </span>
                <p className="font-semibold text-sky-800 leading-relaxed">
                  {port.gate}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Recommended Reporting Time
                </span>
                <p className="font-medium text-slate-600">
                  {port.reportingAdvice}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Vehicle Parking &amp; Cab Drop-off
                </span>
                <p className="font-medium text-slate-600">
                  {port.parkingInfo}
                </p>
              </div>
            </div>

            {/* Terminal Amenities Badges */}
            <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1.5 text-[11px]">
              <span className="text-slate-400 font-bold mr-1">Terminal Facilities:</span>
              {port.amenities.map((amenity, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-medium"
                >
                  ✓ {amenity}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Official Cruise Hunt Maritime Boarding Terminal Information</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-600 hover:text-slate-900 font-bold underline cursor-pointer"
          >
            Close Map
          </button>
        </div>
      </div>
    </div>
  );
};
