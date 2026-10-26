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
  getOperatorReviews,
  resolveOperatorComplaint,
  operatorRespondToComplaint,
  OperatorDashboardData,
  OperatorReview
} from '../api/dashboards';
import {
  Ship,
  Anchor,
  Calendar,
  Clock,
  Plus,
  Waves,
  X,
  Compass,
  Users,
  Tag,
  AlertCircle,
  TrendingUp,
  ArrowUpRight,
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
  User,
  Star,
  AlertTriangle,
  ShieldAlert,
  MessageSquare
} from 'lucide-react';
import { InvoiceModal } from '../components/ticket/InvoiceModal';
import { formatINR } from '../utils/currency';
import { getTourImageUrl } from '../utils/images';
import { Link, useSearchParams } from 'react-router-dom';
import { updateUserProfile } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import { OperatorActivitiesView } from '../components/activities/OperatorActivitiesView';
import { OperatorShipsView } from '../components/ships/OperatorShipsView';
import { OperatorBookingsView } from '../components/bookings/OperatorBookingsView';
import { OperatorStaffEquipmentView } from '../components/staff-equipment/OperatorStaffEquipmentView';
import { OperatorEarningsView } from '../components/finance/OperatorEarningsView';

type OperatorTab =
  | 'overview'
  | 'ships'
  | 'activities'
  | 'staff-equipment'
  | 'extras'
  | 'availability'
  | 'requests'
  | 'tours'
  | 'passengers'
  | 'reviews'
  | 'profile';

