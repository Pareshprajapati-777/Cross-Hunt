import React, { useState, useEffect } from 'react';
import { getEventPackages, EventPackagesResponse } from '../api/events';
import { createBooking } from '../api/bookings';
import { useAuth } from '../context/AuthContext';
import { Booking } from '../api/types';
import confetti from 'canvas-confetti';
import {
  Sparkles,
  Anchor,
  CheckCircle2,
  ArrowRight,
  AlertCircle,
  Gem,
} from 'lucide-react';

interface PrivateEventsPageProps {
  onSuccess: (booking: Booking) => void;
  onNeedLogin: () => void;
}

export const PrivateEventsPage: React.FC<PrivateEventsPageProps> = ({
  onSuccess,
  onNeedLogin,
}) => {
  const { user } = useAuth();
  const [data, setData] = useState<EventPackagesResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // Form State
  const [selectedEventType, setSelectedEventType] = useState('WEDDING');
  const [selectedShipId, setSelectedShipId] = useState<number>(0);
  const [selectedPackageId, setSelectedPackageId] = useState('diamond');
  const [eventDate, setEventDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 21); // 3 weeks out
    return d.toISOString().split('T')[0];
  });
  const [startTime, setStartTime] = useState('17:00');
  const [endTime, setEndTime] = useState('23:00');
  const [guestCount, setGuestCount] = useState<number>(50);
  const [specialRequests, setSpecialRequests] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    getEventPackages()
      .then((res) => {
        setData(res);
        if (res.charter_ships && res.charter_ships.length > 0) {
          setSelectedShipId(res.charter_ships[0].id);
        }
      })
      .catch((err) => console.error('Failed to load event packages:', err))
      .finally(() => setLoading(false));
  }, []);

  const selectedPackage = data?.packages.find((p) => p.id === selectedPackageId);
  const selectedShip = data?.charter_ships.find((s) => s.id === selectedShipId);

  const shipRate = selectedShip ? parseFloat(selectedShip.price) : 300;
  const packageBase = selectedPackage ? selectedPackage.base_fee : 3500;
  const perGuest = selectedPackage ? selectedPackage.per_guest_fee : 120;
  const estimatedTotal = Math.round(packageBase + perGuest * guestCount + shipRate * 1.5);

  const handleBookEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onNeedLogin();
      return;
    }

    if (!selectedShipId) {
      setErrorMessage('Please select a vessel for your maritime charter.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await createBooking({
        cruise_id: selectedShipId,
        booking_type: 'PRIVATE_EVENT',
        booking_date: eventDate,
        start_time: startTime,
        end_time: endTime,
        passengers_count: guestCount,
        event_type: selectedEventType,
        event_package: selectedPackageId,
        special_requests: specialRequests,
      });

      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#0284c7', '#38bdf8', '#f59e0b', '#0369a1'],
      });

      onSuccess(res.booking);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit event reservation.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="min-h-screen pt-32 flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-2 border-sky-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-28 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 bg-[#f8fafc]">
      {/* Hero Banner */}
      <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 border border-amber-300 text-amber-800 text-xs font-bold uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
          Bespoke Maritime Charters
        </div>
        <h1 className="text-4xl sm:text-5xl font-display font-extrabold text-slate-900 tracking-tight">
          Host Your Moment at Sea
        </h1>
        <p className="text-slate-600 text-base max-w-xl mx-auto">
          Private wedding vows, milestone galas, corporate ocean summits, and executive retreats aboard world-class chartered liners.
        </p>
      </div>

      {/* Package Comparison Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
        {data.packages.map((pkg) => {
          const isSelected = selectedPackageId === pkg.id;
          return (
            <div
              key={pkg.id}
              onClick={() => setSelectedPackageId(pkg.id)}
              className={`p-6 sm:p-8 rounded-3xl border transition-all duration-300 cursor-pointer flex flex-col justify-between relative bg-white ${
                isSelected
                  ? 'border-amber-500 shadow-xl ring-2 ring-amber-400/40 scale-[1.02]'
                  : 'border-slate-200 hover:border-sky-300 shadow-sm'
              }`}
            >
              {isSelected && (
                <div className="absolute -top-3 right-6 px-3 py-0.5 rounded-full bg-amber-500 text-white font-bold text-[10px] uppercase tracking-wider shadow-sm">
                  Selected Tier
                </div>
              )}

              <div>
                <div className="w-10 h-10 rounded-2xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700 mb-4">
                  <Gem className="w-5 h-5" />
                </div>
                <h3 className="font-display font-bold text-xl text-slate-900">{pkg.tier}</h3>
                <p className="text-xs text-amber-700 mt-1 font-semibold">{pkg.recommended_for}</p>

                <div className="my-5 pt-4 border-t border-slate-100">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-display font-black text-slate-900">
                      ${pkg.base_fee.toLocaleString()}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">base charter</span>
                  </div>
                  <span className="text-xs text-slate-500 block mt-0.5 font-medium">
                    + ${pkg.per_guest_fee} / attendee
                  </span>
                </div>

                <div className="space-y-2 pt-2">
                  {pkg.highlights.map((h, i) => (
                    <div key={i} className="text-xs text-slate-700 flex items-start gap-2 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <span>{h}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-6 mt-6 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedPackageId(pkg.id)}
                  className={`w-full py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition ${
                    isSelected
                      ? 'bg-amber-500 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
                  }`}
                >
                  {isSelected ? 'Active Selection' : 'Select Tier'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Reservation Builder Form */}
      <div className="max-w-4xl mx-auto bg-white rounded-3xl p-6 sm:p-10 border border-sky-100 shadow-xl">
        <h2 className="text-2xl font-display font-bold text-slate-900 mb-6 flex items-center gap-2">
          <Anchor className="w-6 h-6 text-sky-600" />
          Charter Configuration
        </h2>

        {errorMessage && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-300 text-rose-800 text-sm flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleBookEvent} className="space-y-6">
          {/* Event Category Selector */}
          <div>
            <label className="block text-xs uppercase font-bold text-slate-700 tracking-wider mb-2">
              Event Classification
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {data.event_types.map((et) => {
                const isSelected = selectedEventType === et.id;
                return (
                  <button
                    key={et.id}
                    type="button"
                    onClick={() => setSelectedEventType(et.id)}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-amber-50 border-amber-500 text-amber-900 font-bold'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-xl mb-1">{et.icon}</span>
                    <span className="text-xs truncate">{et.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Ship Charter Selection */}
          <div className="space-y-2">
            <label className="block text-xs uppercase font-bold text-slate-700 tracking-wider">
              Select Charter Vessel
            </label>
            <select
              value={selectedShipId}
              onChange={(e) => setSelectedShipId(parseInt(e.target.value))}
              className="w-full px-4 py-3 rounded-2xl bg-white border border-slate-300 text-slate-900 font-semibold focus:outline-none focus:border-sky-500 transition"
            >
              {data.charter_ships.map((ship) => (
                <option key={ship.id} value={ship.id}>
                  {ship.name} — {ship.category} (Cap: {ship.capacity} guests | {ship.location})
                </option>
              ))}
            </select>
          </div>

          {/* Date and Time Windows */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Charter Date
              </label>
              <input
                type="date"
                value={eventDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-sm font-semibold focus:outline-none focus:border-sky-500 transition"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Embarkation Time
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-sm font-semibold focus:outline-none focus:border-sky-500 transition"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Return Sailaway
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-sm font-semibold focus:outline-none focus:border-sky-500 transition"
              />
            </div>
          </div>

          {/* Guest Count */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold uppercase tracking-wider text-slate-700">
                Estimated Attendees
              </span>
              <span className="font-bold text-amber-600 text-sm">{guestCount} Guests</span>
            </div>
            <input
              type="range"
              min="10"
              max="500"
              step="5"
              value={guestCount}
              onChange={(e) => setGuestCount(parseInt(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>

          {/* Special Requests */}
          <div className="space-y-2">
            <label className="block text-xs uppercase font-bold text-slate-700 tracking-wider">
              Event Specifics & Equipment (AV, Catering, Theming)
            </label>
            <textarea
              rows={3}
              value={specialRequests}
              onChange={(e) => setSpecialRequests(e.target.value)}
              placeholder="e.g. Wedding aisle floral arch, keynote projection mapping, champagne reception on top observation deck..."
              className="w-full p-4 rounded-2xl bg-white border border-slate-300 text-slate-800 text-sm focus:outline-none focus:border-sky-500 transition"
            />
          </div>

          {/* Price Calculation & Submit */}
          <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs text-slate-500 block uppercase font-bold tracking-wider">
                Total Charter Estimate
              </span>
              <span className="text-3xl font-display font-black text-amber-600">
                ${estimatedTotal.toLocaleString()}
              </span>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-white font-display font-bold text-sm tracking-wide shadow-xl shadow-amber-500/25 flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
            >
              <span>{submitting ? 'Submitting...' : 'REQUEST EVENT CHARTER'}</span>
              <ArrowRight className="w-4 h-4 text-white" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
