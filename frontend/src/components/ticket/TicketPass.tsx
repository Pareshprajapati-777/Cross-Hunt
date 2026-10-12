import React from 'react';
import { Booking } from '../../api/types';
import { QRCodeSVG } from 'qrcode.react';
import {
  Anchor,
  Calendar,
  Clock,
  MapPin,
  Printer,
  ShieldCheck,
  UserCheck,
  FileText,
  X,
  ExternalLink,
  CheckCircle2
} from 'lucide-react';
import { formatINR } from '../../utils/currency';

interface TicketPassProps {
  booking: Booking;
  onPrint?: () => void;
  onViewInvoice?: () => void;
  onClose?: () => void;
}

export const TicketPass: React.FC<TicketPassProps> = ({
  booking,
  onPrint,
  onViewInvoice,
  onClose
}) => {
  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      window.print();
    }
  };

  const isConfirmed = booking.status === 'CONFIRMED' || booking.status === 'COMPLETED';
  const verifyCode = booking.ticket_code || booking.qr_code_hash || booking.booking_id;
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://cross-hunt.com';
  const verifyUrl = `${origin}/ticket/verify/${verifyCode}`;

  return (
    <div className="max-w-2xl mx-auto my-4 print:m-0 print:max-w-full">
      {/* Printable Boarding Pass Card */}
      <div className="relative rounded-3xl overflow-hidden bg-white border border-sky-300 shadow-2xl shadow-sky-900/15 print:border-black print:shadow-none">
        {/* Top Header Strip */}
        <div className="bg-gradient-to-r from-sky-600 via-blue-700 to-indigo-800 p-6 text-white flex items-center justify-between relative">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-full bg-white border-2 border-white/60 flex items-center justify-center p-1.5 overflow-hidden shadow-sm shrink-0">
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
                OFFICIAL DIGITAL BOARDING PASS
              </span>
              <h2 className="text-xl font-display font-black tracking-tight">CROSS-HUNT VOYAGES</h2>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-sky-200 block tracking-wider">
                Booking Ref
              </span>
              <span className="font-mono font-bold text-base bg-white/20 backdrop-blur-md px-3 py-1 rounded-xl inline-block border border-white/20">
                {booking.booking_id}
              </span>
            </div>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition cursor-pointer print:hidden"
                title="Close Boarding Pass"
              >
                <X className="w-4 h-4" />
              </button>
            )}
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
              <span className="text-slate-600 font-bold text-[11px]">
                Voyage: <span className="text-sky-800 uppercase">{booking.tracking_status}</span>
              </span>
            )}
          </div>
          <div className="flex items-center space-x-1.5 text-slate-600">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span className="text-[11px] font-bold text-slate-700">Digital Gate Manifest Verified</span>
          </div>
        </div>

        {/* Main Trip Body */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Ship and Route Information */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                Vessel / Ship
              </span>
              <h3 className="text-2xl font-display font-extrabold text-slate-900 mt-0.5">
                {booking.cruise_title || booking.cruise_name}
              </h3>
              <p className="text-xs text-sky-700 font-bold flex items-center gap-1.5 mt-1">
                <MapPin className="w-3.5 h-3.5 text-sky-600" />
                <span>{booking.departure_port || 'Departure Port'} → {booking.destination}</span>
              </p>
            </div>

            <div className="sm:text-right">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                Accommodations / Cabin
              </span>
              <span className="text-base font-bold text-slate-800 block mt-0.5">
                {booking.cabin_name || booking.cabin_type || 'Standard Ocean Cabin'}
              </span>
              <span className="text-xs text-slate-500 font-medium">
                {booking.passengers_count || booking.number_of_people} Passenger(s) ({(booking.adults_count || 1)} Adults{booking.children_count ? `, ${booking.children_count} Kids` : ''})
              </span>
            </div>
          </div>

          {/* Schedule Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-sky-50/70 border border-sky-100 text-center">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Embark Date
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
                {booking.start_time || '10:00'}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Duration
              </span>
              <span className="font-bold text-slate-900 text-sm flex items-center justify-center gap-1 mt-0.5">
                <Anchor className="w-3.5 h-3.5 text-sky-600" />
                {booking.duration_days ? `${booking.duration_days} Days` : `${booking.duration_hours || 4} Hours`}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Passholder
              </span>
              <span className="font-bold text-slate-900 text-xs sm:text-sm flex items-center justify-center gap-1 mt-0.5 truncate px-1">
                <UserCheck className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                <span className="truncate">{booking.customer_name || 'Verified Guest'}</span>
              </span>
            </div>
          </div>

          {/* Barcode / QR Code Strip */}
          <div className="p-5 rounded-2xl bg-slate-50 border-2 border-dashed border-sky-200 flex flex-col sm:flex-row items-center justify-between gap-5">
            {/* Real High-Resolution Scannable QR Matrix */}
            <div className="flex items-center gap-4">
              <a
                href={verifyUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="Scan with smartphone or click to verify boarding ticket at maritime gate"
                className="group relative p-2.5 bg-white rounded-2xl border-2 border-sky-300 shadow-sm hover:border-sky-500 hover:shadow-md transition shrink-0 block"
              >
                <div className="w-24 h-24 flex items-center justify-center bg-white">
                  <QRCodeSVG
                    value={verifyUrl}
                    size={96}
                    level="H"
                    includeMargin={false}
                    className="w-full h-full"
                  />
                </div>
                <span className="block text-[8px] font-mono text-center text-sky-700 font-extrabold uppercase mt-1.5 group-hover:underline flex items-center justify-center gap-0.5">
                  <span>Gate QR Scan</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </span>
              </a>

              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Ticket & Security ID
                </span>
                <span className="font-mono text-sm font-black text-sky-950 block">
                  {booking.ticket_code || `TK-${booking.booking_id.replace('CRS-', '')}`}
                </span>
                <span className="text-[10px] font-mono text-slate-500 block">
                  Token: {(booking.qr_code_hash || booking.booking_id).slice(0, 16)}
                </span>
                <a
                  href={verifyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-bold text-sky-600 hover:text-sky-800 underline inline-flex items-center gap-1 pt-0.5"
                >
                  Verify at Gate Portal
                </a>
              </div>
            </div>

            {/* Visual Barcode Pattern */}
            <div className="flex flex-col items-center sm:items-end space-y-1">
              <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest">
                BOARDING PASS BARCODE
              </span>
              <div className="h-10 flex items-center justify-center space-x-0.5 shrink-0 bg-white p-1.5 rounded-lg border border-slate-200">
                {[4, 2, 6, 3, 5, 2, 4, 6, 2, 4, 3, 5, 2, 6, 3, 4, 2, 5, 3, 4, 3, 5, 2, 4].map((w, idx) => (
                  <div key={idx} className="bg-slate-900 h-full" style={{ width: `${w}px` }} />
                ))}
              </div>
              <span className="font-mono text-[10px] text-slate-600 font-bold">
                *{booking.booking_id}*
              </span>
            </div>
          </div>

          {/* Total Paid & Booking Type */}
          <div className="flex items-center justify-between text-sm pt-2 border-t border-slate-100">
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

        {/* Footer print & invoice action (hidden on paper print) */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row gap-3 sm:items-center justify-between print:hidden">
          <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Present this pass or QR at terminal gate for immediate boarding.</span>
          </span>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            {onViewInvoice && (
              <button
                type="button"
                onClick={onViewInvoice}
                className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold flex items-center gap-1.5 border border-slate-300 transition cursor-pointer shadow-sm"
              >
                <FileText className="w-3.5 h-3.5 text-sky-600" />
                <span>Tax Invoice</span>
              </button>
            )}
            <button
              type="button"
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
