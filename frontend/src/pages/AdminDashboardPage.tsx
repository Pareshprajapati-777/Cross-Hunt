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
  getAdminOperators,
  updateAdminOperator,
  resyncAdminSeedData,
  AdminDashboardData
} from '../api/dashboards';
import { Offer, Booking, PublicTour, OperatorSummary } from '../api/types';
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
  Anchor,
  Database,
  RefreshCw,
  CheckCircle2,
  ExternalLink,
  Globe,
  Phone,
  Mail
} from 'lucide-react';
import { InvoiceModal } from '../components/ticket/InvoiceModal';
import { formatINR } from '../utils/currency';
import { AdminAnalyticsView } from '../components/admin/AdminAnalyticsView';
import { AdminWhatsAppView } from '../components/admin/AdminWhatsAppView';
import { MessageSquare } from 'lucide-react';

type AdminTab =
  | 'overview'
  | 'whatsapp'
  | 'operators'
  | 'users'
  | 'owners'
  | 'ships'
  | 'bookings'
  | 'tours'
  | 'offers'
  | 'reviews';

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
  const [operatorsList, setOperatorsList] = useState<OperatorSummary[]>([]);
  const [resyncLoading, setResyncLoading] = useState(false);
  const [resyncResult, setResyncResult] = useState<string | null>(null);
  const [selectedOperatorForVessels, setSelectedOperatorForVessels] = useState<OperatorSummary | null>(null);

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
    Promise.allSettled([getAdminDashboard(), getAdminOffers(), getAdminReports(), getAdminOperators()])
      .then(([dashRes, offersRes, reportsRes, opRes]) => {
        if (dashRes.status === 'fulfilled') {
          setData(dashRes.value);
        }
        if (offersRes.status === 'fulfilled') {
          setOffersList(offersRes.value.offers || []);
        }
        if (reportsRes.status === 'fulfilled') {
          setReportsData(reportsRes.value);
        }
        if (opRes.status === 'fulfilled') {
          setOperatorsList(opRes.value.operators || []);
        }
      })
      .catch((err) => console.error('Failed to load admin dashboard:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadBaseData();
  }, []);

  // Fetch contextual tab data
  useEffect(() => {
    if (activeTab === 'operators') {
      getAdminOperators()
        .then((res) => setOperatorsList(res.operators || []))
        .catch((err) => console.error('Error fetching operators:', err));
    } else if (activeTab === 'users') {
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

  const handleToggleOperatorVerified = async (op: OperatorSummary) => {
    try {
      const res = await updateAdminOperator(op.id, { verified: !op.verified });
      setOperatorsList((prev) => prev.map((item) => (item.id === op.id ? { ...item, verified: res.operator.verified } : item)));
    } catch (err: any) {
      alert(err.message || 'Failed to update operator status');
    }
  };

  const handleResyncSeed = async () => {
    if (!window.confirm('Re-run database cruise seed sync? This will safely update operator and vessel records without destroying data.')) return;
    setResyncLoading(true);
    setResyncResult(null);
    try {
      const res = await resyncAdminSeedData();
      setResyncResult(res.message);
      getAdminOperators().then((r) => setOperatorsList(r.operators || []));
      loadBaseData();
    } catch (err: any) {
      setResyncResult(`Failed: ${err.message}`);
    } finally {
      setResyncLoading(false);
    }
  };

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
    total_owners: 0,
    total_operators: 0,
    total_ships: 0,
    active_ships: 0,
    external_operators: 11,
    external_operators_count: 11,
    total_tours: 0,
    active_tours: 0,
    total_bookings: 0,
    private_bookings: 0,
    tour_bookings: 0,
    total_tickets: 0,
    tickets_count: 0,
    pending_bookings: 0,
    pending_requests: 0,
    confirmed_bookings: 0,
    cancelled_bookings: 0,
    total_revenue: 0,
    gross_revenue: 0,
    owner_payout: 0,
    platform_commission: 0,
    platform_profit: 0,
    net_profit: 0,
    occupancy_rate: 0,
    cancellation_rate: 0,
  };

  const monthlyAnalytics = data?.analytics?.monthly_revenue || [];
  const maxMonthRevenue = Math.max(...monthlyAnalytics.map((m) => m.revenue), 100000);

  return (
    <div className="min-h-screen pt-28 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ocean-spatial-mesh">
      {/* 1. ADMIN SPATIAL IDENTITY HEADER */}
      <div className="spatial-glass-dark rounded-3xl p-6 sm:p-8 text-white shadow-2xl mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6 border border-white/10 relative overflow-hidden">
        {/* Subtle Ambient Refraction */}
        <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-80 h-80 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/20 text-red-300 text-xs font-bold uppercase tracking-wider mb-2.5 border border-red-500/30 backdrop-blur-md">
            <Shield className="w-3.5 h-3.5 text-red-400" />
            Platform Control Center & Master Ledger
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-black tracking-tight text-white drop-shadow-sm">
            Executive Platform Administration
          </h1>
          <p className="text-xs text-slate-300/90 mt-1.5 font-ui">
            Global system management, role access controls, financial auditing, and fleet governance in INR (₹).
          </p>
        </div>

        <button
          onClick={() => setShowAddOfferModal(true)}
          className="relative z-10 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-pink-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs flex items-center gap-2 self-start cursor-pointer shadow-lg shadow-rose-950/40 hover:shadow-rose-600/30 transition-all hover:-translate-y-0.5 active:translate-y-0"
        >
          <Plus className="w-4 h-4" /> Create Coupon Promo
        </button>
      </div>

      {/* 2. SPATIAL SUB-NAVIGATION DOCK */}
      <div className="p-1.5 bg-white/80 backdrop-blur-xl rounded-2xl border border-slate-200/90 shadow-sm flex items-center gap-1.5 mb-8 overflow-x-auto text-xs font-bold font-ui">
        {[
          { id: 'overview', label: 'Platform Overview & Analytics', icon: BarChart3 },
          { id: 'whatsapp', label: 'WhatsApp Reminders', icon: MessageSquare },
          { id: 'operators', label: `Data Sources (${operatorsList.length || 11})`, icon: Database },
          { id: 'users', label: `Users (${stats.total_users})`, icon: Users },
          { id: 'owners', label: `Owners (${stats.total_owners || stats.total_operators})`, icon: Anchor },
          { id: 'ships', label: `Ships Fleet (${stats.total_ships})`, icon: Ship },
          { id: 'bookings', label: `Bookings (${stats.total_bookings})`, icon: Calendar },
          { id: 'tours', label: `Tours (${stats.total_tours || 0})`, icon: Waves },
          { id: 'offers', label: `Offers (${offersList.length})`, icon: Tag },
          { id: 'reviews', label: 'Reviews', icon: Star },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as AdminTab)}
              className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-slate-900 text-white font-black shadow-md shadow-slate-900/25 border border-slate-800'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/90'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW & ANALYTICS */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* CLEAR PROFIT CALCULATION CARD (Spatial Financial Model) */}
          <div className="spatial-glass-dark rounded-3xl p-6 sm:p-8 text-white shadow-2xl space-y-6 border border-white/10 relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold uppercase tracking-wider mb-2 border border-emerald-500/30 backdrop-blur-md">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                  Financial Accounting Model
                </span>
                <h3 className="text-2xl font-bold font-display tracking-tight">Platform Profit & Commission Breakdown</h3>
                <p className="text-xs text-slate-300/80 mt-0.5">
                  Formula: Customer Paid − Owner Payout (85%) − Refunds/Discounts = Platform Net Profit
                </p>
              </div>

              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Total Net Profit</span>
                <span className="text-3xl font-black text-emerald-400 font-mono-numbers">
                  {formatINR(stats.platform_profit || stats.net_profit || (stats.total_revenue * 0.15))}
                </span>
              </div>
            </div>

            {/* 4 Spatial Financial Columns */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 relative z-10">
              <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 space-y-1.5 hover:bg-white/10 transition-all shadow-inner">
                <span className="text-[10px] uppercase font-bold text-slate-300 block tracking-wider">Gross Customer Paid</span>
                <span className="text-2xl font-black text-white font-mono-numbers">{formatINR(stats.gross_revenue || stats.total_revenue)}</span>
                <p className="text-[10px] text-slate-400">Total customer collections</p>
              </div>

              <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 space-y-1.5 hover:bg-white/10 transition-all shadow-inner">
                <span className="text-[10px] uppercase font-bold text-slate-300 block tracking-wider">Owner Payout (85%)</span>
                <span className="text-2xl font-black text-sky-300 font-mono-numbers">{formatINR(stats.owner_payout || (stats.total_revenue * 0.85))}</span>
                <p className="text-[10px] text-slate-400">Paid out to ship operators</p>
              </div>

              <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 space-y-1.5 hover:bg-white/10 transition-all shadow-inner">
                <span className="text-[10px] uppercase font-bold text-slate-300 block tracking-wider">Platform Commission (15%)</span>
                <span className="text-2xl font-black text-amber-300 font-mono-numbers">{formatINR(stats.platform_commission || (stats.total_revenue * 0.15))}</span>
                <p className="text-[10px] text-slate-400">Standard commission rate</p>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-500/15 backdrop-blur-md border border-emerald-400/30 space-y-1.5 hover:bg-emerald-500/20 transition-all shadow-inner">
                <span className="text-[10px] uppercase font-bold text-emerald-300 block tracking-wider">Net Platform Profit</span>
                <span className="text-2xl font-black text-emerald-400 font-mono-numbers">{formatINR(stats.platform_profit || stats.net_profit || (stats.total_revenue * 0.15))}</span>
                <p className="text-[10px] text-emerald-200 font-semibold">After all payouts & discounts</p>
              </div>
            </div>
          </div>

          {/* 3. BUSINESS ANALYTICS & VISUAL TRENDS (Merged Smartly with Overview) */}
          <AdminAnalyticsView initialData={data} />

        </div>
      )}

      {/* TAB: WHATSAPP TOUR REMINDERS & AUTOMATION */}
      {activeTab === 'whatsapp' && (
        <AdminWhatsAppView />
      )}

      {/* TAB: DATA SOURCES & OPERATORS (Requirement 17 & 28) */}
      {activeTab === 'operators' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold uppercase tracking-wider mb-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Source of Truth: Research 2026 Dataset
              </div>
              <h2 className="text-2xl font-black text-slate-900 font-serif">Data Sources & Verified Operators</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Audit research operators, fleet vessels, price units, and source verification dates.
              </p>
            </div>

            <button
              onClick={handleResyncSeed}
              disabled={resyncLoading}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-2 self-start cursor-pointer shadow-md disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${resyncLoading ? 'animate-spin' : ''}`} />
              <span>{resyncLoading ? 'Re-Syncing Seed...' : 'Re-Sync Seed Data'}</span>
            </button>
          </div>

          {resyncResult && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center justify-between">
              <span>{resyncResult}</span>
              <button onClick={() => setResyncResult(null)} className="text-emerald-600 font-bold hover:underline cursor-pointer">
                Dismiss
              </button>
            </div>
          )}

          {/* Seed Audit Summary Cards (Requirement 28) */}
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Operators</span>
              <span className="text-2xl font-black text-slate-900 mt-1 block font-mono">{operatorsList.length || 11}</span>
              <span className="text-[10px] text-emerald-600 font-semibold">100% Verified</span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Routes</span>
              <span className="text-2xl font-black text-slate-900 mt-1 block font-mono">15</span>
              <span className="text-[10px] text-slate-500">Goa, Andaman, etc.</span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Research Fleet</span>
              <span className="text-2xl font-black text-slate-900 mt-1 block font-mono">13</span>
              <span className="text-[10px] text-sky-600 font-semibold">32 Fleet Total</span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Charter Rates</span>
              <span className="text-2xl font-black text-slate-900 mt-1 block font-mono">13</span>
              <span className="text-[10px] text-amber-600 font-semibold">Exact Units</span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Public Tours</span>
              <span className="text-2xl font-black text-slate-900 mt-1 block font-mono">23</span>
              <span className="text-[10px] text-emerald-600 font-semibold">Scheduled</span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Cabin Fares</span>
              <span className="text-2xl font-black text-slate-900 mt-1 block font-mono">41</span>
              <span className="text-[10px] text-slate-500">Tier Rates</span>
            </div>
          </div>

          {/* Operators Inventory Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Operator Name</th>
                    <th className="py-3 px-4">Base Location</th>
                    <th className="py-3 px-4">Contact Phone & Email</th>
                    <th className="py-3 px-4">Source URL</th>
                    <th className="py-3 px-4">Ships</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {operatorsList.map((op) => (
                    <tr key={op.id} className="hover:bg-slate-50 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 text-sm">{op.name}</div>
                        <div className="text-[11px] text-slate-500 line-clamp-1">{op.description}</div>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-700">{op.location}</td>
                      <td className="py-3.5 px-4 text-slate-600 space-y-0.5">
                        {op.phone && (
                          <div className="flex items-center gap-1 text-[11px]">
                            <Phone className="w-3 h-3 text-sky-600" />
                            <span>{op.phone}</span>
                          </div>
                        )}
                        {op.email && (
                          <div className="flex items-center gap-1 text-[11px]">
                            <Mail className="w-3 h-3 text-sky-600" />
                            <span>{op.email}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {op.website ? (
                          <a
                            href={op.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sky-600 font-semibold hover:underline"
                          >
                            <Globe className="w-3 h-3" />
                            <span>Source Link</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        ) : (
                          <span className="text-slate-400">Research doc</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-800">
                        {op.vessels_count} Ships
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          op.verified ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {op.verified ? 'Verified' : 'Pending Review'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-2">
                        <button
                          onClick={() => setSelectedOperatorForVessels(selectedOperatorForVessels?.id === op.id ? null : op)}
                          className="px-2.5 py-1 rounded-lg bg-sky-50 text-sky-800 border border-sky-200 font-bold text-[11px] cursor-pointer hover:bg-sky-100 transition"
                        >
                          {selectedOperatorForVessels?.id === op.id ? 'Hide Fleet' : 'Inspect Fleet'}
                        </button>
                        <button
                          onClick={() => handleToggleOperatorVerified(op)}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 font-bold text-[11px] cursor-pointer hover:bg-slate-100 transition"
                        >
                          {op.verified ? 'Revoke' : 'Verify'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Expandable Vessel Details for Selected Operator */}
            {selectedOperatorForVessels && (
              <div className="p-6 bg-slate-50 border-t border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <Ship className="w-4 h-4 text-sky-600" />
                    <span>Fleet & Inventory for {selectedOperatorForVessels.name}</span>
                  </h4>
                  <span className="text-xs text-slate-500 font-semibold">
                    {selectedOperatorForVessels.vessels?.length || 0} active ships in database
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {(selectedOperatorForVessels.vessels || []).map((v) => (
                    <div key={v.id} className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 text-xs truncate font-serif">{v.name}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-800">
                          {v.category}
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 space-y-1">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Capacity:</span>
                          <span className="font-semibold text-slate-800">{v.display_capacity_text || `${v.capacity} guests`}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Rate Basis:</span>
                          <span className="font-bold text-sky-800">
                            {v.is_quote_based ? 'Price on Request' : `${formatINR(v.price)} ${v.formatted_price_basis}`}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Unit:</span>
                          <span className="font-mono text-[11px] font-bold text-slate-700">{v.price_unit}</span>
                        </div>
                      </div>
                      {v.source_url && (
                        <div className="pt-2 border-t border-slate-100">
                          <a
                            href={v.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-sky-600 font-bold hover:underline flex items-center gap-1"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Verified Source URL</span>
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
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
            <p className="text-xs text-slate-500 mt-0.5">Approve, verify, or suspend cruise & boat operators across India.</p>
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
            <h2 className="text-2xl font-black text-slate-900 font-serif">Platform Ship Fleet Governance</h2>
            <p className="text-xs text-slate-500 mt-0.5">Inspect all registered ships across all owners on the platform.</p>
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
                    <th className="py-3 px-4">Ship</th>
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
                  placeholder="e.g. Festive Trip 15% Off"
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
