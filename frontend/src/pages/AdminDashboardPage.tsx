import React, { useState, useEffect } from 'react';
import { getAdminDashboard, AdminDashboardData } from '../api/dashboards';
import { Shield, Users, Ship, Calendar, DollarSign, Search } from 'lucide-react';

export const AdminDashboardPage: React.FC = () => {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    getAdminDashboard()
      .then((res) => setData(res))
      .catch((err) => console.error('Failed to load admin dashboard:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return (
      <div className="min-h-screen pt-32 flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-2 border-red-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  const filteredBookings = data.recent_bookings.filter(
    (b) =>
      b.booking_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.cruise_title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen pt-28 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 bg-[#f8fafc]">
      {/* Top Banner */}
      <div className="mb-10 border-b border-slate-200 pb-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 border border-red-200 text-red-700 text-xs font-bold uppercase tracking-wider mb-2">
          <Shield className="w-3.5 h-3.5 text-red-500" />
          Platform Command Center
        </div>
        <h1 className="text-3xl sm:text-4xl font-display font-black text-slate-900 tracking-tight">
          Executive Platform Overview & Fleet Ledger
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Real-time transactional audit of registered vessels, guest passengers, and operator bookings.
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-10">
        <div className="p-5 rounded-3xl bg-white border border-sky-100 shadow-sm">
          <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Total Users</span>
          <p className="text-2xl font-display font-extrabold text-slate-900 mt-1 flex items-center gap-2">
            <Users className="w-5 h-5 text-sky-600" />
            {data.stats.total_users}
          </p>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-sky-100 shadow-sm">
          <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Ship Operators</span>
          <p className="text-2xl font-display font-extrabold text-slate-900 mt-1 flex items-center gap-2">
            <Shield className="w-5 h-5 text-amber-600" />
            {data.stats.total_operators}
          </p>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-sky-100 shadow-sm">
          <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Active Liners</span>
          <p className="text-2xl font-display font-extrabold text-slate-900 mt-1 flex items-center gap-2">
            <Ship className="w-5 h-5 text-blue-600" />
            {data.stats.total_ships}
          </p>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-sky-100 shadow-sm">
          <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Total Bookings</span>
          <p className="text-2xl font-display font-extrabold text-slate-900 mt-1 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-600" />
            {data.stats.total_bookings}
          </p>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-sky-100 shadow-sm col-span-2 sm:col-span-1">
          <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Total Gross GMV</span>
          <p className="text-2xl font-display font-black text-amber-600 mt-1 flex items-center gap-1">
            <DollarSign className="w-5 h-5" />
            ${Math.round(data.stats.total_revenue).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Bookings Ledger */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-2xl font-display font-bold text-slate-900">System Bookings Ledger</h2>
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search reference or vessel..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-red-400 transition"
            />
          </div>
        </div>

        <div className="overflow-x-auto bg-white rounded-3xl border border-sky-100 shadow-xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-500 bg-sky-50/50">
                <th className="py-4 px-6">Ref ID</th>
                <th className="py-4 px-6">Vessel</th>
                <th className="py-4 px-6">Type</th>
                <th className="py-4 px-6">Departure</th>
                <th className="py-4 px-6">Fare</th>
                <th className="py-4 px-6">Verification Hash</th>
                <th className="py-4 px-6">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-800">
              {filteredBookings.map((b) => (
                <tr key={b.id} className="hover:bg-sky-50/40 transition">
                  <td className="py-4 px-6 font-mono text-xs text-sky-700 font-bold">
                    #{b.booking_id}
                  </td>
                  <td className="py-4 px-6 font-bold">{b.cruise_title}</td>
                  <td className="py-4 px-6 text-xs text-slate-600 font-medium">
                    {b.booking_type === 'PRIVATE_EVENT' ? 'Private Event' : 'Cruise Tour'}
                  </td>
                  <td className="py-4 px-6 text-xs text-slate-600 font-medium">{b.booking_date}</td>
                  <td className="py-4 px-6 font-display font-bold text-amber-600">
                    ${Number(b.total_price).toLocaleString()}
                  </td>
                  <td className="py-4 px-6 font-mono text-[10px] text-slate-500 max-w-[140px] truncate font-semibold">
                    {b.qr_code_hash}
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
