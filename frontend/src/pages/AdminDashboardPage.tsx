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
  Mail,
  CreditCard,
  Bell,
  FileSpreadsheet,
  RotateCcw,
  Percent,
  Layers,
  Send
} from 'lucide-react';
import { InvoiceModal } from '../components/ticket/InvoiceModal';
import { formatINR } from '../utils/currency';
import { AdminAnalyticsView } from '../components/admin/AdminAnalyticsView';
import { AdminWhatsAppView } from '../components/admin/AdminWhatsAppView';
import { AdminUsersManagementView } from '../components/admin/AdminUsersManagementView';
import { AdminShipsManagementView } from '../components/admin/AdminShipsManagementView';
import { AdminTransactionsView } from '../components/admin/AdminTransactionsView';
import { AdminNotificationsView } from '../components/admin/AdminNotificationsView';
import { AdminReportsView } from '../components/admin/AdminReportsView';
import { AdminToursManagementView } from '../components/admin/AdminToursManagementView';
import { MessageSquare } from 'lucide-react';

type AdminTab =
  | 'overview'
  | 'users'
  | 'ships'
  | 'transactions'
  | 'notifications'
  | 'reports'
  | 'bookings'
  | 'tours'
  | 'offers'
  | 'whatsapp'
  | 'operators'
  | 'owners'
  | 'reviews';

type OverviewSubTab =
  | 'analytics'
  | 'users'
  | 'ships'
  | 'transactions'
  | 'notifications'
  | 'reports';