export const OperatorDashboardPage: React.FC = () => {
  const { user, refreshUser, updateUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState<OperatorDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<OperatorTab>('overview');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Smart Dual-View inside Merged "Fleet Overview & Earnings" tab
  const [overviewViewMode, setOverviewViewMode] = useState<'analytics' | 'earnings'>(() => {
    return searchParams.get('tab') === 'earnings' || searchParams.get('view') === 'earnings' ? 'earnings' : 'analytics';
  });

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'earnings') {
      setActiveTab('overview');
      setOverviewViewMode('earnings');
    }
  }, [searchParams]);

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
      if (res.user) {
        updateUser(res.user);
        setProfileFirstName(res.user.first_name || '');
        setProfileLastName(res.user.last_name || '');
        setProfileEmail(res.user.email || '');
        setProfilePhone(res.user.phone || '');
        setProfileAddress(res.user.address || '');
      } else {
        await refreshUser();
      }
      setProfileMsg({ text: res.message || 'Profile saved successfully!' });
      setProfilePassword('');
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

  // Reviews & Complaints Management State
  const [reviewsData, setReviewsData] = useState<{
    reviews: OperatorReview[];
    complaints: OperatorReview[];
    admin_warnings: OperatorReview[];
    total_count: number;
    complaints_count: number;
    admin_warnings_count: number;
    avg_rating: number;
  }>({
    reviews: [],
    complaints: [],
    admin_warnings: [],
    total_count: 0,
    complaints_count: 0,
    admin_warnings_count: 0,
    avg_rating: 5.0,
  });
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsFilterTab, setReviewsFilterTab] = useState<'all' | 'warnings' | 'complaints' | 'positive' | 'critical'>('all');
  const [resolvingId, setResolvingId] = useState<number | null>(null);

  const fetchReviews = async () => {
    setReviewsLoading(true);
    try {
      const res = await getOperatorReviews();
      setReviewsData(res);
    } catch (err) {
      console.error('Failed to load operator reviews:', err);
    } finally {
      setReviewsLoading(false);
    }
  };

  const handleResolveComplaint = async (reviewId: number) => {
    if (!window.confirm('Mark this passenger complaint as resolved & acknowledged? This will update the compliance status.')) return;
    setResolvingId(reviewId);
    try {
      const res = await resolveOperatorComplaint(reviewId);
      alert(res.message || 'Complaint resolved successfully.');
      await fetchReviews();
      fetchDashboard();
    } catch (err: any) {
      alert(err.message || 'Failed to resolve complaint.');
    } finally {
      setResolvingId(null);
    }
  };

  // Respond to Customer Complaint State
  const [respondingReview, setRespondingReview] = useState<OperatorReview | null>(null);
  const [ownerReplyText, setOwnerReplyText] = useState('');
  const [replySending, setReplySending] = useState(false);

  const replyTemplates = [
    {
      id: 'all_in_one',
      label: '🌟 Complete Resolution (Apology + Improved Operations + Future Guarantee)',
      text: 'Dear Guest, we sincerely apologize for the shortcomings during your voyage. We have implemented immediate operational improvements and staff retraining to resolve this issue, and assure you that this will never happen again in the future. We look forward to welcoming you aboard again for an exceptional luxury experience.',
    },
    {
      id: 'apology',
      label: '🙏 Sincere Apology & Regret',
      text: 'Dear Guest, please accept our heartfelt apologies for the inconvenience you experienced. We take immense pride in delivering five-star luxury voyages and deeply regret falling short of your expectations during this trip.',
    },
    {
      id: 'improve',
      label: '🛠️ Corrective Actions & Upgrades',
      text: 'Dear Guest, thank you for bringing this to our attention. We have immediately inspected the vessel with our marine engineers, retrained our onboard crew, and upgraded our operating protocols to ensure our facilities meet five-star luxury standards.',
    },
    {
      id: 'future',
      label: '⚓ Never Happen in Future Assurance',
      text: 'Dear Guest, we have addressed the root cause of this incident and guarantee with absolute certainty that this will never occur again in any future voyages. We look forward to offering you a truly flawless experience next time.',
    },
  ];

  const handleOpenRespondModal = (review: OperatorReview) => {
    setRespondingReview(review);
    setOwnerReplyText(
      review.owner_response ||
      `Dear ${review.author || review.user}, we sincerely apologize for the inconvenience regarding ${review.complaint_category || 'your trip'}. We have taken immediate corrective measures with our vessel team to resolve this issue and guarantee that this will never happen again in the future. We appreciate your valuable feedback.`
    );
  };

  const handleSendResponseToCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!respondingReview || !ownerReplyText.trim()) return;
    setReplySending(true);
    try {
      const res = await operatorRespondToComplaint(respondingReview.id, ownerReplyText.trim());
      alert(res.message || 'Apology and resolution message sent to customer successfully!');
      setRespondingReview(null);
      await fetchReviews();
      fetchDashboard();
    } catch (err: any) {
      alert(err.message || 'Failed to dispatch response to customer.');
    } finally {
      setReplySending(false);
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
    fetchReviews();
  }, []);

  // Fetch reviews when reviews tab is opened
  useEffect(() => {
    if (activeTab === 'reviews') {
      fetchReviews();
    }
  }, [activeTab]);

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
          { id: 'overview', label: 'Fleet Overview & Earnings', icon: BarChart3 },
          { id: 'ships', label: `My Ships (${data?.my_ships?.length || 0})`, icon: Ship },
          { id: 'activities', label: 'Activities & Water Sports', icon: Waves },
          { id: 'staff-equipment', label: 'Staff & Equipment', icon: ShieldCheck },
          { id: 'extras', label: 'Ship Extras', icon: Tag },
          { id: 'availability', label: 'Availability Timeline', icon: Calendar },
          { id: 'requests', label: `Booking Management (${data?.recent_bookings?.length || 0})`, icon: Clock },
          { id: 'tours', label: `Public Tours (${data?.my_tours?.length || 0})`, icon: Anchor },
          { id: 'passengers', label: 'Tour Passengers', icon: Users },
          {
            id: 'reviews',
            label: reviewsData.admin_warnings_count > 0
              ? `Complaints & Reviews (${reviewsData.admin_warnings_count} Alert${reviewsData.admin_warnings_count > 1 ? 's' : ''})`
              : `Reviews & Feedback (${reviewsData.total_count})`,
            icon: Star,
            hasWarning: reviewsData.admin_warnings_count > 0,
          },
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
              {tab.hasWarning && (
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping inline-block -ml-0.5" />
              )}
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: FLEET OVERVIEW & EARNINGS (SMARTLY MERGED) */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Header banner with smart dual segmented switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#082F5B]/10 pb-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#082F5B] to-[#1677C8] text-[#F8FCFF] shadow-md flex items-center justify-center">
                {overviewViewMode === 'earnings' ? (
                  <DollarSign className="w-6 h-6 text-white" />
                ) : (
                  <BarChart3 className="w-6 h-6 text-white" />
                )}
              </div>
              <div>
                <h3 className="text-xl sm:text-2xl font-black text-[#102B46] tracking-tight">
                  {overviewViewMode === 'earnings'
                    ? 'Owner Earnings & Financial Ledger'
                    : 'Fleet Operations & Revenue Analytics'}
                </h3>
                <p className="text-xs text-[#102B46]/60">
                  {overviewViewMode === 'earnings'
                    ? 'Comprehensive financial ledger, platform commission (15%), payment gateway (2%), refunds, and bank payout records.'
                    : 'Live performance metrics, monthly earnings trajectory, trip split, and ship utilization for your fleet.'}
                </p>
              </div>
            </div>

            {/* Smart Dual Segmented Mode Switcher */}
            <div className="inline-flex p-1.5 rounded-2xl bg-slate-100 border border-slate-200/80 shadow-inner max-w-full overflow-x-auto">
              <button
                type="button"
                onClick={() => setOverviewViewMode('analytics')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                  overviewViewMode === 'analytics'
                    ? 'bg-[#082F5B] text-white shadow-sm'
                    : 'text-slate-600 hover:text-[#082F5B] hover:bg-white/60'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Fleet Operations &amp; Analytics</span>
              </button>

              <button
                type="button"
                onClick={() => setOverviewViewMode('earnings')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                  overviewViewMode === 'earnings'
                    ? 'bg-[#082F5B] text-white shadow-sm'
                    : 'text-slate-600 hover:text-[#082F5B] hover:bg-white/60'
                }`}
              >
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                <span>Owner Earnings &amp; Payouts</span>
                {(stats.pending_payouts || stats.pending_requests || 0) > 0 && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                )}
              </button>
            </div>
          </div>

          {/* VIEW MODE 1: FLEET OPERATIONS & ANALYTICS */}
          {overviewViewMode === 'analytics' && (
            <div className="space-y-8 animate-fadeIn">
              {/* Top 8 Owner Dashboard KPI Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* 1. Total Revenue */}
                <div
                  onClick={() => setOverviewViewMode('earnings')}
                  className="bg-white rounded-3xl p-5 border border-[#0284c7]/20 shadow-sm space-y-1.5 hover:border-[#0284c7]/50 hover:shadow-md transition cursor-pointer"
                  title="Click to view full financial ledger"
                >
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-slate-500 block tracking-wider">Total Revenue</span>
                <DollarSign className="w-4 h-4 text-emerald-600" />
              </div>
              <span className="font-mono-numbers text-2xl sm:text-3xl font-black text-[#051833]">
                {formatINR(stats.gross_booking_value || stats.total_revenue)}
              </span>
              <p className="text-[11px] text-slate-500 font-medium">Total earned amount</p>
            </div>

            {/* 2. Upcoming Bookings */}
            <div
              onClick={() => setActiveTab('requests')}
              className="bg-white rounded-3xl p-5 border border-[#0284c7]/20 shadow-sm space-y-1.5 hover:border-[#0284c7]/50 hover:shadow-md transition cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-slate-500 block tracking-wider">Upcoming Bookings</span>
                <Calendar className="w-4 h-4 text-sky-600" />
              </div>
              <span className="font-mono-numbers text-2xl sm:text-3xl font-black text-sky-700">
                {stats.upcoming_bookings ?? (analyticsData.status_breakdown.confirmed)}
              </span>
              <p className="text-[11px] text-slate-500 font-medium">Future reservations</p>
            </div>

            {/* 3. Pending Requests */}
            <div
              onClick={() => setActiveTab('requests')}
              className={`rounded-3xl p-5 border shadow-sm space-y-1.5 transition cursor-pointer ${
                (stats.pending_requests || pendingRequests.length || 0) > 0
                  ? 'bg-amber-50/50 border-amber-300 hover:border-amber-400 ring-1 ring-amber-300/40'
                  : 'bg-white border-[#0284c7]/20 hover:border-[#0284c7]/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-slate-500 block tracking-wider">Pending Requests</span>
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <span className="font-mono-numbers text-2xl sm:text-3xl font-black text-amber-600">
                {stats.pending_requests ?? pendingRequests.length}
              </span>
              <p className="text-[11px] text-slate-500 font-medium">Bookings awaiting approval</p>
            </div>

            {/* 4. Active Activities */}
            <div
              onClick={() => setActiveTab('activities')}
              className="bg-white rounded-3xl p-5 border border-[#0284c7]/20 shadow-sm space-y-1.5 hover:border-[#0284c7]/50 hover:shadow-md transition cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-slate-500 block tracking-wider">Active Activities</span>
                <Waves className="w-4 h-4 text-indigo-600" />
              </div>
              <span className="font-mono-numbers text-2xl sm:text-3xl font-black text-[#051833]">
                {stats.active_activities ?? 0}
              </span>
              <p className="text-[11px] text-slate-500 font-medium">Currently published activities</p>
            </div>

            {/* 5. Available Vessels */}
            <div
              onClick={() => setActiveTab('ships')}
              className="bg-white rounded-3xl p-5 border border-[#0284c7]/20 shadow-sm space-y-1.5 hover:border-[#0284c7]/50 hover:shadow-md transition cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-slate-500 block tracking-wider">Available Vessels</span>
                <Ship className="w-4 h-4 text-teal-600" />
              </div>
              <span className="font-mono-numbers text-2xl sm:text-3xl font-black text-[#051833]">
                {stats.available_vessels ?? (stats.available_ships || stats.total_ships)}
              </span>
              <p className="text-[11px] text-slate-500 font-medium">Operational ships and boats</p>
            </div>

            {/* 6. Occupancy Rate */}
            <div className="bg-white rounded-3xl p-5 border border-[#0284c7]/20 shadow-sm space-y-1.5 hover:border-[#0284c7]/50 hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-slate-500 block tracking-wider">Occupancy Rate</span>
                <BarChart3 className="w-4 h-4 text-purple-600" />
              </div>
              <span className="font-mono-numbers text-2xl sm:text-3xl font-black text-purple-700">
                {stats.occupancy_rate ?? 74.0}%
              </span>
              <p className="text-[11px] text-slate-500 font-medium">Booked vs total capacity</p>
            </div>

            {/* 7. Customer Rating */}
            <div
              onClick={() => setActiveTab('reviews')}
              className="bg-white rounded-3xl p-5 border border-[#0284c7]/20 shadow-sm space-y-1.5 hover:border-[#0284c7]/50 hover:shadow-md transition cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-slate-500 block tracking-wider">Customer Rating</span>
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              </div>
              <span className="font-mono-numbers text-2xl sm:text-3xl font-black text-amber-600 flex items-center gap-1">
                {stats.customer_rating ?? 4.9} <span className="text-sm font-normal text-slate-400">/ 5.0</span>
              </span>
              <p className="text-[11px] text-slate-500 font-medium">Average review score</p>
            </div>

            {/* 8. Cancellation Rate */}
            <div className="bg-white rounded-3xl p-5 border border-[#0284c7]/20 shadow-sm space-y-1.5 hover:border-[#0284c7]/50 hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-slate-500 block tracking-wider">Cancellation Rate</span>
                <AlertTriangle className="w-4 h-4 text-rose-500" />
              </div>
              <span className="font-mono-numbers text-2xl sm:text-3xl font-black text-rose-600">
                {stats.cancellation_rate ?? 0.0}%
              </span>
              <p className="text-[11px] text-slate-500 font-medium">Cancelled bookings share</p>
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

          {/* REVENUE DASHBOARD: GROSS, COMMISSION, REFUNDS & NET PAYOUT (SEPARATED) */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#0284c7]/25 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 text-[#0284c7] text-xs font-bold uppercase tracking-wider mb-1 border border-sky-200">
                  <DollarSign className="w-3.5 h-3.5 text-[#0284c7]" />
                  Financial Accounting &amp; Settlement
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-[#051833]">Owner Revenue Breakdown</h3>
                <p className="text-xs text-slate-500">
                  Gross Booking Value, platform commission, customer refunds, and net owner payout displayed distinctly.
                </p>
              </div>

              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Final Net Payout</span>
                <span className="text-2xl sm:text-3xl font-black text-emerald-600 font-mono-numbers">
                  {formatINR(stats.net_payout ?? stats.owner_payout ?? (stats.total_revenue * 0.85))}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Gross Booking Value */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-slate-500 block tracking-wider">
                  1. Gross Booking Value
                </span>
                <span className="text-2xl font-black text-[#051833] font-mono-numbers block">
                  {formatINR(stats.gross_booking_value ?? stats.total_revenue)}
                </span>
                <p className="text-[11px] text-slate-500">Total customer amount booked across fleet</p>
              </div>

              {/* Platform Commission */}
              <div className="p-5 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-amber-800 block tracking-wider">
                  2. Platform Commission (15%)
                </span>
                <span className="text-2xl font-black text-amber-900 font-mono-numbers block">
                  -{formatINR(stats.platform_commission ?? (stats.total_revenue * 0.15))}
                </span>
                <p className="text-[11px] text-amber-700">Platform operations, marketing &amp; gateway</p>
              </div>

              {/* Refunds */}
              <div className="p-5 rounded-2xl bg-rose-50/60 border border-rose-200 space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-rose-800 block tracking-wider">
                  3. Refunds
                </span>
                <span className="text-2xl font-black text-rose-900 font-mono-numbers block">
                  -{formatINR(stats.refunds ?? 0)}
                </span>
                <p className="text-[11px] text-rose-700">Returned to passengers on cancelled bookings</p>
              </div>

              {/* Net Payout */}
              <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-1.5 shadow-sm">
                <span className="text-[10px] uppercase font-bold text-emerald-800 block tracking-wider">
                  4. Net Payout (Disbursable)
                </span>
                <span className="text-2xl font-black text-emerald-700 font-mono-numbers block">
                  {formatINR(stats.net_payout ?? stats.owner_payout ?? (stats.total_revenue * 0.85))}
                </span>
                <p className="text-[11px] text-emerald-600">Disbursed directly to owner bank account</p>
              </div>
            </div>

            {/* Direct Switch to Full Earnings & Payout Ledger */}
            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-xs text-slate-500">
                Detailed transaction audit, bank UTR clearance records, itemized booking fee breakdown, and manual withdrawals.
              </p>
              <button
                type="button"
                onClick={() => setOverviewViewMode('earnings')}
                className="px-4 py-2 rounded-xl bg-[#082F5B] hover:bg-[#1677C8] text-white text-xs font-black flex items-center gap-2 transition cursor-pointer shadow-sm whitespace-nowrap self-start sm:self-auto"
              >
                <span>View Full Earnings &amp; Payout Ledger</span>
                <ArrowUpRight className="w-4 h-4 text-emerald-300" />
              </button>
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

          {/* VIEW MODE 2: OWNER EARNINGS & FINANCIAL LEDGER */}
          {overviewViewMode === 'earnings' && (
            <div className="animate-fadeIn">
              <OperatorEarningsView />
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MANAGE SHIPS & BOATS */}
      {activeTab === 'ships' && (
        <OperatorShipsView
          myShips={data?.my_ships || data?.vessels || []}
          onRefresh={fetchDashboard}
        />
      )}

      {/* TAB: WATER SPORTS & ACTIVITIES */}
      {activeTab === 'activities' && (
        <OperatorActivitiesView myShips={data?.my_ships || []} />
      )}

      {/* TAB: STAFF & EQUIPMENT MANAGEMENT */}
      {activeTab === 'staff-equipment' && (
        <OperatorStaffEquipmentView
          vessels={data?.my_ships || data?.vessels || []}
        />
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

      {/* TAB 5: BOOKING MANAGEMENT (Lifecycle tracking & owner operations) */}
      {activeTab === 'requests' && (
        <OperatorBookingsView
          bookings={data?.recent_bookings || []}
          onRefresh={fetchDashboard}
          onOpenInvoice={(bookingId) => setSelectedInvoiceId(bookingId)}
        />
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
            {data?.my_tours?.map((tour) => {
              const shipImg = getTourImageUrl(tour.ship_image || tour.tour_image || tour.image_url);
              return (
                <div
                  key={tour.id}
                  className="bg-[#F8FCFF] rounded-3xl border border-[#082F5B]/10 shadow-[0_4px_20px_rgba(8,47,91,0.04)] hover:shadow-[0_12px_30px_rgba(8,47,91,0.08)] transition-all overflow-hidden flex flex-col justify-between group"
                >
                  {/* Ship / Tour Vessel Cover Image */}
                  <div className="relative h-48 sm:h-52 w-full bg-slate-100 overflow-hidden">
                    <img
                      src={shipImg}
                      alt={tour.ship_name || tour.tour_title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e: any) => {
                        e.target.src = 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=800&q=80';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#082F5B]/85 via-black/15 to-black/30" />

                    {/* Floating Top Badges */}
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                      <span className="px-3 py-1 rounded-full bg-white/95 backdrop-blur-md text-[#082F5B] border border-white/30 text-[10px] font-black uppercase tracking-wider shadow-sm flex items-center gap-1.5">
                        <Ship className="w-3 h-3 text-[#1677C8]" />
                        <span>{tour.ship_name}</span>
                      </span>
                      <span className="px-3 py-1 rounded-full bg-emerald-500 text-white text-[10px] font-black uppercase tracking-wider shadow-sm flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        <span>{tour.remaining_capacity} Seats Remaining</span>
                      </span>
                    </div>

                    {/* Route Info Overlay at Bottom of Image */}
                    <div className="absolute bottom-3 left-3 right-3 text-white">
                      <span className="text-xs font-bold text-white/95 flex items-center gap-1.5 drop-shadow-sm">
                        <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                        <span className="line-clamp-1">{tour.departure_port} → {tour.destination}</span>
                      </span>
                    </div>
                  </div>

                  {/* Card Content Details */}
                  <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                    <div className="space-y-1.5">
                      <h3 className="text-xl font-black text-[#102B46] font-heading tracking-tight leading-snug">
                        {tour.tour_title}
                      </h3>
                      <p className="text-xs text-[#102B46]/70 font-medium flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-[#1677C8] shrink-0" />
                        <span>Departure Date: <strong className="text-[#102B46]">{tour.departure_date}</strong></span>
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
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#082F5B] hover:bg-[#1677C8] text-white text-xs font-bold transition-all cursor-pointer shadow-sm"
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>View Passenger List</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
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

      {/* TAB 8: GUEST REVIEWS & OFFICIAL COMPLAINTS BOX */}
      {activeTab === 'reviews' && (() => {
        const displayedReviews = reviewsData.reviews.filter((r) => {
          if (reviewsFilterTab === 'warnings') {
            return r.complaint_status === 'WARNING_SENT' || (Boolean(r.warning_message) && r.complaint_status !== 'RESOLVED');
          }
          if (reviewsFilterTab === 'complaints') {
            return r.has_complaint || r.complaint_status !== 'NONE';
          }
          if (reviewsFilterTab === 'positive') {
            return r.rating >= 4;
          }
          if (reviewsFilterTab === 'critical') {
            return r.rating < 4;
          }
          return true;
        });

        const fiveStarCount = reviewsData.reviews.filter((r) => r.rating === 5).length;
        const fiveStarPct = reviewsData.total_count > 0 ? Math.round((fiveStarCount / reviewsData.total_count) * 100) : 100;

        return (
          <div className="space-y-8 animate-in fade-in duration-200">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[11px] font-black tracking-widest uppercase text-[#1677C8] block mb-1">
                  Passenger Experience & Safety Compliance
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-[#102B46] font-heading tracking-tight">
                  Guest Reviews & Complaints Box
                </h2>
                <p className="text-xs text-[#102B46]/65 mt-0.5 font-medium">
                  Review passenger trip feedback, ratings across your fleet, and directly resolve official compliance warnings dispatched by platform moderation.
                </p>
              </div>

              <button
                onClick={fetchReviews}
                disabled={reviewsLoading}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white hover:bg-slate-50 border border-[#082F5B]/15 text-[#082F5B] text-xs font-bold transition shadow-xs cursor-pointer self-start sm:self-auto"
              >
                <Clock className={`w-3.5 h-3.5 ${reviewsLoading ? 'animate-spin text-[#1677C8]' : ''}`} />
                <span>Refresh Reviews</span>
              </button>
            </div>

            {/* KPI Metric Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-3xl bg-white border border-[#082F5B]/10 shadow-xs">
                <span className="text-[10px] uppercase font-bold text-slate-500 block tracking-wider mb-1">Average Fleet Rating</span>
                <div className="flex items-center gap-2">
                  <Star className="w-6 h-6 fill-amber-400 text-amber-400" />
                  <span className="text-3xl font-black text-[#102B46] font-mono-numbers">{reviewsData.avg_rating.toFixed(1)}</span>
                  <span className="text-xs text-slate-400 font-normal">/ 5.0</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">From verified passenger voyages</p>
              </div>

              <div className="p-5 rounded-3xl bg-white border border-[#082F5B]/10 shadow-xs">
                <span className="text-[10px] uppercase font-bold text-slate-500 block tracking-wider mb-1">Total Reviews</span>
                <div className="text-3xl font-black text-[#102B46] font-mono-numbers">{reviewsData.total_count}</div>
                <p className="text-[11px] text-emerald-600 font-semibold mt-1">{fiveStarPct}% 5-Star satisfaction rate</p>
              </div>

              <div className={`p-5 rounded-3xl border shadow-xs transition-all ${
                reviewsData.admin_warnings_count > 0 
                  ? 'bg-rose-50/80 border-rose-300' 
                  : 'bg-emerald-50/50 border-emerald-200'
              }`}>
                <span className="text-[10px] uppercase font-bold block tracking-wider mb-1 flex items-center gap-1.5 text-slate-600">
                  <ShieldAlert className={`w-3.5 h-3.5 ${reviewsData.admin_warnings_count > 0 ? 'text-rose-600' : 'text-emerald-600'}`} />
                  <span>Admin Complaints Box</span>
                </span>
                <div className={`text-3xl font-black font-mono-numbers ${
                  reviewsData.admin_warnings_count > 0 ? 'text-rose-700' : 'text-emerald-700'
                }`}>
                  {reviewsData.admin_warnings_count}
                </div>
                <p className={`text-[11px] font-semibold mt-1 ${
                  reviewsData.admin_warnings_count > 0 ? 'text-rose-600' : 'text-emerald-600'
                }`}>
                  {reviewsData.admin_warnings_count > 0 ? 'Active compliance warnings require action' : 'Zero active warnings (All clear)'}
                </p>
              </div>

              <div className="p-5 rounded-3xl bg-white border border-[#082F5B]/10 shadow-xs">
                <span className="text-[10px] uppercase font-bold text-slate-500 block tracking-wider mb-1">Passenger Grievances</span>
                <div className="text-3xl font-black text-[#102B46] font-mono-numbers">{reviewsData.complaints_count}</div>
                <p className="text-[11px] text-slate-400 mt-1">Total grievances logged on fleet</p>
              </div>
            </div>

            {/* DEDICATED OFFICIAL COMPLAINTS BOX ("Complen Box") */}
            <div className={`rounded-3xl border-2 transition-all p-6 sm:p-8 shadow-md ${
              reviewsData.admin_warnings.length > 0
                ? 'bg-gradient-to-br from-rose-50/90 via-amber-50/40 to-white border-rose-300 shadow-rose-900/5'
                : 'bg-gradient-to-br from-emerald-50/70 via-sky-50/30 to-white border-emerald-300 shadow-emerald-900/5'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider mb-2 border shadow-xs"
                    style={{
                      backgroundColor: reviewsData.admin_warnings.length > 0 ? '#ffe4e6' : '#dcfce7',
                      color: reviewsData.admin_warnings.length > 0 ? '#9f1239' : '#166534',
                      borderColor: reviewsData.admin_warnings.length > 0 ? '#fecdd3' : '#bbf7d0',
                    }}
                  >
                    {reviewsData.admin_warnings.length > 0 ? (
                      <>
                        <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping" />
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                        <span>Action Required: Official Admin Directives</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Complaints Box: Fleet In Compliance</span>
                      </>
                    )}
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-[#102B46] font-heading tracking-tight">
                    Official Safety & Moderation Complaints Box
                  </h3>
                  <p className="text-xs text-[#102B46]/70 mt-1 font-medium">
                    When platform administrators investigate passenger grievances and dispatch formal compliance warnings, they arrive directly into this box.
                  </p>
                </div>

                {reviewsData.admin_warnings.length > 0 && (
                  <span className="px-3.5 py-1.5 rounded-full bg-rose-600 text-white text-xs font-black self-start sm:self-auto shadow-sm">
                    {reviewsData.admin_warnings.length} Active Directive{reviewsData.admin_warnings.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {/* If there are admin warnings in the complaint box */}
              {reviewsData.admin_warnings.length > 0 ? (
                <div className="space-y-4">
                  {reviewsData.admin_warnings.map((warn) => (
                    <div
                      key={warn.id}
                      className="bg-white rounded-2xl border border-rose-200/90 p-5 sm:p-6 shadow-sm space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-rose-100 pb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                            <Ship className="w-5 h-5 text-rose-600" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-extrabold text-base text-[#102B46]">{warn.ship_name}</h4>
                              {warn.ship_category && (
                                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-[#102B46] text-[10px] font-bold">
                                  {warn.ship_category}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500">
                              Passenger: <strong className="text-[#102B46]">{warn.author || warn.user}</strong>
                              {warn.booking_id && <> • Booking: <span className="font-mono">{warn.booking_id}</span></>}
                              {warn.travel_date && <> • Voyage Date: {warn.travel_date}</>}
                            </p>
                          </div>
                        </div>

                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 text-rose-800 text-[11px] font-black uppercase tracking-wider self-start sm:self-auto border border-rose-200">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                          <span>Warning Dispatched</span>
                        </span>
                      </div>

                      {/* Passenger's Filed Grievance */}
                      <div className="bg-rose-50/50 rounded-xl p-3.5 border border-rose-100 text-xs space-y-1">
                        <div className="font-bold text-rose-900 flex items-center gap-1.5">
                          <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 bg-rose-200/60 rounded text-rose-800">
                            Category: {warn.complaint_category || 'Service Quality'}
                          </span>
                        </div>
                        <p className="text-rose-950 font-medium italic mt-1">
                          "{warn.complaint_text || warn.comment || 'Passenger filed a grievance regarding voyage standards.'}"
                        </p>
                      </div>

                      {/* Admin's Official Directive Message */}
                      <div className="bg-[#061D36] rounded-2xl p-4 sm:p-5 text-white border border-[#63B8F0]/30 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[#63B8F0] font-bold uppercase tracking-wider flex items-center gap-1.5 text-[10px]">
                            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                            Official Directive from Platform Moderation
                          </span>
                          <span className="text-white/60 text-[10px] font-mono">
                            {warn.warning_sent_at || 'Recent'}
                          </span>
                        </div>
                        <p className="text-xs text-amber-100 font-mono leading-relaxed">
                          {warn.warning_message || 'Please investigate and resolve this passenger issue immediately. Failure to adhere to standards may affect listing status.'}
                        </p>
                      </div>

                      {/* Owner's Dispatched Response / Apology if already sent */}
                      {warn.owner_response && (
                        <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-200 text-xs space-y-1">
                          <div className="flex items-center justify-between text-emerald-900 font-bold">
                            <span className="flex items-center gap-1.5 text-xs">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              Official Owner Apology & Resolution Dispatched:
                            </span>
                            <span className="text-[10px] text-emerald-700/80 font-mono">
                              {warn.owner_response_at}
                            </span>
                          </div>
                          <p className="text-emerald-950 font-medium italic mt-0.5">
                            "{warn.owner_response}"
                          </p>
                        </div>
                      )}

                      {/* Action Buttons Row */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                        <span className="text-[11px] text-slate-500 font-medium">
                          Send a formal apology & resolution message to reassure the passenger, or mark resolved.
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenRespondModal(warn)}
                            className="px-4 py-2.5 rounded-full bg-[#1677C8] hover:bg-[#082F5B] text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>{warn.owner_response ? 'Edit Apology to Customer' : 'Send Apology to Customer'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleResolveComplaint(warn.id)}
                            disabled={resolvingId === warn.id}
                            className="px-4 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-sm disabled:opacity-50"
                          >
                            {resolvingId === warn.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            )}
                            <span>Quick Resolve</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 px-4 text-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h4 className="font-extrabold text-[#102B46] text-base">Complaints Box is Empty</h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    No active passenger grievances or administration compliance warnings for your vessels. When any official warning is dispatched by platform moderation, it will appear right here.
                  </p>
                </div>
              )}
            </div>

            {/* PASSENGER REVIEWS LIST SECTION */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#082F5B]/10 pb-4">
                <div>
                  <h3 className="text-xl font-black text-[#102B46] font-heading tracking-tight">
                    All Passenger Reviews & Ratings
                  </h3>
                  <p className="text-xs text-[#102B46]/65 mt-0.5">
                    Individual ratings and verified feedback from guests across your ships and tours.
                  </p>
                </div>

                {/* Filter Pills */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    onClick={() => setReviewsFilterTab('all')}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
                      reviewsFilterTab === 'all'
                        ? 'bg-[#102B46] text-white shadow-xs'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    All ({reviewsData.total_count})
                  </button>
                  <button
                    onClick={() => setReviewsFilterTab('warnings')}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                      reviewsFilterTab === 'warnings'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100'
                    }`}
                  >
                    <AlertTriangle className="w-3 h-3" />
                    <span>Admin Notices ({reviewsData.admin_warnings_count})</span>
                  </button>
                  <button
                    onClick={() => setReviewsFilterTab('complaints')}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                      reviewsFilterTab === 'complaints'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span>Complaints ({reviewsData.complaints_count})</span>
                  </button>
                  <button
                    onClick={() => setReviewsFilterTab('positive')}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                      reviewsFilterTab === 'positive'
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    <span>Positive (4-5★)</span>
                  </button>
                  <button
                    onClick={() => setReviewsFilterTab('critical')}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
                      reviewsFilterTab === 'critical'
                        ? 'bg-slate-800 text-white shadow-xs'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Critical (1-3★)
                  </button>
                </div>
              </div>

              {/* Reviews Grid */}
              {displayedReviews.length === 0 ? (
                <div className="bg-white rounded-3xl p-10 border border-[#082F5B]/10 text-center space-y-2">
                  <Star className="w-10 h-10 text-slate-300 mx-auto" />
                  <h4 className="font-bold text-[#102B46]">No Reviews Match Filter</h4>
                  <p className="text-xs text-slate-500">There are no passenger reviews under this selection.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {displayedReviews.map((r) => {
                    const stars = [1, 2, 3, 4, 5];
                    return (
                      <div
                        key={r.id}
                        className={`bg-white rounded-3xl p-6 border shadow-sm transition hover:shadow-md flex flex-col justify-between space-y-4 ${
                          r.has_complaint ? 'border-amber-200 bg-amber-50/20' : 'border-[#082F5B]/10'
                        }`}
                      >
                        <div className="space-y-3">
                          {/* Card Top: Vessel & Rating */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                              {r.ship_image ? (
                                <img
                                  src={getTourImageUrl(r.ship_image)}
                                  alt={r.ship_name}
                                  className="w-10 h-10 rounded-xl object-cover border border-slate-200"
                                  onError={(e: any) => {
                                    e.target.src = 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=400&q=80';
                                  }}
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500">
                                  <Ship className="w-5 h-5 text-[#1677C8]" />
                                </div>
                              )}
                              <div>
                                <h4 className="font-black text-sm text-[#102B46]">{r.ship_name}</h4>
                                <span className="text-[11px] text-slate-400 block">{r.ship_location || 'Coastal'}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-0.5">
                              {stars.map((s) => (
                                <Star
                                  key={s}
                                  className={`w-4 h-4 ${
                                    s <= r.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>

                          {/* Guest Feedback Text */}
                          <p className="text-xs text-[#102B46]/85 font-medium leading-relaxed">
                            "{r.comment || 'Passenger gave a 5-star rating with no text comment.'}"
                          </p>

                          {/* If Passenger Filed a Grievance */}
                          {r.has_complaint && (
                            <div className="bg-rose-50 border border-rose-200 p-3 rounded-2xl text-xs space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase text-rose-800 tracking-wider">
                                  Complaint: {r.complaint_category || 'Service Issue'}
                                </span>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                  r.complaint_status === 'RESOLVED'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : r.complaint_status === 'WARNING_SENT'
                                    ? 'bg-rose-200 text-rose-900'
                                    : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {r.complaint_status === 'RESOLVED' ? 'Resolved' : r.complaint_status === 'WARNING_SENT' ? 'Warning Issued' : 'Pending Review'}
                                </span>
                              </div>
                              <p className="text-rose-900 text-[11px] italic">
                                {r.complaint_text}
                              </p>
                            </div>
                          )}

                          {/* If Owner sent an apology/response */}
                          {r.owner_response && (
                            <div className="bg-emerald-50/80 border border-emerald-200 p-3 rounded-2xl text-xs space-y-1">
                              <div className="flex items-center justify-between text-emerald-800 font-bold text-[10px]">
                                <span className="flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  Owner Apology & Resolution:
                                </span>
                                <span className="text-emerald-700/80 font-mono">{r.owner_response_at}</span>
                              </div>
                              <p className="text-emerald-950 text-[11px] italic">"{r.owner_response}"</p>
                            </div>
                          )}

                          {r.has_complaint && (
                            <div className="flex items-center justify-end pt-1">
                              <button
                                type="button"
                                onClick={() => handleOpenRespondModal(r)}
                                className="text-[11px] font-bold text-[#1677C8] hover:text-[#082F5B] flex items-center gap-1 cursor-pointer"
                              >
                                <MessageSquare className="w-3 h-3" />
                                <span>{r.owner_response ? 'Edit Customer Apology' : 'Send Customer Apology'}</span>
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Card Bottom Meta */}
                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                          <span className="font-semibold text-[#102B46]">{r.author || r.user}</span>
                          <span>{r.date || r.created_at || 'Recent Voyage'}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        );
      })()}

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

      {/* MODAL: RESPOND TO CUSTOMER COMPLAINT & SEND APOLOGY */}
      {respondingReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#061D36]/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#F8FCFF] rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-[#082F5B]/20 overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#061D36] to-[#082F5B] p-6 sm:p-7 flex items-center justify-between text-white">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-[#63B8F0] block mb-1 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#63B8F0]" />
                  Customer Resolution & Apology Center
                </span>
                <h3 className="font-heading font-black text-xl text-white">
                  Send Apology & Resolution to Customer
                </h3>
                <p className="text-xs text-white/70 mt-0.5">
                  Reassure {respondingReview.author || respondingReview.user} with an apology, corrective improvements, and future assurance.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRespondingReview(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSendResponseToCustomer} className="p-6 sm:p-7 space-y-5">
              {/* Complaint Summary Card */}
              <div className="bg-rose-50/70 border border-rose-200 rounded-2xl p-4 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-black text-rose-900 uppercase text-[10px] tracking-wider">
                    Grievance: {respondingReview.complaint_category || 'Service Quality'}
                  </span>
                  <span className="text-[11px] font-semibold text-rose-800">
                    Vessel: <strong>{respondingReview.ship_name}</strong>
                  </span>
                </div>
                <p className="text-rose-950 italic">
                  "{respondingReview.complaint_text || respondingReview.comment}"
                </p>
              </div>

              {/* Quick Template Presets */}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-wider text-[#102B46] block">
                  Quick Resolution Templates (Click to fill message)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {replyTemplates.map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => setOwnerReplyText(tpl.text)}
                      className="p-3 text-left rounded-xl border border-[#082F5B]/15 hover:border-[#1677C8] hover:bg-sky-50/50 bg-white text-xs transition cursor-pointer group"
                    >
                      <div className="font-bold text-[#102B46] group-hover:text-[#1677C8] text-[11px] mb-1">
                        {tpl.label}
                      </div>
                      <p className="text-[10px] text-slate-500 line-clamp-2">
                        {tpl.text}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Editable Response Textarea */}
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-[#102B46] block flex items-center justify-between">
                  <span>Custom Message to Passenger</span>
                  <span className="text-[10px] font-normal text-slate-400">Delivered directly to customer's feedback view</span>
                </label>
                <textarea
                  required
                  rows={5}
                  value={ownerReplyText}
                  onChange={(e) => setOwnerReplyText(e.target.value)}
                  placeholder="Write your apology, corrective actions taken, and future assurances..."
                  className="w-full px-4 py-3 rounded-2xl border border-[#082F5B]/20 text-xs text-[#102B46] bg-white focus:outline-none focus:border-[#1677C8] focus:ring-2 focus:ring-[#1677C8]/15 leading-relaxed font-medium"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRespondingReview(null)}
                  className="px-5 py-2.5 rounded-full border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={replySending || !ownerReplyText.trim()}
                  className="px-6 py-2.5 rounded-full bg-[#1677C8] hover:bg-[#082F5B] text-white font-bold text-xs transition cursor-pointer shadow-md disabled:opacity-50 flex items-center gap-2"
                >
                  {replySending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <MessageSquare className="w-4 h-4" />
                  )}
                  <span>Send Apology & Mark Resolved</span>
                </button>
              </div>
            </form>
          </div>
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
