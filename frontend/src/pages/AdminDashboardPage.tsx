import React, { useState, useEffect } from 'react';
import {
  getAdminDashboard,
  getAdminOffers,
  createAdminOffer,
  getAdminUsers,
  toggleAdminUserActive,
  getAdminOwners,
  adminOwnerAction,
  getAdminShips,
  adminShipAction,
  getAdminBookings,
  adminBookingAction,
  getAdminTours,
  adminTourAction,
  getAdminReviews,
  adminDeleteReview,
  getAdminReports,
  AdminDashboardData
} from '../api/dashboards';
import { Offer, Booking, PublicTour } from '../api/types';
import {
  Shield,
  Users,
  Ship,
  Calendar,
  Search,
  Tag,
  Plus,
  X,
  FileText,
  BarChart3,
  TrendingUp,
  Star,
  Trash2,
  MapPin,
  Waves,
  Anchor
} from 'lucide-react';
import { InvoiceModal } from '../components/ticket/InvoiceModal';
import { formatINR } from '../utils/currency';

type AdminTab =
  | 'overview'
  | 'analytics'
  | 'users'
  | 'owners'
  | 'ships'
  | 'bookings'
  | 'tours'
  | 'offers'
  | 'reviews'
  | 'reports';

export const AdminDashboardPage: React.FC = () => {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');

  // Sub-data states
  const [usersList, setUsersList] = useState<any[]>([]);
  const [ownersList, setOwnersList] = useState<any[]>([]);
  const [shipsList, setShipsList] = useState<any[]>([]);
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [toursList, setToursList] = useState<PublicTour[]>([]);
  const [offersList, setOffersList] = useState<Offer[]>([]);
  const [reviewsList, setReviewsList] = useState<any[]>([]);
  const [reportsData, setReportsData] = useState<any | null>(null);

  // Search & Filter filters
  const [userSearch, setUserSearch] = useState('');
  const [bookingTypeFilter, setBookingTypeFilter] = useState('');
  const [bookingStatusFilter, setBookingStatusFilter] = useState('');

  // Modals
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [showAddOfferModal, setShowAddOfferModal] = useState(false);

  // Offer Form
  const [offerForm, setOfferForm] = useState({
    code: '',
    title: '',
    description: '',
    discount_type: 'PERCENTAGE',
    discount_value: 10,
    min_booking_amount: 25000,
    valid_from: '2026-10-01',
    valid_to: '2026-12-31',
  });

  const loadBaseData = () => {
    setLoading(true);
    Promise.all([getAdminDashboard(), getAdminOffers(), getAdminReports()])
      .then(([dashRes, offersRes, reportsRes]) => {
        setData(dashRes);
        setOffersList(offersRes.offers || []);
        setReportsData(reportsRes);
      })
      .catch((err) => console.error('Failed to load admin dashboard:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadBaseData();
  }, []);

  // Fetch contextual tab data
  useEffect(() => {
    if (activeTab === 'users') {
      getAdminUsers({ q: userSearch || undefined })
        .then((res) => setUsersList(res.users || []))
        .catch((err) => console.error('Error fetching users:', err));
    } else if (activeTab === 'owners') {
      getAdminOwners()
        .then((res) => setOwnersList(res.owners || []))
        .catch((err) => console.error('Error fetching owners:', err));
    } else if (activeTab === 'ships') {
      getAdminShips()
        .then((res) => setShipsList(res.ships || []))
        .catch((err) => console.error('Error fetching ships:', err));
    } else if (activeTab === 'bookings') {
      getAdminBookings({ type: bookingTypeFilter || undefined, status: bookingStatusFilter || undefined })
        .then((res) => setAllBookings(res.bookings || []))
        .catch((err) => console.error('Error fetching bookings:', err));
    } else if (activeTab === 'tours') {
      getAdminTours()
        .then((res) => setToursList(res.tours || []))
        .catch((err) => console.error('Error fetching tours:', err));
    } else if (activeTab === 'reviews') {
      getAdminReviews()
        .then((res) => setReviewsList(res.reviews || []))
        .catch((err) => console.error('Error fetching reviews:', err));
    }
  }, [activeTab, userSearch, bookingTypeFilter, bookingStatusFilter]);

  const handleToggleUser = async (userId: number) => {
    try {
      await toggleAdminUserActive(userId);
      getAdminUsers({ q: userSearch || undefined }).then((res) => setUsersList(res.users || []));
    } catch (err: any) {
      alert(err.message || 'Action failed');
    }
  };

  const handleOwnerAction = async (ownerId: number, action: 'approve' | 'reject' | 'toggle_active') => {
    try {
      await adminOwnerAction(ownerId, action);
      getAdminOwners().then((res) => setOwnersList(res.owners || []));
    } catch (err: any) {
      alert(err.message || 'Action failed');
    }
  };

  const handleShipAction = async (shipId: number, action: 'approve' | 'toggle_active' | 'delete') => {
    if (action === 'delete' && !window.confirm('Delete this vessel permanently?')) return;
    try {
      await adminShipAction(shipId, action);
      getAdminShips().then((res) => setShipsList(res.ships || []));
    } catch (err: any) {
      alert(err.message || 'Action failed');
    }
  };

  const handleBookingStatus = async (bookingId: string, status: string) => {
    try {
      await adminBookingAction(bookingId, status);
      getAdminBookings({ type: bookingTypeFilter || undefined, status: bookingStatusFilter || undefined })
        .then((res) => setAllBookings(res.bookings || []));
    } catch (err: any) {
      alert(err.message || 'Action failed');
    }
  };

  const handleTourAction = async (tourId: number, action: 'toggle_publish' | 'cancel') => {
    try {
      await adminTourAction(tourId, action);
      getAdminTours().then((res) => setToursList(res.tours || []));
    } catch (err: any) {
      alert(err.message || 'Action failed');
    }
  };

  const handleDeleteReview = async (reviewId: number) => {
    if (!window.confirm('Delete this user review?')) return;
    try {
      await adminDeleteReview(reviewId);
      getAdminReviews().then((res) => setReviewsList(res.reviews || []));
    } catch (err: any) {
      alert(err.message || 'Action failed');
    }
  };

  const handleCreateOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createAdminOffer(offerForm as any);
      setShowAddOfferModal(false);
      setOfferForm({
        code: '',
        title: '',
        description: '',
        discount_type: 'PERCENTAGE',
        discount_value: 10,
        min_booking_amount: 25000,
        valid_from: '2026-10-01',
        valid_to: '2026-12-31',
      });
      getAdminOffers().then((res) => setOffersList(res.offers || []));
    } catch (err: any) {
      alert(err.message || 'Failed to create promo coupon');
    }
  };

  if (loading && !data) {
    return (
      <div className="min-h-screen pt-32 flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-red-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  const stats = data?.stats || {
    total_users: 0,
    total_operators: 0,
    total_ships: 0,
    active_ships: 0,
    total_tours: 0,
    active_tours: 0,
    total_bookings: 0,
    private_bookings: 0,
    tour_bookings: 0,
    pending_bookings: 0,
    confirmed_bookings: 0,
    total_revenue: 0,
  };

  return (
    <div className="min-h-screen pt-28 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 bg-slate-50/70">
      {/* 1. ADMIN IDENTITY HEADER */}
      <div className="bg-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6 border border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/20 text-red-300 text-xs font-bold uppercase tracking-wider mb-2 border border-red-500/30">
            <Shield className="w-3.5 h-3.5 text-red-400" />
            Platform Control Center & Master Ledger
          </div>
          <h1 className="text-2xl sm:text-4xl font-display font-black tracking-tight font-serif">
            Executive Platform Administration
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Global system management, role access controls, financial auditing, and fleet governance in INR (₹).
          </p>
        </div>

        <button
          onClick={() => setShowAddOfferModal(true)}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs flex items-center gap-1.5 self-start cursor-pointer shadow-md"
        >
          <Plus className="w-4 h-4" /> Create Coupon Promo
        </button>
      </div>

      {/* 2. SUB-NAVIGATION TABS BAR */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 mb-8 overflow-x-auto text-xs font-bold">
        {[
          { id: 'overview', label: 'Platform Overview', icon: BarChart3 },
          { id: 'analytics', label: 'Charts & Analytics', icon: TrendingUp },
          { id: 'users', label: `Users (${stats.total_users})`, icon: Users },
          { id: 'owners', label: `Owners (${stats.total_operators})`, icon: Anchor },
          { id: 'ships', label: `Ships Fleet (${stats.total_ships})`, icon: Ship },
          { id: 'bookings', label: `Bookings (${stats.total_bookings})`, icon: Calendar },
          { id: 'tours', label: `Tours (${stats.total_tours || 0})`, icon: Waves },
          { id: 'offers', label: `Offers (${offersList.length})`, icon: Tag },
          { id: 'reviews', label: 'Reviews', icon: Star },
          { id: 'reports', label: 'Audit Reports', icon: FileText },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as AdminTab)}
              className={`px-4 py-2.5 rounded-xl transition flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-slate-900 text-white font-black shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW & KPIS */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Gross Platform Revenue</span>
              <span className="text-3xl font-black text-slate-900">{formatINR(stats.total_revenue)}</span>
              <p className="text-[11px] text-emerald-600 font-bold">100% In INR (₹)</p>
            </div>
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Total Bookings</span>
              <span className="text-3xl font-black text-slate-900">{stats.total_bookings}</span>
              <p className="text-[11px] text-slate-500">{stats.private_bookings || 0} Private • {stats.tour_bookings || 0} Tours</p>
            </div>
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Registered Vessels</span>
              <span className="text-3xl font-black text-slate-900">{stats.total_ships}</span>
              <p className="text-[11px] text-slate-500">{stats.active_ships || stats.total_ships} Active Ships</p>
            </div>
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Platform Accounts</span>
              <span className="text-3xl font-black text-slate-900">{stats.total_users + stats.total_operators}</span>
              <p className="text-[11px] text-slate-500">{stats.total_users} Users • {stats.total_operators} Operators</p>
            </div>
          </div>

          {/* Quick Recent Platform Activity */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 font-serif">Recent Platform Reservations</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Booking Ref</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Vessel</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Amount (₹)</th>
                    <th className="py-3 px-4 text-right">Invoice</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data?.recent_bookings.slice(0, 10).map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">#{b.booking_id}</td>
                      <td className="py-3.5 px-4 font-semibold text-slate-800">{b.customer_name || 'Passenger'}</td>
                      <td className="py-3.5 px-4 text-slate-700">{b.cruise_title}</td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 uppercase">
                          {b.booking_type === 'EVENT' ? 'Private' : 'Tour'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">{b.booking_date}</td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase">
                          {b.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-black text-slate-900">{formatINR(b.total_price)}</td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setSelectedInvoiceId(b.booking_id)}
                          className="px-2.5 py-1 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 font-bold text-[11px] transition cursor-pointer"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ANALYTICS & CHARTS */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Booking Classification Distribution */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-900 font-serif">Booking Type Distribution</h3>
              <div className="space-y-3 pt-2">
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span className="text-amber-800">Private Ship Charters ({stats.private_bookings || 0})</span>
                    <span>{Math.round(((stats.private_bookings || 0) / Math.max(1, stats.total_bookings)) * 100)}%</span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full"
                      style={{ width: `${((stats.private_bookings || 0) / Math.max(1, stats.total_bookings)) * 100}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span className="text-sky-800">Public Cruise Tour Tickets ({stats.tour_bookings || 0})</span>
                    <span>{Math.round(((stats.tour_bookings || 0) / Math.max(1, stats.total_bookings)) * 100)}%</span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full bg-sky-500 rounded-full"
                      style={{ width: `${((stats.tour_bookings || 0) / Math.max(1, stats.total_bookings)) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Top Destinations Audit */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-900 font-serif">Top Destinations Demand</h3>
              <div className="space-y-2">
                {reportsData?.popular_destinations?.map((d: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-50">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-sky-600" />
                      {d.destination}
                    </span>
                    <span className="font-mono font-bold text-slate-600">{d.count} Bookings</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Popular Flagships */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 font-serif">High-Performing Fleet Ships</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {reportsData?.popular_ships?.map((s: any, idx: number) => (
                <div key={idx} className="p-4 rounded-2xl border border-slate-100 bg-slate-50/70 space-y-1">
                  <span className="text-xs font-bold text-slate-900 block font-serif">{s.name}</span>
                  <p className="text-[11px] text-slate-500">{s.location}</p>
                  <p className="text-xs font-black text-emerald-700">{s.bookings_count} Total Reservations</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: USER MANAGEMENT */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-slate-900 font-serif">Registered Passenger Users</h2>
              <p className="text-xs text-slate-500 mt-0.5">Manage customer accounts, verify permissions, and toggle access.</p>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search user by name or email..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="pl-9 pr-4 py-2 rounded-xl border border-slate-300 text-xs w-64 bg-white"
              />
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Joined Date</th>
                    <th className="py-3 px-4">Bookings</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {usersList.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50 transition">
                      <td className="py-3.5 px-4 font-bold text-slate-900">{u.full_name} (@{u.username})</td>
                      <td className="py-3.5 px-4 text-slate-600">{u.email}</td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800">
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">{u.date_joined}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-700">{u.bookings_count}</td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${u.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                          {u.is_active ? 'Active' : 'Suspended'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleToggleUser(u.id)}
                          className="px-3 py-1 rounded-lg border border-slate-200 text-[11px] font-bold hover:bg-slate-50 transition cursor-pointer"
                        >
                          {u.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: OWNER MANAGEMENT */}
      {activeTab === 'owners' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-black text-slate-900 font-serif">Ship Operators & Fleet Owners</h2>
            <p className="text-xs text-slate-500 mt-0.5">Approve, verify, or suspend maritime operators across India.</p>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Operator Name</th>
                    <th className="py-3 px-4">Contact</th>
                    <th className="py-3 px-4">Vessels in Fleet</th>
                    <th className="py-3 px-4">Total Revenue Generated</th>
                    <th className="py-3 px-4">Approval Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ownersList.map((o) => (
                    <tr key={o.id} className="hover:bg-slate-50 transition">
                      <td className="py-3.5 px-4 font-bold text-slate-900">{o.full_name} (@{o.username})</td>
                      <td className="py-3.5 px-4 text-slate-600">{o.email} {o.phone ? `(${o.phone})` : ''}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-700">{o.ships_count} Ships</td>
                      <td className="py-3.5 px-4 font-black text-slate-900">{formatINR(o.total_revenue)}</td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${o.is_approved_owner ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                          {o.is_approved_owner ? 'Approved' : 'Pending Approval'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-2">
                        {!o.is_approved_owner ? (
                          <button
                            onClick={() => handleOwnerAction(o.id, 'approve')}
                            className="px-2.5 py-1 rounded-lg bg-emerald-500 text-white font-bold text-[11px] cursor-pointer"
                          >
                            Approve
                          </button>
                        ) : (
                          <button
                            onClick={() => handleOwnerAction(o.id, 'reject')}
                            className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-300 font-bold text-[11px] cursor-pointer"
                          >
                            Revoke
                          </button>
                        )}
                        <button
                          onClick={() => handleOwnerAction(o.id, 'toggle_active')}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 font-bold text-[11px] cursor-pointer"
                        >
                          {o.is_active ? 'Suspend' : 'Unsuspend'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: SHIP FLEET MANAGEMENT */}
      {activeTab === 'ships' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-black text-slate-900 font-serif">Platform Vessel Governance</h2>
            <p className="text-xs text-slate-500 mt-0.5">Inspect all registered vessels across all owners on the platform.</p>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Ship Name</th>
                    <th className="py-3 px-4">Operator</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Location</th>
                    <th className="py-3 px-4">Capacity</th>
                    <th className="py-3 px-4">Rate (₹)</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {shipsList.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50 transition">
                      <td className="py-3.5 px-4 font-bold text-slate-900 font-serif">{s.name}</td>
                      <td className="py-3.5 px-4 text-slate-600">{s.owner_name}</td>
                      <td className="py-3.5 px-4 text-slate-500">{s.category}</td>
                      <td className="py-3.5 px-4 text-slate-700">{s.location}</td>
                      <td className="py-3.5 px-4 font-semibold">{s.capacity} Guests</td>
                      <td className="py-3.5 px-4 font-black">{formatINR(s.price)}</td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${s.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>
                          {s.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-1.5">
                        <button
                          onClick={() => handleShipAction(s.id, 'toggle_active')}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 text-[11px] font-bold cursor-pointer"
                        >
                          {s.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => handleShipAction(s.id, 'delete')}
                          className="p-1 rounded-lg text-rose-600 hover:bg-rose-50 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5 inline" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: BOOKINGS LEDGER */}
      {activeTab === 'bookings' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-slate-900 font-serif">Master Bookings Ledger</h2>
              <p className="text-xs text-slate-500 mt-0.5">Real-time ledger of all private charters and public tour ticket reservations.</p>
            </div>

            <div className="flex gap-2">
              <select
                value={bookingTypeFilter}
                onChange={(e) => setBookingTypeFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs bg-white text-slate-800"
              >
                <option value="">All Booking Types</option>
                <option value="EVENT">Private Charter</option>
                <option value="TOUR">Public Tour Ticket</option>
              </select>
              <select
                value={bookingStatusFilter}
                onChange={(e) => setBookingStatusFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs bg-white text-slate-800"
              >
                <option value="">All Statuses</option>
                <option value="CONFIRMED">CONFIRMED</option>
                <option value="PENDING">PENDING</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Ref #</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Ship</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Total (₹)</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allBookings.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-sky-700">#{b.booking_id}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">{b.customer_name}</td>
                      <td className="py-3.5 px-4 text-slate-700">{b.cruise_title}</td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 uppercase">
                          {b.booking_type === 'EVENT' ? 'Charter' : 'Ticket'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">{b.booking_date}</td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase">
                          {b.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-black text-slate-900">{formatINR(b.total_price)}</td>
                      <td className="py-3.5 px-4 text-right space-x-1.5">
                        <button
                          onClick={() => setSelectedInvoiceId(b.booking_id)}
                          className="px-2.5 py-1 rounded-lg bg-sky-50 text-sky-700 font-bold text-[11px] cursor-pointer"
                        >
                          Invoice
                        </button>
                        {b.status === 'PENDING' && (
                          <button
                            onClick={() => handleBookingStatus(b.booking_id, 'CONFIRMED')}
                            className="px-2.5 py-1 rounded-lg bg-emerald-500 text-white font-bold text-[11px] cursor-pointer"
                          >
                            Confirm
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: TOURS MANAGEMENT */}
      {activeTab === 'tours' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-black text-slate-900 font-serif">Scheduled Public Cruise Tours</h2>
            <p className="text-xs text-slate-500 mt-0.5">Moderate departure schedules and passenger capacity limits.</p>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Tour Title</th>
                    <th className="py-3 px-4">Ship</th>
                    <th className="py-3 px-4">Route</th>
                    <th className="py-3 px-4">Departure</th>
                    <th className="py-3 px-4">Duration</th>
                    <th className="py-3 px-4">Seats Left</th>
                    <th className="py-3 px-4">Price (₹)</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {toursList.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50 transition">
                      <td className="py-3.5 px-4 font-bold text-slate-900 font-serif">{t.tour_title}</td>
                      <td className="py-3.5 px-4 text-slate-700">{t.ship_name}</td>
                      <td className="py-3.5 px-4 text-slate-500">{t.departure_port} → {t.destination}</td>
                      <td className="py-3.5 px-4 font-semibold">{t.departure_date}</td>
                      <td className="py-3.5 px-4">{t.duration_days} Days</td>
                      <td className="py-3.5 px-4 font-bold text-emerald-700">{t.remaining_capacity} / {t.total_capacity}</td>
                      <td className="py-3.5 px-4 font-black">{formatINR(t.adult_price)}</td>
                      <td className="py-3.5 px-4 text-right space-x-1.5">
                        <button
                          onClick={() => handleTourAction(t.id, 'toggle_publish')}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 text-[11px] font-bold cursor-pointer"
                        >
                          {t.is_published ? 'Unpublish' : 'Publish'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 8: OFFERS MANAGEMENT */}
      {activeTab === 'offers' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-slate-900 font-serif">Platform Promo Vouchers</h2>
              <p className="text-xs text-slate-500 mt-0.5">Manage promotional codes, discounts, and minimum booking rules.</p>
            </div>
            <button
              onClick={() => setShowAddOfferModal(true)}
              className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add Voucher Code
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {offersList.map((offer) => (
              <div key={offer.id} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold uppercase">
                    {offer.discount_type === 'PERCENTAGE' ? `${offer.discount_value}% OFF` : `₹${offer.discount_value} OFF`}
                  </span>
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">Active</span>
                </div>
                <h3 className="font-bold text-base text-slate-900">{offer.title}</h3>
                <p className="text-xs text-slate-500">{offer.description}</p>
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <code className="font-mono font-bold text-sky-800 bg-sky-50 px-2.5 py-1 rounded">{offer.code}</code>
                  <span className="text-[11px] text-slate-400">Min: {formatINR(offer.min_booking_amount)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 9: REVIEWS MODERATION */}
      {activeTab === 'reviews' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-black text-slate-900 font-serif">Customer Review Moderation</h2>
            <p className="text-xs text-slate-500 mt-0.5">Review passenger feedback and remove inappropriate content.</p>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Vessel</th>
                    <th className="py-3 px-4">Author</th>
                    <th className="py-3 px-4">Rating</th>
                    <th className="py-3 px-4">Comment</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reviewsList.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50 transition">
                      <td className="py-3.5 px-4 font-bold text-slate-900">{r.ship_name}</td>
                      <td className="py-3.5 px-4 text-slate-700">{r.author}</td>
                      <td className="py-3.5 px-4">
                        <span className="flex items-center gap-1 font-bold text-amber-500">
                          <Star className="w-3.5 h-3.5 fill-amber-400" /> {r.rating}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 max-w-md">{r.comment}</td>
                      <td className="py-3.5 px-4 text-slate-400">{r.created_at}</td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleDeleteReview(r.id)}
                          className="px-2.5 py-1 rounded-lg text-rose-600 hover:bg-rose-50 font-bold text-[11px] cursor-pointer"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 10: AUDIT REPORTS */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-black text-slate-900 font-serif">Platform Financial & Operational Audit</h2>
            <p className="text-xs text-slate-500 mt-0.5">High-level financial summaries for regulatory and platform records.</p>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-xs font-bold text-slate-500 block uppercase">Total GMV Processed</span>
                <span className="text-2xl font-black text-slate-900 mt-1 block">{formatINR(stats.total_revenue)}</span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-xs font-bold text-slate-500 block uppercase">Platform Commission (15%)</span>
                <span className="text-2xl font-black text-emerald-700 mt-1 block">{formatINR(stats.total_revenue * 0.15)}</span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-xs font-bold text-slate-500 block uppercase">Cancellation Rate</span>
                <span className="text-2xl font-black text-slate-900 mt-1 block">{reportsData?.cancellation_rate || 0}%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD OFFER MODAL */}
      {showAddOfferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-lg text-slate-900">Create Platform Coupon</h3>
              <button onClick={() => setShowAddOfferModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOffer} className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase text-slate-700 block mb-1">Coupon Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. FESTIVE15"
                  value={offerForm.code}
                  onChange={(e) => setOfferForm({ ...offerForm, code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-slate-700 block mb-1">Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Festive Maritime 15% Off"
                  value={offerForm.title}
                  onChange={(e) => setOfferForm({ ...offerForm, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-700 block mb-1">Discount Value</label>
                  <input
                    type="number"
                    required
                    value={offerForm.discount_value}
                    onChange={(e) => setOfferForm({ ...offerForm, discount_value: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-slate-700 block mb-1">Type</label>
                  <select
                    value={offerForm.discount_type}
                    onChange={(e) => setOfferForm({ ...offerForm, discount_type: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white"
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FIXED">Flat INR (₹)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-700 block mb-1">Valid From</label>
                  <input
                    type="date"
                    required
                    value={offerForm.valid_from}
                    onChange={(e) => setOfferForm({ ...offerForm, valid_from: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-slate-700 block mb-1">Valid To</label>
                  <input
                    type="date"
                    required
                    value={offerForm.valid_to}
                    onChange={(e) => setOfferForm({ ...offerForm, valid_to: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddOfferModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 text-white font-bold text-xs rounded-xl shadow-sm"
                >
                  Publish Promo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INVOICE MODAL */}
      {selectedInvoiceId && (
        <InvoiceModal
          bookingId={selectedInvoiceId}
          onClose={() => setSelectedInvoiceId(null)}
        />
      )}
    </div>
  );
};