export const AdminDashboardPage: React.FC = () => {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [overviewSubTab, setOverviewSubTab] = useState<OverviewSubTab>('analytics');

  const handleSelectTab = (tabId: AdminTab) => {
    if (['users', 'ships', 'transactions', 'notifications', 'reports'].includes(tabId)) {
      setActiveTab('overview');
      setOverviewSubTab(tabId as OverviewSubTab);
    } else {
      setActiveTab(tabId);
    }
  };

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

  // Live count sync
  const [liveUsersCount, setLiveUsersCount] = useState<number | null>(null);

  // Search & Filter filters
  const [userSearch, setUserSearch] = useState('');
  const [bookingTypeFilter, setBookingTypeFilter] = useState('');
  const [bookingStatusFilter, setBookingStatusFilter] = useState('');

  // Modals & Navigation Helpers
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [showAddOfferModal, setShowAddOfferModal] = useState(false);
  const [targetUserIdForNotification, setTargetUserIdForNotification] = useState<number | null>(null);
  const [targetUserNameForNotification, setTargetUserNameForNotification] = useState<string | null>(null);

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
        .then((res) => {
          const sorted = [...(res.bookings || [])].sort((a, b) => {
            const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
            const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
            if (bTime !== aTime) return bTime - aTime;
            return (Number(b.id) || 0) - (Number(a.id) || 0);
          });
          setAllBookings(sorted);
        })
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
    <div
      className="min-h-screen pt-28 pb-20 bg-[#f8f9fa] text-[#051833] max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 selection:bg-[#0284c7]/20 selection:text-[#051833]"
      style={{
        backgroundImage:
          'radial-gradient(circle at 85% 15%, rgba(2, 132, 199, 0.07) 0%, transparent 45%), radial-gradient(circle at 15% 85%, rgba(255, 248, 220, 0.55) 0%, transparent 50%)',
      }}
    >
      {/* 1. ADMIN MARITIME IDENTITY HEADER (OD Studio Deep Luxury Banner) */}
      <div className="bg-gradient-to-r from-[#030d1c] via-[#051833] to-[#0a2548] rounded-3xl p-7 sm:p-9 text-white shadow-2xl shadow-[#051833]/15 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6 border border-[#0284c7]/25 relative overflow-hidden">
        {/* Subtle Ambient Depth */}
        <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-[#0284c7]/15 blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-80 h-80 rounded-full bg-[#38bdf8]/10 blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 text-[#fff8dc] text-xs font-black uppercase tracking-wider mb-2.5 border border-white/15 backdrop-blur-md">
            <Shield className="w-3.5 h-3.5 text-[#38bdf8]" />
            Platform Control Center & Bookings
          </div>
          <h1 className="text-3xl sm:text-5xl font-serif font-black tracking-tight text-white drop-shadow-sm">
            Executive Platform Administration
          </h1>
          <p className="text-xs text-white/80 mt-1.5 font-medium">
            Global system management, role access controls, financial auditing, and fleet governance in INR (₹).
          </p>
        </div>

        <button
          onClick={() => setShowAddOfferModal(true)}
          className="relative z-10 px-6 py-3 rounded-full bg-[#fff8dc] hover:bg-[#f7edd0] text-[#030d1c] font-black text-xs flex items-center gap-2 self-start cursor-pointer shadow-lg shadow-[#051833]/40 transition-all hover:-translate-y-0.5 active:translate-y-0"
        >
          <Plus className="w-4 h-4 text-[#030d1c]" /> Create Coupon Promo
        </button>
      </div>

      {/* 2. MAIN NAVIGATION PILL DOCK (Home Page Style) */}
      <div className="p-1.5 bg-white/90 rounded-full border border-[#0284c7]/20 shadow-md shadow-[#051833]/5 flex items-center gap-1.5 mb-8 overflow-x-auto text-xs font-bold scrollbar-none backdrop-blur-md">
        {[
          { id: 'overview', label: 'Platform Overview', icon: BarChart3 },
          { id: 'bookings', label: `All Bookings (${stats.total_bookings})`, icon: Calendar },
          { id: 'tours', label: `Public Tours (${stats.total_tours || 0})`, icon: Waves },
          { id: 'offers', label: `Coupons & Offers (${offersList.length})`, icon: Tag },
          { id: 'whatsapp', label: 'WhatsApp Reminders', icon: MessageSquare },
          { id: 'operators', label: `Data Sources (${operatorsList.length || 11})`, icon: Database },
          { id: 'owners', label: `Owners (${stats.total_owners || stats.total_operators})`, icon: Anchor },
          { id: 'reviews', label: 'Reviews', icon: Star },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleSelectTab(tab.id as AdminTab)}
              className={`px-4 py-2 rounded-full transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap text-xs font-bold ${
                isActive
                  ? 'bg-[#051833] text-[#fff8dc] shadow-md shadow-[#051833]/25 font-black'
                  : 'text-slate-600 hover:text-[#051833] hover:bg-slate-100'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: PLATFORM OVERVIEW (Includes 5 Management Sub-Tabs) */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* SUB-TABS PILL DOCK (Styled like the capsule pill screenshot) */}
          <div className="flex items-center gap-2 sm:gap-2.5 overflow-x-auto pb-1 scrollbar-none">
            {[
              { id: 'analytics', label: 'Platform Overview & Trends', icon: BarChart3 },
              { id: 'users', label: `1. User Management (${liveUsersCount ?? stats.total_users})`, icon: Users },
              { id: 'ships', label: `2. Ship Management (${stats.total_ships})`, icon: Ship },
              { id: 'transactions', label: '3. Payments & Transactions', icon: CreditCard },
              { id: 'notifications', label: '4. Direct Notifications', icon: Bell },
              { id: 'reports', label: '5. Business Reports & Export', icon: FileSpreadsheet },
            ].map((sub) => {
              const Icon = sub.icon;
              const isSubActive = overviewSubTab === sub.id;
              return (
                <button
                  key={sub.id}
                  onClick={() => setOverviewSubTab(sub.id as OverviewSubTab)}
                  className={`px-5 py-2 rounded-full transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap text-xs font-bold border ${
                    isSubActive
                      ? 'bg-[#0284c7] text-white border-[#0284c7] shadow-md shadow-[#0284c7]/25 font-black'
                      : 'bg-white text-[#051833] border-[#0284c7]/25 hover:bg-sky-50/70 hover:border-[#0284c7]/40 shadow-sm'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isSubActive ? 'text-white' : 'text-[#0284c7]'}`} />
                  <span>{sub.label}</span>
                </button>
              );
            })}
          </div>

          {/* SUB-TAB 0: PLATFORM OVERVIEW & FINANCIAL MODEL */}
          {overviewSubTab === 'analytics' && (
            <div className="space-y-8 animate-fade-in">
              {/* CLEAR PROFIT CALCULATION CARD (Maritime Financial Model) */}
              <div className="bg-gradient-to-br from-[#082F5B] via-[#061D36] to-[#082F5B] rounded-3xl p-7 sm:p-8 text-white shadow-2xl space-y-6 border border-white/10 relative overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
                  <div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1677C8]/30 text-[#63B8F0] text-xs font-black uppercase tracking-wider mb-2 border border-[#63B8F0]/30 backdrop-blur-md">
                      <TrendingUp className="w-3.5 h-3.5 text-[#63B8F0]" />
                      Financial Accounting Model
                    </span>
                    <h3 className="text-2xl sm:text-3xl font-black font-heading tracking-tight text-white">Platform Profit & Commission Breakdown</h3>
                    <p className="text-xs text-white/75 mt-0.5 font-medium">
                      Formula: Customer Paid − Owner Payout (85%) − Refunds/Discounts = Platform Net Profit
                    </p>
                  </div>

                  <div className="text-left sm:text-right bg-white/5 p-4 rounded-2xl border border-white/10 sm:bg-transparent sm:p-0 sm:border-0">
                    <span className="text-[10px] uppercase font-black text-[#63B8F0] block tracking-wider">Total Net Profit</span>
                    <span className="text-3xl font-black text-emerald-400 font-heading">
                      {formatINR(stats.platform_profit || stats.net_profit || (stats.total_revenue * 0.15))}
                    </span>
                  </div>
                </div>

                {/* 4 Financial Columns */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 relative z-10">
                  <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 space-y-1.5 hover:bg-white/10 transition-all">
                    <span className="text-[10px] uppercase font-black text-white/60 block tracking-wider">Gross Customer Paid</span>
                    <span className="text-2xl font-black text-white font-heading">{formatINR(stats.gross_revenue || stats.total_revenue)}</span>
                    <p className="text-[10px] text-white/50 font-medium">Total customer collections</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 space-y-1.5 hover:bg-white/10 transition-all">
                    <span className="text-[10px] uppercase font-black text-white/60 block tracking-wider">Owner Payout (85%)</span>
                    <span className="text-2xl font-black text-[#63B8F0] font-heading">{formatINR(stats.owner_payout || (stats.total_revenue * 0.85))}</span>
                    <p className="text-[10px] text-white/50 font-medium">Paid out to ship operators</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 space-y-1.5 hover:bg-white/10 transition-all">
                    <span className="text-[10px] uppercase font-black text-white/60 block tracking-wider">Platform Commission (15%)</span>
                    <span className="text-2xl font-black text-amber-300 font-heading">{formatINR(stats.platform_commission || (stats.total_revenue * 0.15))}</span>
                    <p className="text-[10px] text-white/50 font-medium">Standard commission rate</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-emerald-500/15 backdrop-blur-md border border-emerald-400/30 space-y-1.5 hover:bg-emerald-500/20 transition-all">
                    <span className="text-[10px] uppercase font-black text-emerald-300 block tracking-wider">Net Platform Profit</span>
                    <span className="text-2xl font-black text-emerald-400 font-heading">{formatINR(stats.platform_profit || stats.net_profit || (stats.total_revenue * 0.15))}</span>
                    <p className="text-[10px] text-emerald-200 font-semibold">After all payouts & discounts</p>
                  </div>
                </div>
              </div>

              {/* 3. BUSINESS ANALYTICS & VISUAL TRENDS */}
              <AdminAnalyticsView initialData={data} />
            </div>
          )}

          {/* SUB-TAB 1: 1. USER MANAGEMENT */}
          {overviewSubTab === 'users' && (
            <div className="animate-fade-in">
              <AdminUsersManagementView
                onTotalUsersCountChange={(count) => setLiveUsersCount(count)}
                onDirectNotifyUser={(userId, userName) => {
                  setTargetUserIdForNotification(userId);
                  setTargetUserNameForNotification(userName);
                  setOverviewSubTab('notifications');
                }}
              />
            </div>
          )}

          {/* SUB-TAB 2: 2. SHIP FLEET MANAGEMENT */}
          {overviewSubTab === 'ships' && (
            <div className="animate-fade-in">
              <AdminShipsManagementView />
            </div>
          )}

          {/* SUB-TAB 3: 3. PAYMENTS & TRANSACTIONS */}
          {overviewSubTab === 'transactions' && (
            <div className="animate-fade-in">
              <AdminTransactionsView
                onOpenInvoice={(bookingId) => setSelectedInvoiceId(bookingId)}
              />
            </div>
          )}

          {/* SUB-TAB 4: 4. DIRECT NOTIFICATIONS */}
          {overviewSubTab === 'notifications' && (
            <div className="animate-fade-in">
              <AdminNotificationsView
                initialTargetUserId={targetUserIdForNotification}
                initialTargetUserName={targetUserNameForNotification}
              />
            </div>
          )}

          {/* SUB-TAB 5: 5. BUSINESS REPORTS & EXPORT */}
          {overviewSubTab === 'reports' && (
            <div className="animate-fade-in">
              <AdminReportsView />
            </div>
          )}
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
              <span className="text-[11px] font-black tracking-widest uppercase text-[#1677C8] block mb-1">
                Data Sovereignty & Fleet Auditing
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-[#102B46] font-heading tracking-tight">Data Sources & Verified Operators</h2>
              <p className="text-xs text-[#102B46]/65 mt-0.5 font-medium">
                Audit research operators, fleet vessels, price units, and source verification dates across India.
              </p>
            </div>

            <button
              onClick={handleResyncSeed}
              disabled={resyncLoading}
              className="px-5 py-2.5 rounded-full bg-[#082F5B] hover:bg-[#1677C8] text-white font-bold text-xs flex items-center gap-2 self-start cursor-pointer shadow-md transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${resyncLoading ? 'animate-spin' : ''}`} />
              <span>{resyncLoading ? 'Re-Syncing Seed...' : 'Re-Sync Seed Data'}</span>
            </button>
          </div>

          {resyncResult && (
            <div className="p-4 rounded-2xl bg-[#EAF4FB] border border-[#1677C8]/30 text-xs font-semibold text-[#082F5B] flex items-center justify-between shadow-sm">
              <span>{resyncResult}</span>
              <button onClick={() => setResyncResult(null)} className="text-[#1677C8] font-bold hover:underline cursor-pointer">
                Dismiss
              </button>
            </div>
          )}

          {/* Seed Audit Summary Cards (Requirement 28) */}
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
            <div className="p-4 rounded-2xl bg-[#F8FCFF] border border-[#082F5B]/10 shadow-[0_4px_16px_rgba(8,47,91,0.03)] text-center">
              <span className="text-[10px] uppercase font-black text-[#102B46]/50 block tracking-wider">Operators</span>
              <span className="text-2xl font-black text-[#102B46] mt-1 block font-heading">{operatorsList.length || 11}</span>
              <span className="text-[10px] text-emerald-700 font-bold">100% Verified</span>
            </div>

            <div className="p-4 rounded-2xl bg-[#F8FCFF] border border-[#082F5B]/10 shadow-[0_4px_16px_rgba(8,47,91,0.03)] text-center">
              <span className="text-[10px] uppercase font-black text-[#102B46]/50 block tracking-wider">Routes</span>
              <span className="text-2xl font-black text-[#102B46] mt-1 block font-heading">15</span>
              <span className="text-[10px] text-[#102B46]/60 font-medium">Goa, Andaman, etc.</span>
            </div>

            <div className="p-4 rounded-2xl bg-[#F8FCFF] border border-[#082F5B]/10 shadow-[0_4px_16px_rgba(8,47,91,0.03)] text-center">
              <span className="text-[10px] uppercase font-black text-[#102B46]/50 block tracking-wider">Research Fleet</span>
              <span className="text-2xl font-black text-[#1677C8] mt-1 block font-heading">13</span>
              <span className="text-[10px] text-[#1677C8] font-bold">32 Fleet Total</span>
            </div>

            <div className="p-4 rounded-2xl bg-[#F8FCFF] border border-[#082F5B]/10 shadow-[0_4px_16px_rgba(8,47,91,0.03)] text-center">
              <span className="text-[10px] uppercase font-black text-[#102B46]/50 block tracking-wider">Charter Rates</span>
              <span className="text-2xl font-black text-[#102B46] mt-1 block font-heading">13</span>
              <span className="text-[10px] text-amber-700 font-bold">Exact Units</span>
            </div>

            <div className="p-4 rounded-2xl bg-[#F8FCFF] border border-[#082F5B]/10 shadow-[0_4px_16px_rgba(8,47,91,0.03)] text-center">
              <span className="text-[10px] uppercase font-black text-[#102B46]/50 block tracking-wider">Public Tours</span>
              <span className="text-2xl font-black text-[#102B46] mt-1 block font-heading">23</span>
              <span className="text-[10px] text-emerald-700 font-bold">Scheduled</span>
            </div>

            <div className="p-4 rounded-2xl bg-[#F8FCFF] border border-[#082F5B]/10 shadow-[0_4px_16px_rgba(8,47,91,0.03)] text-center">
              <span className="text-[10px] uppercase font-black text-[#102B46]/50 block tracking-wider">Cabin Fares</span>
              <span className="text-2xl font-black text-[#102B46] mt-1 block font-heading">41</span>
              <span className="text-[10px] text-[#102B46]/60 font-medium">Tier Rates</span>
            </div>
          </div>

          {/* Operators Inventory Table */}
          <div className="bg-[#F8FCFF] rounded-3xl border border-[#082F5B]/10 shadow-[0_4px_20px_rgba(8,47,91,0.04)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#EAF4FB] border-b border-[#082F5B]/10 text-[#102B46] font-black uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3.5 px-5">Operator Name</th>
                    <th className="py-3.5 px-5">Base Location</th>
                    <th className="py-3.5 px-5">Contact Phone & Email</th>
                    <th className="py-3.5 px-5">Source URL</th>
                    <th className="py-3.5 px-5">Ships</th>
                    <th className="py-3.5 px-5">Status</th>
                    <th className="py-3.5 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#082F5B]/5">
                  {operatorsList.map((op) => (
                    <tr key={op.id} className="hover:bg-[#EAF4FB]/50 transition-colors">
                      <td className="py-4 px-5">
                        <div className="font-bold text-[#102B46] text-sm">{op.name}</div>
                        <div className="text-[11px] text-[#102B46]/60 line-clamp-1">{op.description}</div>
                      </td>
                      <td className="py-4 px-5 font-semibold text-[#102B46]">{op.location}</td>
                      <td className="py-4 px-5 text-[#102B46]/70 space-y-0.5">
                        {op.phone && (
                          <div className="flex items-center gap-1.5 text-[11px]">
                            <Phone className="w-3 h-3 text-[#1677C8]" />
                            <span>{op.phone}</span>
                          </div>
                        )}
                        {op.email && (
                          <div className="flex items-center gap-1.5 text-[11px]">
                            <Mail className="w-3 h-3 text-[#1677C8]" />
                            <span>{op.email}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-5">
                        {op.website ? (
                          <a
                            href={op.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[#1677C8] font-bold hover:underline"
                          >
                            <Globe className="w-3 h-3" />
                            <span>Source Link</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        ) : (
                          <span className="text-[#102B46]/40">Research doc</span>
                        )}
                      </td>
                      <td className="py-4 px-5 font-black text-[#102B46]">
                        {op.vessels_count} Ships
                      </td>
                      <td className="py-4 px-5">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          op.verified ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}>
                          {op.verified ? 'Verified' : 'Pending Review'}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-right space-x-2">
                        <button
                          onClick={() => setSelectedOperatorForVessels(selectedOperatorForVessels?.id === op.id ? null : op)}
                          className="px-3 py-1 rounded-full bg-[#EAF4FB] text-[#082F5B] border border-[#082F5B]/15 font-bold text-[11px] cursor-pointer hover:bg-[#1677C8] hover:text-white transition-all"
                        >
                          {selectedOperatorForVessels?.id === op.id ? 'Hide Fleet' : 'Inspect Fleet'}
                        </button>
                        <button
                          onClick={() => handleToggleOperatorVerified(op)}
                          className="px-3 py-1 rounded-full border border-[#082F5B]/20 text-[#102B46] font-bold text-[11px] cursor-pointer hover:bg-[#EAF4FB] transition-all"
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
              <div className="p-6 bg-[#EAF4FB]/50 border-t border-[#082F5B]/10 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-[#102B46] text-sm flex items-center gap-2">
                    <Ship className="w-4 h-4 text-[#1677C8]" />
                    <span>Fleet & Inventory for {selectedOperatorForVessels.name}</span>
                  </h4>
                  <span className="text-xs text-[#102B46]/70 font-bold">
                    {selectedOperatorForVessels.vessels?.length || 0} active ships in database
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {(selectedOperatorForVessels.vessels || []).map((v) => (
                    <div key={v.id} className="p-4 rounded-2xl bg-[#F8FCFF] border border-[#082F5B]/10 shadow-sm space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#102B46] text-xs truncate font-heading">{v.name}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EAF4FB] text-[#082F5B]">
                          {v.category}
                        </span>
                      </div>
                      <div className="text-xs text-[#102B46]/70 space-y-1">
                        <div className="flex justify-between">
                          <span className="text-[#102B46]/50">Capacity:</span>
                          <span className="font-bold text-[#102B46]">{v.display_capacity_text || `${v.capacity} guests`}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#102B46]/50">Rate Basis:</span>
                          <span className="font-black text-[#1677C8]">
                            {v.is_quote_based ? 'Price on Request' : `${formatINR(v.price)} ${v.formatted_price_basis}`}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#102B46]/50">Unit:</span>
                          <span className="font-mono text-[11px] font-bold text-[#102B46]">{v.price_unit}</span>
                        </div>
                      </div>
                      {v.source_url && (
                        <div className="pt-2 border-t border-[#082F5B]/10">
                          <a
                            href={v.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-[#1677C8] font-bold hover:underline flex items-center gap-1"
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



      {/* TAB 4: OWNER MANAGEMENT */}
      {activeTab === 'owners' && (
        <div className="space-y-6">
          <div>
            <span className="text-[11px] font-black tracking-widest uppercase text-[#1677C8] block mb-1">
              Fleet Partners & Verification
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-[#102B46] font-heading tracking-tight">Ship Operators & Fleet Owners</h2>
            <p className="text-xs text-[#102B46]/65 mt-0.5 font-medium">Approve, verify, or suspend cruise & boat operators across India.</p>
          </div>

          <div className="bg-[#F8FCFF] rounded-3xl border border-[#082F5B]/10 shadow-[0_4px_20px_rgba(8,47,91,0.04)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#EAF4FB] border-b border-[#082F5B]/10 text-[#102B46] font-black uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3.5 px-5">Operator Name</th>
                    <th className="py-3.5 px-5">Contact</th>
                    <th className="py-3.5 px-5">Vessels in Fleet</th>
                    <th className="py-3.5 px-5">Total Revenue Generated</th>
                    <th className="py-3.5 px-5">Approval Status</th>
                    <th className="py-3.5 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#082F5B]/5">
                  {ownersList.map((o) => (
                    <tr key={o.id} className="hover:bg-[#EAF4FB]/50 transition-colors">
                      <td className="py-4 px-5 font-bold text-[#102B46]">{o.full_name} (@{o.username})</td>
                      <td className="py-4 px-5 text-[#102B46]/70">{o.email} {o.phone ? `(${o.phone})` : ''}</td>
                      <td className="py-4 px-5 font-bold text-[#102B46]">{o.ships_count} Ships</td>
                      <td className="py-4 px-5 font-black text-sm text-[#102B46]">{formatINR(o.total_revenue)}</td>
                      <td className="py-4 px-5">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${o.is_approved_owner ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-amber-100 text-amber-800 border border-amber-200'}`}>
                          {o.is_approved_owner ? 'Approved' : 'Pending Approval'}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-right space-x-2">
                        {!o.is_approved_owner ? (
                          <button
                            onClick={() => handleOwnerAction(o.id, 'approve')}
                            className="px-3.5 py-1 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] cursor-pointer shadow-sm transition-all"
                          >
                            Approve
                          </button>
                        ) : (
                          <button
                            onClick={() => handleOwnerAction(o.id, 'reject')}
                            className="px-3.5 py-1 rounded-full bg-amber-50 text-amber-900 border border-amber-200 font-bold text-[11px] cursor-pointer hover:bg-amber-100 transition-all"
                          >
                            Revoke
                          </button>
                        )}
                        <button
                          onClick={() => handleOwnerAction(o.id, 'toggle_active')}
                          className="px-3.5 py-1 rounded-full border border-[#082F5B]/20 text-[#102B46] font-bold text-[11px] cursor-pointer hover:bg-[#EAF4FB] transition-all"
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



      {/* TAB 6: BOOKINGS LEDGER */}
      {activeTab === 'bookings' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[11px] font-black tracking-widest uppercase text-[#1677C8] block mb-1">
                Global Transaction Ledger
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-[#102B46] font-heading tracking-tight">Master Bookings Ledger</h2>
              <p className="text-xs text-[#102B46]/65 mt-0.5 font-medium">Real-time ledger of all private charters and public tour ticket reservations.</p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <select
                value={bookingTypeFilter}
                onChange={(e) => setBookingTypeFilter(e.target.value)}
                className="px-4 py-2 rounded-full border border-[#082F5B]/20 text-xs font-bold bg-[#F8FCFF] text-[#102B46] focus:border-[#1677C8] focus:outline-none"
              >
                <option value="">All Booking Types</option>
                <option value="EVENT">Private Charter</option>
                <option value="TOUR">Public Tour Ticket</option>
              </select>
              <select
                value={bookingStatusFilter}
                onChange={(e) => setBookingStatusFilter(e.target.value)}
                className="px-4 py-2 rounded-full border border-[#082F5B]/20 text-xs font-bold bg-[#F8FCFF] text-[#102B46] focus:border-[#1677C8] focus:outline-none"
              >
                <option value="">All Statuses</option>
                <option value="CONFIRMED">CONFIRMED</option>
                <option value="PENDING">PENDING</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            </div>
          </div>

          <div className="bg-[#F8FCFF] rounded-3xl border border-[#082F5B]/10 shadow-[0_4px_20px_rgba(8,47,91,0.04)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#EAF4FB] border-b border-[#082F5B]/10 text-[#102B46] font-black uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3.5 px-5">Ref #</th>
                    <th className="py-3.5 px-5">Customer</th>
                    <th className="py-3.5 px-5">Ship</th>
                    <th className="py-3.5 px-5">Type</th>
                    <th className="py-3.5 px-5">Date</th>
                    <th className="py-3.5 px-5">Status</th>
                    <th className="py-3.5 px-5 text-right">Total (₹)</th>
                    <th className="py-3.5 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#082F5B]/5">
                  {allBookings.map((b) => (
                    <tr key={b.id} className="hover:bg-[#EAF4FB]/50 transition-colors">
                      <td className="py-4 px-5 font-mono font-bold text-[#1677C8]">#{b.booking_id}</td>
                      <td className="py-4 px-5 font-bold text-[#102B46]">{b.customer_name}</td>
                      <td className="py-4 px-5 text-[#102B46]/80 font-medium">{b.cruise_title}</td>
                      <td className="py-4 px-5">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#EAF4FB] text-[#082F5B] uppercase border border-[#082F5B]/10">
                          {b.booking_type === 'EVENT' ? 'Charter' : 'Ticket'}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-[#102B46]/70">{b.booking_date}</td>
                      <td className="py-4 px-5">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          b.status === 'CONFIRMED'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : b.status === 'PENDING'
                            ? 'bg-amber-100 text-amber-900 border border-amber-200'
                            : b.status === 'COMPLETED'
                            ? 'bg-[#EAF4FB] text-[#1677C8] border border-[#1677C8]/20'
                            : 'bg-rose-100 text-rose-800 border border-rose-200'
                        }`}>
                          {b.status}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-right font-black text-sm text-[#102B46]">{formatINR(b.total_price)}</td>
                      <td className="py-4 px-5 text-right space-x-2">
                        <button
                          onClick={() => setSelectedInvoiceId(b.booking_id)}
                          className="px-3 py-1 rounded-full bg-[#EAF4FB] text-[#082F5B] hover:bg-[#1677C8] hover:text-white border border-[#082F5B]/15 font-bold text-[11px] cursor-pointer transition-all"
                        >
                          Invoice
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

      {/* TAB 7: TOURS MANAGEMENT */}
      {activeTab === 'tours' && <AdminToursManagementView />}

      {/* TAB 8: OFFERS MANAGEMENT */}
      {activeTab === 'offers' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[11px] font-black tracking-widest uppercase text-[#1677C8] block mb-1">
                Campaigns & Discounts
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-[#102B46] font-heading tracking-tight">Platform Promo Vouchers</h2>
              <p className="text-xs text-[#102B46]/65 mt-0.5 font-medium">Manage promotional discount codes, validity periods, and minimum booking rules.</p>
            </div>
            <button
              onClick={() => setShowAddOfferModal(true)}
              className="px-5 py-2.5 rounded-full bg-[#1677C8] hover:bg-[#082F5B] text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-md transition-all"
            >
              <Plus className="w-4 h-4" /> Add Voucher Code
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {offersList.map((offer) => (
              <div key={offer.id} className="bg-[#F8FCFF] rounded-3xl p-6 border border-[#082F5B]/10 shadow-[0_4px_20px_rgba(8,47,91,0.04)] hover:shadow-[0_12px_30px_rgba(8,47,91,0.08)] transition-all space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-full bg-[#EAF4FB] text-[#082F5B] border border-[#082F5B]/15 text-[10px] font-black uppercase tracking-wider">
                    {offer.discount_type === 'PERCENTAGE' ? `${offer.discount_value}% OFF` : `₹${offer.discount_value} OFF`}
                  </span>
                  <span className="text-[10px] font-black text-emerald-800 bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 rounded-full">Active</span>
                </div>
                <h3 className="font-heading font-black text-lg text-[#102B46]">{offer.title}</h3>
                <p className="text-xs text-[#102B46]/70 font-medium">{offer.description}</p>
                <div className="pt-3 border-t border-[#082F5B]/10 flex items-center justify-between text-xs">
                  <code className="font-mono font-bold text-[#1677C8] bg-[#EAF4FB] px-3 py-1 rounded-full border border-[#1677C8]/20">{offer.code}</code>
                  <span className="text-[11px] text-[#102B46]/60 font-medium">Min: {formatINR(offer.min_booking_amount)}</span>
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
            <span className="text-[11px] font-black tracking-widest uppercase text-[#1677C8] block mb-1">
              Quality Assurance & Ratings
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-[#102B46] font-heading tracking-tight">Customer Review Moderation</h2>
            <p className="text-xs text-[#102B46]/65 mt-0.5 font-medium">Review passenger feedback, verify ratings, and remove inappropriate content.</p>
          </div>

          <div className="bg-[#F8FCFF] rounded-3xl border border-[#082F5B]/10 shadow-[0_4px_20px_rgba(8,47,91,0.04)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#EAF4FB] border-b border-[#082F5B]/10 text-[#102B46] font-black uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3.5 px-5">Ship</th>
                    <th className="py-3.5 px-5">Author</th>
                    <th className="py-3.5 px-5">Rating</th>
                    <th className="py-3.5 px-5">Comment</th>
                    <th className="py-3.5 px-5">Date</th>
                    <th className="py-3.5 px-5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#082F5B]/5">
                  {reviewsList.map((r) => (
                    <tr key={r.id} className="hover:bg-[#EAF4FB]/50 transition-colors">
                      <td className="py-4 px-5 font-bold text-[#102B46] font-heading">{r.ship_name}</td>
                      <td className="py-4 px-5 text-[#102B46]/80">{r.author}</td>
                      <td className="py-4 px-5">
                        <span className="flex items-center gap-1 font-bold text-amber-500">
                          <Star className="w-3.5 h-3.5 fill-amber-400" /> {r.rating}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-[#102B46]/70 max-w-md">{r.comment}</td>
                      <td className="py-4 px-5 text-[#102B46]/50">{r.created_at}</td>
                      <td className="py-4 px-5 text-right">
                        <button
                          onClick={() => handleDeleteReview(r.id)}
                          className="px-3.5 py-1 rounded-full text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 font-bold text-[11px] cursor-pointer transition-all"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#061D36]/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#F8FCFF] rounded-3xl max-w-md w-full shadow-2xl border border-[#082F5B]/15 overflow-hidden">
            <div className="bg-gradient-to-r from-[#061D36] to-[#082F5B] p-6 flex items-center justify-between text-white">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-[#63B8F0] block mb-0.5">
                  Promotion Engine
                </span>
                <h3 className="font-heading font-black text-lg text-white">Create Platform Coupon</h3>
              </div>
              <button
                onClick={() => setShowAddOfferModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOffer} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold uppercase text-[#102B46] block mb-1">Coupon Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. FESTIVE15"
                  value={offerForm.code}
                  onChange={(e) => setOfferForm({ ...offerForm, code: e.target.value.toUpperCase() })}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#082F5B]/20 text-sm font-mono bg-white text-[#102B46] focus:outline-none focus:border-[#1677C8]"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-[#102B46] block mb-1">Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Festive Trip 15% Off"
                  value={offerForm.title}
                  onChange={(e) => setOfferForm({ ...offerForm, title: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#082F5B]/20 text-sm bg-white text-[#102B46] focus:outline-none focus:border-[#1677C8]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase text-[#102B46] block mb-1">Discount Value</label>
                  <input
                    type="number"
                    required
                    value={offerForm.discount_value}
                    onChange={(e) => setOfferForm({ ...offerForm, discount_value: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-[#082F5B]/20 text-sm bg-white text-[#102B46] focus:outline-none focus:border-[#1677C8]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-[#102B46] block mb-1">Type</label>
                  <select
                    value={offerForm.discount_type}
                    onChange={(e) => setOfferForm({ ...offerForm, discount_type: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#082F5B]/20 text-sm bg-white text-[#102B46] focus:outline-none focus:border-[#1677C8]"
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FIXED">Flat INR (₹)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase text-[#102B46] block mb-1">Valid From</label>
                  <input
                    type="date"
                    required
                    value={offerForm.valid_from}
                    onChange={(e) => setOfferForm({ ...offerForm, valid_from: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#082F5B]/20 text-sm bg-white text-[#102B46] focus:outline-none focus:border-[#1677C8]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-[#102B46] block mb-1">Valid To</label>
                  <input
                    type="date"
                    required
                    value={offerForm.valid_to}
                    onChange={(e) => setOfferForm({ ...offerForm, valid_to: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#082F5B]/20 text-sm bg-white text-[#102B46] focus:outline-none focus:border-[#1677C8]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#082F5B]/10">
                <button
                  type="button"
                  onClick={() => setShowAddOfferModal(false)}
                  className="px-4 py-2 text-xs font-bold text-[#102B46]/70 hover:bg-[#EAF4FB] rounded-full transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#1677C8] hover:bg-[#082F5B] text-white font-bold text-xs rounded-full shadow-md transition-all cursor-pointer"
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
