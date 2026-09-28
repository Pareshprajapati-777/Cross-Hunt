import React from 'react';
import { Booking } from '../../api/types';
import { Anchor, Calendar, Clock, MapPin, Printer, ShieldCheck, UserCheck } from 'lucide-react';

interface TicketPassProps {
  booking: Booking;
  onPrint?: () => void;
}

export const TicketPass: React.FC<TicketPassProps> = ({ booking, onPrint }) => {
  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      window.print();
    }
  };

  return (
    <div className="max-w-2xl mx-auto my-6 print:m-0 print:max-w-full">
      {/* Printable Boarding Pass Card */}
      <div className="relative rounded-3xl overflow-hidden bg-white border border-sky-300 shadow-2xl shadow-sky-900/10 print:border-black print:shadow-none">
        {/* Top Header Strip */}
        <div className="bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-700 p-6 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-full bg-white border-2 border-white/60 flex items-center justify-center p-1.5 overflow-hidden shadow-sm">
              <img
                src="/static/images/logo_icon.png"
                alt="Emblem"
                className="w-full h-full object-contain rounded-full"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = 'none';
                }}
              />
              <Anchor className="w-6 h-6 text-sky-600" />
            </div>
            <div>
              <h2 className="text-xl font-display font-black tracking-wider uppercase">
                CROSS HUNT <span className="text-sky-200">PASS</span>
              </h2>
              <p className="text-xs text-sky-100 uppercase tracking-widest font-bold">
                Official Maritime Boarding Document
              </p>
            </div>
          </div>

          <div className="text-right">
            <span
              className={`inline-block px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase ${
                booking.status === 'CONFIRMED'
                  ? 'bg-emerald-400 text-slate-950'
                  : booking.status === 'PENDING'
                  ? 'bg-amber-300 text-slate-950'
                  : 'bg-rose-400 text-slate-950'
              }`}
            >
              {booking.status}
            </span>
            <p className="text-[11px] text-sky-100 font-mono font-bold mt-1">
              REF #{booking.booking_id}
            </p>
          </div>
        </div>

        {/* Main Body */}
        <div className="p-6 sm:p-8 space-y-6 bg-white text-slate-800">
          {/* Ship and Voyage */}
          <div className="border-b border-slate-100 pb-5">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-700">
              Vessel & Voyage
            </span>
            <h3 className="text-2xl font-display font-extrabold text-slate-900 mt-1">
              {booking.cruise_title}
            </h3>
            <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-slate-600 font-medium">
              <span className="flex items-center gap-1.5 text-sky-700 font-bold">
                <MapPin className="w-4 h-4 text-sky-600" />
                {booking.destination || 'Global Waters'}
              </span>
              <span>•</span>
              <span>Port: {booking.departure_port || 'Main Terminal'}</span>
              <span>•</span>
              <span>{booking.duration_days || 7} Days Voyage</span>
            </div>
          </div>

          {/* Schedule & Cabin Information */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-2 border-b border-slate-100 pb-5 text-left">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Voyage Date</p>
              <p className="text-sm font-bold text-slate-900 flex items-center gap-1.5 mt-0.5">
                <Calendar className="w-3.5 h-3.5 text-sky-600" />
                {booking.booking_date}
              </p>
            </div>

            <div>
              <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Embarkation Time</p>
              <p className="text-sm font-bold text-slate-900 flex items-center gap-1.5 mt-0.5">
                <Clock className="w-3.5 h-3.5 text-sky-600" />
                {booking.start_time} - {booking.end_time}
              </p>
            </div>

            <div>
              <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Guests</p>
              <p className="text-sm font-bold text-slate-900 flex items-center gap-1.5 mt-0.5">
                <UserCheck className="w-3.5 h-3.5 text-sky-600" />
                {booking.passengers_count} Passenger{booking.passengers_count > 1 ? 's' : ''}
              </p>
            </div>

            <div>
              <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Accommodation</p>
              <p className="text-sm font-bold text-amber-700 truncate mt-0.5">
                {booking.cabin_name || (booking.booking_type === 'PRIVATE_EVENT' ? 'Private Vessel Charter' : 'Oceanview Stateroom')}
              </p>
            </div>
          </div>

          {/* Ticket Barcode / Cryptographic QR Verification String */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-sky-50/70 border border-sky-200">
            <div className="space-y-1">
              <span className="text-xs uppercase font-mono text-sky-800 font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-sky-600" />
                Cryptographic Maritime Verification Hash
              </span>
              <p className="font-mono text-[11px] text-slate-600 break-all select-all font-semibold">
                {booking.qr_code_hash || `CRX-${booking.booking_id}-${Date.now().toString(36).toUpperCase()}`}
              </p>
              <p className="text-[10px] text-slate-500 font-medium">
                Present this barcode / digital verification at terminal pier security desk for boarding keycard.
              </p>
            </div>

            <div className="shrink-0 text-center">
              {/* High-contrast verification barcode */}
              <div className="bg-white p-2.5 rounded-xl border border-slate-300 shadow-sm">
                <div className="flex items-center space-x-1 h-12 w-28 justify-center">
                  {[4, 2, 6, 3, 5, 2, 4, 6, 2, 4, 3, 5, 2, 6, 3, 4, 2].map((w, idx) => (
                    <div
                      key={idx}
                      className="bg-black h-full"
                      style={{ width: `${w}px` }}
                    />
                  ))}
                </div>
                <span className="block font-mono text-[9px] text-slate-900 font-bold tracking-widest mt-1">
                  {booking.booking_id}
                </span>
              </div>
            </div>
          </div>

          {/* Total Paid & Booking Type */}
          <div className="flex items-center justify-between text-sm pt-2">
            <div>
              <span className="text-xs text-slate-500 font-semibold block">Experience Category</span>
              <span className="font-bold text-slate-800">
                {booking.booking_type === 'PRIVATE_EVENT' ? 'Private Maritime Event' : 'Cruise Tour Ticket'}
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-500 font-semibold block">Total Investment</span>
              <span className="text-2xl font-display font-black text-amber-600">
                ${Number(booking.total_price).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Footer print action (hidden on paper) */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between print:hidden">
          <span className="text-xs text-slate-500 font-medium">
            Check-in opens 2 hours prior to scheduled departure time.
          </span>
          <button
            onClick={handlePrint}
            className="px-4 py-2 rounded-xl bg-white hover:bg-sky-50 text-slate-800 text-xs font-bold flex items-center gap-2 border border-slate-300 transition cursor-pointer shadow-sm"
          >
            <Printer className="w-4 h-4 text-sky-600" />
            Print Ticket
          </button>
        </div>
      </div>
    </div>
  );
};
