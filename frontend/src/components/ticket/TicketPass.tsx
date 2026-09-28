import React from 'react';
import { Booking } from '../../api/types';
import { Anchor, Calendar, Clock, MapPin, Printer, ShieldCheck, UserCheck, FileText } from 'lucide-react';
import { formatINR } from '../../utils/currency';

interface TicketPassProps {
  booking: Booking;
  onPrint?: () => void;
  onViewInvoice?: () => void;
}

export const TicketPass: React.FC<TicketPassProps> = ({ booking, onPrint, onViewInvoice }) => {
  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      window.print();
    }
  };

  const isConfirmed = booking.status === 'CONFIRMED' || booking.status === 'COMPLETED';

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
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
            <div>
              <span className="text-[10px] tracking-widest font-mono uppercase text-sky-200 block">
                OFFICIAL MARITIME BOARDING PASS
              </span>
              <h2 className="text-xl font-display font-black tracking-tight">CROSS-HUNT VOYAGES</h2>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-sky-200 block tracking-wider">
              Booking Ref
            </span>
            <span className="font-mono font-bold text-base bg-white/20 backdrop-blur-md px-3 py-1 rounded-xl">
              {booking.booking_id}
            </span>
          </div>
        </div>

        {/* Status bar */}
        <div className="px-6 py-3 bg-sky-50 border-b border-sky-100 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <span
              className={`inline-block px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase ${
                isConfirmed
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-amber-100 text-amber-800 border border-amber-300'
              }`}
            >
              {booking.status}
            </span>
            {booking.tracking_status && (
              <span className="text-slate-500 font-semibold text-[11px]">
                Status: {booking.tracking_status}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-1.5 text-slate-500">
            <ShieldCheck className="w-4 h-4 text-sky-600" />
            <span className="text-[11px] font-medium">Digital Ticket Verified</span>
          </div>
        </div>

        {/* Main Voyage Body */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Ship and Route Information */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
            <div>
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">
                Flagship Vessel
              </span>
              <h3 className="text-2xl font-display font-extrabold text-slate-900 mt-0.5">
                {booking.cruise_title || booking.cruise_name}
              </h3>
              <p className="text-xs text-sky-700 font-semibold flex items-center gap-1.5 mt-1">
                <MapPin className="w-3.5 h-3.5" />
                <span>{booking.departure_port || 'Flagship Port'} → {booking.destination}</span>
              </p>
            </div>

            <div className="sm:text-right">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">
                Stateroom / Suite
              </span>
              <span className="text-base font-bold text-slate-800 block mt-0.5">
                {booking.cabin_name || booking.cabin_type || 'Royal Balcony Stateroom'}
              </span>
              <span className="text-xs text-slate-500">
                {booking.passengers_count || booking.number_of_people} Passenger(s)
              </span>
            </div>
          </div>

          {/* Schedule Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-sky-50/70 border border-sky-100 text-center">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Embarkation
              </span>
              <span className="font-bold text-slate-900 text-sm flex items-center justify-center gap-1 mt-0.5">
                <Calendar className="w-3.5 h-3.5 text-sky-600" />
                {booking.booking_date}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Boarding Time
              </span>
              <span className="font-bold text-slate-900 text-sm flex items-center justify-center gap-1 mt-0.5">
                <Clock className="w-3.5 h-3.5 text-sky-600" />
                {booking.start_time}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Duration
              </span>
              <span className="font-bold text-slate-900 text-sm flex items-center justify-center gap-1 mt-0.5">
                <Anchor className="w-3.5 h-3.5 text-sky-600" />
                {booking.duration_days || 3} Days
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Passenger Party
              </span>
              <span className="font-bold text-slate-900 text-sm flex items-center justify-center gap-1 mt-0.5">
                <UserCheck className="w-3.5 h-3.5 text-sky-600" />
                {booking.passengers_count || booking.number_of_people} Guests
              </span>
            </div>
          </div>

          {/* Barcode / QR Simulation Strip */}
          <div className="p-4 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-left">
              <span className="text-[10px] font-mono uppercase text-slate-400 block">
                DIGITAL ENCRYPTION SIGNATURE
              </span>
              <span className="font-mono text-xs font-bold text-sky-800 break-all">
                {booking.qr_code_hash || `CRS-${booking.booking_id}-VERIFIED`}
              </span>
            </div>

            {/* Visual Barcode Pattern */}
            <div className="h-10 flex items-center justify-center space-x-0.5 shrink-0">
              {[4, 2, 6, 3, 5, 2, 4, 6, 2, 4, 3, 5, 2, 6, 3, 4, 2, 5, 3, 4].map((w, idx) => (
                <div key={idx} className="bg-black h-full" style={{ width: `${w}px` }} />
              ))}
            </div>
          </div>

          {/* Total Paid & Booking Type */}
          <div className="flex items-center justify-between text-sm pt-2">
            <div>
              <span className="text-xs text-slate-500 font-semibold block">Experience Category</span>
              <span className="font-bold text-slate-800">
                {booking.booking_type === 'EVENT' || booking.booking_type === 'PRIVATE_EVENT'
                  ? 'Private Ship Charter / Event'
                  : 'Public Cruise Tour Ticket'}
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-500 font-semibold block">Total Amount (INR)</span>
              <span className="text-2xl font-display font-black text-sky-700">
                {formatINR(booking.total_price)}
              </span>
            </div>
          </div>
        </div>

        {/* Footer print & invoice action (hidden on paper) */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between print:hidden">
          <span className="text-xs text-slate-500 font-medium">
            Check-in opens 2 hours prior to scheduled embarkation.
          </span>
          <div className="flex items-center gap-2">
            {onViewInvoice && (
              <button
                onClick={onViewInvoice}
                className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold flex items-center gap-1.5 border border-slate-300 transition cursor-pointer shadow-sm"
              >
                <FileText className="w-3.5 h-3.5 text-sky-600" />
                <span>Tax Invoice</span>
              </button>
            )}
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Boarding Pass</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
