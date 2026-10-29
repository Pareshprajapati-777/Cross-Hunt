import React, { useState, useEffect } from 'react';
import { Booking } from '../../api/types';
import { QRCodeSVG } from 'qrcode.react';
import {
  Anchor,
  Calendar,
  Clock,
  MapPin,
  Navigation,
  Printer,
  ShieldCheck,
  UserCheck,
  FileText,
  X,
  ExternalLink,
  CheckCircle2,
  Smartphone,
  Copy,
  Check,
  Globe,
  Settings,
  Ship
} from 'lucide-react';
import { formatINR } from '../../utils/currency';

interface TicketPassProps {
  booking: Booking;
  onPrint?: () => void;
  onViewInvoice?: () => void;
  onOpenPortMap?: (booking: Booking) => void;
  onClose?: () => void;
  isVerificationView?: boolean;
}

export const TicketPass: React.FC<TicketPassProps> = ({
  booking,
  onPrint,
  onViewInvoice,
  onOpenPortMap,
  onClose,
  isVerificationView = false,
}) => {
  const [detectedLanUrl, setDetectedLanUrl] = useState<string>('');
  const [customScanBase, setCustomScanBase] = useState<string>(() => {
    try {
      return localStorage.getItem('cruisehunt_qr_scan_base') || localStorage.getItem('crosshunt_qr_scan_base') || '';
    } catch {
      return '';
    }
  });
  const [showConfig, setShowConfig] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      setDetectedLanUrl(window.location.origin);
      return;
    }

    fetch('/api/system/network-info/')
      .then((res) => res.json())
      .then((data) => {
        if (data?.active_base_url) {
          setDetectedLanUrl(data.active_base_url);
        }
      })
      .catch(() => {
        if (typeof window !== 'undefined') {
          setDetectedLanUrl(window.location.origin);
        }
      });
  }, []);

  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      window.print();
    }
  };

  const isConfirmed = booking.status === 'CONFIRMED' || booking.status === 'COMPLETED';
  const verifyCode = booking.ticket_code || booking.qr_code_hash || booking.booking_id;
  const effectiveBase = (customScanBase.trim() || detectedLanUrl || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173')).replace(/\/+$/, '');
  const verifyUrl = `${effectiveBase}/ticket/verify/${encodeURIComponent(verifyCode)}`;

  const handleCopyLink = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(verifyUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSaveCustomBase = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = customInput.trim();
    setCustomScanBase(cleaned);
    try {
      if (cleaned) {
        localStorage.setItem('cruisehunt_qr_scan_base', cleaned);
      } else {
        localStorage.removeItem('cruisehunt_qr_scan_base');
        localStorage.removeItem('crosshunt_qr_scan_base');
      }
    } catch {}
    setShowConfig(false);
  };

  return (
    <div className="max-w-2xl mx-auto my-4 print:m-0 print:max-w-full">
      {/* Printable Boarding Pass Card */}
      <div className="relative rounded-3xl overflow-hidden bg-[#F8FCFF] border border-[#082F5B]/15 shadow-2xl shadow-[#082F5B]/15 print:border-black print:shadow-none">
        {/* Top Header Strip - Midnight Oceanic Navy to Deep Ocean */}
        <div className="bg-gradient-to-r from-[#030d1c] via-[#051833] to-[#0a2548] p-6 text-[#fff8dc] flex items-center justify-between relative border-b border-[#38bdf8]/20">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#0284c7] via-[#0369a1] to-[#fff8dc] p-[2px] shadow-sm flex items-center justify-center shrink-0">
              <div className="w-full h-full bg-white rounded-full flex items-center justify-center overflow-hidden">
                <Ship className="w-6 h-6 text-[#0284c7]" />
              </div>
            </div>
            <div>
              <span className="text-[10px] tracking-widest font-mono uppercase text-[#38bdf8] block font-bold">
                OFFICIAL DIGITAL BOARDING PASS
              </span>
              <h2 className="text-xl font-display font-black tracking-tight text-[#fff8dc]">CRUISE-HUNT CRUISES & TRIPS</h2>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-[#38bdf8] block tracking-wider">
                Booking Ref
              </span>
              <span className="font-mono font-bold text-base bg-[#071c38]/80 backdrop-blur-md text-[#fff8dc] px-3 py-1 rounded-xl inline-block border border-[#38bdf8]/30">
                {booking.booking_id}
              </span>
            </div>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/25 text-[#F8FCFF] flex items-center justify-center transition cursor-pointer print:hidden"
                title="Close Boarding Pass"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Status bar */}
        <div className="px-6 py-3 bg-[#EAF4FB] border-b border-[#082F5B]/10 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <span
              className={`inline-block px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase ${
                isConfirmed
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-amber-100 text-amber-800 border border-amber-300'
              }`}
            >
              {booking.status === 'PENDING' ? 'PENDING APPROVAL' : booking.status}
            </span>
            {booking.tracking_status && (
              <span className="text-[#102B46] font-bold text-[11px]">
                Trip Status: <span className="text-[#1677C8] uppercase">{booking.tracking_status}</span>
              </span>
            )}
          </div>
          <div className="flex items-center space-x-1.5 text-[#102B46]">
            {isConfirmed ? (
              <>
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span className="text-[11px] font-bold text-emerald-800">Digital Gate Pass Verified</span>
              </>
            ) : (
              <>
                <Clock className="w-4 h-4 text-amber-600 animate-pulse" />
                <span className="text-[11px] font-bold text-amber-800">Awaiting Owner Approval</span>
              </>
            )}
          </div>
        </div>

        {/* Main Trip Body */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Ship and Route Information */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#082F5B]/10 pb-6">
            <div>
              <span className="text-[10px] text-[#102B46]/60 font-bold uppercase tracking-wider block">
                Ship / Boat
              </span>
              <h3 className="text-2xl font-display font-extrabold text-[#102B46] mt-0.5">
                {booking.cruise_title || booking.cruise_name}
              </h3>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <p className="text-xs text-[#1677C8] font-bold flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#1677C8]" />
                  <span>{booking.departure_port || 'Departure Port'} → {booking.destination}</span>
                </p>
                {onOpenPortMap && (
                  <button
                    type="button"
                    onClick={() => onOpenPortMap(booking)}
                    className="px-2.5 py-0.5 rounded-full bg-sky-100 hover:bg-sky-200 text-sky-800 text-[10px] font-bold transition inline-flex items-center gap-1 cursor-pointer print:hidden shadow-xs"
                    title="Open live route to boarding port"
                  >
                    <Navigation className="w-2.5 h-2.5 text-sky-600" />
                    <span>Live Route Map</span>
                  </button>
                )}
              </div>
            </div>

            <div className="sm:text-right">
              <span className="text-[10px] text-[#102B46]/60 font-bold uppercase tracking-wider block">
                Accommodations / Cabin
              </span>
              <span className="text-base font-bold text-[#102B46] block mt-0.5">
                {booking.cabin_name || booking.cabin_type || 'Standard Ocean Cabin'}
              </span>
              <span className="text-xs text-[#102B46]/70 font-medium">
                {booking.passengers_count || booking.number_of_people} Passenger(s) ({(booking.adults_count || 1)} Adults{booking.children_count ? `, ${booking.children_count} Kids` : ''})
              </span>
            </div>
          </div>

          {/* Schedule Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-[#EAF4FB] border border-[#082F5B]/10 text-center">
            <div>
              <span className="text-[10px] uppercase font-bold text-[#102B46]/60 block tracking-wider">
                {booking.return_date && booking.return_date !== booking.booking_date ? 'Voyage Dates' : 'Embark Date'}
              </span>
              <span className="font-bold text-[#102B46] text-sm flex items-center justify-center gap-1 mt-0.5">
                <Calendar className="w-3.5 h-3.5 text-[#1677C8]" />
                {booking.booking_date}
              </span>
              {booking.return_date && booking.return_date !== booking.booking_date && (
                <span className="text-[10px] font-bold text-[#1677C8] block mt-0.5">
                  to {booking.return_date}
                </span>
              )}
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-[#102B46]/60 block tracking-wider">
                Boarding Time
              </span>
              <span className="font-bold text-[#102B46] text-sm flex items-center justify-center gap-1 mt-0.5">
                <Clock className="w-3.5 h-3.5 text-[#1677C8]" />
                {booking.start_time || '10:00'}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-[#102B46]/60 block tracking-wider">
                Duration
              </span>
              <span className="font-bold text-[#102B46] text-sm flex items-center justify-center gap-1 mt-0.5">
                <Anchor className="w-3.5 h-3.5 text-[#1677C8]" />
                {booking.duration_display || (booking.duration_days ? `${booking.duration_days} Days` : `${booking.duration_hours || 4} Hours`)}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-[#102B46]/60 block tracking-wider">
                Passholder
              </span>
              <span className="font-bold text-[#102B46] text-xs sm:text-sm flex items-center justify-center gap-1 mt-0.5 truncate px-1">
                <UserCheck className="w-3.5 h-3.5 text-[#1677C8] shrink-0" />
                <span className="truncate">{booking.customer_name || 'Verified Guest'}</span>
              </span>
            </div>
          </div>

          {/* QR Code Pass Strip */}
          <div className="p-5 rounded-2xl bg-[#F8FCFF] border-2 border-dashed border-[#63B8F0]/50 flex flex-col sm:flex-row items-center justify-between gap-5">
            {/* Real High-Resolution Scannable QR Matrix */}
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
              <a
                href={verifyUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="Scan with Google Lens, iPhone Camera, or QR app to open boarding pass"
                className="group relative p-2.5 bg-white rounded-2xl border-2 border-[#1677C8]/40 shadow-sm hover:border-[#1677C8] hover:shadow-md transition shrink-0 block"
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
                <span className="block text-[8px] font-mono text-center text-[#1677C8] font-extrabold uppercase mt-1.5 group-hover:underline flex items-center justify-center gap-0.5">
                  <Smartphone className="w-2.5 h-2.5" />
                  <span>Scan with Phone</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </span>
              </a>

              <div className="space-y-1.5 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-1.5">
                  <span className="text-[10px] uppercase font-bold text-[#102B46]/60 tracking-wider">
                    Ticket Security ID
                  </span>
                  <span className="px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[9px] font-black tracking-wider uppercase">
                    Lens Ready
                  </span>
                </div>
                <span className="font-mono text-sm font-black text-[#082F5B] block">
                  {booking.ticket_code || `TK-${booking.booking_id.replace('CRS-', '')}`}
                </span>
                <span className="text-[10px] font-mono text-[#102B46]/60 block truncate max-w-[200px]">
                  Token: {(booking.qr_code_hash || booking.booking_id).slice(0, 16)}
                </span>

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-0.5">
                  {!isVerificationView ? (
                    <a
                      href={verifyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-bold text-[#1677C8] hover:text-[#082F5B] underline inline-flex items-center gap-1"
                    >
                      <span>Open Gate Pass</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  ) : (
                    <span className="text-[11px] font-bold text-emerald-700 inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>Verified at Gate Portal</span>
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="px-2 py-0.5 rounded-md bg-white border border-[#1677C8]/30 hover:border-[#1677C8] text-[#1677C8] text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
                    title="Copy direct verification link for mobile sharing"
                  >
                    {copied ? <Check className="w-2.5 h-2.5 text-emerald-600" /> : <Copy className="w-2.5 h-2.5" />}
                    <span>{copied ? 'Link Copied!' : 'Copy Link'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCustomInput(customScanBase || effectiveBase);
                      setShowConfig(!showConfig);
                    }}
                    className="p-1 rounded-md text-[#102B46]/50 hover:text-[#1677C8] transition cursor-pointer print:hidden"
                    title="Configure custom domain or tunnel URL for mobile scanning"
                  >
                    <Settings className="w-3 h-3" />
                  </button>
                </div>

                {/* Optional Custom Scan URL Popover */}
                {showConfig && (
                  <form onSubmit={handleSaveCustomBase} className="mt-2 p-2.5 bg-white rounded-xl border border-sky-200 shadow-lg text-[11px] space-y-1.5 print:hidden">
                    <span className="font-bold text-[#082F5B] block">QR Code Scan Domain / IP:</span>
                    <input
                      type="text"
                      value={customInput}
                      onChange={(e) => setCustomInput(e.target.value)}
                      placeholder="e.g. http://10.83.31.2:5173 or https://xyz.ngrok.io"
                      className="w-full px-2 py-1 rounded bg-slate-50 border border-slate-300 text-[10px] font-mono focus:outline-none focus:border-sky-500"
                    />
                    <div className="flex items-center justify-between gap-1">
                      <button
                        type="submit"
                        className="px-2.5 py-1 rounded bg-sky-600 text-white font-bold text-[10px] cursor-pointer"
                      >
                        Save URL
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCustomScanBase('');
                          localStorage.removeItem('cruisehunt_qr_scan_base');
                          localStorage.removeItem('crosshunt_qr_scan_base');
                          setShowConfig(false);
                        }}
                        className="text-[10px] text-slate-500 hover:text-slate-800 underline cursor-pointer"
                      >
                        Reset to Auto
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>

            {/* Booking Reference Stamp */}
            <div className="flex flex-col items-center sm:items-end space-y-1 text-center sm:text-right">
              <span className="text-[9px] font-mono text-[#102B46]/60 uppercase tracking-widest">
                BOOKING REFERENCE
              </span>
              <div className="px-3.5 py-1.5 rounded-xl bg-white border border-[#082F5B]/15 shadow-xs">
                <span className="font-mono text-xs sm:text-sm font-black text-[#082F5B] tracking-wide block">
                  {booking.booking_id}
                </span>
              </div>
              <span className="text-[10px] font-semibold text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                Verified Digital Pass
              </span>
            </div>
          </div>

          {/* Total Paid & Booking Type */}
          <div className="flex items-center justify-between text-sm pt-2 border-t border-[#082F5B]/10">
            <div>
              <span className="text-xs text-[#102B46]/60 font-semibold block">Experience Category</span>
              <span className="font-bold text-[#102B46]">
                {booking.booking_type === 'EVENT' || booking.booking_type === 'PRIVATE_EVENT'
                  ? 'Private Ship Charter / Event'
                  : 'Public Cruise Tour Ticket'}
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs text-[#102B46]/60 font-semibold block">Total Amount (INR)</span>
              <span className="text-2xl font-display font-black text-[#1677C8]">
                {formatINR(booking.total_price)}
              </span>
            </div>
          </div>
        </div>

        {/* Footer print & invoice action (hidden on paper print) */}
        <div className="px-6 py-4 bg-[#EAF4FB] border-t border-[#082F5B]/10 flex flex-col sm:flex-row gap-3 sm:items-center justify-between print:hidden">
          <span className="text-xs text-[#102B46]/70 font-medium flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Present this pass or QR at terminal gate for immediate boarding.</span>
          </span>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            {onOpenPortMap && (
              <button
                type="button"
                onClick={() => onOpenPortMap(booking)}
                className="px-4 py-2 rounded-full bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-sm"
              >
                <Navigation className="w-3.5 h-3.5 text-sky-200" />
                <span>Port Route Map</span>
              </button>
            )}
            {onViewInvoice && (
              <button
                type="button"
                onClick={onViewInvoice}
                className="px-4 py-2 rounded-full bg-[#F8FCFF] hover:bg-white text-[#102B46] text-xs font-bold flex items-center gap-1.5 border border-[#082F5B]/15 transition cursor-pointer shadow-sm"
              >
                <FileText className="w-3.5 h-3.5 text-[#1677C8]" />
                <span>Tax Invoice</span>
              </button>
            )}
            <button
              type="button"
              onClick={handlePrint}
              className="px-5 py-2 rounded-full bg-[#1677C8] hover:bg-[#082F5B] text-[#F8FCFF] text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-md shadow-[#1677C8]/20"
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
