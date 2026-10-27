import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { verifyTicket, markTicketUsed } from '../api/bookings';
import { TicketVerification, Booking } from '../api/types';
import { TicketPass } from '../components/ticket/TicketPass';
import { InvoiceModal } from '../components/ticket/InvoiceModal';
import {
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Loader2,
  ArrowLeft,
  Anchor,
  Check,
  AlertTriangle,
  Smartphone,
  Printer,
  FileText,
  Sparkles
} from 'lucide-react';

export const TicketVerifyPage: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [ticketData, setTicketData] = useState<TicketVerification | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [showInvoice, setShowInvoice] = useState(false);

  useEffect(() => {
    if (!code) {
      setErrorMsg('No boarding ticket code or QR token provided.');
      setLoading(false);
      return;
    }

    setLoading(true);
    verifyTicket(code)
      .then((res) => {
        setTicketData(res);
        setErrorMsg(null);
      })
      .catch((err) => {
        console.error('Ticket verification error:', err);
        setErrorMsg(err.message || 'Unable to verify boarding ticket.');
      })
      .finally(() => setLoading(false));
  }, [code]);

  const handleMarkUsed = async () => {
    if (!code) return;
    setActionLoading(true);
    try {
      const res = await markTicketUsed(code);
      setActionSuccessMsg(res.message || 'Passenger successfully marked as BOARDED / Ticket USED.');
      setTicketData((prev) => (prev ? {
        ...prev,
        valid: false,
        status: 'USED',
        status_display: 'BOARDING PASS USED',
        can_mark_used: false
      } : null));
    } catch (err: any) {
      alert(err.message || 'Failed to update ticket status');
    } finally {
      setActionLoading(false);
    }
  };

  // Build high-fidelity resolved Booking object from verified ticket response
  const resolvedBooking: Booking | null = ticketData?.booking ? ticketData.booking : (ticketData ? ({
    id: 0,
    booking_id: ticketData.booking_id,
    ticket_code: ticketData.ticket_id,
    qr_code_hash: ticketData.verification_code,
    status: ticketData.valid ? 'CONFIRMED' : (ticketData.status === 'USED' ? 'COMPLETED' : 'CANCELLED'),
    customer_name: ticketData.passenger_name || 'Verified Guest',
    cruise_title: ticketData.ship_name || 'Luxury Cruise Vessel',
    cruise_name: ticketData.ship_name || 'Luxury Cruise Vessel',
    departure_port: ticketData.departure_port || '',
    destination: ticketData.destination || '',
    booking_date: ticketData.departure_date || '',
    return_date: ticketData.departure_date || '',
    start_time: ticketData.departure_time || '10:00',
    duration_display: ticketData.duration_display || 'Scheduled Cruise Tour',
    duration_days: ticketData.duration_days || 1,
    cabin_name: ticketData.cabin_seat || 'Ocean Suite',
    cabin_type: ticketData.cabin_seat || 'Ocean Suite',
    passengers_count: ticketData.passengers_count || 1,
    number_of_people: ticketData.passengers_count || 1,
    adults_count: ticketData.adults_count || 1,
    children_count: ticketData.children_count || 0,
    total_price: ticketData.total_price || 0,
    booking_type: ticketData.booking_type === 'Private Charter' ? 'EVENT' : 'TOUR',
  } as unknown as Booking) : null);

  return (
    <div className="min-h-screen bg-[#f8f9fa] py-8 sm:py-12 px-4 sm:px-6 lg:px-8 flex flex-col justify-center items-center selection:bg-[#0284c7]/20 selection:text-[#051833]">
      <div className="w-full max-w-3xl mx-auto space-y-6">

        {/* Top Navigation Bar */}
        <div className="flex items-center justify-between print:hidden">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 text-xs font-bold text-sky-700 hover:text-sky-900 transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Cruise-Hunt</span>
          </button>
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white border border-sky-200 text-sky-800 text-[11px] font-bold shadow-xs">
            <Smartphone className="w-3.5 h-3.5 text-sky-600" />
            <span>Official Gate & Mobile Pass Portal</span>
          </div>
        </div>

        {/* Loading Spinner */}
        {loading && (
          <div className="p-12 rounded-3xl bg-white border border-sky-100 shadow-xl text-center space-y-4">
            <Loader2 className="w-10 h-10 text-sky-600 animate-spin mx-auto" />
            <h2 className="text-xl font-bold text-slate-800 font-serif">Verifying Boarding Pass...</h2>
            <p className="text-xs text-slate-500">Authenticating digital maritime security token</p>
          </div>
        )}

        {/* Verification Failed / Not Found */}
        {!loading && errorMsg && (
          <div className="p-8 sm:p-10 rounded-3xl bg-white border border-rose-200 shadow-2xl text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-rose-100 border border-rose-300 flex items-center justify-center mx-auto text-rose-600">
              <ShieldAlert className="w-9 h-9" />
            </div>

            <div className="space-y-2">
              <span className="inline-block px-3 py-1 rounded-full bg-rose-100 text-rose-800 text-xs font-black uppercase tracking-wider border border-rose-300">
                INVALID TICKET
              </span>
              <h2 className="text-2xl font-extrabold text-slate-900 font-serif">Verification Failed</h2>
              <p className="text-sm text-slate-600 max-w-sm mx-auto">{errorMsg}</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 font-mono text-xs text-slate-500">
              Scanned Token: <span className="font-bold text-slate-800">{code}</span>
            </div>

            <button
              onClick={() => navigate('/')}
              className="w-full py-3 rounded-2xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition cursor-pointer"
            >
              Return to Homepage
            </button>
          </div>
        )}

        {/* Valid or Verified State: Render Full Boarding Pass */}
        {!loading && ticketData && resolvedBooking && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Top Security Status Banner */}
            <div
              className={`p-5 sm:p-6 rounded-3xl text-white shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4 transition-all print:hidden ${
                ticketData.valid
                  ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-sky-700 shadow-emerald-900/15 border border-emerald-400/30'
                  : ticketData.status === 'USED'
                  ? 'bg-gradient-to-r from-slate-700 via-sky-800 to-slate-900 shadow-slate-900/15 border border-slate-400/30'
                  : 'bg-gradient-to-r from-rose-600 via-red-600 to-amber-700 shadow-rose-900/15 border border-rose-400/30'
              }`}
            >
              <div className="flex items-center gap-3.5 text-center sm:text-left">
                <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md border border-white/40 flex items-center justify-center shrink-0 mx-auto sm:mx-0">
                  {ticketData.valid ? (
                    <ShieldCheck className="w-7 h-7 text-white" />
                  ) : ticketData.status === 'USED' ? (
                    <CheckCircle2 className="w-7 h-7 text-white" />
                  ) : (
                    <XCircle className="w-7 h-7 text-white" />
                  )}
                </div>
                <div>
                  <span className="text-[10px] font-mono tracking-widest uppercase font-black text-white/80 block">
                    {ticketData.valid
                      ? 'OFFICIALLY VERIFIED • READY FOR EMBARKATION'
                      : ticketData.status === 'USED'
                      ? 'BOARDING PASS USED • PASSENGER CHECKED IN'
                      : 'SECURITY CHECK • INVALID PASS'}
                  </span>
                  <h1 className="text-xl sm:text-2xl font-black font-serif tracking-tight">
                    {ticketData.status_display}
                  </h1>
                  <p className="text-xs text-white/90 font-medium">
                    Passenger: <strong>{ticketData.passenger_name}</strong> • Vessel: <strong>{ticketData.ship_name}</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3.5 py-1.5 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-mono font-bold tracking-wider border border-white/30">
                  {ticketData.ticket_id}
                </span>
              </div>
            </div>

            {/* Crew mark USED alert */}
            {actionSuccessMsg && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-xs font-bold text-emerald-800 print:hidden">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{actionSuccessMsg}</span>
              </div>
            )}

            {/* THE OFFICIAL DIGITAL BOARDING PASS */}
            <TicketPass
              booking={resolvedBooking}
              isVerificationView={true}
              onViewInvoice={() => setShowInvoice(true)}
              onPrint={() => window.print()}
            />

            {/* Authorized Ship Crew Gate Control (if Operator or Admin) */}
            {ticketData.can_mark_used && (
              <div className="p-6 rounded-3xl bg-amber-50/90 border-2 border-amber-300 shadow-md space-y-4 print:hidden">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-bold text-amber-900">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                    <span>Authorized Maritime Gate Crew Action</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-200/80 text-amber-900 font-bold uppercase">
                    Staff Only
                  </span>
                </div>
                <p className="text-xs text-amber-800 leading-relaxed">
                  Verify the passenger&apos;s government-issued photo ID (Aadhaar / Passport) matches <strong>{ticketData.passenger_name}</strong>. Once verified, click below to mark this pass as boarded.
                </p>
                <button
                  onClick={handleMarkUsed}
                  disabled={actionLoading}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-sky-700 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-md transition cursor-pointer flex items-center justify-center gap-2"
                >
                  {actionLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Validating Embarkation...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Confirm ID & Mark Passenger as Boarded / USED</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Action Bar below Boarding Pass */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs print:hidden">
              <span className="text-slate-500 font-medium">
                Official Cruise-Hunt Maritime Verification Seal • Cryptographic Hash {ticketData.verification_code?.slice(0, 12)}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowInvoice(true)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-sky-600" />
                  <span>Tax Invoice</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Pass</span>
                </button>
              </div>
            </div>

          </div>
        )}

      </div>

      {/* Tax Invoice Modal */}
      {showInvoice && resolvedBooking && (
        <InvoiceModal
          bookingId={resolvedBooking.booking_id}
          onClose={() => setShowInvoice(false)}
        />
      )}
    </div>
  );
};
