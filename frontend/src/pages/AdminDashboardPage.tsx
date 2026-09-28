import React, { useState, useEffect } from 'react';
import {
  getAdminDashboard,
  getAdminOffers,
  createAdminOffer,
  AdminDashboardData
} from '../api/dashboards';
import { Offer } from '../api/types';
import {
  Shield,
  Users,
  Ship,
  Calendar,
  Search,
  Tag,
  Plus,
  X,
  FileText
} from 'lucide-react';
import { InvoiceModal } from '../components/ticket/InvoiceModal';
import { formatINR } from '../utils/currency';

export const AdminDashboardPage: React.FC = () => {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [showAddOfferModal, setShowAddOfferModal] = useState(false);

  // New Offer Form State
  const [offerForm, setOfferForm] = useState({
    code: '',
    title: '',
    description: '',
    discount_type: 'PERCENTAGE',
    discount_value: 10,
    min_booking_amount: 20000,
    valid_from: new Date().toISOString().split('T')[0],
    valid_to: new Date(Date.now() + 180 * 86400000).toISOString().split('T')[0],
  });

  const loadData = () => {
    setLoading(true);
    Promise.all([getAdminDashboard(), getAdminOffers()])
      .then(([dashRes, offersRes]) => {
        setData(dashRes);
        setOffers(offersRes.offers || []);
      })
      .catch((err) => console.error('Failed to load admin dashboard:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createAdminOffer(offerForm as any);
      setShowAddOfferModal(false);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to create promo coupon');
    }
  };

  if (loading || !data) {
    return (
      <div className="min-h-screen pt-32 flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-sky-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  const filteredBookings = data.recent_bookings.filter(
    (b) =>
      b.booking_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.cruise_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.customer_name && b.customer_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="min-h-screen pt-28 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 bg-slate-50/70">
      {/* Top Banner */}
      <div className="mb-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 text-sky-400 text-xs font-bold uppercase tracking-wider mb-2">
            <Shield className="w-3.5 h-3.5" />
            Platform Command & Administration
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-black text-slate-900 tracking-tight font-serif">
            Executive Fleet Ledger & Analytics
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            Real-time transactional audit of registered vessels, ticket reservations, promo offers, and revenues in INR (₹).
          </p>
        </div>

        <button
          onClick={() => setShowAddOfferModal(true)}
          className="px-4 py-2.5 rounded-2xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold shadow-md shadow-sky-500/20 flex items-center gap-1.5 transition cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Create Promo Offer</span>
        </button>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-10">
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm">
          <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Total Users</span>
          <p className="text-2xl font-black text-slate-900 mt-1 flex items-center gap-2">
            <Users className="w-5 h-5 text-sky-500" />
            {data.stats.total_users}
          </p>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm">
          <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Fleet Operators</span>
          <p className="text-2xl font-black text-slate-900 mt-1 flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-500" />
            {data.stats.total_operators}
          </p>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm">
          <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Fleet Vessels</span>
          <p className="text-2xl font-black text-slate-900 mt-1 flex items-center gap-2">
            <Ship className="w-5 h-5 text-sky-600" />
            {data.stats.total_ships}
          </p>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm">
          <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Total Bookings</span>
          <p className="text-2xl font-black text-emerald-600 mt-1 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-500" />
            {data.stats.total_bookings}
          </p>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm col-span-2 sm:col-span-1">
          <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Platform GMV (INR)</span>
          <p className="text-xl sm:text-2xl font-black text-sky-700 mt-1 font-serif">
            {formatINR(data.stats.total_revenue)}
          </p>
        </div>
      </div>

      {/* Promotional Offers Management Section */}
      <section className="mb-12 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-sky-500" />
            <h2 className="text-xl font-bold font-serif text-slate-900">Active Promotional Offers & Discount Coupons</h2>
          </div>
          <span className="text-xs text-slate-500">{offers.length} Coupons Configured</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {offers.map((off) => (
            <div key={off.id} className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono font-black text-sm px-2.5 py-1 rounded-lg bg-sky-50 text-sky-800 border border-sky-200">
                  {off.code}
                </span>
                <span className="text-xs font-bold text-emerald-600">
                  {off.discount_type === 'PERCENTAGE' ? `${off.discount_value}% OFF` : `${formatINR(off.discount_value)} OFF`}
                </span>
              </div>
              <h3 className="font-bold text-slate-900 text-sm">{off.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{off.description}</p>
              <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-400 flex justify-between">
                <span>Min Order: {formatINR(off.min_booking_amount)}</span>
                <span>Valid: {off.valid_to}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Bookings Ledger */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-xl font-bold font-serif text-slate-900">Platform Bookings Ledger</h2>
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search reference, guest, or vessel..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-white border border-slate-200 text-xs focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-4">Reference & Date</th>
                  <th className="p-4">Vessel & Operator</th>
                  <th className="p-4">Guest</th>
                  <th className="p-4">Product Type</th>
                  <th className="p-4 text-right">Amount (₹)</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-right">Invoice</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/50">
                    <td className="p-4">
                      <div className="font-mono font-bold text-slate-900">{b.booking_id}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{b.booking_date}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-slate-900">{b.cruise_title}</div>
                      <div className="text-[11px] text-slate-500">Operator: {b.operator_name || 'Fleet Operator'}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-semibold text-slate-900">{b.customer_name || 'Passenger'}</div>
                      <div className="text-[10px] text-slate-400">{b.customer_email}</div>
                    </td>
                    <td className="p-4">
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold text-[10px] uppercase">
                        {b.booking_type === 'EVENT' ? 'Private Charter' : 'Public Tour'}
                      </span>
                    </td>
                    <td className="p-4 text-right font-black text-slate-900 font-serif text-sm">
                      {formatINR(b.total_price)}
                    </td>
                    <td className="p-4 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        b.status === 'CONFIRMED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : b.status === 'COMPLETED'
                          ? 'bg-slate-100 text-slate-800'
                          : b.status === 'PENDING'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => setSelectedInvoiceId(b.booking_id)}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold"
                        title="View Official GST Invoice"
                      >
                        <FileText className="w-3.5 h-3.5 inline" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Invoice Modal */}
      {selectedInvoiceId && (
        <InvoiceModal
          bookingId={selectedInvoiceId}
          onClose={() => setSelectedInvoiceId(null)}
        />
      )}

      {/* Add Offer Modal */}
      {showAddOfferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold font-serif text-slate-900">Create Promotional Coupon</h3>
              <button onClick={() => setShowAddOfferModal(false)} className="p-1 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOffer} className="space-y-4">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Coupon Code</label>
                <input
                  type="text"
                  required
                  value={offerForm.code}
                  onChange={(e) => setOfferForm({ ...offerForm, code: e.target.value.toUpperCase() })}
                  placeholder="e.g. MONSOON20"
                  className="w-full p-2.5 rounded-xl border border-slate-200 uppercase font-mono font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Offer Title</label>
                <input
                  type="text"
                  required
                  value={offerForm.title}
                  onChange={(e) => setOfferForm({ ...offerForm, title: e.target.value })}
                  placeholder="e.g. 15% Seasonal Festive Discount"
                  className="w-full p-2.5 rounded-xl border border-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Discount Type</label>
                  <select
                    value={offerForm.discount_type}
                    onChange={(e) => setOfferForm({ ...offerForm, discount_type: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200"
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FIXED">Flat Amount (₹)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Discount Value</label>
                  <input
                    type="number"
                    required
                    value={offerForm.discount_value}
                    onChange={(e) => setOfferForm({ ...offerForm, discount_value: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Minimum Booking Amount (₹)</label>
                <input
                  type="number"
                  value={offerForm.min_booking_amount}
                  onChange={(e) => setOfferForm({ ...offerForm, min_booking_amount: Number(e.target.value) })}
                  className="w-full p-2.5 rounded-xl border border-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Valid From</label>
                  <input
                    type="date"
                    required
                    value={offerForm.valid_from}
                    onChange={(e) => setOfferForm({ ...offerForm, valid_from: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Valid To</label>
                  <input
                    type="date"
                    required
                    value={offerForm.valid_to}
                    onChange={(e) => setOfferForm({ ...offerForm, valid_to: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-2xl bg-sky-500 hover:bg-sky-600 text-white font-bold shadow-md cursor-pointer"
              >
                Publish Coupon
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
