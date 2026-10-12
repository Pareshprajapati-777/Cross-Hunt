import React, { useState, useEffect, useMemo } from 'react';
import {
  getOperatorDashboard,
  operatorBookingAction,
  createOperatorShip,
  createOperatorTour,
  getOperatorExtras,
  createOperatorExtra,
  deleteOperatorExtra,
  getOperatorAvailability,
  getTourPassengers,
  OperatorDashboardData
} from '../api/dashboards';
import {
  Ship,
  Anchor,
  Calendar,
  Clock,
  Plus,
  X,
  Compass,
  Users,
  Tag,
  AlertCircle,
  TrendingUp,
  MapPin,
  Trash2,
  ShieldCheck,
  CheckCircle2,
  BarChart3,
  PieChart,
  Activity,
  Award,
  DollarSign,
  Layers
} from 'lucide-react';
import { InvoiceModal } from '../components/ticket/InvoiceModal';
import { formatINR } from '../utils/currency';

type OperatorTab =
  | 'overview'
  | 'ships'
  | 'extras'
  | 'availability'
  | 'requests'
  | 'tours'
  | 'passengers';

export const OperatorDashboardPage: React.FC = () => {
  const [data, setData] = useState<OperatorDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<OperatorTab>('overview');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Modals
  const [showAddShipModal, setShowAddShipModal] = useState(false);
  const [showAddTourModal, setShowAddTourModal] = useState(false);
  const [showAddExtraModal, setShowAddExtraModal] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);

  // Extras state
  const [extrasList, setExtrasList] = useState<any[]>([]);
  const [newExtra, setNewExtra] = useState({
    ship_id: '',
    name: '',
    description: '',
    price: 5000,
    pricing_mode: 'FLAT'
  });

  // Availability state
  const [selectedShipIdForTimeline, setSelectedShipIdForTimeline] = useState<number | null>(null);
  const [availabilityTimeline, setAvailabilityTimeline] = useState<any[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);

  // Tour Passengers Manifest State
  const [selectedTourIdForManifest, setSelectedTourIdForManifest] = useState<number | null>(null);
  const [manifestData, setManifestData] = useState<any | null>(null);
  const [manifestLoading, setManifestLoading] = useState(false);

  // Bookings Filter State (Tab 5)
  const [bookingFilter, setBookingFilter] = useState<'ALL' | 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'>('ALL');

  // Fleet Filter State
  const [fleetFilter, setFleetFilter] = useState<'ALL' | 'AVAILABLE' | 'BOOKED' | 'ON_TOUR' | 'MAINTENANCE'>('ALL');

  // Add Ship Form State
  const [shipForm, setShipForm] = useState({
    name: '',
    category: 'Luxury Ocean Cruise',
    location: 'Mumbai',
    departure_port: 'Mumbai Cruise Terminal',
    destination: 'Goa & Arabian Sea',
    route: 'Mumbai - Goa - Mumbai',
    price: 75000,
    capacity: 150,
    duration_days: 3,
    ship_length_meters: 220,
    beam_meters: 30,
    decks_count: 8,
    cabin_count: 90,
    description: '',
    image_url: '',
    facilities: 'Wi-Fi, Swimming Pool, Fine Dining, DJ Audio Rigs, Sun Deck',
    supports_private_charter: true,
    supports_public_tours: true,
    supports_weddings: true,
    supports_birthdays: true,
    supports_corporate: true,
    supports_parties: true,
  });

  // Add Tour Form State
  const [tourForm, setTourForm] = useState({
    ship_id: '',
    tour_title: '',
    departure_port: 'Mumbai Cruise Terminal',
    destination: 'Goa (Mormugao)',
    departure_date: '',
    departure_time: '16:00',
    return_date: '',
    return_time: '11:00',
    duration_days: 3,
    total_capacity: 100,
    adult_price: 14999,
    child_price: 7999,
    itinerary: 'Day 1: Boarding & Sunset Deck Welcome\nDay 2: High Seas Cruising & Gala Dinner\nDay 3: Arrival at Port',
    meals_included: 'All Gourmet Buffet Meals Included',
  });

  const fetchDashboard = () => {
    setLoading(true);
    getOperatorDashboard()
      .then((res) => {
        setData(res);
        if (res.my_ships && res.my_ships.length > 0) {
          if (!tourForm.ship_id) {
            setTourForm((prev) => ({ ...prev, ship_id: res.my_ships[0].id.toString() }));
          }
          if (!selectedShipIdForTimeline) {
            setSelectedShipIdForTimeline(res.my_ships[0].id);
          }
          if (!newExtra.ship_id) {
            setNewExtra((prev) => ({ ...prev, ship_id: res.my_ships[0].id.toString() }));
          }
        }
        if (res.my_tours && res.my_tours.length > 0 && !selectedTourIdForManifest) {
          setSelectedTourIdForManifest(res.my_tours[0].id);
        }
      })
      .catch((err) => console.error('Failed to load operator dashboard:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  // Fetch Extras when extras tab is opened
  useEffect(() => {
    if (activeTab === 'extras') {
      getOperatorExtras()
        .then((res) => setExtrasList(res.extras || []))
        .catch((err) => console.error('Failed to load extras:', err));
    }
  }, [activeTab]);

  // Fetch Timeline when availability tab is opened or ship changes
  useEffect(() => {
    if (activeTab === 'availability' && selectedShipIdForTimeline) {
      setTimelineLoading(true);
      getOperatorAvailability(selectedShipIdForTimeline)
        .then((res) => setAvailabilityTimeline(res.timeline || []))
        .catch((err) => console.error('Failed to load timeline:', err))
        .finally(() => setTimelineLoading(false));
    }
  }, [activeTab, selectedShipIdForTimeline]);

  // Fetch Passengers manifest when tour changes
  useEffect(() => {
    if (activeTab === 'passengers' && selectedTourIdForManifest) {
      setManifestLoading(true);
      getTourPassengers(selectedTourIdForManifest)
        .then((res) => setManifestData(res))
        .catch((err) => console.error('Failed to load manifest:', err))
        .finally(() => setManifestLoading(false));
    }
  }, [activeTab, selectedTourIdForManifest]);

  // Computed Fleet Analytics Data for Tab 1 (Called unconditionally at top-level)
  const analyticsData = useMemo(() => {
    if (data?.analytics) {
      return data.analytics;
    }

    const bookings = data?.recent_bookings || [];
    const monthsOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthMap: Record<string, { month: string; revenue: number; payout: number; bookings_count: number }> = {};
    monthsOrder.forEach((m) => {
      monthMap[m] = { month: m, revenue: 0, payout: 0, bookings_count: 0 };
    });

    bookings.forEach((b) => {
      const dateStr = b.booking_date || '';
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const monthIndex = parseInt(parts[1], 10) - 1;
        if (monthIndex >= 0 && monthIndex < 12) {
          const mKey = monthsOrder[monthIndex];
          monthMap[mKey].bookings_count += 1;
          if (b.status === 'CONFIRMED' || b.status === 'COMPLETED') {
            const price = Number(b.total_price) || 0;
            monthMap[mKey].revenue += price;
            monthMap[mKey].payout += Math.round(price * 0.85);
          }
        }
      }
    });

    const activeMonths = monthsOrder.map((m) => monthMap[m]).filter((m) => m.bookings_count > 0 || m.revenue > 0);
    const monthlyTrend = activeMonths.length > 0 ? activeMonths : monthsOrder.slice(0, 6).map((m) => monthMap[m]);

    const privCount = bookings.filter((b) => b.booking_type === 'EVENT').length;
    const tourCount = bookings.filter((b) => b.booking_type === 'TOUR').length;
    const totalCat = privCount + tourCount || 1;
    const privRev = bookings
      .filter((b) => b.booking_type === 'EVENT' && (b.status === 'CONFIRMED' || b.status === 'COMPLETED'))
      .reduce((s, b) => s + (Number(b.total_price) || 0), 0);
    const tourRev = bookings
      .filter((b) => b.booking_type === 'TOUR' && (b.status === 'CONFIRMED' || b.status === 'COMPLETED'))
      .reduce((s, b) => s + (Number(b.total_price) || 0), 0);

    const ships = data?.my_ships || [];
    const shipPerf = ships
      .map((s) => {
        const sBookings = bookings.filter((b) => (b as any).cross?.id === s.id || b.cruise_id === s.id || (b as any).cross_id === s.id);
        const sRev = sBookings
          .filter((b) => b.status === 'CONFIRMED' || b.status === 'COMPLETED')
          .reduce((acc, b) => acc + (Number(b.total_price) || 0), 0);
        const sGuests = sBookings.reduce(
          (acc, b) => acc + (Number(b.passengers_count || b.number_of_people) || 1),
          0
        );
        return {
          ship_id: s.id,
          ship_name: s.name,
          location: s.location || 'Mumbai',
          image: s.image || (s as any).image_url || '/static/images/vessels/cordelia_empress.jpg',
          category: s.category || 'Cruiser',
          bookings_count: sBookings.length,
          revenue: sRev,
          payout: Math.round(sRev * 0.85),
          guests: sGuests,
        };
      })
      .sort((a, b) => b.revenue - a.revenue);

    return {
      monthly_trend: monthlyTrend,
      category_split: {
        private_count: privCount,
        private_revenue: privRev,
        private_percent: Math.round((privCount / totalCat) * 100),
        tour_count: tourCount,
        tour_revenue: tourRev,
        tour_percent: 100 - Math.round((privCount / totalCat) * 100),
      },
      status_breakdown: {
        confirmed: bookings.filter((b) => b.status === 'CONFIRMED').length,
        completed: bookings.filter((b) => b.status === 'COMPLETED').length,
        pending: bookings.filter((b) => b.status === 'PENDING').length,
        cancelled: bookings.filter((b) => b.status === 'CANCELLED').length,
        total: bookings.length,
      },
      ship_performance: shipPerf,
      top_destinations: [],
    };
  }, [data]);

  const handleAction = async (
    bookingId: string,
    action: 'confirm' | 'cancel' | 'complete' | 'board' | 'depart' | 'arrive'
  ) => {
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

  const handleAddShipSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...shipForm,
        facilities: shipForm.facilities.split(',').map((f) => f.trim()).filter(Boolean),
      };
      await createOperatorShip(payload as any);
      setShowAddShipModal(false);
      fetchDashboard();
    } catch (err: any) {
      alert(err.message || 'Failed to register ship');
    }
  };

  const handleAddTourSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createOperatorTour(tourForm);
      setShowAddTourModal(false);
      fetchDashboard();
    } catch (err: any) {
      alert(err.message || 'Failed to create tour');
    }
  };

  const handleCreateExtraSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createOperatorExtra(newExtra);
      setShowAddExtraModal(false);
      setNewExtra({ ship_id: newExtra.ship_id, name: '', description: '', price: 5000, pricing_mode: 'FLAT' });
      getOperatorExtras().then((res) => setExtrasList(res.extras || []));
    } catch (err: any) {
      alert(err.message || 'Failed to create extra');
    }
  };

  const handleDeleteExtra = async (id: number) => {
    if (!window.confirm('Delete this ship extra service?')) return;
    try {
      await deleteOperatorExtra(id);
      getOperatorExtras().then((res) => setExtrasList(res.extras || []));
    } catch (err: any) {
      alert(err.message || 'Failed to delete extra');
    }
  };

  if (loading && !data) {
    return (
      <div className="min-h-screen pt-32 pb-20 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-600 font-medium text-sm">Loading Owner Dashboard...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen pt-32 pb-20 flex items-center justify-center px-4">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center max-w-md shadow-sm">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">Unable to Load Owner Dashboard</h2>
          <p className="text-slate-600 text-sm mb-6">
            Could not fetch operator details. Please check your connection or try logging in again.
          </p>
          <button
            onClick={fetchDashboard}
            className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl text-sm transition-colors shadow-sm shadow-amber-500/20"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const stats = data.stats || {
    total_ships: 0,
    active_ships: 0,
    available_ships: 0,
    booked_ships: 0,
    on_tour_ships: 0,
    maintenance_ships: 0,
    active_bookings: 0,
    pending_bookings: 0,
    confirmed_bookings: 0,
    completed_trips: 0,
    total_revenue: 0,
    owner_payout: 0,
    platform_commission: 0,
    private_revenue: 0,
    tour_revenue: 0,
  };

  const filteredShips = (data.my_ships || []).filter((s) => {
    if (fleetFilter === 'ALL') return true;
    const op = s.operational_status || (s.is_active ? 'AVAILABLE' : 'MAINTENANCE');
    return op === fleetFilter;
  });

  const pendingRequests = (data.recent_bookings || []).filter((b) => b.status === 'PENDING');
  const filteredBookings = (data.recent_bookings || []).filter((b) => {
    if (bookingFilter === 'ALL') return true;
    return b.status === bookingFilter;
  });

  const maxMonthlyRevenue = Math.max(...((analyticsData?.monthly_trend || []).map((m: any) => m.revenue)), 1);
  const maxShipRevenue = Math.max(...((analyticsData?.ship_performance || []).map((s: any) => s.revenue)), 1);
  const maxDestCount = Math.max(...((analyticsData?.top_destinations || []).map((d: any) => d.count)), 1);
  const totalFleetGuests = (analyticsData?.ship_performance || []).reduce((acc: number, s: any) => acc + s.guests, 0);

  return (
    <div className="min-h-screen pt-28 pb-20 bg-slate-50/70 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* 1. OPERATOR IDENTITY & FLEET SUMMARY HEADER */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-amber-200/80 shadow-sm mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-bold uppercase tracking-wider mb-2 border border-amber-300">
            <Anchor className="w-3.5 h-3.5 text-amber-700" />
            Ship Owner & Operator Operations Suite
          </div>
          <h1 className="text-2xl sm:text-4xl font-display font-black text-slate-900 tracking-tight font-serif">
            Owner's Command Center
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage your registered ships, charter bookings, public tour departures, and verified revenue in ₹ INR.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={() => setShowAddShipModal(true)}
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Ship</span>
          </button>
          <button
            onClick={() => setShowAddTourModal(true)}
            className="px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Publish Tour</span>
          </button>
        </div>
      </div>

      {/* 2. SUB-NAVIGATION TABS BAR */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 mb-8 overflow-x-auto text-xs font-bold">
        {[
          { id: 'overview', label: 'Fleet Overview & Analytics', icon: BarChart3 },
          { id: 'ships', label: `My Ships (${data?.my_ships?.length || 0})`, icon: Ship },
          { id: 'extras', label: 'Ship Extras', icon: Tag },
          { id: 'availability', label: 'Availability Timeline', icon: Calendar },
          { id: 'requests', label: `Booking Requests (${data?.recent_bookings?.length || 0})`, icon: Clock },
          { id: 'tours', label: `Public Tours (${data?.my_tours?.length || 0})`, icon: Anchor },
          { id: 'passengers', label: 'Tour Passengers', icon: Users },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as OperatorTab)}
              className={`px-4 py-2.5 rounded-xl transition flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: FLEET OVERVIEW & ANALYTICS */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Header banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20">
                <BarChart3 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 font-serif">
                  Fleet Operations & Revenue Analytics
                </h3>
                <p className="text-xs text-slate-500">
                  Live performance metrics, monthly earnings trajectory, voyage split, and vessel utilization for your fleet.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold shadow-sm">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Verified Owner Fleet (85% Payout)</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold shadow-sm">
                <Activity className="w-3.5 h-3.5 text-amber-600" />
                <span>{analyticsData.status_breakdown.total} Total Bookings</span>
              </span>
            </div>
          </div>

          {/* Top 4 Fleet KPI Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Gross Fleet Revenue</span>
              <span className="text-2xl sm:text-3xl font-black text-slate-900">{formatINR(stats.total_revenue)}</span>
              <p className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                Owner Payout: {formatINR(stats.owner_payout || stats.total_revenue * 0.85)}
              </p>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Total Fleet Ships</span>
              <span className="text-2xl sm:text-3xl font-black text-amber-600">{stats.total_ships}</span>
              <p className="text-[11px] text-slate-500 font-medium">
                {stats.active_ships || stats.total_ships} Active in Commission
              </p>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Confirmed Bookings</span>
              <span className="text-2xl sm:text-3xl font-black text-blue-600">
                {analyticsData.status_breakdown.confirmed + analyticsData.status_breakdown.completed}
              </span>
              <p className="text-[11px] text-slate-500 font-medium">
                {analyticsData.status_breakdown.completed} Completed • {analyticsData.status_breakdown.confirmed} Upcoming
              </p>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Total Guests Hosted</span>
              <span className="text-2xl sm:text-3xl font-black text-slate-900">{totalFleetGuests} Guests</span>
              <p className="text-[11px] text-slate-500 font-medium">
                {(stats.pending_bookings || 0) > 0 ? (
                  <span className="text-amber-600 font-bold">{stats.pending_bookings} Pending Actions</span>
                ) : (
                  'All requests up to date'
                )}
              </p>
            </div>
          </div>

          {/* Pending Charter Requests Alert Table (If Any) */}
          {pendingRequests.length > 0 && (
            <div className="bg-amber-50/60 rounded-3xl p-6 border border-amber-200 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-amber-950 font-serif flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                  Urgent: Pending Charter Booking Requests ({pendingRequests.length})
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingRequests.map((req) => (
                  <div key={req.id} className="bg-white p-5 rounded-2xl border border-amber-200/80 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                        #{req.booking_id}
                      </span>
                      <span className="text-xs font-black text-slate-900">{formatINR(req.total_price)}</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 font-serif">{req.cruise_name}</h4>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Customer: <strong>{req.customer_name}</strong> ({req.customer_phone || req.customer_email})
                      </p>
                      <p className="text-xs text-slate-500">
                        Date: {req.booking_date} • Guests: {req.passengers_count || req.number_of_people}
                      </p>
                    </div>
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleAction(req.booking_id, 'confirm')}
                        disabled={actionLoading === `${req.booking_id}-confirm`}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs transition cursor-pointer shadow-sm"
                      >
                        Accept Booking
                      </button>
                      <button
                        onClick={() => handleAction(req.booking_id, 'cancel')}
                        disabled={actionLoading === `${req.booking_id}-cancel`}
                        className="px-3.5 py-1.5 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold text-xs transition cursor-pointer"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* FINANCIAL ACCOUNTING & PAYOUT MODEL CARD */}
          <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl space-y-6 border border-amber-900/40">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold uppercase tracking-wider mb-1 border border-amber-500/30">
                  <DollarSign className="w-3.5 h-3.5 text-amber-400" />
                  Owner Payout & Settlement Breakdown
                </span>
                <h3 className="text-2xl font-bold font-serif">Verified Fleet Revenue Distribution</h3>
                <p className="text-xs text-slate-400">
                  Direct automated disbursement: 85% to Ship Owner account, 15% platform management & gateway fee.
                </p>
              </div>

              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Owner Net Payout</span>
                <span className="text-3xl font-black text-amber-400">
                  {formatINR(stats.owner_payout || stats.total_revenue * 0.85)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-300 block tracking-wider">Gross Customer Paid</span>
                <span className="text-2xl font-black text-white">{formatINR(stats.total_revenue)}</span>
                <p className="text-[10px] text-slate-400">100% of all confirmed & completed orders</p>
              </div>

              <div className="p-4 rounded-2xl bg-amber-500/20 backdrop-blur-md border border-amber-500/40 space-y-1">
                <span className="text-[10px] uppercase font-bold text-amber-300 block tracking-wider">Owner Net Share (85%)</span>
                <span className="text-2xl font-black text-amber-400">{formatINR(stats.owner_payout || stats.total_revenue * 0.85)}</span>
                <p className="text-[10px] text-amber-200">Disbursed directly to your registered bank</p>
              </div>

              <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-300 block tracking-wider">Platform Fee (15%)</span>
                <span className="text-2xl font-black text-slate-300">{formatINR(stats.platform_commission || stats.total_revenue * 0.15)}</span>
                <p className="text-[10px] text-slate-400">Includes payment gateways & ticketing support</p>
              </div>
            </div>
          </div>

          {/* ROW 1: CHARTS (Monthly Revenue Trend + Category Split) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart 1: Monthly Revenue & Trips Trend (2 cols) */}
            <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="font-bold text-base text-slate-900 font-serif flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-amber-600" />
                    Monthly Fleet Revenue & Activity Trend
                  </h4>
                  <p className="text-xs text-slate-500">
                    Gross bookings revenue and net owner payouts across past departures.
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <span className="w-3 h-3 rounded bg-amber-500 inline-block" />
                    Gross Revenue
                  </span>
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <span className="w-3 h-3 rounded bg-emerald-500 inline-block" />
                    Owner Payout (85%)
                  </span>
                </div>
              </div>

              {analyticsData.monthly_trend.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-slate-400 text-xs">
                  No monthly activity recorded yet.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="h-56 flex items-end justify-between gap-3 pt-6 pb-2 border-b border-slate-100">
                    {analyticsData.monthly_trend.map((m, idx) => {
                      const revHeight = Math.max(6, Math.round((m.revenue / maxMonthlyRevenue) * 100));
                      const payHeight = Math.max(4, Math.round((m.payout / maxMonthlyRevenue) * 100));
                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group relative">
                          {/* Tooltip on hover */}
                          <div className="absolute -top-16 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 bg-slate-900 text-white p-2 rounded-xl text-[10px] whitespace-nowrap shadow-xl border border-slate-800">
                            <p className="font-bold text-amber-300">{m.month}: {formatINR(m.revenue)}</p>
                            <p className="text-emerald-300">Net Payout: {formatINR(m.payout)}</p>
                            <p className="text-slate-400">{m.bookings_count} bookings</p>
                          </div>

                          {/* Dual Bar pair */}
                          <div className="w-full flex items-end justify-center gap-1 h-full">
                            <div
                              style={{ height: `${revHeight}%` }}
                              className="w-full max-w-[18px] bg-gradient-to-t from-amber-600 to-amber-400 rounded-t-md transition-all duration-500 group-hover:brightness-110 shadow-sm"
                              title={`Gross: ${formatINR(m.revenue)}`}
                            />
                            <div
                              style={{ height: `${payHeight}%` }}
                              className="w-full max-w-[18px] bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t-md transition-all duration-500 group-hover:brightness-110 shadow-sm"
                              title={`Owner Payout: ${formatINR(m.payout)}`}
                            />
                          </div>

                          <span className="text-[11px] font-bold text-slate-600 truncate mt-1">
                            {m.month}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                    <span>Peak Month: <strong>{analyticsData.monthly_trend.reduce((prev, curr) => curr.revenue > prev.revenue ? curr : prev, analyticsData.monthly_trend[0])?.month || 'N/A'}</strong></span>
                    <span>Max Monthly: <strong>{formatINR(maxMonthlyRevenue)}</strong></span>
                  </div>
                </div>
              )}
            </div>

            {/* Chart 2: Category Split Ratio (1 col) */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-5 flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-base text-slate-900 font-serif flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-sky-600" />
                  Voyage Category Ratio
                </h4>
                <p className="text-xs text-slate-500">
                  Private Charters vs Public Tours breakdown.
                </p>
              </div>

              {/* Progress Split Bar */}
              <div className="space-y-3">
                <div className="w-full h-5 rounded-full bg-slate-100 overflow-hidden flex shadow-inner">
                  <div
                    style={{ width: `${analyticsData.category_split.private_percent}%` }}
                    className="bg-gradient-to-r from-amber-500 to-amber-400 h-full transition-all duration-500"
                    title={`Private Charters: ${analyticsData.category_split.private_percent}%`}
                  />
                  <div
                    style={{ width: `${analyticsData.category_split.tour_percent}%` }}
                    className="bg-gradient-to-r from-sky-500 to-blue-500 h-full transition-all duration-500"
                    title={`Public Tours: ${analyticsData.category_split.tour_percent}%`}
                  />
                </div>

                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-amber-700">{analyticsData.category_split.private_percent}% Private Charters</span>
                  <span className="text-sky-700">{analyticsData.category_split.tour_percent}% Public Tours</span>
                </div>
              </div>

              {/* Breakdown cards */}
              <div className="space-y-2.5">
                <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-amber-900 block">Private Event Charters</span>
                    <span className="text-[11px] text-amber-700">{analyticsData.category_split.private_count} contracts</span>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-sm text-amber-900 block">{formatINR(analyticsData.category_split.private_revenue)}</span>
                    <span className="text-[10px] text-amber-700 font-bold">Payout: {formatINR(analyticsData.category_split.private_revenue * 0.85)}</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-sky-50/70 border border-sky-200 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-sky-900 block">Scheduled Cruise Tours</span>
                    <span className="text-[11px] text-sky-700">{analyticsData.category_split.tour_count} bookings</span>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-sm text-sky-900 block">{formatINR(analyticsData.category_split.tour_revenue)}</span>
                    <span className="text-[10px] text-sky-700 font-bold">Payout: {formatINR(analyticsData.category_split.tour_revenue * 0.85)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ROW 2: CHARTS (Reservation Status + Vessel Performance + Top Destinations) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart 3: Reservation Lifecycle Status */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div>
                <h4 className="font-bold text-base text-slate-900 font-serif flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-600" />
                  Reservation Status Lifecycle
                </h4>
                <p className="text-xs text-slate-500">
                  Distribution of all customer reservations for your fleet.
                </p>
              </div>

              <div className="space-y-3.5 pt-2">
                {[
                  { label: 'Confirmed (Upcoming)', count: analyticsData.status_breakdown.confirmed, color: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50' },
                  { label: 'Completed (Voyaged)', count: analyticsData.status_breakdown.completed, color: 'bg-blue-500', text: 'text-blue-700', bg: 'bg-blue-50' },
                  { label: 'Pending Confirmation', count: analyticsData.status_breakdown.pending, color: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50' },
                  { label: 'Cancelled / Refunded', count: analyticsData.status_breakdown.cancelled, color: 'bg-rose-500', text: 'text-rose-700', bg: 'bg-rose-50' },
                ].map((s, i) => {
                  const total = analyticsData.status_breakdown.total || 1;
                  const pct = Math.round((s.count / total) * 100);
                  return (
                    <div key={i} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-700 flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${s.color}`} />
                          {s.label}
                        </span>
                        <span className="font-bold text-slate-900">
                          {s.count} <span className="text-[11px] font-normal text-slate-400">({pct}%)</span>
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          style={{ width: `${pct}%` }}
                          className={`h-full rounded-full ${s.color} transition-all duration-500`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Chart 4: Vessel Performance & Revenue Ranking (2 cols on large screens) */}
            <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-base text-slate-900 font-serif flex items-center gap-2">
                    <Award className="w-4 h-4 text-amber-600" />
                    Fleet Vessel Performance & Utilization
                  </h4>
                  <p className="text-xs text-slate-500">
                    Revenue generated and bookings completed by individual fleet ships.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('ships')}
                  className="text-xs font-bold text-amber-700 hover:text-amber-800 cursor-pointer"
                >
                  Manage All Ships →
                </button>
              </div>

              {analyticsData.ship_performance.length === 0 ? (
                <div className="h-44 flex items-center justify-center text-slate-400 text-xs">
                  No fleet vessels registered yet.
                </div>
              ) : (
                <div className="space-y-3 pt-2">
                  {analyticsData.ship_performance.slice(0, 5).map((ship, idx) => {
                    const revPct = Math.round((ship.revenue / maxShipRevenue) * 100);
                    return (
                      <div key={ship.ship_id} className="p-3 rounded-2xl bg-slate-50/80 hover:bg-slate-100/80 border border-slate-200/60 transition space-y-2">
                        <div className="flex items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-2.5 truncate">
                            <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-800 font-black text-[11px] flex items-center justify-center shrink-0">
                              #{idx + 1}
                            </span>
                            <div className="truncate">
                              <span className="font-bold text-slate-900 block truncate">{ship.ship_name}</span>
                              <span className="text-[10px] text-slate-500 flex items-center gap-1 truncate">
                                <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                {ship.location} • {ship.category} • {ship.guests} guests hosted
                              </span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="font-black text-slate-900 text-sm block">{formatINR(ship.revenue)}</span>
                            <span className="text-[10px] text-emerald-700 font-bold block">
                              Payout: {formatINR(ship.payout)} ({ship.bookings_count} trips)
                            </span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                          <div
                            style={{ width: `${revPct}%` }}
                            className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-500"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ROW 3: Top Explored Maritime Destinations (Full Width) */}
          {analyticsData.top_destinations && analyticsData.top_destinations.length > 0 && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-base text-slate-900 font-serif flex items-center gap-2">
                    <Compass className="w-4 h-4 text-sky-600" />
                    Top Explored Maritime Destinations & Routes
                  </h4>
                  <p className="text-xs text-slate-500">
                    Most visited sea routes and passenger destinations across your fleet.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 pt-1">
                {analyticsData.top_destinations.map((d, i) => {
                  const pct = Math.round((d.count / maxDestCount) * 100);
                  return (
                    <div key={i} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded-md bg-sky-100 text-sky-800 text-[10px] font-bold uppercase">
                          Rank #{i + 1}
                        </span>
                        <span className="text-xs font-black text-slate-900">{d.count} trips</span>
                      </div>
                      <h5 className="font-bold text-sm text-slate-900 truncate" title={d.destination}>
                        {d.destination}
                      </h5>
                      <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                        <div style={{ width: `${pct}%` }} className="h-full bg-sky-500 rounded-full" />
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium">
                        Revenue: <strong className="text-slate-800">{formatINR(d.revenue)}</strong>
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MY SHIPS */}
      {activeTab === 'ships' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-slate-900 font-serif">My Cruise Fleet</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage ship specifications, pricing rates, deck capabilities, and operational status.
              </p>
            </div>
            <button
              onClick={() => setShowAddShipModal(true)}
              className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 self-start cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4" /> Add New Ship
            </button>
          </div>

          {/* Status Filter Chips */}
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'ALL', label: 'All Fleet Ships', count: data?.my_ships?.length || 0 },
              { id: 'AVAILABLE', label: 'Available', count: stats.available_ships || 0 },
              { id: 'BOOKED', label: 'Booked / Unavailable', count: stats.booked_ships || 0 },
              { id: 'ON_TOUR', label: 'On Tour Departure', count: stats.on_tour_ships || 0 },
              { id: 'MAINTENANCE', label: 'In Maintenance', count: stats.maintenance_ships || 0 },
            ].map((chip) => {
              const isActive = fleetFilter === chip.id;
              return (
                <button
                  key={chip.id}
                  onClick={() => setFleetFilter(chip.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                    isActive
                      ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span>{chip.label}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-md text-[10px] ${
                      isActive ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {chip.count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredShips.map((ship) => {
              const opStatus = ship.operational_status || (ship.is_active ? 'AVAILABLE' : 'MAINTENANCE');
              return (
              <div key={ship.id} className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-4">
                <div className="flex gap-4">
                  <img
                    src={ship.image || (ship as any).image_url || '/static/images/vessels/cordelia_empress.jpg'}
                    alt={ship.name}
                    className="w-28 h-28 rounded-2xl object-cover shrink-0"
                  />
                  <div className="space-y-1 min-w-0">
                    {opStatus === 'AVAILABLE' && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 uppercase inline-flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Available for Charter
                      </span>
                    )}
                    {opStatus === 'BOOKED' && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 uppercase inline-flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                        Booked / Unavailable
                      </span>
                    )}
                    {opStatus === 'ON_TOUR' && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-300 uppercase inline-flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                        On Tour Departure
                      </span>
                    )}
                    {opStatus === 'MAINTENANCE' && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 uppercase inline-flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        Maintenance / Drydock
                      </span>
                    )}
                    <h3 className="font-bold text-lg text-slate-900 font-serif truncate">{ship.name}</h3>
                    <p className="text-xs text-slate-500">
                      {ship.departure_port} → {ship.destination}
                    </p>
                    <p className="text-xs font-black text-slate-900 pt-1">
                      {formatINR(ship.price)} <span className="text-[10px] font-normal text-slate-400">/ {ship.price_unit || 'day base charter'}</span>
                    </p>
                  </div>
                </div>

                {/* Vessel Tech Specs */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Capacity</span>
                    <span className="font-bold text-slate-800">{ship.capacity} Guests</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Length / Beam</span>
                    <span className="font-bold text-slate-800">{ship.ship_length_meters || 200}m / {ship.beam_meters || 28}m</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Decks / Cabins</span>
                    <span className="font-bold text-slate-800">{ship.decks_count || 8} Decks • {ship.cabin_count || 80}</span>
                  </div>
                </div>

                <div className="pt-2 flex flex-wrap gap-2 justify-end">
                  <button
                    onClick={() => {
                      setSelectedShipIdForTimeline(ship.id);
                      setActiveTab('availability');
                    }}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                  >
                    View Availability
                  </button>
                  <button
                    onClick={() => {
                      setNewExtra((prev) => ({ ...prev, ship_id: ship.id.toString() }));
                      setActiveTab('extras');
                    }}
                    className="px-3 py-1.5 rounded-xl border border-amber-200 text-xs font-bold text-amber-800 hover:bg-amber-50 transition cursor-pointer"
                  >
                    Configure Extras
                  </button>
                </div>
              </div>
            );
          })}
          </div>
        </div>
      )}

      {/* TAB 3: SHIP EXTRAS */}
      {activeTab === 'extras' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-slate-900 font-serif">Ship Add-on Extras</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure owner-provided add-on services (DJ, Drone Photography, Fine Catering, Decoration) with pricing mode.
              </p>
            </div>
            <button
              onClick={() => setShowAddExtraModal(true)}
              className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4" /> Add Extra Service
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {extrasList.map((extra) => (
              <div key={extra.id} className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-50 text-sky-700 uppercase">
                      {extra.pricing_mode === 'PER_PERSON' ? 'Per Guest' : extra.pricing_mode === 'PER_DAY' ? 'Per Day' : 'Flat Package'}
                    </span>
                    <button
                      onClick={() => handleDeleteExtra(extra.id)}
                      className="text-slate-400 hover:text-rose-600 transition cursor-pointer p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <h3 className="font-bold text-base text-slate-900 font-serif mt-2">{extra.name}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed mt-1">{extra.description || 'Custom boat/cruise service option.'}</p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-base font-black text-slate-900">{formatINR(extra.price)}</span>
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                    Active
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: AVAILABILITY TIMELINE */}
      {activeTab === 'availability' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-slate-900 font-serif">Ship Availability Timeline</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                30-day chronological operational status derived directly from live database bookings and tour schedules.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-semibold">Select Ship:</span>
              <select
                value={selectedShipIdForTimeline || ''}
                onChange={(e) => setSelectedShipIdForTimeline(Number(e.target.value))}
                className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold bg-white text-slate-900"
              >
                {(data?.my_ships || []).map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          {timelineLoading ? (
            <div className="py-20 text-center">
              <div className="w-10 h-10 mx-auto border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm">
              <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-6 gap-3">
                {availabilityTimeline.map((item, idx) => {
                  const isAvailable = item.status === 'Available';
                  const isCharter = item.status === 'Private Booking';
                  return (
                    <div
                      key={idx}
                      className={`p-3.5 rounded-2xl border text-center transition ${
                        isAvailable
                          ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                          : isCharter
                          ? 'bg-sky-50 border-sky-200 text-sky-900'
                          : 'bg-purple-50 border-purple-200 text-purple-900'
                      }`}
                    >
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">{item.day_name}</span>
                      <span className="text-sm font-black block mt-0.5">{item.date.slice(5)}</span>
                      <span
                        className={`text-[9px] font-bold uppercase tracking-wider block mt-1.5 px-1.5 py-0.5 rounded ${
                          isAvailable ? 'bg-emerald-100 text-emerald-800' : isCharter ? 'bg-sky-100 text-sky-800' : 'bg-purple-100 text-purple-800'
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: PRIVATE BOOKING REQUESTS */}
      {activeTab === 'requests' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-slate-900 font-serif">Private Charter Reservations</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Review passenger requests, approve charter slots, track trip departures, and inspect tax invoices.
              </p>
            </div>
          </div>

          {/* Status Filter Chips */}
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'ALL', label: 'All Reservations', count: data?.recent_bookings?.length || 0 },
              { id: 'PENDING', label: 'Pending Requests', count: (data?.recent_bookings || []).filter(b => b.status === 'PENDING').length },
              { id: 'CONFIRMED', label: 'Confirmed', count: (data?.recent_bookings || []).filter(b => b.status === 'CONFIRMED').length },
              { id: 'COMPLETED', label: 'Completed', count: (data?.recent_bookings || []).filter(b => b.status === 'COMPLETED').length },
              { id: 'CANCELLED', label: 'Cancelled', count: (data?.recent_bookings || []).filter(b => b.status === 'CANCELLED').length },
            ].map((chip) => {
              const isActive = bookingFilter === chip.id;
              return (
                <button
                  key={chip.id}
                  onClick={() => setBookingFilter(chip.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    isActive
                      ? 'bg-amber-500 text-slate-950 shadow-sm font-black'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span>{chip.label}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    isActive ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {chip.count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="space-y-4">
            {filteredBookings.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center text-slate-500">
                <Clock className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="font-bold text-slate-700 text-sm">No reservations found</p>
                <p className="text-xs text-slate-400 mt-1">There are no bookings matching the selected status filter.</p>
              </div>
            ) : (
              filteredBookings.map((b) => (
              <div
                key={b.id}
                className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                      #{b.booking_id}
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                        b.status === 'CONFIRMED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : b.status === 'PENDING'
                          ? 'bg-amber-100 text-amber-800'
                          : b.status === 'COMPLETED'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {b.status}
                    </span>
                    <span className="text-[10px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded uppercase">
                      {b.booking_type === 'EVENT' ? 'Private Event Charter' : 'Public Tour Ticket'}
                    </span>
                  </div>

                  <h3 className="font-bold text-lg text-slate-900 font-serif">{b.cruise_name}</h3>
                  <p className="text-xs text-slate-600">
                    Customer: <strong>{b.customer_name}</strong> • Contact: {b.customer_email} {b.customer_phone ? `(${b.customer_phone})` : ''}
                  </p>
                  <p className="text-xs text-slate-500">
                    Trip Date: {b.booking_date} • Guests: {b.passengers_count || b.number_of_people} • Cabin: {b.cabin_name || b.cabin_type || 'Private Charter'}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-3 shrink-0">
                  <span className="text-xl font-black text-slate-900">{formatINR(b.total_price)}</span>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => setSelectedInvoiceId(b.booking_id)}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                    >
                      Invoice
                    </button>

                    {b.status === 'PENDING' && (
                      <>
                        <button
                          onClick={() => handleAction(b.booking_id, 'confirm')}
                          disabled={actionLoading === `${b.booking_id}-confirm`}
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs transition cursor-pointer shadow-sm"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleAction(b.booking_id, 'cancel')}
                          disabled={actionLoading === `${b.booking_id}-cancel`}
                          className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold text-xs transition cursor-pointer"
                        >
                          Reject
                        </button>
                      </>
                    )}

                    {b.status === 'CONFIRMED' && (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleAction(b.booking_id, 'board')}
                          disabled={actionLoading === `${b.booking_id}-board`}
                          className="px-2.5 py-1 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 font-bold text-[11px] transition cursor-pointer"
                        >
                          Boarding
                        </button>
                        <button
                          onClick={() => handleAction(b.booking_id, 'depart')}
                          disabled={actionLoading === `${b.booking_id}-depart`}
                          className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold text-[11px] transition cursor-pointer"
                        >
                          Depart
                        </button>
                        <button
                          onClick={() => handleAction(b.booking_id, 'arrive')}
                          disabled={actionLoading === `${b.booking_id}-arrive`}
                          className="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 font-bold text-[11px] transition cursor-pointer"
                        >
                          Arrive
                        </button>
                        <button
                          onClick={() => handleAction(b.booking_id, 'complete')}
                          disabled={actionLoading === `${b.booking_id}-complete`}
                          className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-[11px] transition cursor-pointer"
                        >
                          Complete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )))}
          </div>
        </div>
      )}

      {/* TAB 6: PUBLIC CRUISE TOURS */}
      {activeTab === 'tours' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-slate-900 font-serif">Scheduled Public Cruise Tours</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Multi-passenger scheduled departures with seat and cabin inventory management.
              </p>
            </div>
            <button
              onClick={() => setShowAddTourModal(true)}
              className="px-4 py-2 rounded-xl bg-sky-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4" /> Publish New Tour
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {data?.my_tours?.map((tour) => (
              <div key={tour.id} className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-full bg-sky-100 text-sky-800 text-[10px] font-bold uppercase">
                    {tour.ship_name}
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase">
                    {tour.remaining_capacity} Seats Remaining
                  </span>
                </div>

                <div>
                  <h3 className="text-lg font-black text-slate-900 font-serif">{tour.tour_title}</h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {tour.departure_port} → {tour.destination} ({tour.departure_date})
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Duration</span>
                    <span className="font-bold text-slate-800">{tour.duration_days} Days</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Adult Rate</span>
                    <span className="font-bold text-slate-800">{formatINR(tour.adult_price)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Booked / Total</span>
                    <span className="font-bold text-slate-800">{tour.booked_capacity} / {tour.total_capacity}</span>
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    onClick={() => {
                      setSelectedTourIdForManifest(tour.id);
                      setActiveTab('passengers');
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition cursor-pointer"
                  >
                    View Passenger Manifest
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 7: TOUR PASSENGERS MANIFEST */}
      {activeTab === 'passengers' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-slate-900 font-serif">Tour Passenger Manifest</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Authorized passenger list and ticket bookings for your scheduled cruise departures.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-semibold">Select Tour:</span>
              <select
                value={selectedTourIdForManifest || ''}
                onChange={(e) => setSelectedTourIdForManifest(Number(e.target.value))}
                className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold bg-white text-slate-900"
              >
                {data?.my_tours?.map((t) => (
                  <option key={t.id} value={t.id}>{t.tour_title}</option>
                ))}
              </select>
            </div>
          </div>

          {manifestLoading ? (
            <div className="py-20 text-center">
              <div className="w-10 h-10 mx-auto border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : !manifestData || manifestData.passengers.length === 0 ? (
            <div className="py-20 text-center bg-white rounded-3xl border border-slate-200 p-8">
              <Users className="w-12 h-12 mx-auto text-slate-300" />
              <h3 className="text-base font-bold text-slate-700 mt-2">No Passengers Booked Yet</h3>
              <p className="text-xs text-slate-400 mt-1">Passenger reservations will appear here as customers book tickets.</p>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3.5 px-4">Ticket Ref</th>
                      <th className="py-3.5 px-4">Passenger Name</th>
                      <th className="py-3.5 px-4">Contact</th>
                      <th className="py-3.5 px-4">Cabin / Class</th>
                      <th className="py-3.5 px-4">Party Size</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Fare (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {manifestData.passengers.map((p: any) => (
                      <tr key={p.booking_id} className="hover:bg-slate-50/80 transition">
                        <td className="py-4 px-4 font-mono font-bold text-sky-700">#{p.booking_id}</td>
                        <td className="py-4 px-4 font-bold text-slate-900">{p.passenger_name}</td>
                        <td className="py-4 px-4 text-slate-500">{p.email}</td>
                        <td className="py-4 px-4 text-slate-700">{p.cabin_type}</td>
                        <td className="py-4 px-4 font-semibold text-slate-800">{p.adults_count} Adults, {p.children_count} Children</td>
                        <td className="py-4 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase">
                            {p.status}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right font-black text-slate-900">
                          {formatINR(p.total_price)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ADD SHIP MODAL */}
      {showAddShipModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-display font-extrabold text-xl text-slate-900">Register New Ship in Fleet</h3>
                <p className="text-xs text-slate-500">Configure naval specs, passenger capacity, and base INR pricing.</p>
              </div>
              <button
                onClick={() => setShowAddShipModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddShipSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-700 block mb-1">Ship Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. MV Royal Arabian"
                    value={shipForm.name}
                    onChange={(e) => setShipForm({ ...shipForm, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-slate-700 block mb-1">Ship Category</label>
                  <select
                    value={shipForm.category}
                    onChange={(e) => setShipForm({ ...shipForm, category: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-amber-500 bg-white"
                  >
                    <option value="Luxury Ocean Cruise">Luxury Ocean Cruise</option>
                    <option value="Superyacht">Superyacht</option>
                    <option value="Catamaran Cruiser">Catamaran Cruiser</option>
                    <option value="Expedition Vessel">Expedition Vessel</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-700 block mb-1">Home Port</label>
                  <input
                    type="text"
                    required
                    value={shipForm.departure_port}
                    onChange={(e) => setShipForm({ ...shipForm, departure_port: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-slate-700 block mb-1">Destination Region</label>
                  <input
                    type="text"
                    required
                    value={shipForm.destination}
                    onChange={(e) => setShipForm({ ...shipForm, destination: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-700 block mb-1">Base Price (₹/day)</label>
                  <input
                    type="number"
                    required
                    value={shipForm.price}
                    onChange={(e) => setShipForm({ ...shipForm, price: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-slate-700 block mb-1">Capacity</label>
                  <input
                    type="number"
                    required
                    value={shipForm.capacity}
                    onChange={(e) => setShipForm({ ...shipForm, capacity: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-slate-700 block mb-1">Length (m)</label>
                  <input
                    type="number"
                    value={shipForm.ship_length_meters}
                    onChange={(e) => setShipForm({ ...shipForm, ship_length_meters: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-slate-700 block mb-1">Decks</label>
                  <input
                    type="number"
                    value={shipForm.decks_count}
                    onChange={(e) => setShipForm({ ...shipForm, decks_count: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-slate-700 block mb-1">Ship Photo URL</label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={shipForm.image_url}
                  onChange={(e) => setShipForm({ ...shipForm, image_url: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddShipModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-md"
                >
                  Register Ship
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PUBLISH TOUR MODAL */}
      {showAddTourModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-display font-extrabold text-xl text-slate-900">Publish Public Scheduled Tour</h3>
                <p className="text-xs text-slate-500">Sell passenger tickets and cabins on a scheduled departure.</p>
              </div>
              <button
                onClick={() => setShowAddTourModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddTourSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase text-slate-700 block mb-1">Select Ship</label>
                <select
                  required
                  value={tourForm.ship_id}
                  onChange={(e) => setTourForm({ ...tourForm, ship_id: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-sky-500 bg-white"
                >
                  {(data?.my_ships || []).map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.location})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-slate-700 block mb-1">Tour Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mumbai to Goa Coastal Carnival Cruise"
                  value={tourForm.tour_title}
                  onChange={(e) => setTourForm({ ...tourForm, tour_title: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-700 block mb-1">Departure Date</label>
                  <input
                    type="date"
                    required
                    value={tourForm.departure_date}
                    onChange={(e) => setTourForm({ ...tourForm, departure_date: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-slate-700 block mb-1">Return Date</label>
                  <input
                    type="date"
                    required
                    value={tourForm.return_date}
                    onChange={(e) => setTourForm({ ...tourForm, return_date: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-700 block mb-1">Adult Fare (₹/person)</label>
                  <input
                    type="number"
                    required
                    value={tourForm.adult_price}
                    onChange={(e) => setTourForm({ ...tourForm, adult_price: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-slate-700 block mb-1">Total Seat Capacity</label>
                  <input
                    type="number"
                    required
                    value={tourForm.total_capacity}
                    onChange={(e) => setTourForm({ ...tourForm, total_capacity: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddTourModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs shadow-md"
                >
                  Publish Public Tour
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD EXTRA MODAL */}
      {showAddExtraModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-lg text-slate-900">Add Ship Extra Service</h3>
              <button onClick={() => setShowAddExtraModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateExtraSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase text-slate-700 block mb-1">Assigned Ship</label>
                <select
                  required
                  value={newExtra.ship_id}
                  onChange={(e) => setNewExtra({ ...newExtra, ship_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white"
                >
                  {(data?.my_ships || []).map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-slate-700 block mb-1">Extra Service Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Drone Videography & Saxophone Solo"
                  value={newExtra.name}
                  onChange={(e) => setNewExtra({ ...newExtra, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-slate-700 block mb-1">Description</label>
                <textarea
                  rows={2}
                  value={newExtra.description}
                  onChange={(e) => setNewExtra({ ...newExtra, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-700 block mb-1">Rate in INR (₹)</label>
                  <input
                    type="number"
                    required
                    value={newExtra.price}
                    onChange={(e) => setNewExtra({ ...newExtra, price: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-slate-700 block mb-1">Pricing Mode</label>
                  <select
                    value={newExtra.pricing_mode}
                    onChange={(e) => setNewExtra({ ...newExtra, pricing_mode: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white"
                  >
                    <option value="FLAT">Flat Fee</option>
                    <option value="PER_PERSON">Per Person</option>
                    <option value="PER_DAY">Per Day</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddExtraModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-sm"
                >
                  Add Extra
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
