import React, { useState } from 'react';
import { Cruise, CabinTier, Booking } from '../api/types';
import { createBooking } from '../api/bookings';
import { useAuth } from '../context/AuthContext';
import confetti from 'canvas-confetti';
import {
  Calendar,
  Users,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Ship,
  Sparkles,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';

interface BookTourPageProps {
  cruise: Cruise;
  initialCabin?: string;
  onSuccess: (booking: Booking) => void;
  onCancel: () => void;
  onNeedLogin: () => void;
}

export const BookTourPage: React.FC<BookTourPageProps> = ({
  cruise,
  initialCabin = 'OCEANVIEW',
  onSuccess,
  onCancel,
  onNeedLogin,
}) => {
  const { user } = useAuth();

  // Booking Flow Steps: 1: Date -> 2: Guests -> 3: Cabin -> 4: Requests -> 5: Review
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Form State
  const [bookingDate, setBookingDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14); // default 2 weeks out
    return d.toISOString().split('T')[0];
  });
  const [startTime, setStartTime] = useState<string>('10:00');
  const [endTime, setEndTime] = useState<string>('18:00');
  const [passengersCount, setPassengersCount] = useState<number>(2);
  const [cabinType, setCabinType] = useState<string>(initialCabin);
  const [specialRequests, setSpecialRequests] = useState<string>('');

  // Submitting and Error States
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const defaultCabins: CabinTier[] = cruise.cabins || [
    {
      id: 'PRESIDENTIAL',
      name: 'Presidential Sea Suite',
      multiplier: 2.2,
      description: 'Expansive private terrace, personal butler service, and jacuzzi overlooking the ocean.',
      price_per_day: cruise.price_per_day * 2.2,
      amenities: ['Private Veranda', '24/7 Butler Service', 'Champagne Cellar'],
    },
    {
      id: 'ROYAL_BALCONY',
      name: 'Royal Ocean Balcony',
      multiplier: 1.6,
      description: 'Floor-to-ceiling glass doors opening directly to private sea breeze balcony.',
      price_per_day: cruise.price_per_day * 1.6,
      amenities: ['Private Balcony', 'King Stateroom Bed'],
    },
    {
      id: 'OCEANVIEW',
      name: 'Premium Oceanview Stateroom',
      multiplier: 1.0,
      description: 'Panoramic picture window with unobstructed oceanic horizons.',
      price_per_day: cruise.price_per_day,
      amenities: ['Panoramic Picture Window', 'Luxury Linens'],
    },
    {
      id: 'INTERIOR',
      name: 'Deluxe Interior Haven',
      multiplier: 0.75,
      description: 'Cozy, whisper-quiet stateroom with ambient circadian lighting.',
      price_per_day: cruise.price_per_day * 0.75,
      amenities: ['Circadian Lighting', 'Soundproofing'],
    },
  ];

  const selectedCabinObj = defaultCabins.find((c) => c.id === cabinType) || defaultCabins[2];
  const duration = cruise.duration_days || 7;
  const estimatedPrice = Math.round(
    selectedCabinObj.price_per_day * duration * Math.max(1, passengersCount)
  );

  const handleNext = () => {
    setErrorMessage(null);
    if (currentStep === 1 && !bookingDate) {
      setErrorMessage('Please select a valid voyage departure date.');
      return;
    }
    if (currentStep === 5 && !user) {
      onNeedLogin();
      return;
    }
    setCurrentStep((prev) => Math.min(prev + 1, 5));
  };

  const handleBack = () => {
    setErrorMessage(null);
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleConfirmBooking = async () => {
    if (!user) {
      onNeedLogin();
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await createBooking({
        cruise_id: cruise.id,
        booking_type: 'CRUISE_TOUR',
        booking_date: bookingDate,
        start_time: startTime,
        end_time: endTime,
        passengers_count: passengersCount,
        cabin_type: cabinType,
        special_requests: specialRequests,
      });

      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#0284c7', '#38bdf8', '#f59e0b', '#0369a1'],
      });

      onSuccess(res.booking);
    } catch (err: any) {
      setErrorMessage(
        err.message || 'Failed to complete booking. The stateroom or date may be unavailable.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen pt-28 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 bg-[#f8fafc]">
      {/* Top Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <span className="text-xs uppercase font-bold text-sky-700 tracking-wider">
            Stateroom Reservation
          </span>
          <h1 className="text-3xl font-display font-black text-slate-900 mt-1">
            Book Voyage: {cruise.title}
          </h1>
        </div>
        <button
          onClick={onCancel}
          className="text-xs text-slate-500 hover:text-slate-900 transition cursor-pointer self-start sm:self-auto font-semibold"
        >
          Cancel & Return
        </button>
      </div>

      {/* Stepper Progress Bar */}
      <div className="mb-10">
        <div className="flex items-center justify-between max-w-3xl mx-auto">
          {[
            { num: 1, label: 'Dates' },
            { num: 2, label: 'Guests' },
            { num: 3, label: 'Stateroom' },
            { num: 4, label: 'Requests' },
            { num: 5, label: 'Review' },
          ].map((s) => (
            <div key={s.num} className="flex items-center space-x-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  currentStep === s.num
                    ? 'bg-sky-500 text-white ring-4 ring-sky-200 shadow-md'
                    : currentStep > s.num
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {currentStep > s.num ? <CheckCircle2 className="w-4 h-4" /> : s.num}
              </div>
              <span
                className={`hidden sm:inline text-xs font-bold ${
                  currentStep >= s.num ? 'text-slate-900' : 'text-slate-400'
                }`}
              >
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Error Alert if any */}
      {errorMessage && (
        <div className="max-w-4xl mx-auto mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-300 text-rose-800 text-sm flex items-center gap-3 shadow-sm">
          <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Step Content & Sticky Booking Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start max-w-6xl mx-auto">
        {/* ============================================================ */}
        {/* STEPPER MAIN FORM CONTENT                                    */}
        {/* ============================================================ */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 sm:p-8 border border-sky-100 shadow-xl">
          {/* STEP 1: DATES */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <h2 className="text-2xl font-display font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-sky-600" />
                Select Departure Date & Schedule
              </h2>
              <p className="text-sm text-slate-500">
                Choose your embarkation date. Voyages on the {cruise.title} depart weekly from{' '}
                <span className="text-sky-700 font-semibold">{cruise.departure_port || 'Flagship Port'}</span>.
              </p>

              <div className="space-y-2">
                <label className="text-xs uppercase font-bold text-slate-700 tracking-wider">
                  Embarkation Date
                </label>
                <input
                  type="date"
                  value={bookingDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setBookingDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-white border border-slate-300 text-slate-900 font-semibold focus:outline-none focus:border-sky-500 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs uppercase font-bold text-slate-700 tracking-wider">
                    Boarding Window
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl bg-white border border-slate-300 text-slate-900 font-semibold focus:outline-none focus:border-sky-500 transition"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase font-bold text-slate-700 tracking-wider">
                    Departure Sailaway
                  </label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl bg-white border border-slate-300 text-slate-900 font-semibold focus:outline-none focus:border-sky-500 transition"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: PASSENGERS */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <h2 className="text-2xl font-display font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-sky-600" />
                Select Passenger Count
              </h2>
              <p className="text-sm text-slate-500">
                Specify the number of travelers traveling in your party. Max stateroom configuration is 8 passengers.
              </p>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-2xl bg-sky-50/70 border border-sky-100">
                  <div>
                    <span className="text-base font-bold text-slate-900 block">Passengers Traveling</span>
                    <span className="text-xs text-slate-500">Includes all adults and children occupying stateroom</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button
                      type="button"
                      onClick={() => setPassengersCount((p) => Math.max(1, p - 1))}
                      className="w-10 h-10 rounded-xl bg-white border border-slate-300 text-slate-800 font-bold hover:bg-slate-100 transition cursor-pointer shadow-sm"
                    >
                      -
                    </button>
                    <span className="font-display font-extrabold text-2xl text-sky-700 w-8 text-center">
                      {passengersCount}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPassengersCount((p) => Math.min(cruise.capacity || 8, p + 1))}
                      className="w-10 h-10 rounded-xl bg-white border border-slate-300 text-slate-800 font-bold hover:bg-slate-100 transition cursor-pointer shadow-sm"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: CABIN CHOICE */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <h2 className="text-2xl font-display font-bold text-slate-900 flex items-center gap-2">
                <Ship className="w-5 h-5 text-sky-600" />
                Select Stateroom Accommodation
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {defaultCabins.map((cabin) => {
                  const isSelected = cabinType === cabin.id;
                  return (
                    <div
                      key={cabin.id}
                      onClick={() => setCabinType(cabin.id)}
                      className={`p-5 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'bg-sky-50 border-sky-500 shadow-md ring-1 ring-sky-400'
                          : 'bg-white border-slate-200 hover:border-sky-300 shadow-sm'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-display font-bold text-slate-900">{cabin.name}</span>
                          {isSelected && <CheckCircle2 className="w-5 h-5 text-sky-600" />}
                        </div>
                        <p className="text-xs text-slate-500 mb-3">{cabin.description}</p>
                      </div>
                      <div className="pt-3 border-t border-slate-100 flex justify-between items-baseline">
                        <span className="text-xs text-slate-500 font-semibold">Total / Day</span>
                        <span className="font-display font-extrabold text-amber-600 text-lg">
                          ${Math.round(cabin.price_per_day).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 4: SPECIAL REQUESTS & EXTRAS */}
          {currentStep === 4 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <h2 className="text-2xl font-display font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-600" />
                Special Requests & Dietary Requirements
              </h2>
              <div className="space-y-2">
                <label className="text-xs uppercase font-bold text-slate-700 tracking-wider">
                  Dietary, Anniversary, or Mobility Requests
                </label>
                <textarea
                  rows={4}
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value)}
                  placeholder="e.g. Celebrating 25th wedding anniversary, requesting quiet stateroom deck, vegan culinary requirements..."
                  className="w-full p-4 rounded-2xl bg-white border border-slate-300 text-slate-800 text-sm focus:outline-none focus:border-sky-500 transition"
                />
              </div>
            </div>
          )}

          {/* STEP 5: REVIEW & CONFIRM */}
          {currentStep === 5 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <h2 className="text-2xl font-display font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                Review & Confirm Stateroom Reservation
              </h2>

              {!user && (
                <div className="p-4 rounded-2xl bg-sky-50 border border-sky-300 text-sky-800 text-sm flex items-center justify-between shadow-sm">
                  <span className="font-semibold">Sign in is required to complete your booking.</span>
                  <button
                    onClick={onNeedLogin}
                    className="px-4 py-1.5 rounded-xl bg-sky-500 text-white font-bold text-xs"
                  >
                    Sign In
                  </button>
                </div>
              )}

              <div className="p-5 rounded-2xl bg-sky-50/50 border border-sky-100 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Vessel:</span>
                  <span className="font-bold text-slate-900">{cruise.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Route / Destination:</span>
                  <span className="font-semibold text-sky-700">{cruise.destination}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Embarkation Date:</span>
                  <span className="font-semibold text-slate-900">{bookingDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Schedule:</span>
                  <span className="font-semibold text-slate-900">{startTime} to {endTime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Passengers:</span>
                  <span className="font-semibold text-slate-900">{passengersCount} Guest(s)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Selected Stateroom:</span>
                  <span className="font-bold text-amber-700">{selectedCabinObj.name}</span>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-8 border-t border-slate-100 mt-8">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={handleBack}
                className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                Previous Step
              </button>
            ) : (
              <div />
            )}

            {currentStep < 5 ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-7 py-3 rounded-2xl bg-sky-500 hover:bg-sky-600 text-white font-display font-bold text-sm tracking-wide flex items-center gap-2 transition cursor-pointer shadow-md shadow-sky-400/20"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                disabled={submitting}
                onClick={handleConfirmBooking}
                className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-display font-bold text-sm tracking-wide shadow-xl shadow-emerald-500/25 flex items-center gap-2 transition disabled:opacity-50 cursor-pointer"
              >
                {submitting ? 'Confirming with Ship Pier...' : 'CONFIRM & ISSUE TICKET'}
              </button>
            )}
          </div>
        </div>

        {/* ============================================================ */}
        {/* RIGHT STICKY PRICE BREAKDOWN                                 */}
        {/* ============================================================ */}
        <aside className="lg:col-span-1 bg-white rounded-3xl p-6 border border-sky-200 shadow-xl space-y-5 lg:sticky lg:top-28">
          <div>
            <span className="text-xs uppercase font-bold text-sky-700">Live Fare Calculation</span>
            <h3 className="text-xl font-display font-bold text-slate-900 mt-0.5">Booking Summary</h3>
          </div>

          <div className="space-y-2.5 text-xs text-slate-600 py-3 border-y border-slate-100">
            <div className="flex justify-between">
              <span className="text-slate-500">Stateroom Rate:</span>
              <span className="font-bold text-slate-800">
                ${Math.round(selectedCabinObj.price_per_day).toLocaleString()} / day
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Voyage Duration:</span>
              <span className="font-bold text-slate-800">{duration} Days</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Passengers:</span>
              <span className="font-bold text-slate-800">{passengersCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Port Taxes & Fees:</span>
              <span className="text-emerald-600 font-bold">Included</span>
            </div>
          </div>

          <div>
            <span className="text-xs text-slate-500 font-semibold block">Total Investment</span>
            <span className="text-3xl font-display font-black text-amber-600">
              ${estimatedPrice.toLocaleString()}
            </span>
            <p className="text-[11px] text-slate-500 mt-1">
              Backend recalculates dynamically upon confirmation to ensure anti-double booking guarantee.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
};
