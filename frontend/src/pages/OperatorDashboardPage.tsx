import React, { useState, useEffect } from 'react';
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
  getOperatorRevenue,
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
  Trash2
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
  | 'passengers'
  | 'revenue';

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

  // Revenue State
  const [revenueData, setRevenueData] = useState<any | null>(null);

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
    itinerary: 'Day 1: Embarkation & Sunset Deck Welcome\nDay 2: High Seas Cruising & Gala Dinner\nDay 3: Arrival at Port',
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

  // Fetch Revenue when revenue tab is opened
  useEffect(() => {
    if (activeTab === 'revenue') {
      getOperatorRevenue()
        .then((res) => setRevenueData(res))
        .catch((err) => console.error('Failed to load revenue:', err));
    }
  }, [activeTab]);

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
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const stats = data?.stats || {
    total_ships: 0,
    active_ships: 0,
    active_bookings: 0,
    pending_bookings: 0,
    confirmed_bookings: 0,
    completed_trips: 0,
    total_revenue: 0,
    private_revenue: 0,
    tour_revenue: 0,
  };

  const pendingRequests = data?.recent_bookings.filter((b) => b.status === 'PENDING') || [];

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
            My Fleet Command Center
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage your registered vessels, charter bookings, public tour departures, and verified revenue in ₹ INR.
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
          { id: 'overview', label: 'Fleet Overview', icon: Compass },
          { id: 'ships', label: `My Ships (${data?.my_ships.length || 0})`, icon: Ship },
          { id: 'extras', label: 'Ship Extras', icon: Tag },
          { id: 'availability', label: 'Availability Timeline', icon: Calendar },
          { id: 'requests', label: `Booking Requests (${pendingRequests.length})`, icon: Clock },
          { id: 'tours', label: `Public Tours (${data?.my_tours?.length || 0})`, icon: Anchor },
          { id: 'passengers', label: 'Tour Passengers', icon: Users },
          { id: 'revenue', label: 'Revenue Breakdown', icon: TrendingUp },
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

      {/* TAB 1: FLEET OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Real Database KPI Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Total Vessels</span>
              <span className="text-3xl font-black text-slate-900">{stats.total_ships}</span>
              <p className="text-[11px] text-emerald-600 font-bold">{stats.active_ships || stats.total_ships} Active in Fleet</p>
            </div>
            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Pending Requests</span>
              <span className="text-3xl font-black text-amber-600">{stats.pending_bookings || 0}</span>
              <p className="text-[11px] text-slate-500">Requires Owner Confirmation</p>
            </div>
            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Confirmed Bookings</span>
              <span className="text-3xl font-black text-blue-600">{stats.confirmed_bookings || stats.active_bookings}</span>
              <p className="text-[11px] text-slate-500">{stats.completed_trips} Completed Trips</p>
            </div>
            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Total Fleet Revenue</span>
              <span className="text-3xl font-black text-slate-900">{formatINR(stats.total_revenue)}</span>
              <p className="text-[11px] text-slate-500">Private: {formatINR(stats.private_revenue || 0)}</p>
            </div>
          </div>

          {/* Pending Charter Requests Alert Table */}
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

          {/* Quick Vessels View */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 font-serif">Registered Fleet Flagships</h3>
              <button
                onClick={() => setActiveTab('ships')}
                className="text-xs font-bold text-amber-700 hover:text-amber-800 cursor-pointer"
              >
                Manage All Ships →
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {data?.my_ships.map((ship) => (
                <div key={ship.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="aspect-[16/10] relative">
                    <img
                      src={ship.image || (ship as any).image_url || 'https://images.unsplash.com/photo-1548574505-5e239809ee19?auto=format&fit=crop&w=600&q=80'}
                      alt={ship.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-3 right-3">
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500 text-white text-[10px] font-bold uppercase">
                        Available
                      </span>
                    </div>
                  </div>
                  <div className="p-4 space-y-2">
                    <h4 className="font-bold text-sm text-slate-900 font-serif truncate">{ship.name}</h4>
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {ship.location} • Capacity: {ship.capacity} Guests
                    </p>
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs font-black text-slate-900">{formatINR(ship.price)} / day</span>
                      <span className="text-[10px] font-bold text-slate-400">{ship.category}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MY SHIPS */}
      {activeTab === 'ships' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-slate-900 font-serif">My Cruise Fleet</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage vessel specifications, pricing rates, deck capabilities, and operational status.
              </p>
            </div>
            <button
              onClick={() => setShowAddShipModal(true)}
              className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 self-start cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4" /> Add New Vessel
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {data?.my_ships.map((ship) => (
              <div key={ship.id} className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-4">
                <div className="flex gap-4">
                  <img
                    src={ship.image || (ship as any).image_url || 'https://images.unsplash.com/photo-1548574505-5e239809ee19?auto=format&fit=crop&w=300&q=80'}
                    alt={ship.name}
                    className="w-28 h-28 rounded-2xl object-cover shrink-0"
                  />
                  <div className="space-y-1 min-w-0">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                      Operational
                    </span>
                    <h3 className="font-bold text-lg text-slate-900 font-serif truncate">{ship.name}</h3>
                    <p className="text-xs text-slate-500">
                      {ship.departure_port} → {ship.destination}
                    </p>
                    <p className="text-xs font-black text-slate-900 pt-1">
                      {formatINR(ship.price)} <span className="text-[10px] font-normal text-slate-400">/ day base charter</span>
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
            ))}
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
                  <p className="text-xs text-slate-500 leading-relaxed mt-1">{extra.description || 'Custom maritime service option.'}</p>
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
              <h2 className="text-2xl font-black text-slate-900 font-serif">Vessel Availability Timeline</h2>
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
                {data?.my_ships.map((s) => (
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
          <div>
            <h2 className="text-2xl font-black text-slate-900 font-serif">Private Charter Reservations</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Review passenger requests, approve charter slots, track voyage departures, and inspect tax invoices.
            </p>
          </div>

          <div className="space-y-4">
            {data?.recent_bookings.map((b) => (
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
                    Voyage Date: {b.booking_date} • Guests: {b.passengers_count || b.number_of_people} • Stateroom: {b.cabin_name || b.cabin_type || 'Charter Stateroom'}
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
            ))}
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
                Multi-passenger scheduled departures with stateroom seat inventory management.
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
              <p className="text-xs text-slate-400 mt-1">Passenger reservations will appear here as customers purchase stateroom tickets.</p>
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
                      <th className="py-3.5 px-4">Stateroom</th>
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

      {/* TAB 8: OWNER REVENUE */}
      {activeTab === 'revenue' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-black text-slate-900 font-serif">Fleet Revenue Analytics</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Live database financial breakdown by vessel and booking classification in INR (₹).
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Gross Fleet Revenue</span>
              <span className="text-3xl font-black text-slate-900">{formatINR(revenueData?.total_revenue || stats.total_revenue)}</span>
            </div>
            <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Private Charters</span>
              <span className="text-3xl font-black text-amber-700">{formatINR(revenueData?.private_revenue || stats.private_revenue || 0)}</span>
            </div>
            <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Public Tour Tickets</span>
              <span className="text-3xl font-black text-sky-700">{formatINR(revenueData?.tour_revenue || stats.tour_revenue || 0)}</span>
            </div>
          </div>

          {/* Revenue by Ship Table */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 font-serif">Earnings by Vessel</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Ship Name</th>
                    <th className="py-3 px-4">Total Reservations</th>
                    <th className="py-3 px-4 text-right">Revenue Generated (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {revenueData?.by_ship?.map((s: any) => (
                    <tr key={s.ship_id} className="hover:bg-slate-50 transition">
                      <td className="py-4 px-4 font-bold text-slate-900">{s.ship_name}</td>
                      <td className="py-4 px-4 text-slate-600">{s.bookings_count} bookings</td>
                      <td className="py-4 px-4 text-right font-black text-slate-900">{formatINR(s.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ADD SHIP MODAL */}
      {showAddShipModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-display font-extrabold text-xl text-slate-900">Register New Vessel in Fleet</h3>
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
                  <label className="text-xs font-bold uppercase text-slate-700 block mb-1">Vessel Name</label>
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
                  <label className="text-xs font-bold uppercase text-slate-700 block mb-1">Vessel Category</label>
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
                <label className="text-xs font-bold uppercase text-slate-700 block mb-1">Vessel Photo URL</label>
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
                  Register Vessel
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
                <p className="text-xs text-slate-500">Sell passenger ticket staterooms on a scheduled departure.</p>
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
                <label className="text-xs font-bold uppercase text-slate-700 block mb-1">Select Vessel</label>
                <select
                  required
                  value={tourForm.ship_id}
                  onChange={(e) => setTourForm({ ...tourForm, ship_id: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-sky-500 bg-white"
                >
                  {data?.my_ships.map((s) => (
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
                <label className="text-xs font-bold uppercase text-slate-700 block mb-1">Assigned Vessel</label>
                <select
                  required
                  value={newExtra.ship_id}
                  onChange={(e) => setNewExtra({ ...newExtra, ship_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white"
                >
                  {data?.my_ships.map((s) => (
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
