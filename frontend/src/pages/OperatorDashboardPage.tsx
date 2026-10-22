import React, { useState, useEffect, useMemo } from 'react';
import {
  getOperatorDashboard,
  operatorBookingAction,
  createOperatorShip,
  deleteOperatorShip,
  createOperatorTour,
  getOperatorExtras,
  createOperatorExtra,
  deleteOperatorExtra,
  getOperatorAvailability,
  getTourPassengers,
  uploadOperatorImage,
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
  Layers,
  Receipt,
  Upload,
  Link as LinkIcon,
  Loader2,
  User
} from 'lucide-react';
import { InvoiceModal } from '../components/ticket/InvoiceModal';
import { formatINR } from '../utils/currency';
import { Link } from 'react-router-dom';
import { updateUserProfile } from '../api/auth';
import { useAuth } from '../context/AuthContext';

type OperatorTab =
  | 'overview'
  | 'ships'
  | 'extras'
  | 'availability'
  | 'requests'
  | 'tours'
  | 'passengers'
  | 'profile';

export const OperatorDashboardPage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [data, setData] = useState<OperatorDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<OperatorTab>('overview');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Profile Form state
  const [profileFirstName, setProfileFirstName] = useState(user?.first_name || '');
  const [profileLastName, setProfileLastName] = useState(user?.last_name || '');
  const [profileEmail, setProfileEmail] = useState(user?.email || '');
  const [profilePhone, setProfilePhone] = useState(user?.phone || '');
  const [profileAddress, setProfileAddress] = useState(user?.address || '');
  const [profilePassword, setProfilePassword] = useState('');
  const [profileMsg, setProfileMsg] = useState<{ text: string; isError?: boolean } | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);

  // Sync authenticated operator details to form
  useEffect(() => {
    if (user) {
      setProfileFirstName(user.first_name || '');
      setProfileLastName(user.last_name || '');
      setProfileEmail(user.email || '');
      setProfilePhone(user.phone || '');
      setProfileAddress(user.address || '');
    }
  }, [user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileMsg(null);
    try {
      const res = await updateUserProfile({
        first_name: profileFirstName,
        last_name: profileLastName,
        email: profileEmail,
        phone: profilePhone,
        address: profileAddress,
        password: profilePassword || undefined,
      });
      setProfileMsg({ text: res.message || 'Profile saved successfully!' });
      setProfilePassword('');
      await refreshUser();
    } catch (err: any) {
      setProfileMsg({ text: err.message || 'Failed to update profile.', isError: true });
    } finally {
      setProfileSaving(false);
    }
  };

  // Modals
  const [showAddShipModal, setShowAddShipModal] = useState(false);
  const [showAddTourModal, setShowAddTourModal] = useState(false);
  const [showAddExtraModal, setShowAddExtraModal] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [shipToDelete, setShipToDelete] = useState<any | null>(null);
  const [deletingShip, setDeletingShip] = useState(false);

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
  const [selectedDayDetail, setSelectedDayDetail] = useState<any | null>(null);

  // Tour Passengers Manifest State
  const [selectedTourIdForManifest, setSelectedTourIdForManifest] = useState<number | null>(null);
  const [manifestData, setManifestData] = useState<any | null>(null);
  const [manifestLoading, setManifestLoading] = useState(false);

  // Bookings Filter State (Tab 5)
  const [bookingFilter, setBookingFilter] = useState<'ALL' | 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'>('ALL');

  // Fleet Filter State
  const [fleetFilter, setFleetFilter] = useState<'ALL' | 'AVAILABLE' | 'BOOKED' | 'ON_TOUR' | 'MAINTENANCE'>('ALL');

  // Add Ship Form State
  const initialShipForm = {
    name: '',
    category: 'Luxury Ocean Cruise',
    location: '',
    departure_port: '',
    destination: '',
    route: '',
    price: '' as unknown as number,
    capacity: '' as unknown as number,
    duration_days: '' as unknown as number,
    ship_length_meters: '' as unknown as number,
    beam_meters: '' as unknown as number,
    decks_count: '' as unknown as number,
    cabin_count: '' as unknown as number,
    description: '',
    image_url: '',
    facilities: '',
    supports_private_charter: true,
    supports_public_tours: true,
    supports_weddings: true,
    supports_birthdays: true,
    supports_corporate: true,
    supports_parties: true,
  };

  const [shipForm, setShipForm] = useState(initialShipForm);
  const [imageUploadMode, setImageUploadMode] = useState<'upload' | 'url'>('upload');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string>('');

  const handleOpenAddShipModal = () => {
    setShipForm(initialShipForm);
    setImagePreview('');
    setImageUploadMode('upload');
    setShowAddShipModal(true);
  };

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);

    setUploadingImage(true);
    try {
      const res = await uploadOperatorImage(file);
      if (res.url) {
        setShipForm((prev) => ({ ...prev, image_url: res.url }));
        setImagePreview(res.url);
      }
    } catch (err: any) {
      alert(err.message || 'Image upload failed. You can also paste an image URL directly.');
    } finally {
      setUploadingImage(false);
    }
  };

  // Add Tour Form State
  const calculateTourDuration = (depDateStr: string, retDateStr: string) => {
    if (!depDateStr || !retDateStr) return { days: 1, display: '1 Day' };
    const dep = new Date(depDateStr);
    const ret = new Date(retDateStr);
    const diffTime = ret.getTime() - dep.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) {
      return { days: 1, display: '1 Day' };
    }
    return {
      days: diffDays,
      display: `${diffDays} Days`
    };
  };

  const initialTourForm = {
    ship_id: '',
    tour_title: '',
    departure_port: 'Mumbai Cruise Terminal',
    destination: 'Goa (Mormugao)',
    departure_date: '',
    departure_time: '16:00',
    return_date: '',
    return_time: '11:00',
    duration_days: 1,
    duration_display: '1 Day',
    total_capacity: 100,
    adult_price: 14999,
    child_price: 7999,
    itinerary: 'Day 1: Boarding & Sunset Deck Welcome\nDay 2: High Seas Cruising & Gala Dinner\nDay 3: Arrival at Port',
    meals_included: 'All Gourmet Buffet Meals Included',
  };

  const [tourForm, setTourForm] = useState(initialTourForm);

  const fetchDashboard = () => {
    setLoading(true);
    setFetchError(null);
    getOperatorDashboard()
      .then((res) => {
        const sortedShips = [...(res.my_ships || [])].sort((a, b) => {
          const aTime = (a as any).created_at ? new Date((a as any).created_at).getTime() : 0;
          const bTime = (b as any).created_at ? new Date((b as any).created_at).getTime() : 0;
          if (bTime !== aTime) return bTime - aTime;
          return (Number(b.id) || 0) - (Number(a.id) || 0);
        });
        const sortedTours = [...(res.my_tours || [])].sort((a, b) => {
          const aTime = (a as any).created_at ? new Date((a as any).created_at).getTime() : 0;
          const bTime = (b as any).created_at ? new Date((b as any).created_at).getTime() : 0;
          if (bTime !== aTime) return bTime - aTime;
          return (Number(b.id) || 0) - (Number(a.id) || 0);
        });
        const sortedBookings = [...(res.recent_bookings || [])].sort((a, b) => {
          const aTime = b.created_at ? new Date(b.created_at).getTime() : 0;
          const bTime = a.created_at ? new Date(a.created_at).getTime() : 0;
          if (aTime !== bTime) return aTime - bTime;
          return (Number(b.id) || 0) - (Number(a.id) || 0);
        });
        setData({
          ...res,
          my_ships: sortedShips,
          vessels: sortedShips,
          my_tours: sortedTours,
          recent_bookings: sortedBookings,
        });
        if (sortedShips.length > 0) {
          if (!tourForm.ship_id) {
            setTourForm((prev) => ({ ...prev, ship_id: sortedShips[0].id.toString() }));
          }
          if (!selectedShipIdForTimeline) {
            setSelectedShipIdForTimeline(sortedShips[0].id);
          }
          if (!newExtra.ship_id) {
            setNewExtra((prev) => ({ ...prev, ship_id: sortedShips[0].id.toString() }));
          }
        }
        if (sortedTours.length > 0 && !selectedTourIdForManifest) {
          setSelectedTourIdForManifest(sortedTours[0].id);
        }
      })
      .catch((err) => {
        console.error('Failed to load operator dashboard:', err);
        setFetchError(err?.message || 'Could not fetch operator details');
      })
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
        location: shipForm.location || shipForm.departure_port || 'Goa',
        departure_port: shipForm.departure_port || 'Panaji Jetty',
        destination: shipForm.destination || 'Goa & Arabian Sea',
        route: shipForm.route || `${shipForm.departure_port || 'Mumbai'} - ${shipForm.destination || 'Goa'}`,
        price: shipForm.price ? Number(shipForm.price) : 25000,
        capacity: shipForm.capacity ? Number(shipForm.capacity) : 20,
        ship_length_meters: shipForm.ship_length_meters ? Number(shipForm.ship_length_meters) : 200,
        beam_meters: shipForm.beam_meters ? Number(shipForm.beam_meters) : 28,
        decks_count: shipForm.decks_count ? Number(shipForm.decks_count) : 8,
        cabin_count: shipForm.cabin_count ? Number(shipForm.cabin_count) : 80,
        duration_days: shipForm.duration_days ? Number(shipForm.duration_days) : 3,
        facilities: shipForm.facilities ? shipForm.facilities.split(',').map((f) => f.trim()).filter(Boolean) : ['Wi-Fi', 'Fine Dining', 'Sun Deck'],
      };
      await createOperatorShip(payload as any);
      setShowAddShipModal(false);
      setImagePreview('');
      setShipForm(initialShipForm);
      fetchDashboard();
    } catch (err: any) {
      alert(err.message || 'Failed to register ship');
    }
  };

  const handleOpenAddTourModal = () => {
    const defaultShip = data?.my_ships?.[0];
    const defaultShipId = defaultShip ? defaultShip.id.toString() : '';
    setTourForm({
      ...initialTourForm,
      ship_id: defaultShipId,
      departure_port: defaultShip?.departure_port || defaultShip?.location || 'Mumbai Cruise Terminal',
      destination: defaultShip?.destination || 'Goa (Mormugao)',
      departure_date: '',
      return_date: '',
      duration_days: 1,
      duration_display: '1 Day',
    });
    setShowAddTourModal(true);
  };

  const handleDepartureDateChange = (newDeparture: string) => {
    const dur = calculateTourDuration(newDeparture, tourForm.return_date);
    setTourForm((prev) => ({
      ...prev,
      departure_date: newDeparture,
      duration_days: dur.days,
      duration_display: dur.display,
    }));
  };

  const handleReturnDateChange = (newReturn: string) => {
    const dur = calculateTourDuration(tourForm.departure_date, newReturn);
    setTourForm((prev) => ({
      ...prev,
      return_date: newReturn,
      duration_days: dur.days,
      duration_display: dur.display,
    }));
  };

  const handleAddTourSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (tourForm.departure_date && tourForm.return_date && tourForm.return_date < tourForm.departure_date) {
      alert("Return date cannot be earlier than departure date.");
      return;
    }
    try {
      const dur = calculateTourDuration(tourForm.departure_date, tourForm.return_date);
      const payload = {
        ...tourForm,
        duration_days: dur.days,
        duration_display: dur.display,
      };
      await createOperatorTour(payload);
      setShowAddTourModal(false);
      setTourForm(initialTourForm);
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

  const handleConfirmDeleteShip = async () => {
    if (!shipToDelete) return;
    setDeletingShip(true);
    try {
      await deleteOperatorShip(shipToDelete.id);
      setShipToDelete(null);
      fetchDashboard();
    } catch (err: any) {
      alert(err.message || 'Failed to delete ship');
    } finally {
      setDeletingShip(false);
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
          <p className="text-slate-600 text-sm mb-3">
            {fetchError || 'Could not fetch operator details. Please check your connection or try logging in again.'}
          </p>
          <p className="text-xs text-slate-400 mb-6 bg-slate-50 p-3 rounded-xl border border-slate-100">
            Render backend free tier spins down on inactivity (~45s wake-up time). Ensure you are logged in with valid owner credentials.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={fetchDashboard}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl text-sm transition-colors shadow-sm shadow-amber-500/20"
            >
              Retry
            </button>
            <Link
              to="/login"
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-sm transition-colors"
            >
              Log In
            </Link>
          </div>
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
    <div
      className="min-h-screen pt-28 pb-20 bg-[#f8f9fa] text-[#051833] max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 selection:bg-[#0284c7]/20 selection:text-[#051833]"
      style={{
        backgroundImage:
          'radial-gradient(circle at 85% 15%, rgba(2, 132, 199, 0.07) 0%, transparent 45%), radial-gradient(circle at 15% 85%, rgba(255, 248, 220, 0.55) 0%, transparent 50%)',
      }}
    >
      {/* 1. OPERATOR IDENTITY & FLEET SUMMARY HEADER (OD Studio Luxury Style) */}
      <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-6 sm:p-8 border border-[#0284c7]/20 shadow-xl shadow-[#051833]/5 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-sky-50 text-[#0284c7] text-xs font-bold uppercase tracking-wider mb-2 border border-[#0284c7]/25">
            <Anchor className="w-3.5 h-3.5 text-[#0284c7]" />
            Ship Owner & Operator Operations Suite
          </div>
          <h1 className="text-2xl sm:text-4xl font-black font-serif text-[#051833] tracking-tight">
            Owner's Command Center
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Manage your registered ships, charter bookings, public tour departures, and verified revenue in ₹ INR.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={handleOpenAddShipModal}
            className="px-5 py-2.5 rounded-full bg-[#051833] hover:bg-[#0a2548] text-[#fff8dc] font-black text-xs flex items-center gap-1.5 transition cursor-pointer shadow-md shadow-[#051833]/20"
          >
            <Plus className="w-4 h-4 text-[#fff8dc]" />
            <span>Add Ship</span>
          </button>
          <button
            onClick={() => setShowAddTourModal(true)}
            className="px-5 py-2.5 rounded-full bg-white hover:bg-slate-50 text-[#051833] border border-black/80 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4 text-[#0284c7]" />
            <span>Publish Tour</span>
          </button>
        </div>
      </div>

      {/* 2. SUB-NAVIGATION TABS BAR (Clean White Dock & Deep Navy Pill) */}
      <div className="inline-flex items-center gap-1.5 p-1.5 rounded-full bg-white/90 border border-[#0284c7]/20 shadow-md shadow-[#051833]/5 backdrop-blur-md mb-8 overflow-x-auto text-xs font-bold max-w-full">
        {[
          { id: 'overview', label: 'Fleet Overview & Analytics', icon: BarChart3 },
          { id: 'ships', label: `My Ships (${data?.my_ships?.length || 0})`, icon: Ship },
          { id: 'extras', label: 'Ship Extras', icon: Tag },
          { id: 'availability', label: 'Availability Timeline', icon: Calendar },
          { id: 'requests', label: `Booking Requests (${data?.recent_bookings?.length || 0})`, icon: Clock },
          { id: 'tours', label: `Public Tours (${data?.my_tours?.length || 0})`, icon: Anchor },
          { id: 'passengers', label: 'Tour Passengers', icon: Users },
          { id: 'profile', label: 'Owner Profile', icon: User },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as OperatorTab)}
              className={`px-5 py-2.5 rounded-full transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap text-xs ${
                isActive
                  ? 'bg-[#051833] text-[#fff8dc] shadow-md shadow-[#051833]/25 font-black'
                  : 'text-slate-600 hover:text-[#051833] hover:bg-slate-100 font-bold'
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#082F5B]/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-[#082F5B] text-[#63B8F0] shadow-md flex items-center justify-center">
                <BarChart3 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl sm:text-2xl font-extrabold text-[#102B46] tracking-tight">
                  Fleet Operations & Revenue Analytics
                </h3>
                <p className="text-xs text-[#102B46]/60">
                  Live performance metrics, monthly earnings trajectory, trip split, and ship utilization for your fleet.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#EAF4FB] text-[#082F5B] border border-[#082F5B]/10 text-xs font-bold shadow-sm">
                <ShieldCheck className="w-3.5 h-3.5 text-[#1677C8]" />
                <span>Verified Owner Fleet (85% Payout)</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#EAF4FB] text-[#082F5B] border border-[#082F5B]/10 text-xs font-bold shadow-sm">
                <Activity className="w-3.5 h-3.5 text-[#1677C8]" />
                <span>{analyticsData.status_breakdown.total} Total Bookings</span>
              </span>
            </div>
          </div>

          {/* Top 4 Fleet KPI Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-5 border border-[#0284c7]/20 shadow-sm space-y-1.5 hover:border-[#0284c7]/50 hover:shadow-md transition">
              <span className="text-[10px] uppercase font-bold text-slate-500 block tracking-wider">Gross Fleet Revenue</span>
              <span className="font-mono-numbers text-2xl sm:text-3xl font-black text-[#051833]">{formatINR(stats.total_revenue)}</span>
              <p className="text-[11px] text-[#0284c7] font-bold flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-[#0284c7]" />
                Owner Payout: {formatINR(stats.owner_payout || stats.total_revenue * 0.85)}
              </p>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-[#0284c7]/20 shadow-sm space-y-1.5 hover:border-[#0284c7]/50 hover:shadow-md transition">
              <span className="text-[10px] uppercase font-bold text-slate-500 block tracking-wider">Total Fleet Ships</span>
              <span className="font-mono-numbers text-2xl sm:text-3xl font-black text-[#051833]">{stats.total_ships}</span>
              <p className="text-[11px] text-slate-500 font-medium">
                {stats.active_ships || stats.total_ships} Active in Commission
              </p>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-[#0284c7]/20 shadow-sm space-y-1.5 hover:border-[#0284c7]/50 hover:shadow-md transition">
              <span className="text-[10px] uppercase font-bold text-slate-500 block tracking-wider">Confirmed Bookings</span>
              <span className="font-mono-numbers text-2xl sm:text-3xl font-black text-emerald-600">
                {analyticsData.status_breakdown.confirmed + analyticsData.status_breakdown.completed}
              </span>
              <p className="text-[11px] text-slate-500 font-medium">
                {analyticsData.status_breakdown.completed} Completed • {analyticsData.status_breakdown.confirmed} Upcoming
              </p>
            </div>

            <div
              onClick={() => setActiveTab('requests')}
              className={`rounded-2xl p-5 border shadow-sm space-y-1.5 transition cursor-pointer ${
                (pendingRequests.length || stats.pending_bookings || 0) > 0
                  ? 'bg-white border-amber-300 hover:border-amber-400 hover:shadow-md ring-1 ring-amber-300/40'
                  : 'bg-white border-[#0284c7]/20 hover:border-[#0284c7]/50 hover:shadow-md'
              }`}
              title="Click to view pending booking requests"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-slate-500 block tracking-wider">Pending Bookings</span>
                {(pendingRequests.length || stats.pending_bookings || 0) > 0 && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                    Action Required
                  </span>
                )}
              </div>
              <span className={`font-mono-numbers text-2xl sm:text-3xl font-black ${
                (pendingRequests.length || stats.pending_bookings || 0) > 0 ? 'text-amber-600' : 'text-[#051833]'
              }`}>
                {pendingRequests.length || stats.pending_bookings || 0}
              </span>
              <p className="text-[11px] text-slate-500 font-medium">
                {(pendingRequests.length || stats.pending_bookings || 0) > 0 ? (
                  <span className="text-amber-600 font-bold">
                    {pendingRequests.length || stats.pending_bookings} Pending Actions
                  </span>
                ) : (
                  'All requests up to date'
                )}
              </p>
            </div>
          </div>

          {/* Pending Charter Requests Alert Table (If Any) */}
          {pendingRequests.length > 0 && (
            <div className="bg-[#F8FCFF] rounded-3xl p-6 border border-[#1677C8]/30 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-extrabold text-[#102B46] flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-[#1677C8]" />
                  Urgent: Pending Charter Booking Requests ({pendingRequests.length})
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingRequests.map((req) => (
                  <div key={req.id} className="bg-[#EAF4FB] p-5 rounded-2xl border border-[#082F5B]/10 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#082F5B] bg-[#F8FCFF] px-2.5 py-0.5 rounded-full border border-[#082F5B]/10">
                        #{req.booking_id}
                      </span>
                      <span className="text-sm font-black text-[#102B46]">{formatINR(req.total_price)}</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-[#102B46]">{req.cruise_name}</h4>
                      <p className="text-xs text-[#102B46]/70 mt-0.5">
                        Customer: <strong>{req.customer_name}</strong> ({req.customer_phone || req.customer_email})
                      </p>
                      <p className="text-xs text-[#102B46]/60">
                        Date: {req.booking_date} • Guests: {req.passengers_count || req.number_of_people}
                      </p>
                    </div>
                    <div className="pt-2 border-t border-[#082F5B]/10 flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleAction(req.booking_id, 'confirm')}
                        disabled={actionLoading === `${req.booking_id}-confirm`}
                        className="px-4 py-1.5 rounded-full bg-[#1677C8] hover:bg-[#082F5B] text-[#F8FCFF] font-bold text-xs transition cursor-pointer shadow-sm"
                      >
                        Accept Booking
                      </button>
                      <button
                        onClick={() => handleAction(req.booking_id, 'cancel')}
                        disabled={actionLoading === `${req.booking_id}-cancel`}
                        className="px-4 py-1.5 rounded-full bg-[#F8FCFF] text-rose-600 hover:bg-rose-50 border border-rose-200 font-bold text-xs transition cursor-pointer"
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
          <div className="bg-gradient-to-r from-[#061D36] via-[#082F5B] to-[#1677C8] rounded-3xl p-6 sm:p-8 text-[#F8FCFF] shadow-xl space-y-6 border border-[#63B8F0]/30">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-[#63B8F0] text-xs font-bold uppercase tracking-wider mb-1 border border-white/20">
                  <DollarSign className="w-3.5 h-3.5 text-[#63B8F0]" />
                  Owner Payout & Settlement Breakdown
                </span>
                <h3 className="text-2xl font-extrabold text-[#F8FCFF]">Verified Fleet Revenue Distribution</h3>
                <p className="text-xs text-[#F8FCFF]/80">
                  Direct automated disbursement: 85% to Ship Owner account, 15% platform management & gateway fee.
                </p>
              </div>

              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-[#F8FCFF]/70 block">Total Owner Net Payout</span>
                <span className="text-3xl font-black text-[#63B8F0]">
                  {formatINR(stats.owner_payout || stats.total_revenue * 0.85)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 space-y-1">
                <span className="text-[10px] uppercase font-bold text-[#F8FCFF]/70 block tracking-wider">Gross Customer Paid</span>
                <span className="text-2xl font-black text-white">{formatINR(stats.total_revenue)}</span>
                <p className="text-[10px] text-[#F8FCFF]/60">100% of all confirmed & completed orders</p>
              </div>

              <div className="p-4 rounded-2xl bg-[#63B8F0]/20 backdrop-blur-md border border-[#63B8F0]/40 space-y-1">
                <span className="text-[10px] uppercase font-bold text-[#63B8F0] block tracking-wider">Owner Net Share (85%)</span>
                <span className="text-2xl font-black text-[#F8FCFF]">{formatINR(stats.owner_payout || stats.total_revenue * 0.85)}</span>
                <p className="text-[10px] text-[#F8FCFF]/80">Disbursed directly to your registered bank</p>
              </div>

              <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 space-y-1">
                <span className="text-[10px] uppercase font-bold text-[#F8FCFF]/70 block tracking-wider">Platform Fee (15%)</span>
                <span className="text-2xl font-black text-[#F8FCFF]/80">{formatINR(stats.platform_commission || stats.total_revenue * 0.15)}</span>
                <p className="text-[10px] text-[#F8FCFF]/60">Includes payment gateways & ticketing support</p>
              </div>
            </div>
          </div>

          {/* ROW 1: CHARTS (Monthly Revenue Trend + Category Split) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart 1: Monthly Revenue & Trips Trend (2 cols) */}
            <div className="lg:col-span-2 bg-[#F8FCFF] rounded-3xl p-6 sm:p-7 border border-[#082F5B]/10 shadow-sm space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="font-extrabold text-base text-[#102B46] flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-[#1677C8]" />
                    Monthly Fleet Revenue & Activity Trend
                  </h4>
                  <p className="text-xs text-[#102B46]/60">
                    Gross bookings revenue and net owner payouts across past departures.
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1.5 text-[#102B46] font-semibold">
                    <span className="w-3 h-3 rounded-full bg-[#1677C8] inline-block" />
                    Gross Revenue
                  </span>
                  <span className="flex items-center gap-1.5 text-[#102B46] font-semibold">
                    <span className="w-3 h-3 rounded-full bg-[#082F5B] inline-block" />
                    Owner Payout (85%)
                  </span>
                </div>
              </div>

              {analyticsData.monthly_trend.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-[#102B46]/40 text-xs">
                  No monthly activity recorded yet.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="h-56 flex items-end justify-between gap-3 pt-6 pb-2 border-b border-[#082F5B]/10">
                    {analyticsData.monthly_trend.map((m, idx) => {
                      const revHeight = Math.max(6, Math.round((m.revenue / maxMonthlyRevenue) * 100));
                      const payHeight = Math.max(4, Math.round((m.payout / maxMonthlyRevenue) * 100));
                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group relative">
                          {/* Tooltip on hover */}
                          <div className="absolute -top-16 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 bg-[#061D36] text-[#F8FCFF] p-2 rounded-xl text-[10px] whitespace-nowrap shadow-xl border border-[#63B8F0]/30">
                            <p className="font-bold text-[#63B8F0]">{m.month}: {formatINR(m.revenue)}</p>
                            <p className="text-[#F8FCFF]">Net Payout: {formatINR(m.payout)}</p>
                            <p className="text-[#F8FCFF]/60">{m.bookings_count} bookings</p>
                          </div>

                          {/* Dual Bar pair */}
                          <div className="w-full flex items-end justify-center gap-1 h-full">
                            <div
                              style={{ height: `${revHeight}%` }}
                              className="w-full max-w-[18px] bg-[#1677C8] hover:bg-[#63B8F0] rounded-t-md transition-all duration-300 shadow-sm"
                              title={`Gross: ${formatINR(m.revenue)}`}
                            />
                            <div
                              style={{ height: `${payHeight}%` }}
                              className="w-full max-w-[18px] bg-[#082F5B] hover:bg-[#1677C8] rounded-t-md transition-all duration-300 shadow-sm"
                              title={`Owner Payout: ${formatINR(m.payout)}`}
                            />
                          </div>

                          <span className="text-[11px] font-bold text-[#102B46]/60 truncate mt-1">
                            {m.month}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between text-xs text-[#102B46]/60 px-1">
                    <span>Peak Month: <strong>{analyticsData.monthly_trend.reduce((prev, curr) => curr.revenue > prev.revenue ? curr : prev, analyticsData.monthly_trend[0])?.month || 'N/A'}</strong></span>
                    <span>Max Monthly: <strong>{formatINR(maxMonthlyRevenue)}</strong></span>
                  </div>
                </div>
              )}
            </div>

            {/* Chart 2: Category Split Ratio (1 col) */}
            <div className="bg-[#F8FCFF] rounded-3xl p-6 sm:p-7 border border-[#082F5B]/10 shadow-sm space-y-5 flex flex-col justify-between">
              <div>
                <h4 className="font-extrabold text-base text-[#102B46] flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-[#1677C8]" />
                  Trip Category Ratio
                </h4>
                <p className="text-xs text-[#102B46]/60">
                  Private Charters vs Public Tours breakdown.
                </p>
              </div>

              {/* Progress Split Bar */}
              <div className="space-y-3">
                <div className="w-full h-5 rounded-full bg-[#EAF4FB] overflow-hidden flex shadow-inner">
                  <div
                    style={{ width: `${analyticsData.category_split.private_percent}%` }}
                    className="bg-[#1677C8] hover:bg-[#63B8F0] h-full transition-all duration-500"
                    title={`Private Charters: ${analyticsData.category_split.private_percent}%`}
                  />
                  <div
                    style={{ width: `${analyticsData.category_split.tour_percent}%` }}
                    className="bg-[#082F5B] hover:bg-[#1677C8] h-full transition-all duration-500"
                    title={`Public Tours: ${analyticsData.category_split.tour_percent}%`}
                  />
                </div>

                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-[#1677C8]">{analyticsData.category_split.private_percent}% Private Charters</span>
                  <span className="text-[#082F5B]">{analyticsData.category_split.tour_percent}% Public Tours</span>
                </div>
              </div>

              {/* Breakdown cards */}
              <div className="space-y-2.5">
                <div className="p-3.5 rounded-2xl bg-[#EAF4FB] border border-[#082F5B]/10 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-[#102B46] block">Private Event Charters</span>
                    <span className="text-[11px] text-[#102B46]/60">{analyticsData.category_split.private_count} contracts</span>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-sm text-[#1677C8] block">{formatINR(analyticsData.category_split.private_revenue)}</span>
                    <span className="text-[10px] text-[#102B46]/70 font-bold">Payout: {formatINR(analyticsData.category_split.private_revenue * 0.85)}</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#EAF4FB] border border-[#082F5B]/10 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-[#102B46] block">Scheduled Cruise Tours</span>
                    <span className="text-[11px] text-[#102B46]/60">{analyticsData.category_split.tour_count} bookings</span>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-sm text-[#082F5B] block">{formatINR(analyticsData.category_split.tour_revenue)}</span>
                    <span className="text-[10px] text-[#102B46]/70 font-bold">Payout: {formatINR(analyticsData.category_split.tour_revenue * 0.85)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ROW 2: CHARTS (Reservation Status + Vessel Performance + Top Destinations) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart 3: Reservation Lifecycle Status */}
            <div className="bg-[#F8FCFF] rounded-3xl p-6 sm:p-7 border border-[#082F5B]/10 shadow-sm space-y-4">
              <div>
                <h4 className="font-extrabold text-base text-[#102B46] flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#1677C8]" />
                  Reservation Status Lifecycle
                </h4>
                <p className="text-xs text-[#102B46]/60">
                  Distribution of all customer reservations for your fleet.
                </p>
              </div>

              <div className="space-y-3.5 pt-2">
                {[
                  { label: 'Confirmed (Upcoming)', count: analyticsData.status_breakdown.confirmed, color: 'bg-emerald-500' },
                  { label: 'Completed Trips', count: analyticsData.status_breakdown.completed, color: 'bg-[#1677C8]' },
                  { label: 'Pending Confirmation', count: analyticsData.status_breakdown.pending, color: 'bg-amber-500' },
                  { label: 'Cancelled / Refunded', count: analyticsData.status_breakdown.cancelled, color: 'bg-rose-500' },
                ].map((s, i) => {
                  const total = analyticsData.status_breakdown.total || 1;
                  const pct = Math.round((s.count / total) * 100);
                  return (
                    <div key={i} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-[#102B46] flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${s.color}`} />
                          {s.label}
                        </span>
                        <span className="font-bold text-[#102B46]">
                          {s.count} <span className="text-[11px] font-normal text-[#102B46]/60">({pct}%)</span>
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-[#EAF4FB] overflow-hidden">
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
            <div className="lg:col-span-2 bg-[#F8FCFF] rounded-3xl p-6 sm:p-7 border border-[#082F5B]/10 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-extrabold text-base text-[#102B46] flex items-center gap-2">
                    <Award className="w-4 h-4 text-[#1677C8]" />
                    Fleet Vessel Performance & Utilization
                  </h4>
                  <p className="text-xs text-[#102B46]/60">
                    Revenue generated and bookings completed by individual fleet ships.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('ships')}
                  className="text-xs font-bold text-[#1677C8] hover:text-[#082F5B] cursor-pointer"
                >
                  Manage All Ships →
                </button>
              </div>

              {analyticsData.ship_performance.length === 0 ? (
                <div className="h-44 flex items-center justify-center text-[#102B46]/40 text-xs">
                  No fleet vessels registered yet.
                </div>
              ) : (
                <div className="space-y-3 pt-2">
                  {analyticsData.ship_performance.slice(0, 5).map((ship, idx) => {
                    const revPct = Math.round((ship.revenue / maxShipRevenue) * 100);
                    return (
                      <div key={ship.ship_id} className="p-3.5 rounded-2xl bg-[#EAF4FB] hover:bg-white border border-[#082F5B]/10 transition space-y-2">
                        <div className="flex items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-2.5 truncate">
                            <span className="w-6 h-6 rounded-full bg-[#1677C8] text-[#F8FCFF] font-black text-[11px] flex items-center justify-center shrink-0">
                              #{idx + 1}
                            </span>
                            <div className="truncate">
                              <span className="font-bold text-[#102B46] block truncate">{ship.ship_name}</span>
                              <span className="text-[10px] text-[#102B46]/60 flex items-center gap-1 truncate">
                                <MapPin className="w-3 h-3 text-[#1677C8] shrink-0" />
                                {ship.location} • {ship.category} • {ship.guests} guests hosted
                              </span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="font-black text-[#102B46] text-sm block">{formatINR(ship.revenue)}</span>
                            <span className="text-[10px] text-[#1677C8] font-bold block">
                              Payout: {formatINR(ship.payout)} ({ship.bookings_count} trips)
                            </span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full h-1.5 rounded-full bg-white overflow-hidden">
                          <div
                            style={{ width: `${revPct}%` }}
                            className="h-full rounded-full bg-[#1677C8] transition-all duration-500"
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
            <div className="bg-[#F8FCFF] rounded-3xl p-6 sm:p-7 border border-[#082F5B]/10 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-extrabold text-base text-[#102B46] flex items-center gap-2">
                    <Compass className="w-4 h-4 text-[#1677C8]" />
                    Top Explored Maritime Destinations & Routes
                  </h4>
                  <p className="text-xs text-[#102B46]/60">
                    Most visited sea routes and passenger destinations across your fleet.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 pt-1">
                {analyticsData.top_destinations.map((d, i) => {
                  const pct = Math.round((d.count / maxDestCount) * 100);
                  return (
                    <div key={i} className="p-4 rounded-2xl bg-[#EAF4FB] border border-[#082F5B]/10 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-0.5 rounded-full bg-[#1677C8]/15 text-[#082F5B] text-[10px] font-bold uppercase">
                          Rank #{i + 1}
                        </span>
                        <span className="text-xs font-black text-[#102B46]">{d.count} trips</span>
                      </div>
                      <h5 className="font-bold text-sm text-[#102B46] truncate" title={d.destination}>
                        {d.destination}
                      </h5>
                      <div className="w-full h-1.5 rounded-full bg-white overflow-hidden">
                        <div style={{ width: `${pct}%` }} className="h-full bg-[#1677C8] rounded-full" />
                      </div>
                      <p className="text-[11px] text-[#102B46]/60 font-medium">
                        Revenue: <strong className="text-[#102B46]">{formatINR(d.revenue)}</strong>
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
              <h2 className="text-2xl font-extrabold text-[#102B46] tracking-tight">My Cruise Fleet</h2>
              <p className="text-xs text-[#102B46]/60 mt-0.5">
                Manage ship specifications, pricing rates, deck capabilities, and operational status.
              </p>
            </div>
            <button
              onClick={handleOpenAddShipModal}
              className="px-5 py-2.5 rounded-full bg-[#051833] hover:bg-[#0a2548] text-[#fff8dc] font-black text-xs flex items-center gap-1.5 self-start cursor-pointer shadow-md shadow-[#051833]/20"
            >
              <Plus className="w-4 h-4 text-[#fff8dc]" /> Add New Ship
            </button>
          </div>

          {/* Status Filter Chips (Pill Design matching screenshot) */}
          <div className="flex flex-wrap items-center gap-2.5">
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
                  className={`px-5 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border ${
                    isActive
                      ? 'bg-[#0284c7] text-white border-[#0284c7] shadow-sm shadow-[#0284c7]/25 font-black'
                      : 'bg-white text-[#051833] border-[#0284c7]/25 hover:bg-sky-50/70 hover:border-[#0284c7]/40 shadow-sm'
                  }`}
                >
                  <span>{chip.label}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                      isActive ? 'bg-white/20 text-white' : 'bg-sky-50 text-[#0284c7] border border-[#0284c7]/20'
                    }`}
                  >
                    ({chip.count})
                  </span>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredShips.map((ship) => {
              const opStatus = ship.operational_status || (ship.is_active ? 'AVAILABLE' : 'MAINTENANCE');
              return (
              <div key={ship.id} className="bg-white rounded-3xl border border-[#0284c7]/20 shadow-sm p-6 sm:p-7 space-y-4 hover:border-[#0284c7]/50 hover:shadow-md transition group">
                <div className="flex gap-4 sm:gap-5">
                  <div className="w-28 h-28 rounded-2xl overflow-hidden shrink-0 bg-[#EAF4FB] border border-[#082F5B]/10">
                    <img
                      src={ship.image || (ship as any).image_url || '/static/images/vessels/cordelia_empress.jpg'}
                      alt={ship.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    />
                  </div>
                  <div className="space-y-1 min-w-0">
                    {opStatus === 'AVAILABLE' && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 uppercase inline-flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Available for Charter
                      </span>
                    )}
                    {opStatus === 'BOOKED' && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200 uppercase inline-flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                        Booked / Unavailable
                      </span>
                    )}
                    {opStatus === 'ON_TOUR' && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#EAF4FB] text-[#082F5B] border border-[#082F5B]/15 uppercase inline-flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#1677C8]" />
                        On Tour Departure
                      </span>
                    )}
                    {opStatus === 'MAINTENANCE' && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 uppercase inline-flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        Maintenance / Drydock
                      </span>
                    )}
                    <h3 className="font-extrabold text-lg text-[#102B46] truncate">{ship.name}</h3>
                    <p className="text-xs text-[#102B46]/60">
                      {ship.departure_port} → {ship.destination}
                    </p>
                    <p className="text-sm font-black text-[#102B46] pt-1">
                      {formatINR(ship.price)} <span className="text-[10px] font-normal text-[#102B46]/50">/ {ship.price_unit || 'day base charter'}</span>
                    </p>
                  </div>
                </div>

                {/* Vessel Tech Specs */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs bg-[#EAF4FB] p-3 rounded-2xl border border-[#082F5B]/10">
                  <div>
                    <span className="text-[10px] font-bold text-[#102B46]/60 block uppercase">Capacity</span>
                    <span className="font-bold text-[#102B46]">{ship.capacity} Guests</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-[#102B46]/60 block uppercase">Length / Beam</span>
                    <span className="font-bold text-[#102B46]">{ship.ship_length_meters || 200}m / {ship.beam_meters || 28}m</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-[#102B46]/60 block uppercase">Decks / Cabins</span>
                    <span className="font-bold text-[#102B46]">{ship.decks_count || 8} Decks • {ship.cabin_count || 80}</span>
                  </div>
                </div>

                <div className="pt-2 flex flex-wrap items-center gap-2 justify-end">
                  <button
                    onClick={() => {
                      setSelectedShipIdForTimeline(ship.id);
                      setActiveTab('availability');
                    }}
                    className="px-4 py-1.5 rounded-full bg-[#EAF4FB] hover:bg-[#F8FCFF] border border-[#082F5B]/15 text-xs font-bold text-[#102B46] transition cursor-pointer"
                  >
                    View Availability
                  </button>
                  <button
                    onClick={() => {
                      setNewExtra((prev) => ({ ...prev, ship_id: ship.id.toString() }));
                      setActiveTab('extras');
                    }}
                    className="px-4 py-1.5 rounded-full bg-[#1677C8] hover:bg-[#082F5B] text-white text-xs font-bold transition cursor-pointer shadow-sm"
                  >
                    Configure Extras
                  </button>
                  <button
                    onClick={() => setShipToDelete(ship)}
                    className="px-3.5 py-1.5 rounded-full bg-rose-50 hover:bg-rose-100 border border-rose-200 text-xs font-bold text-rose-700 transition cursor-pointer flex items-center gap-1.5 shadow-sm"
                    title="Delete this ship"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    <span>Delete</span>
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
              <h2 className="text-2xl font-extrabold text-[#102B46] tracking-tight">Ship Add-on Extras</h2>
              <p className="text-xs text-[#102B46]/60 mt-0.5">
                Configure owner-provided add-on services (DJ, Drone Photography, Fine Catering, Decoration) with pricing mode.
              </p>
            </div>
            <button
              onClick={() => setShowAddExtraModal(true)}
              className="px-5 py-2.5 rounded-full bg-[#1677C8] hover:bg-[#082F5B] text-[#F8FCFF] font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md shadow-[#1677C8]/20"
            >
              <Plus className="w-4 h-4" /> Add Extra Service
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {extrasList.map((extra) => (
              <div key={extra.id} className="bg-[#F8FCFF] rounded-3xl border border-[#082F5B]/10 p-6 shadow-sm space-y-3 flex flex-col justify-between hover:border-[#63B8F0] transition">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-[#EAF4FB] text-[#082F5B] border border-[#082F5B]/10 uppercase">
                      {extra.pricing_mode === 'PER_PERSON' ? 'Per Guest' : extra.pricing_mode === 'PER_DAY' ? 'Per Day' : 'Flat Package'}
                    </span>
                    <button
                      onClick={() => handleDeleteExtra(extra.id)}
                      className="text-[#102B46]/40 hover:text-rose-600 transition cursor-pointer p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <h3 className="font-extrabold text-base text-[#102B46] mt-2.5">{extra.name}</h3>
                  <p className="text-xs text-[#102B46]/70 leading-relaxed mt-1">{extra.description || 'Custom boat/cruise service option.'}</p>
                </div>

                <div className="pt-3 border-t border-[#082F5B]/10 flex items-center justify-between">
                  <span className="text-base font-black text-[#102B46]">{formatINR(extra.price)}</span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
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
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 text-[#0284c7] text-xs font-bold uppercase tracking-wider mb-1 border border-[#0284c7]/25">
                <Calendar className="w-3.5 h-3.5" />
                Live Operational Schedule
              </div>
              <h2 className="text-2xl font-extrabold text-[#102B46] tracking-tight">Ship Availability Timeline</h2>
              <p className="text-xs text-[#102B46]/60 mt-0.5">
                30-day chronological operational status derived directly from live database bookings, charter schedules, and 4-hour turnaround maintenance windows.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-[#102B46]/70 font-semibold">Select Ship:</span>
              <select
                value={selectedShipIdForTimeline || ''}
                onChange={(e) => setSelectedShipIdForTimeline(Number(e.target.value))}
                className="px-4 py-2 rounded-full border border-[#082F5B]/15 text-xs font-bold bg-[#F8FCFF] text-[#102B46] focus:outline-none focus:border-[#1677C8] shadow-sm cursor-pointer"
              >
                {(data?.my_ships || []).map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Operational Policy & Legend Banner */}
          <div className="p-4 rounded-2xl bg-white border border-[#082F5B]/10 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2 text-slate-700 font-semibold">
              <span className="text-[11px] uppercase tracking-wider text-slate-500 font-bold">Status Rules:</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-50 border border-sky-200 text-sky-800 text-[11px] font-bold">
                <span className="w-2 h-2 rounded-full bg-sky-500"></span> Public Tour: Whole Day Booked
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-800 text-[11px] font-bold">
                <span className="w-2 h-2 rounded-full bg-[#1677C8]"></span> Private Charter: Booked Time Slot
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-bold">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span> 4-Hour Turnaround Break
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Ready for Booking
              </span>
            </div>
            <div className="text-[11px] text-slate-500 italic">
              * Click any date card to view detailed hour-by-hour operational breakdown.
            </div>
          </div>

          {timelineLoading ? (
            <div className="py-20 text-center">
              <div className="w-10 h-10 mx-auto border-4 border-[#1677C8] border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-3 text-xs font-bold text-slate-500 uppercase tracking-widest">Loading Ship Availability...</p>
            </div>
          ) : (
            <div className="bg-[#F8FCFF] rounded-3xl border border-[#082F5B]/10 p-5 sm:p-7 shadow-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
                {availabilityTimeline.map((item, idx) => {
                  const isAvailable = item.status === 'Available' || item.status_type === 'AVAILABLE';
                  const isPublicTour = item.status === 'Whole Day Booked' || item.status === 'Public Tour' || item.status_type === 'PUBLIC_TOUR';
                  const isCharter = item.status === 'Private Booking' || item.status_type === 'PRIVATE_BOOKING';

                  return (
                    <div
                      key={idx}
                      onClick={() => setSelectedDayDetail(item)}
                      className={`p-3.5 rounded-2xl border text-left transition-all duration-200 cursor-pointer hover:shadow-md relative overflow-hidden flex flex-col justify-between min-h-[145px] group ${
                        isAvailable
                          ? 'bg-emerald-50/70 border-emerald-200/90 hover:border-emerald-400 hover:bg-emerald-50'
                          : isPublicTour
                          ? 'bg-sky-50/70 border-sky-200 hover:border-sky-400 hover:bg-sky-50'
                          : 'bg-indigo-50/60 border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50'
                      }`}
                    >
                      {/* Top Bar: Day Name & Formatted Date */}
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="text-[10px] uppercase font-black tracking-wider text-[#082F5B]/60">
                            {item.day_name}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400 group-hover:text-slate-600 transition">
                            {item.year || item.date.slice(0, 4)}
                          </span>
                        </div>
                        <div className="font-display font-black text-base text-[#082F5B] leading-tight">
                          {item.formatted_date || `${item.day_number || item.date.slice(8)} ${item.month_name || ''}`}
                        </div>
                      </div>

                      {/* Middle & Bottom: Status, Time Slot, and 4h Break */}
                      <div className="mt-2.5 space-y-1.5">
                        {isPublicTour ? (
                          <>
                            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-600 text-white shadow-xs">
                              <Anchor className="w-2.5 h-2.5" /> Whole Day Booked
                            </span>
                            <div className="text-[11px] font-bold text-sky-950 leading-tight truncate" title={item.details?.tour_title || 'Public Tour'}>
                              {item.details?.tour_title || 'Public Cruise Tour'}
                            </div>
                            <div className="text-[9px] font-semibold text-sky-700">
                              All Day Sailing (00:00 - 23:59)
                            </div>
                          </>
                        ) : isCharter ? (
                          <>
                            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#1677C8] text-white shadow-xs">
                              <Clock className="w-2.5 h-2.5" /> Private Booking
                            </span>
                            <div className="text-[10px] font-bold text-indigo-950 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#1677C8] shrink-0"></span>
                              <span className="truncate">Booked: {item.booked_time || 'Charter'}</span>
                            </div>
                            <div className="text-[9px] font-bold text-amber-800 flex items-center gap-1 bg-amber-100/70 px-1.5 py-0.5 rounded border border-amber-300/80">
                              <Clock className="w-2.5 h-2.5 shrink-0 text-amber-700" />
                              <span className="truncate">4h Break: {item.break_time}</span>
                            </div>
                            <div className="text-[9px] font-black text-emerald-800 flex items-center gap-1 pt-0.5">
                              <CheckCircle2 className="w-2.5 h-2.5 shrink-0 text-emerald-600" />
                              <span className="truncate">{item.ready_time}</span>
                            </div>
                          </>
                        ) : (
                          <>
                            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-600 text-white shadow-xs">
                              <CheckCircle2 className="w-2.5 h-2.5" /> Available
                            </span>
                            <div className="text-[10px] font-bold text-emerald-900 flex items-center gap-1">
                              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                              <span>Ready for Booking</span>
                            </div>
                            <div className="text-[9px] font-semibold text-emerald-700">
                              All Day Open (24 Hours)
                            </div>
                          </>
                        )}
                      </div>
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
              <span className="text-[11px] font-black tracking-widest uppercase text-[#1677C8] block mb-1">
                Charter Bookings & Logistics
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-[#102B46] font-heading tracking-tight">Private Charter Reservations</h2>
              <p className="text-xs text-[#102B46]/65 mt-1 font-medium">
                Review passenger requests, approve charter slots, track trip departures, and inspect GST tax invoices.
              </p>
            </div>
          </div>

          {/* Status Filter Chips (Pill Design matching screenshot) */}
          <div className="flex flex-wrap items-center gap-2.5">
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
                  className={`px-5 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border ${
                    isActive
                      ? 'bg-[#0284c7] text-white border-[#0284c7] shadow-sm shadow-[#0284c7]/25 font-black'
                      : 'bg-white text-[#051833] border-[#0284c7]/25 hover:bg-sky-50/70 hover:border-[#0284c7]/40 shadow-sm'
                  }`}
                >
                  <span>{chip.label}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                    isActive ? 'bg-white/20 text-white' : 'bg-sky-50 text-[#0284c7] border border-[#0284c7]/20'
                  }`}>
                    ({chip.count})
                  </span>
                </button>
              );
            })}
          </div>

          <div className="space-y-4">
            {filteredBookings.length === 0 ? (
              <div className="bg-[#F8FCFF] rounded-3xl border border-[#082F5B]/10 p-12 text-center text-[#102B46]/60 shadow-[0_4px_20px_rgba(8,47,91,0.03)]">
                <Clock className="w-12 h-12 text-[#1677C8]/40 mx-auto mb-3" />
                <p className="font-bold text-[#102B46] text-base">No reservations found</p>
                <p className="text-xs text-[#102B46]/60 mt-1 font-medium">There are no bookings matching the selected status filter.</p>
              </div>
            ) : (
              filteredBookings.map((b) => (
              <div
                key={b.id}
                className="bg-[#F8FCFF] rounded-3xl border border-[#082F5B]/10 shadow-[0_4px_20px_rgba(8,47,91,0.04)] hover:shadow-[0_12px_30px_rgba(8,47,91,0.08)] transition-all p-6 sm:p-7 flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
              >
                <div className="space-y-2 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-black font-mono text-[#082F5B] bg-[#EAF4FB] px-2.5 py-0.5 rounded-full border border-[#082F5B]/10">
                      #{b.booking_id}
                    </span>
                    <span
                      className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                        b.status === 'CONFIRMED'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : b.status === 'PENDING'
                          ? 'bg-amber-100 text-amber-900 border border-amber-200'
                          : b.status === 'COMPLETED'
                          ? 'bg-[#EAF4FB] text-[#1677C8] border border-[#63B8F0]/30'
                          : 'bg-rose-100 text-rose-800 border border-rose-200'
                      }`}
                    >
                      {b.status}
                    </span>
                    <span className="text-[10px] font-bold text-[#1677C8] bg-[#EAF4FB] px-2.5 py-0.5 rounded-full uppercase border border-[#1677C8]/20">
                      {b.booking_type === 'EVENT' ? 'Private Event Charter' : 'Public Tour Ticket'}
                    </span>
                  </div>

                  <h3 className="font-black text-xl text-[#102B46] font-heading tracking-tight">{b.cruise_name}</h3>
                  <p className="text-xs text-[#102B46]/75 font-medium">
                    Passenger: <strong className="text-[#102B46] font-bold">{b.customer_name}</strong> • Contact: {b.customer_email} {b.customer_phone ? `(${b.customer_phone})` : ''}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-[#102B46]/65 font-medium pt-0.5">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-[#1677C8]" />
                      Trip Date: <strong className="text-[#102B46]">{b.booking_date}</strong>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-[#1677C8]" />
                      Guests: <strong className="text-[#102B46]">{b.passengers_count || b.number_of_people}</strong>
                    </span>
                    <span>•</span>
                    <span>Cabin: <strong className="text-[#102B46]">{b.cabin_name || b.cabin_type || 'Private Charter'}</strong></span>
                  </div>
                </div>

                <div className="flex flex-col items-start md:items-end gap-3.5 shrink-0 w-full md:w-auto pt-3 md:pt-0 border-t md:border-t-0 border-[#082F5B]/10">
                  <span className="text-2xl font-black text-[#102B46] font-heading tracking-tight">{formatINR(b.total_price)}</span>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => setSelectedInvoiceId(b.booking_id)}
                      className="px-3.5 py-1.5 rounded-full border border-[#082F5B]/20 text-xs font-bold text-[#082F5B] hover:bg-[#EAF4FB] transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Receipt className="w-3.5 h-3.5 text-[#1677C8]" />
                      Invoice
                    </button>

                    {b.status === 'PENDING' && (
                      <>
                        <button
                          onClick={() => handleAction(b.booking_id, 'confirm')}
                          disabled={actionLoading === `${b.booking_id}-confirm`}
                          className="px-4 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all cursor-pointer shadow-sm hover:shadow"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleAction(b.booking_id, 'cancel')}
                          disabled={actionLoading === `${b.booking_id}-cancel`}
                          className="px-3.5 py-1.5 rounded-full bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 font-bold text-xs transition-all cursor-pointer"
                        >
                          Reject
                        </button>
                      </>
                    )}

                    {b.status === 'CONFIRMED' && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          onClick={() => handleAction(b.booking_id, 'board')}
                          disabled={actionLoading === `${b.booking_id}-board`}
                          className="px-3 py-1 rounded-full bg-[#EAF4FB] text-[#082F5B] hover:bg-[#1677C8] hover:text-white border border-[#082F5B]/10 font-bold text-[11px] transition-all cursor-pointer"
                        >
                          Boarding
                        </button>
                        <button
                          onClick={() => handleAction(b.booking_id, 'depart')}
                          disabled={actionLoading === `${b.booking_id}-depart`}
                          className="px-3 py-1 rounded-full bg-[#EAF4FB] text-[#1677C8] hover:bg-[#1677C8] hover:text-white border border-[#1677C8]/20 font-bold text-[11px] transition-all cursor-pointer"
                        >
                          Depart
                        </button>
                        <button
                          onClick={() => handleAction(b.booking_id, 'arrive')}
                          disabled={actionLoading === `${b.booking_id}-arrive`}
                          className="px-3 py-1 rounded-full bg-[#EAF4FB] text-[#082F5B] hover:bg-[#082F5B] hover:text-white border border-[#082F5B]/10 font-bold text-[11px] transition-all cursor-pointer"
                        >
                          Arrive
                        </button>
                        <button
                          onClick={() => handleAction(b.booking_id, 'complete')}
                          disabled={actionLoading === `${b.booking_id}-complete`}
                          className="px-3.5 py-1 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition-all cursor-pointer shadow-sm"
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
              <span className="text-[11px] font-black tracking-widest uppercase text-[#1677C8] block mb-1">
                Scheduled Departures
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-[#102B46] font-heading tracking-tight">Public Cruise Tours</h2>
              <p className="text-xs text-[#102B46]/65 mt-1 font-medium">
                Multi-passenger scheduled coastal departures with real-time seat and cabin inventory management.
              </p>
            </div>
            <button
              onClick={handleOpenAddTourModal}
              className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-[#1677C8] hover:bg-[#082F5B] text-white font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Publish New Tour
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {data?.my_tours?.map((tour) => (
              <div key={tour.id} className="bg-[#F8FCFF] rounded-3xl border border-[#082F5B]/10 shadow-[0_4px_20px_rgba(8,47,91,0.04)] hover:shadow-[0_12px_30px_rgba(8,47,91,0.08)] transition-all p-6 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="px-3 py-1 rounded-full bg-[#EAF4FB] text-[#082F5B] border border-[#082F5B]/15 text-[10px] font-black uppercase tracking-wider">
                    {tour.ship_name}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-black uppercase tracking-wider">
                    {tour.remaining_capacity} Seats Remaining
                  </span>
                </div>

                <div>
                  <h3 className="text-xl font-black text-[#102B46] font-heading tracking-tight">{tour.tour_title}</h3>
                  <p className="text-xs text-[#102B46]/70 mt-1 font-medium">
                    {tour.departure_port} → {tour.destination} ({tour.departure_date})
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs bg-[#EAF4FB]/60 p-3.5 rounded-2xl border border-[#082F5B]/10">
                  <div>
                    <span className="text-[10px] font-black text-[#102B46]/50 block uppercase tracking-wider">Duration</span>
                    <span className="font-black text-[#102B46] mt-0.5 block">{tour.duration_display || `${tour.duration_days} Days`}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-[#102B46]/50 block uppercase tracking-wider">Adult Rate</span>
                    <span className="font-black text-[#1677C8] mt-0.5 block">{formatINR(tour.adult_price)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-[#102B46]/50 block uppercase tracking-wider">Booked / Total</span>
                    <span className="font-black text-[#102B46] mt-0.5 block">{tour.booked_capacity} / {tour.total_capacity}</span>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => {
                      setSelectedTourIdForManifest(tour.id);
                      setActiveTab('passengers');
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#082F5B] hover:bg-[#1677C8] text-white text-xs font-bold transition-all cursor-pointer shadow-sm"
                  >
                    <Users className="w-3.5 h-3.5" />
                    View Passenger List
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
              <span className="text-[11px] font-black tracking-widest uppercase text-[#1677C8] block mb-1">
                Security & Boarding Protocol
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-[#102B46] font-heading tracking-tight">Tour Passenger List</h2>
              <p className="text-xs text-[#102B46]/65 mt-1 font-medium">
                Authorized passenger list and verified ticket reservations for your scheduled cruise departures.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <span className="text-xs text-[#102B46]/70 font-bold">Select Tour:</span>
              <select
                value={selectedTourIdForManifest || ''}
                onChange={(e) => setSelectedTourIdForManifest(Number(e.target.value))}
                className="px-4 py-2 rounded-xl border border-[#082F5B]/20 text-xs font-bold bg-[#F8FCFF] text-[#102B46] focus:border-[#1677C8] focus:outline-none"
              >
                {data?.my_tours?.map((t) => (
                  <option key={t.id} value={t.id}>{t.tour_title}</option>
                ))}
              </select>
            </div>
          </div>

          {manifestLoading ? (
            <div className="py-20 text-center">
              <div className="w-10 h-10 mx-auto border-4 border-[#1677C8] border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : !manifestData || manifestData.passengers.length === 0 ? (
            <div className="py-20 text-center bg-[#F8FCFF] rounded-3xl border border-[#082F5B]/10 p-8 shadow-[0_4px_20px_rgba(8,47,91,0.03)]">
              <Users className="w-12 h-12 mx-auto text-[#1677C8]/40" />
              <h3 className="text-base font-bold text-[#102B46] mt-2">No Passengers Booked Yet</h3>
              <p className="text-xs text-[#102B46]/60 mt-1 font-medium">Passenger reservations will appear here as customers book tickets for this departure.</p>
            </div>
          ) : (
            <div className="bg-[#F8FCFF] rounded-3xl border border-[#082F5B]/10 shadow-[0_4px_20px_rgba(8,47,91,0.04)] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#EAF4FB] border-b border-[#082F5B]/10 text-[#102B46] font-black uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3.5 px-5">Ticket Ref</th>
                      <th className="py-3.5 px-5">Passenger Name</th>
                      <th className="py-3.5 px-5">Contact</th>
                      <th className="py-3.5 px-5">Cabin / Class</th>
                      <th className="py-3.5 px-5">Party Size</th>
                      <th className="py-3.5 px-5">Status</th>
                      <th className="py-3.5 px-5 text-right">Fare (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#082F5B]/5">
                    {manifestData.passengers.map((p: any) => (
                      <tr key={p.booking_id} className="hover:bg-[#EAF4FB]/50 transition-colors">
                        <td className="py-4 px-5 font-mono font-bold text-[#1677C8]">#{p.booking_id}</td>
                        <td className="py-4 px-5 font-bold text-[#102B46]">{p.passenger_name}</td>
                        <td className="py-4 px-5 text-[#102B46]/70">{p.email}</td>
                        <td className="py-4 px-5 text-[#102B46] font-medium">{p.cabin_type}</td>
                        <td className="py-4 px-5 font-bold text-[#102B46]">{p.adults_count} Adults, {p.children_count} Children</td>
                        <td className="py-4 px-5">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 uppercase border border-emerald-200">
                            {p.status}
                          </span>
                        </td>
                        <td className="py-4 px-5 text-right font-black text-sm text-[#102B46]">
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

      {/* 8. SHIP OWNER / OPERATOR PROFILE TAB */}
      {activeTab === 'profile' && (
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-[#0284c7]/20 shadow-xl shadow-[#051833]/5 max-w-4xl mx-auto space-y-6 animate-in fade-in duration-200">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-50 text-[#0284c7] text-xs font-bold uppercase tracking-wider mb-2 border border-[#0284c7]/20">
              <ShieldCheck className="w-3.5 h-3.5 text-[#0284c7]" />
              Verified Fleet Partner
            </div>
            <h2 className="text-2xl sm:text-3xl font-black font-serif text-[#051833] tracking-tight">
              Ship Owner Profile & Business Details
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
              Update your operator contact details, representative name, registered office address, and security credentials.
            </p>
          </div>

          {/* Account Meta Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-gradient-to-r from-sky-50/70 to-slate-50 border border-[#0284c7]/15 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white border border-[#0284c7]/20 flex items-center justify-center font-black text-[#0284c7] shadow-xs">
                @
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Operator Username</span>
                <span className="font-bold text-[#051833] font-mono">{user?.username || 'owner'}</span>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white border border-[#0284c7]/20 flex items-center justify-center text-emerald-600 shadow-xs">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Partner Status</span>
                <span className="font-bold text-emerald-700">Verified & Approved</span>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white border border-[#0284c7]/20 flex items-center justify-center text-[#0284c7] shadow-xs">
                <Ship className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Active Fleet</span>
                <span className="font-bold text-[#051833]">{data?.my_ships?.length || 0} Ships Registered</span>
              </div>
            </div>
          </div>

          {/* Feedback Message Banner */}
          {profileMsg && (
            <div
              className={`p-4 rounded-2xl text-xs font-bold border flex items-center gap-2.5 ${
                profileMsg.isError
                  ? 'bg-red-50 text-red-700 border-red-200'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
              }`}
            >
              {profileMsg.isError ? (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              )}
              <span>{profileMsg.text}</span>
            </div>
          )}

          {/* Profile Form */}
          <form onSubmit={handleSaveProfile} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[#051833]/80 block mb-1.5">
                  First Name / Representative Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Paresh"
                  value={profileFirstName}
                  onChange={(e) => setProfileFirstName(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-white border border-slate-200 text-sm text-[#051833] focus:outline-none focus:border-[#0284c7] focus:ring-2 focus:ring-[#0284c7]/15 transition font-medium"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[#051833]/80 block mb-1.5">
                  Last Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Prajapati"
                  value={profileLastName}
                  onChange={(e) => setProfileLastName(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-white border border-slate-200 text-sm text-[#051833] focus:outline-none focus:border-[#0284c7] focus:ring-2 focus:ring-[#0284c7]/15 transition font-medium"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-[#051833]/80 block mb-1.5">
                Business / Operator Email Address
              </label>
              <input
                type="email"
                required
                placeholder="operator@crosshunt.com"
                value={profileEmail}
                onChange={(e) => setProfileEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-white border border-slate-200 text-sm text-[#051833] focus:outline-none focus:border-[#0284c7] focus:ring-2 focus:ring-[#0284c7]/15 transition font-medium"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-[#051833]/80 block mb-1.5">
                Contact / WhatsApp Phone Number
              </label>
              <input
                type="text"
                placeholder="+91 98765 43210"
                value={profilePhone}
                onChange={(e) => setProfilePhone(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-white border border-slate-200 text-sm text-[#051833] focus:outline-none focus:border-[#0284c7] focus:ring-2 focus:ring-[#0284c7]/15 transition font-medium"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-[#051833]/80 block mb-1.5">
                Billing / Registered Business Address
              </label>
              <textarea
                rows={3}
                placeholder="Marine Drive, Port Office, City, State, PIN Code"
                value={profileAddress}
                onChange={(e) => setProfileAddress(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-white border border-slate-200 text-sm text-[#051833] focus:outline-none focus:border-[#0284c7] focus:ring-2 focus:ring-[#0284c7]/15 transition font-medium"
              />
            </div>

            <div className="pt-3 border-t border-slate-200/80">
              <label className="text-xs font-bold uppercase tracking-wider text-[#051833]/80 block mb-1.5">
                Change Password (Leave blank to keep current)
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={profilePassword}
                onChange={(e) => setProfilePassword(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-white border border-slate-200 text-sm text-[#051833] focus:outline-none focus:border-[#0284c7] focus:ring-2 focus:ring-[#0284c7]/15 transition font-medium"
              />
            </div>

            <div className="pt-2 flex items-center gap-3">
              <button
                type="submit"
                disabled={profileSaving}
                className="px-8 py-3.5 rounded-full bg-[#051833] hover:bg-[#0a2548] text-white font-bold text-xs flex items-center gap-2 transition cursor-pointer shadow-md shadow-[#051833]/20 disabled:opacity-50"
              >
                {profileSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  <span>Save Profile Changes</span>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ADD SHIP MODAL */}
      {showAddShipModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#061D36]/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#F8FCFF] rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-[#082F5B]/15 overflow-hidden">
            <div className="bg-gradient-to-r from-[#061D36] to-[#082F5B] p-6 sm:p-7 flex items-center justify-between text-white">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-[#63B8F0] block mb-1">
                  Fleet Registry
                </span>
                <h3 className="font-heading font-black text-xl text-white">Register New Ship in Fleet</h3>
                <p className="text-xs text-white/70 mt-0.5">Configure naval specs, passenger capacity, and base INR charter pricing.</p>
              </div>
              <button
                onClick={() => setShowAddShipModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddShipSubmit} className="p-6 sm:p-7 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase text-[#102B46] block mb-1">Ship Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. MV Royal Arabian"
                    value={shipForm.name}
                    onChange={(e) => setShipForm({ ...shipForm, name: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-[#082F5B]/20 text-sm bg-white text-[#102B46] focus:outline-none focus:border-[#1677C8] focus:ring-2 focus:ring-[#1677C8]/20"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-[#102B46] block mb-1">Ship Category</label>
                  <select
                    value={shipForm.category}
                    onChange={(e) => setShipForm({ ...shipForm, category: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-[#082F5B]/20 text-sm bg-white text-[#102B46] focus:outline-none focus:border-[#1677C8]"
                  >
                    <option value="Luxury Ocean Cruise">Luxury Ocean Cruise</option>
                    <option value="Superyacht">Superyacht</option>
                    <option value="Catamaran Cruiser">Catamaran Cruiser</option>
                    <option value="Expedition Vessel">Expedition Vessel</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase text-[#102B46] block mb-1">Home Port</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mumbai Cruise Terminal"
                    value={shipForm.departure_port}
                    onChange={(e) => setShipForm({ ...shipForm, departure_port: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-[#082F5B]/20 text-sm bg-white text-[#102B46] focus:outline-none focus:border-[#1677C8]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-[#102B46] block mb-1">Destination Region</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Goa & Arabian Sea"
                    value={shipForm.destination}
                    onChange={(e) => setShipForm({ ...shipForm, destination: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-[#082F5B]/20 text-sm bg-white text-[#102B46] focus:outline-none focus:border-[#1677C8]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase text-[#102B46] block mb-1">Price (₹/day)</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 75000"
                    value={shipForm.price ?? ''}
                    onChange={(e) => setShipForm({ ...shipForm, price: e.target.value === '' ? ('' as any) : Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-[#082F5B]/20 text-sm bg-white text-[#102B46] focus:outline-none focus:border-[#1677C8]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-[#102B46] block mb-1">Capacity</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 150"
                    value={shipForm.capacity ?? ''}
                    onChange={(e) => setShipForm({ ...shipForm, capacity: e.target.value === '' ? ('' as any) : Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-[#082F5B]/20 text-sm bg-white text-[#102B46] focus:outline-none focus:border-[#1677C8]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-[#102B46] block mb-1">Length (m)</label>
                  <input
                    type="number"
                    placeholder="e.g. 220"
                    value={shipForm.ship_length_meters ?? ''}
                    onChange={(e) => setShipForm({ ...shipForm, ship_length_meters: e.target.value === '' ? ('' as any) : Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-[#082F5B]/20 text-sm bg-white text-[#102B46] focus:outline-none focus:border-[#1677C8]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-[#102B46] block mb-1">Decks</label>
                  <input
                    type="number"
                    placeholder="e.g. 8"
                    value={shipForm.decks_count ?? ''}
                    onChange={(e) => setShipForm({ ...shipForm, decks_count: e.target.value === '' ? ('' as any) : Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-[#082F5B]/20 text-sm bg-white text-[#102B46] focus:outline-none focus:border-[#1677C8]"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold uppercase text-[#102B46] block">
                    Ship Photo
                  </label>
                  <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setImageUploadMode('upload')}
                      className={`px-3 py-1 text-xs font-bold rounded-md flex items-center gap-1.5 transition-all cursor-pointer ${
                        imageUploadMode === 'upload'
                          ? 'bg-white text-[#1677C8] shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Local Upload
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageUploadMode('url')}
                      className={`px-3 py-1 text-xs font-bold rounded-md flex items-center gap-1.5 transition-all cursor-pointer ${
                        imageUploadMode === 'url'
                          ? 'bg-white text-[#1677C8] shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <LinkIcon className="w-3.5 h-3.5" />
                      Image URL
                    </button>
                  </div>
                </div>

                {imageUploadMode === 'upload' ? (
                  <div className="space-y-3">
                    <label className="flex flex-col items-center justify-center border-2 border-dashed border-[#1677C8]/40 hover:border-[#1677C8] bg-sky-50/40 hover:bg-sky-50/70 transition-all rounded-2xl p-4 cursor-pointer text-center relative group">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageFileChange}
                        className="hidden"
                      />
                      {uploadingImage ? (
                        <div className="flex flex-col items-center py-3">
                          <Loader2 className="w-8 h-8 text-[#1677C8] animate-spin mb-2" />
                          <span className="text-xs font-bold text-[#102B46]">Uploading local photo...</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center py-2">
                          <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-[#1677C8] mb-2 group-hover:scale-110 transition-transform">
                            <Upload className="w-5 h-5" />
                          </div>
                          <span className="text-xs font-bold text-[#102B46]">
                            Click to browse image from computer
                          </span>
                          <span className="text-[11px] text-slate-500 mt-0.5">
                            PNG, JPG, JPEG, WEBP (Max 15MB)
                          </span>
                        </div>
                      )}
                    </label>

                    {(imagePreview || shipForm.image_url) && (
                      <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                        <img
                          src={imagePreview || shipForm.image_url}
                          alt="Ship Preview"
                          className="w-16 h-12 object-cover rounded-lg border border-slate-300 shadow-sm"
                          onError={(e) => {
                            e.currentTarget.src = '/static/images/placeholder.png';
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-bold text-slate-800 block truncate">
                            {uploadingImage ? 'Uploading...' : 'Selected photo ready'}
                          </span>
                          <span className="text-[11px] text-slate-500 block truncate">
                            {shipForm.image_url || 'Local file'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setImagePreview('');
                            setShipForm((prev) => ({ ...prev, image_url: '' }));
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                          title="Remove photo"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <input
                      type="url"
                      placeholder="https://images.unsplash.com/photo-xxx..."
                      value={shipForm.image_url}
                      onChange={(e) => {
                        setShipForm({ ...shipForm, image_url: e.target.value });
                        setImagePreview(e.target.value);
                      }}
                      className="w-full px-4 py-2.5 rounded-xl border border-[#082F5B]/20 text-sm bg-white text-[#102B46] focus:outline-none focus:border-[#1677C8]"
                    />
                    {shipForm.image_url && (
                      <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                        <img
                          src={shipForm.image_url}
                          alt="Ship Preview"
                          className="w-16 h-12 object-cover rounded-lg border border-slate-300 shadow-sm"
                          onError={(e) => {
                            e.currentTarget.src = '/static/images/placeholder.png';
                          }}
                        />
                        <span className="text-xs font-medium text-slate-600 truncate flex-1">
                          {shipForm.image_url}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#082F5B]/10">
                <button
                  type="button"
                  onClick={() => setShowAddShipModal(false)}
                  className="px-5 py-2.5 rounded-full text-xs font-bold text-[#102B46]/70 hover:bg-[#EAF4FB] transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-full bg-[#1677C8] hover:bg-[#082F5B] text-white font-bold text-xs shadow-md transition-all cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#061D36]/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#F8FCFF] rounded-3xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-[#082F5B]/15 overflow-hidden">
            <div className="bg-gradient-to-r from-[#061D36] to-[#082F5B] p-6 flex items-center justify-between text-white">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-[#63B8F0] block mb-1">
                  Tour Departure Creator
                </span>
                <h3 className="font-heading font-black text-xl text-white">Publish Public Scheduled Tour</h3>
                <p className="text-xs text-white/70 mt-0.5">Sell passenger tickets and cabins on a scheduled departure.</p>
              </div>
              <button
                onClick={() => setShowAddTourModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddTourSubmit} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold uppercase text-[#102B46] block mb-1">Select Ship</label>
                <select
                  required
                  value={tourForm.ship_id}
                  onChange={(e) => setTourForm({ ...tourForm, ship_id: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#082F5B]/20 text-sm bg-white text-[#102B46] focus:outline-none focus:border-[#1677C8]"
                >
                  {(data?.my_ships || []).map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.location})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-[#102B46] block mb-1">Tour Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mumbai to Goa Coastal Carnival Cruise"
                  value={tourForm.tour_title}
                  onChange={(e) => setTourForm({ ...tourForm, tour_title: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#082F5B]/20 text-sm bg-white text-[#102B46] focus:outline-none focus:border-[#1677C8]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase text-[#102B46] block mb-1">Departure Date</label>
                  <input
                    type="date"
                    required
                    value={tourForm.departure_date}
                    onChange={(e) => handleDepartureDateChange(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-[#082F5B]/20 text-sm bg-white text-[#102B46] focus:outline-none focus:border-[#1677C8]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-[#102B46] block mb-1">Return Date</label>
                  <input
                    type="date"
                    required
                    value={tourForm.return_date}
                    onChange={(e) => handleReturnDateChange(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-[#082F5B]/20 text-sm bg-white text-[#102B46] focus:outline-none focus:border-[#1677C8]"
                  />
                </div>
              </div>

              {tourForm.departure_date && tourForm.return_date && (
                <div className={`flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                  tourForm.return_date < tourForm.departure_date
                    ? 'bg-red-50 text-red-700 border-red-200'
                    : 'bg-[#EAF4FB] text-[#082F5B] border-[#1677C8]/25'
                }`}>
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#1677C8]" />
                    {tourForm.return_date < tourForm.departure_date
                      ? 'Invalid: Return date is before departure date'
                      : 'Calculated Tour Duration:'}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-white font-black text-[#1677C8] border border-[#1677C8]/20 shadow-xs">
                    {tourForm.duration_display} ({tourForm.duration_days} {tourForm.duration_days === 1 ? 'day' : 'days'})
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase text-[#102B46] block mb-1">Adult Fare (₹/person, min ₹2,000)</label>
                  <input
                    type="number"
                    min="2000"
                    required
                    value={tourForm.adult_price}
                    onChange={(e) => setTourForm({ ...tourForm, adult_price: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 rounded-xl border border-[#082F5B]/20 text-sm bg-white text-[#102B46] focus:outline-none focus:border-[#1677C8]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-[#102B46] block mb-1">Total Seat Capacity</label>
                  <input
                    type="number"
                    required
                    value={tourForm.total_capacity}
                    onChange={(e) => setTourForm({ ...tourForm, total_capacity: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 rounded-xl border border-[#082F5B]/20 text-sm bg-white text-[#102B46] focus:outline-none focus:border-[#1677C8]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#082F5B]/10">
                <button
                  type="button"
                  onClick={() => setShowAddTourModal(false)}
                  className="px-5 py-2.5 rounded-full text-xs font-bold text-[#102B46]/70 hover:bg-[#EAF4FB] transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-full bg-[#1677C8] hover:bg-[#082F5B] text-white font-bold text-xs shadow-md transition-all cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#061D36]/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#F8FCFF] rounded-3xl max-w-md w-full shadow-2xl border border-[#082F5B]/15 overflow-hidden">
            <div className="bg-gradient-to-r from-[#061D36] to-[#082F5B] p-6 flex items-center justify-between text-white">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-[#63B8F0] block mb-0.5">
                  Ancillary Catalog
                </span>
                <h3 className="font-heading font-black text-lg text-white">Add Ship Extra Service</h3>
              </div>
              <button
                onClick={() => setShowAddExtraModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateExtraSubmit} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold uppercase text-[#102B46] block mb-1">Assigned Ship</label>
                <select
                  required
                  value={newExtra.ship_id}
                  onChange={(e) => setNewExtra({ ...newExtra, ship_id: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#082F5B]/20 text-sm bg-white text-[#102B46] focus:outline-none focus:border-[#1677C8]"
                >
                  {(data?.my_ships || []).map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-[#102B46] block mb-1">Extra Service Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Drone Videography & Saxophone Solo"
                  value={newExtra.name}
                  onChange={(e) => setNewExtra({ ...newExtra, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#082F5B]/20 text-sm bg-white text-[#102B46] focus:outline-none focus:border-[#1677C8]"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-[#102B46] block mb-1">Description</label>
                <textarea
                  rows={2}
                  value={newExtra.description}
                  onChange={(e) => setNewExtra({ ...newExtra, description: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-[#082F5B]/20 text-sm bg-white text-[#102B46] focus:outline-none focus:border-[#1677C8]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase text-[#102B46] block mb-1">Rate in INR (₹)</label>
                  <input
                    type="number"
                    required
                    value={newExtra.price}
                    onChange={(e) => setNewExtra({ ...newExtra, price: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-[#082F5B]/20 text-sm bg-white text-[#102B46] focus:outline-none focus:border-[#1677C8]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-[#102B46] block mb-1">Pricing Mode</label>
                  <select
                    value={newExtra.pricing_mode}
                    onChange={(e) => setNewExtra({ ...newExtra, pricing_mode: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#082F5B]/20 text-sm bg-white text-[#102B46] focus:outline-none focus:border-[#1677C8]"
                  >
                    <option value="FLAT">Flat Fee</option>
                    <option value="PER_PERSON">Per Person</option>
                    <option value="PER_DAY">Per Day</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#082F5B]/10">
                <button
                  type="button"
                  onClick={() => setShowAddExtraModal(false)}
                  className="px-4 py-2 text-xs font-bold text-[#102B46]/70 hover:bg-[#EAF4FB] rounded-full transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#1677C8] hover:bg-[#082F5B] text-white font-bold text-xs rounded-full shadow-md transition-all cursor-pointer"
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

      {/* DELETE SHIP CONFIRMATION MODAL */}
      {shipToDelete && (
        <div className="fixed inset-0 z-50 bg-[#051833]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl border border-rose-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 bg-gradient-to-r from-rose-50 to-orange-50 border-b border-rose-100 flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-200 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6 text-rose-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-extrabold text-lg text-slate-900">Delete Ship</h3>
                <p className="text-xs text-slate-500 mt-0.5">This action cannot be undone.</p>
              </div>
              <button
                onClick={() => !deletingShip && setShipToDelete(null)}
                disabled={deletingShip}
                className="w-8 h-8 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center text-slate-500 transition-all cursor-pointer disabled:opacity-40"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                <img
                  src={shipToDelete.image || (shipToDelete as any).image_url || '/static/images/vessels/cordelia_empress.jpg'}
                  alt={shipToDelete.name}
                  className="w-14 h-14 rounded-xl object-cover border border-slate-200 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-sm text-slate-900 truncate">{shipToDelete.name}</h4>
                  <p className="text-xs text-slate-500 truncate">{shipToDelete.departure_port} → {shipToDelete.destination}</p>
                  <p className="text-[11px] font-bold text-slate-600 mt-0.5">{shipToDelete.capacity} Guests • {formatINR(shipToDelete.price)}</p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-rose-50/60 border border-rose-200/60 text-xs text-rose-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-rose-700">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Important Notice</span>
                </div>
                <p className="leading-relaxed">
                  Are you sure you want to delete <span className="font-bold">{shipToDelete.name}</span>? All associated tours, availability schedules, and configured extras attached to this ship will also be permanently removed.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShipToDelete(null)}
                  disabled={deletingShip}
                  className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-full transition-all cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteShip}
                  disabled={deletingShip}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-full shadow-md shadow-rose-600/20 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  {deletingShip ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Ship</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Day Schedule Detail Modal */}
      {selectedDayDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#051833]/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl border border-slate-200 relative space-y-5">
            <button
              type="button"
              onClick={() => setSelectedDayDetail(null)}
              className="absolute top-5 right-5 p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 text-[#0284c7] text-xs font-bold uppercase tracking-wider mb-2 border border-sky-200">
                <Calendar className="w-3.5 h-3.5" />
                Operational Schedule Detail
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-[#051833] font-display">
                {selectedDayDetail.full_date_label || selectedDayDetail.formatted_date || selectedDayDetail.date}
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Vessel: <span className="font-bold text-[#0284c7]">{(data?.my_ships || []).find((s) => s.id === selectedShipIdForTimeline)?.name || 'Vessel'}</span>
              </p>
            </div>

            {/* 24-Hour Visual Schedule Bar */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block">
                24-Hour Timeline Distribution (00:00 - 23:59)
              </span>

              {selectedDayDetail.status === 'Whole Day Booked' || selectedDayDetail.status_type === 'PUBLIC_TOUR' ? (
                <div className="space-y-2">
                  <div className="h-9 rounded-xl bg-sky-500 text-white text-xs font-bold flex items-center justify-center shadow-xs">
                    Whole Day Booked • Public Tour Sailing (00:00 - 23:59)
                  </div>
                  <div className="p-3 rounded-xl bg-sky-50 border border-sky-200 text-xs text-sky-950 space-y-1">
                    <p className="font-bold">{selectedDayDetail.details?.tour_title || 'Public Tour'}</p>
                    <p className="text-[11px] text-sky-800">
                      Route: {selectedDayDetail.details?.departure_port} → {selectedDayDetail.details?.destination}
                    </p>
                    <p className="text-[11px] text-slate-500 italic">
                      Whole vessel is fully booked with scheduled public tour passenger cabins for the entire date.
                    </p>
                  </div>
                </div>
              ) : selectedDayDetail.status === 'Private Booking' || selectedDayDetail.status_type === 'PRIVATE_BOOKING' ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-12 gap-1 h-9 rounded-xl overflow-hidden text-[10px] font-bold text-white shadow-xs">
                    <div className="col-span-3 bg-emerald-500 flex items-center justify-center truncate px-1" title="Available before charter">
                      Open
                    </div>
                    <div className="col-span-5 bg-indigo-600 flex items-center justify-center truncate px-1" title={selectedDayDetail.booked_time}>
                      Booked ({selectedDayDetail.booked_time})
                    </div>
                    <div className="col-span-2 bg-amber-500 flex items-center justify-center truncate px-1" title="4h Turnaround & Maintenance Break">
                      4h Break
                    </div>
                    <div className="col-span-2 bg-emerald-600 flex items-center justify-center truncate px-1" title={selectedDayDetail.ready_time}>
                      Ready
                    </div>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-950 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-indigo-600" />
                        <div>
                          <p className="font-bold">Private Charter Booked</p>
                          <p className="text-[11px] text-indigo-800">
                            {selectedDayDetail.details?.customer ? `Customer: ${selectedDayDetail.details.customer}` : ''} {selectedDayDetail.details?.booking_id ? `(#${selectedDayDetail.details.booking_id})` : ''}
                          </p>
                        </div>
                      </div>
                      <span className="font-bold font-mono px-2 py-1 rounded bg-indigo-100 text-indigo-900 text-[11px]">
                        {selectedDayDetail.booked_time}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-amber-600" />
                        <div>
                          <p className="font-bold">Mandatory Turnaround & Prep Break (4 Hours)</p>
                          <p className="text-[11px] text-amber-800">Deck cleaning, sanitation, fueling, & crew rest</p>
                        </div>
                      </div>
                      <span className="font-bold font-mono px-2 py-1 rounded bg-amber-100 text-amber-900 text-[11px]">
                        {selectedDayDetail.break_time}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <div>
                          <p className="font-bold">Ready for Next Booking</p>
                          <p className="text-[11px] text-emerald-800">Vessel 100% prepared and sanitized for next charter departure</p>
                        </div>
                      </div>
                      <span className="font-bold px-2 py-1 rounded bg-emerald-100 text-emerald-900 text-[11px]">
                        {selectedDayDetail.ready_time}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="h-9 rounded-xl bg-emerald-500 text-white text-xs font-bold flex items-center justify-center shadow-xs">
                    100% Available • All Day Open (00:00 - 23:59)
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950">
                    <p className="font-bold">No Bookings or Tours Scheduled</p>
                    <p className="text-[11px] text-emerald-800 mt-0.5">
                      Vessel is completely ready for immediate charter bookings, custom event packages, or public tour assignments.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 text-right">
              <button
                type="button"
                onClick={() => setSelectedDayDetail(null)}
                className="px-5 py-2 rounded-full bg-[#1677C8] hover:bg-[#082F5B] text-white text-xs font-bold transition cursor-pointer"
              >
                Close Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
