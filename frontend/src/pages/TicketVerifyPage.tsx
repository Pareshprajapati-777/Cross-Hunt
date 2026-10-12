import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { verifyTicket, markTicketUsed } from '../api/bookings';
import { TicketVerification } from '../api/types';
import {
  ShieldCheck,
  ShieldAlert,
  Calendar,
  Clock,
  MapPin,
  Ship,
  UserCheck,
  CheckCircle2,
  XCircle,
  Loader2,
  ArrowLeft,
  Anchor,
  QrCode,
  Check,
  AlertTriangle
} from 'lucide-react';
import { formatINR } from '../utils/currency';

export const TicketVerifyPage: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [ticketData, setTicketData] = useState<TicketVerification | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!code) {
      setErrorMsg('No boarding ticket code provided.');
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
      setActionSuccessMsg(res.message || 'Ticket successfully marked as USED / Boarded.');
      setTicketData((prev) => (prev ? { ...prev, valid: false, status: 'USED', status_display: 'BOARDING PASS USED', can_mark_used: false } : null));
    } catch (err: any) {
      alert(err.message || 'Failed to update ticket status');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-slate-50 to-white py-12 px-4 sm:px-6 lg:px-8 flex flex-col justify-center items-center">
      <div className="w-full max-w-xl mx-auto space-y-6">
        {/* Navigation back */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 text-xs font-bold text-sky-700 hover:text-sky-900 transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Cross-Hunt</span>
          </button>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-sky-200 text-sky-800 text-[11px] font-bold shadow-sm">
            <Anchor className="w-3 h-3 text-sky-600" />
            <span>Official Gate Scanner</span>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="p-12 rounded-3xl bg-white border border-sky-100 shadow-xl text-center space-y-4">
            <Loader2 className="w-10 h-10 text-sky-600 animate-spin mx-auto" />
            <h2 className="text-xl font-bold text-slate-800 font-serif">Verifying Boarding Pass...</h2>
            <p className="text-xs text-slate-500">Checking official maritime manifest security token</p>
          </div>
        )}

        {/* Error / Not Found State */}
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

        {/* Valid or Invalid Ticket Card */}
        {!loading && ticketData && (
          <div className="rounded-3xl overflow-hidden bg-white border border-sky-300 shadow-2xl space-y-0">
            {/* Header Banner */}
            <div
              className={`p-6 text-white text-center space-y-2 transition-all ${
                ticketData.valid
                  ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-sky-700'
                  : 'bg-gradient-to-r from-rose-600 via-red-600 to-amber-700'
              }`}
            >
              <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-white/20 backdrop-blur-md border border-white/40 mb-1">
                {ticketData.valid ? (
                  <CheckCircle2 className="w-8 h-8 text-white" />
                ) : (
                  <XCircle className="w-8 h-8 text-white" />
                )}
              </div>

              <div>
                <span className="text-[11px] font-mono tracking-widest uppercase font-black text-white/80 block">
                  OFFICIAL CROSS-HUNT GATE CONTROL
                </span>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight font-serif">
                  {ticketData.status_display}
                </h1>
              </div>

              <div className="inline-block px-3 py-1 rounded-full bg-white/20 text-white text-xs font-mono font-bold tracking-wider">
                Ticket ID: {ticketData.ticket_id}
              </div>
            </div>

            {/* Action Alert if just marked as used */}
            {actionSuccessMsg && (
              <div className="p-4 bg-emerald-50 border-b border-emerald-200 flex items-center gap-2 text-xs font-bold text-emerald-800">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{actionSuccessMsg}</span>
              </div>
            )}

            {/* Ticket Body Manifest */}
            <div className="p-6 sm:p-8 space-y-6">
              {/* Passenger & Ship Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                    Primary Passenger
                  </span>
                  <h3 className="text-xl font-bold text-slate-900 mt-0.5 flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-sky-600" />
                    <span>{ticketData.passenger_name}</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Party of {ticketData.passengers_count} Guest(s) • {ticketData.booking_type}
                  </p>
                </div>

                <div className="sm:text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                    Assigned Cabin / Seat
                  </span>
                  <span className="text-base font-extrabold text-sky-800 block mt-0.5">
                    {ticketData.cabin_seat}
                  </span>
                  <span className="text-xs font-bold text-emerald-700">
                    Paid: {formatINR(ticketData.total_price)}
                  </span>
                </div>
              </div>

              {/* Vessel & Route */}
              <div className="p-4 rounded-2xl bg-sky-50/80 border border-sky-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-2">
                    <Ship className="w-4 h-4 text-sky-700" />
                    <span>{ticketData.ship_name}</span>
                  </span>
                  <span className="text-xs font-semibold text-slate-600">
                    Operator: {ticketData.operator_name}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs font-bold text-sky-900">
                  <MapPin className="w-4 h-4 text-sky-600 shrink-0" />
                  <span>Route: {ticketData.route}</span>
                </div>
              </div>

              {/* Schedule Grid */}
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-0.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                    Departure Date
                  </span>
                  <p className="text-sm font-bold text-slate-900 flex items-center justify-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-sky-600" />
                    <span>{ticketData.departure_date}</span>
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-0.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                    Boarding Time
                  </span>
                  <p className="text-sm font-bold text-slate-900 flex items-center justify-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-sky-600" />
                    <span>{ticketData.departure_time}</span>
                  </p>
                </div>
              </div>

              {/* Security Verification Code */}
              <div className="p-4 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-mono uppercase text-slate-400 block">
                    Cryptographic Verification Token
                  </span>
                  <span className="font-mono text-xs font-bold text-slate-800 break-all">
                    {ticketData.verification_code}
                  </span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-sky-100 border border-sky-200 flex items-center justify-center text-sky-700 shrink-0">
                  <QrCode className="w-5 h-5" />
                </div>
              </div>

              {/* Operator / Admin Mark USED Button */}
              {ticketData.can_mark_used && (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                    <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>Authorized Ship Crew Action</span>
                  </div>
                  <p className="text-[11px] text-amber-800">
                    Confirm that passengers have presented valid government photo ID and boarded the ship.
                  </p>
                  <button
                    onClick={handleMarkUsed}
                    disabled={actionLoading}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    {actionLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Validating Boarding...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Mark Passenger as Boarded / USED</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 text-center text-xs text-slate-500">
              Cross-Hunt Maritime Ticket Verification Engine • Verified Real-Time
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
