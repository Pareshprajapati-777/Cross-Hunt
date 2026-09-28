import React, { useState, useEffect } from 'react';
import { getOperatorDashboard, operatorBookingAction, OperatorDashboardData } from '../api/dashboards';
import { Ship, Users, DollarSign, CheckCircle2, Anchor, Calendar, Layers } from 'lucide-react';

export const OperatorDashboardPage: React.FC = () => {
  const [data, setData] = useState<OperatorDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchDashboard = () => {
    setLoading(true);
    getOperatorDashboard()
      .then((res) => setData(res))
      .catch((err) => console.error('Failed to load operator dashboard:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleAction = async (bookingId: string, action: 'confirm' | 'cancel') => {
    setActionLoading(`${bookingId}-${action}`);
    try {
      await operatorBookingAction(bookingId, action);
      fetchDashboard();
    } catch (err: any) {
      alert(err.message || 'Action failed');
    } finally {
      setActionLoading(null);
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
      {/* Top Banner */}
      <div className="mb-10 border-b border-slate-200 pb-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-100 border border-sky-200 text-sky-800 text-xs font-bold uppercase tracking-wider mb-2">
          <Anchor className="w-3.5 h-3.5 text-sky-600" />
          Operator Fleet Command Suite
        </div>
        <h1 className="text-3xl sm:text-4xl font-display font-black text-slate-900 tracking-tight">
          Vessel Operations & Booking Approvals
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Manage your chartered liners, approve stateroom passengers, and track maritime voyage revenues.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
        <div className="p-6 rounded-3xl bg-white border border-sky-100 shadow-sm">
          <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Total Liners In Fleet</span>
          <p className="text-3xl font-display font-extrabold text-slate-900 mt-2 flex items-center gap-2">
            <Ship className="w-6 h-6 text-sky-600" />
            {data.stats.total_ships}
          </p>
        </div>

        <div className="p-6 rounded-3xl bg-white border border-sky-100 shadow-sm">
          <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Active Bookings</span>
          <p className="text-3xl font-display font-extrabold text-amber-700 mt-2 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-amber-600" />
            {data.stats.active_bookings}
          </p>
        </div>

        <div className="p-6 rounded-3xl bg-white border border-sky-100 shadow-sm">
          <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Completed Voyages</span>
          <p className="text-3xl font-display font-extrabold text-emerald-600 mt-2 flex items-center gap-2">
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            {data.stats.completed_trips}
          </p>
        </div>

        <div className="p-6 rounded-3xl bg-white border border-sky-100 shadow-sm">
          <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Charter & Ticket Revenue</span>
          <p className="text-3xl font-display font-extrabold text-amber-600 mt-2 flex items-center gap-1">
            <DollarSign className="w-6 h-6 text-amber-600" />
            ${Math.round(data.stats.total_revenue).toLocaleString()}
          </p>
        </div>
      </div>

      {/* ============================================================ */}
      {/* SECTION: MY FLEET CARDS                                      */}
      {/* ============================================================ */}
      <section className="mb-14 space-y-6">
        <h2 className="text-2xl font-display font-bold text-slate-900">My Fleet Liners</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.my_ships.map((ship) => (
            <div
              key={ship.id}
              className="rounded-3xl bg-white border border-sky-100 shadow-sm overflow-hidden flex flex-col justify-between"
            >
              <div className="relative aspect-[16/10] bg-slate-100">
                <img
                  src={ship.image || '/static/images/placeholder.png'}
                  alt={ship.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-white/95 backdrop-blur-md text-[10px] uppercase font-bold text-sky-800 border border-sky-200 shadow-sm">
                  {ship.category}
                </div>
              </div>

              <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-display font-bold text-xl text-slate-900">{ship.title}</h3>
                  <p className="text-xs text-slate-500 mt-1">{ship.destination || ship.location}</p>
                  <div className="grid grid-cols-2 gap-2 mt-4 text-xs text-slate-600 font-semibold">
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      {ship.capacity} Passengers
                    </span>
                    <span className="flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-slate-400" />
                      {ship.decks_count || 12} Decks
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-semibold">Starting Fare</span>
                  <span className="font-display font-bold text-lg text-amber-600">
                    ${Number(ship.price_per_day).toLocaleString()} / day
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ============================================================ */}
      {/* SECTION: RECENT BOOKINGS & APPROVALS TABLE                   */}
      {/* ============================================================ */}
      <section className="space-y-6">
        <h2 className="text-2xl font-display font-bold text-slate-900">Guest Reservations & Approvals</h2>
        {data.recent_bookings.length === 0 ? (
          <div className="p-8 rounded-3xl bg-white border border-sky-100 text-center text-slate-500 text-sm">
            No guest reservations found for your fleet yet.
          </div>
        ) : (
          <div className="overflow-x-auto bg-white rounded-3xl border border-sky-100 shadow-lg">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-500 bg-sky-50/50">
                  <th className="py-4 px-6">Booking Ref</th>
                  <th className="py-4 px-6">Vessel</th>
                  <th className="py-4 px-6">Date</th>
                  <th className="py-4 px-6">Guests</th>
                  <th className="py-4 px-6">Fare</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-800">
                {data.recent_bookings.map((b) => (
                  <tr key={b.id} className="hover:bg-sky-50/40 transition">
                    <td className="py-4 px-6 font-mono text-xs text-sky-700 font-bold">
                      #{b.booking_id}
                    </td>
                    <td className="py-4 px-6 font-bold">{b.cruise_title}</td>
                    <td className="py-4 px-6 text-xs text-slate-600 font-medium">{b.booking_date}</td>
                    <td className="py-4 px-6 text-xs font-semibold">{b.passengers_count} Guests</td>
                    <td className="py-4 px-6 font-display font-bold text-amber-600">
                      ${Number(b.total_price).toLocaleString()}
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          b.status === 'CONFIRMED'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : b.status === 'PENDING'
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-rose-100 text-rose-800 border border-rose-300'
                        }`}
                      >
                        {b.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      {b.status === 'PENDING' && (
                        <div className="inline-flex items-center space-x-2">
                          <button
                            onClick={() => handleAction(b.booking_id, 'confirm')}
                            disabled={actionLoading === `${b.booking_id}-confirm`}
                            className="px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300 text-xs font-bold transition cursor-pointer"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleAction(b.booking_id, 'cancel')}
                            disabled={actionLoading === `${b.booking_id}-cancel`}
                            className="px-3 py-1.5 rounded-lg bg-rose-100 text-rose-800 hover:bg-rose-200 border border-rose-300 text-xs font-bold transition cursor-pointer"
                          >
                            Decline
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
