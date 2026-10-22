import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { getMyBookings, cancelBooking, submitReview, updateBookingWhatsAppOpt } from '../api/bookings';
import { getCruises } from '../api/cruises';
import { getTours } from '../api/tours';
import { getActiveOffers } from '../api/offers';
import { updateUserProfile } from '../api/auth';
import { Booking, Cruise, PublicTour, Offer } from '../api/types';
import { useAuth } from '../context/AuthContext';
import { useFavorites } from '../context/FavoritesContext';
import { CruiseCard } from '../components/cruises/CruiseCard';
import { TicketPass } from '../components/ticket/TicketPass';
import { InvoiceModal } from '../components/ticket/InvoiceModal';
import {
  Ship,
  Calendar,
  Clock,
  MapPin,
  Ticket,
  FileText,
  X,
  Star,
  Compass,
  Tag,
  User as UserIcon,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Copy,
  Search,
  Waves,
  ArrowRight,
  Anchor,
  MessageSquare,
  Send,
  Bell,
  BellOff,
  QrCode,
  ExternalLink,
  BarChart3,
  TrendingUp,
  PieChart,
  Activity,
  Award,
  Heart,
  Eye,
  EyeOff
} from 'lucide-react';
import { formatINR } from '../utils/currency';

interface UserDashboardPageProps {
  onExplore: () => void;
  onSelectCruise?: (cruise: Cruise) => void;
  onBookCruise?: (cruise: Cruise) => void;
  onSelectTour?: (tour: PublicTour) => void;
  onBookTour?: (tour: PublicTour) => void;
}

type UserSubTab =
  | 'home'
  | 'bookings'
  | 'favorites'
  | 'offers'
  | 'profile';

export const UserDashboardPage: React.FC<UserDashboardPageProps> = ({
  onExplore,
  onSelectCruise,
  onBookCruise,
  onSelectTour,
  onBookTour,
}) => {
  const { user, refreshUser } = useAuth();
  const { favorites, loading: favoritesLoading } = useFavorites();
  const [searchParams, setSearchParams] = useSearchParams();
  const targetBookingId = searchParams.get('booking_id');
  const autoOpenPass = searchParams.get('openPass') === 'true' || searchParams.get('showTicket') === 'true';
  const tabParam = searchParams.get('tab');

  const [activeSubTab, setActiveSubTab] = useState<UserSubTab>('home');

  // Bookings state
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [bookingFilter, setBookingFilter] = useState<'ALL' | 'UPCOMING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'>('ALL');
  const [bookingSearch, setBookingSearch] = useState<string>('');

  // Recommendation & Discovery Data
  const [recommendedShips, setRecommendedShips] = useState<Cruise[]>([]);
  const [upcomingTours, setUpcomingTours] = useState<PublicTour[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);

  // Modals
  const [selectedTicketBooking, setSelectedTicketBooking] = useState<Booking | null>(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [copiedCoupon, setCopiedCoupon] = useState<string | null>(null);

  // Review modal
  const [reviewBooking, setReviewBooking] = useState<Booking | null>(null);
  const [ratingVal, setRatingVal] = useState<number>(5);
  const [commentVal, setCommentVal] = useState<string>('');
  const [hasComplaint, setHasComplaint] = useState<boolean>(false);
  const [complaintCategory, setComplaintCategory] = useState<string>('Cleanliness & Hygiene');
  const [complaintText, setComplaintText] = useState<string>('');
  const [reviewSubmitting, setReviewSubmitting] = useState<boolean>(false);

  // Profile Form state
  const [profileFirstName, setProfileFirstName] = useState(user?.first_name || '');
  const [profileLastName, setProfileLastName] = useState(user?.last_name || '');
  const [profileEmail, setProfileEmail] = useState(user?.email || '');
  const [profilePhone, setProfilePhone] = useState(user?.phone || '');
  const [profileAddress, setProfileAddress] = useState(user?.address || '');
  const [profilePassword, setProfilePassword] = useState('');
  const [showProfilePassword, setShowProfilePassword] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ text: string; isError?: boolean } | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);

  // Sync user state to form
  useEffect(() => {
    if (user) {
      setProfileFirstName(user.first_name || '');
      setProfileLastName(user.last_name || '');
      setProfileEmail(user.email || '');
      setProfilePhone(user.phone || '');
      setProfileAddress(user.address || '');
    }
  }, [user]);

  // Sync tab parameter from URL
  useEffect(() => {
    if (tabParam) {
      if (['tickets', 'invoices'].includes(tabParam)) {
        setActiveSubTab('bookings');
      } else if (['home', 'bookings', 'favorites', 'offers', 'profile'].includes(tabParam)) {
        setActiveSubTab(tabParam as UserSubTab);
      }
    }
  }, [tabParam]);

  // Auto-open boarding pass modal with confetti when redirected after booking
  useEffect(() => {
    if (targetBookingId && bookings.length > 0) {
      const match = bookings.find((b) => b.booking_id === targetBookingId || String(b.id) === targetBookingId);
      if (match) {
        if (autoOpenPass) {
          setSelectedTicketBooking(match);
          try {
            confetti({
              particleCount: 120,
              spread: 80,
              origin: { y: 0.5 },
              colors: ['#0284c7', '#38bdf8', '#10b981', '#f59e0b'],
            });
          } catch {
            // ignore confetti error if any
          }
        }
      }
    }
  }, [targetBookingId, bookings, autoOpenPass]);

  const fetchBookings = () => {
    setLoading(true);
    getMyBookings()
      .then((res) => {
        const raw = res.bookings || [];
        const sorted = [...raw].sort((a, b) => {
          const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
          const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
          if (bTime !== aTime) return bTime - aTime;
          return (Number(b.id) || 0) - (Number(a.id) || 0);
        });
        setBookings(sorted);
      })
      .catch((err) => console.error('Failed to load my bookings:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchBookings();
    getCruises({ sort_by: 'rating' })
      .then((res) => setRecommendedShips(res.cruises.slice(0, 3)))
      .catch((err) => console.error('Failed to load recommended ships:', err));

    getTours()
      .then((res) => setUpcomingTours(res.tours.slice(0, 4)))
      .catch((err) => console.error('Failed to load upcoming tours:', err));

    getActiveOffers()
      .then((res) => setOffers(Array.isArray(res) ? res : ((res as any).offers || [])))
      .catch((err) => console.error('Failed to load offers:', err));
  }, []);

  const handleCancelBooking = async (bookingId: string) => {
    if (!window.confirm(`Are you sure you wish to cancel reservation #${bookingId}?`)) return;
    try {
      await cancelBooking(bookingId);
      fetchBookings();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel reservation.');
    }
  };

  const handleToggleWhatsAppOpt = async (booking: Booking) => {
    try {
      const nextOpt = !booking.whatsapp_reminder_opt_in;
      const res = await updateBookingWhatsAppOpt(booking.booking_id, nextOpt);
      alert(res.message);
      fetchBookings();
    } catch (err: any) {
      alert(err.message || 'Failed to update WhatsApp preferences.');
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewBooking) return;
    setReviewSubmitting(true);
    try {
      const res = await submitReview(reviewBooking.booking_id, ratingVal, commentVal, {
        has_complaint: hasComplaint,
        complaint_category: complaintCategory,
        complaint_text: complaintText || commentVal,
      });
      alert(res.message || 'Review submitted successfully!');
      setReviewBooking(null);
      setCommentVal('');
      setHasComplaint(false);
      setComplaintCategory('Cleanliness & Hygiene');
      setComplaintText('');
      fetchBookings();
    } catch (err: any) {
      alert(err.message || 'Failed to submit review.');
    } finally {
      setReviewSubmitting(false);
    }
  };

  const handleCopyCoupon = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCoupon(code);
    setTimeout(() => setCopiedCoupon(null), 2500);
  };

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

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // Booking Categorization
  const upcomingBookings = bookings.filter(
    (b) => b.booking_date >= todayStr && b.status !== 'CANCELLED' && b.status !== 'COMPLETED'
  );
  const activeBookings = bookings.filter(
    (b) => b.status === 'CONFIRMED' || b.tracking_status === 'BOARDING' || b.tracking_status === 'DEPARTED'
  );
  const completedBookings = bookings.filter((b) => b.status === 'COMPLETED' || b.tracking_status === 'COMPLETED');
  const cancelledBookings = bookings.filter((b) => b.status === 'CANCELLED');
  const publicTickets = bookings.filter((b) => b.booking_type === 'TOUR' || b.booking_type === 'CRUISE_TOUR');
  const charterBookings = bookings.filter((b) => b.booking_type === 'EVENT' || b.booking_type === 'PRIVATE_EVENT');


  // User Travel Analytics & Charts Computation
  const analyticsData = React.useMemo(() => {
    const validBookings = bookings.filter((b) => b.status !== 'CANCELLED');
    const totalSpent = validBookings.reduce((sum, b) => sum + (Number(b.total_price) || 0), 0);
    const totalDiscount = validBookings.reduce((sum, b) => sum + (Number(b.discount_amount) || 0), 0);
    const totalGuests = validBookings.reduce((sum, b) => sum + (Number(b.passengers_count || b.number_of_people) || 1), 0);
    const totalDaysOnWater = validBookings.reduce((sum, b) => sum + (Number(b.duration_days) || 1), 0);

    // 1. Monthly Spending & Trips Trend
    const monthsOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthMap: Record<string, { label: string; spent: number; count: number }> = {};
    monthsOrder.forEach((m) => {
      monthMap[m] = { label: m, spent: 0, count: 0 };
    });

    bookings.forEach((b) => {
      if (b.booking_date) {
        const d = new Date(b.booking_date);
        const mIdx = d.getMonth();
        const mName = monthsOrder[mIdx] || 'Oct';
        if (!monthMap[mName]) {
          monthMap[mName] = { label: mName, spent: 0, count: 0 };
        }
        if (b.status !== 'CANCELLED') {
          monthMap[mName].spent += Number(b.total_price) || 0;
        }
        monthMap[mName].count += 1;
      }
    });

    const monthlyTrend = monthsOrder.map((m) => monthMap[m]);
    const maxMonthlySpent = Math.max(...monthlyTrend.map((m) => m.spent), 1000);

    // 2. Private Charters vs Public Tours
    const privateBookings = bookings.filter((b) => b.booking_type === 'EVENT' || b.booking_type === 'PRIVATE_EVENT');
    const tourBookings = bookings.filter((b) => b.booking_type === 'TOUR' || b.booking_type === 'CRUISE_TOUR');
    const privateSpent = privateBookings.filter((b) => b.status !== 'CANCELLED').reduce((s, b) => s + (Number(b.total_price) || 0), 0);
    const tourSpent = tourBookings.filter((b) => b.status !== 'CANCELLED').reduce((s, b) => s + (Number(b.total_price) || 0), 0);
    const totalTypeCount = Math.max(1, privateBookings.length + tourBookings.length);
    const privatePercent = Math.round((privateBookings.length / totalTypeCount) * 100);
    const tourPercent = 100 - privatePercent;

    // 3. Status breakdown
    const statusCounts = {
      CONFIRMED: bookings.filter((b) => b.status === 'CONFIRMED').length,
      COMPLETED: bookings.filter((b) => b.status === 'COMPLETED').length,
      PENDING: bookings.filter((b) => b.status === 'PENDING').length,
      CANCELLED: bookings.filter((b) => b.status === 'CANCELLED').length,
    };

    // 4. Destinations visited
    const destMap: Record<string, { count: number; spent: number }> = {};
    bookings.forEach((b) => {
      const dest = b.destination || 'Arabian Sea';
      if (!destMap[dest]) {
        destMap[dest] = { count: 0, spent: 0 };
      }
      destMap[dest].count += 1;
      if (b.status !== 'CANCELLED') {
        destMap[dest].spent += Number(b.total_price) || 0;
      }
    });
    const topDestinations = Object.entries(destMap)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const maxDestCount = Math.max(...topDestinations.map((d) => d.count), 1);

    return {
      totalSpent,
      totalDiscount,
      totalGuests,
      totalDaysOnWater,
      monthlyTrend,
      maxMonthlySpent,
      privateCount: privateBookings.length,
      tourCount: tourBookings.length,
      privateSpent,
      tourSpent,
      privatePercent,
      tourPercent,
      statusCounts,
      topDestinations,
      maxDestCount,
    };
  }, [bookings]);

  // Filtered list for 'bookings' tab with search query support
  const getFilteredBookings = () => {
    let list = bookings;
    switch (bookingFilter) {
      case 'UPCOMING':
        list = upcomingBookings;
        break;
      case 'ACTIVE':
        list = activeBookings;
        break;
      case 'COMPLETED':
        list = completedBookings;
        break;
      case 'CANCELLED':
        list = cancelledBookings;
        break;
      default:
        list = bookings;
        break;
    }
    if (bookingSearch.trim()) {
      const q = bookingSearch.trim().toLowerCase();
      list = list.filter(
        (b) =>
          b.booking_id.toLowerCase().includes(q) ||
          b.cruise_name.toLowerCase().includes(q) ||
          (b.ticket_code && b.ticket_code.toLowerCase().includes(q)) ||
          b.destination.toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => {
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
      if (bTime !== aTime) return bTime - aTime;
      return (Number(b.id) || 0) - (Number(a.id) || 0);
    });
  };

  return (
    <div
      className="min-h-screen pt-28 pb-20 bg-[#f8f9fa] text-[#051833] max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 selection:bg-[#0284c7]/20 selection:text-[#051833]"
      style={{
        backgroundImage:
          'radial-gradient(circle at 85% 15%, rgba(2, 132, 199, 0.07) 0%, transparent 45%), radial-gradient(circle at 15% 85%, rgba(255, 248, 220, 0.55) 0%, transparent 50%)',
      }}
    >
      {/* 0. NEWLY BOOKED / TARGET TICKET CELEBRATION NOTIFICATION */}
      {targetBookingId && (
        <div className="mb-6 p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-[#030d1c] via-[#051833] to-[#0a2548] text-[#fff8dc] shadow-xl shadow-[#051833]/15 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-[#0284c7]/30 animate-in fade-in duration-300">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/20">
              <CheckCircle2 className="w-6 h-6 text-[#63B8F0]" />
            </div>
            <div>
              <span className="text-[10px] font-mono tracking-widest font-black uppercase text-[#63B8F0] block">
                BOOKING CONFIRMED & TICKET ISSUED
              </span>
              <h4 className="text-base font-bold text-[#F8FCFF]">
                Reservation Reference #{targetBookingId}
              </h4>
              <p className="text-xs text-[#F8FCFF]/80">
                Your official boarding pass with scannable gate QR code has been generated and is ready for boarding.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <button
              onClick={() => {
                const found = bookings.find((b) => b.booking_id === targetBookingId || String(b.id) === targetBookingId);
                if (found) setSelectedTicketBooking(found);
              }}
              className="px-5 py-2.5 rounded-full bg-[#F8FCFF] text-[#082F5B] text-xs font-bold hover:bg-[#EAF4FB] shadow-md transition flex items-center gap-1.5 cursor-pointer"
            >
              <Ticket className="w-4 h-4 text-[#1677C8]" />
              <span>Open Boarding Pass</span>
            </button>
            <button
              onClick={() => {
                const nextParams = new URLSearchParams(searchParams);
                nextParams.delete('booking_id');
                nextParams.delete('openPass');
                setSearchParams(nextParams);
              }}
              className="p-2 rounded-full text-[#F8FCFF]/70 hover:bg-white/10 transition cursor-pointer"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 1. CUSTOMER IDENTITY & WELCOME HEADER (OD Studio Luxury Style) */}
      <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-6 sm:p-8 border border-[#0284c7]/20 shadow-xl shadow-[#051833]/5 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-sky-50 text-[#0284c7] text-xs font-bold uppercase tracking-wider mb-2 border border-[#0284c7]/25">
            <Anchor className="w-3.5 h-3.5 text-[#0284c7]" />
            Passenger & Charter Client Hub
          </div>
          <h1 className="text-2xl sm:text-4xl font-black font-serif text-[#051833] tracking-tight">
            Welcome, {user?.first_name || user?.username}!
          </h1>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-2 font-medium">
            <span>Passholder: {user?.email}</span>
            <span>•</span>
            <span className="text-[#0284c7] font-bold">Pass ID: CR-{(user?.id || 1).toString().padStart(6, '0')}</span>
          </p>
        </div>

        {/* Overview KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
          <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-[#0284c7]/15 shadow-sm">
            <span className="text-[10px] uppercase font-bold text-slate-500 block tracking-wider">Upcoming</span>
            <span className="font-mono-numbers text-2xl font-black text-[#051833]">{upcomingBookings.length}</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-[#0284c7]/15 shadow-sm">
            <span className="text-[10px] uppercase font-bold text-slate-500 block tracking-wider">Active</span>
            <span className="font-mono-numbers text-2xl font-black text-[#0284c7]">{activeBookings.length}</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-[#0284c7]/15 shadow-sm">
            <span className="text-[10px] uppercase font-bold text-slate-500 block tracking-wider">Completed</span>
            <span className="font-mono-numbers text-2xl font-black text-emerald-600">{completedBookings.length}</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-[#0284c7]/15 shadow-sm">
            <span className="text-[10px] uppercase font-bold text-slate-500 block tracking-wider">Total</span>
            <span className="font-mono-numbers text-2xl font-black text-[#051833]">{bookings.length}</span>
          </div>
          <button
            type="button"
            onClick={() => setActiveSubTab('favorites')}
            className={`p-3.5 rounded-2xl border shadow-sm transition cursor-pointer text-center group ${
              activeSubTab === 'favorites'
                ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-300/50'
                : 'bg-slate-50/80 border-[#0284c7]/15 hover:bg-rose-50/50 hover:border-rose-200'
            }`}
          >
            <span className="text-[10px] uppercase font-bold text-slate-500 group-hover:text-rose-600 block tracking-wider flex items-center justify-center gap-1">
              <Heart className="w-3 h-3 text-rose-500 fill-rose-500" /> Saved
            </span>
            <span className="font-mono-numbers text-2xl font-black text-rose-600">{favorites.length}</span>
          </button>
        </div>
      </div>

      {/* 2. SUB-NAVIGATION TABS BAR (Clean White Dock & Deep Navy Pill) */}
      <div className="inline-flex items-center gap-1.5 p-1.5 rounded-full bg-white/90 border border-[#0284c7]/20 shadow-md shadow-[#051833]/5 backdrop-blur-md mb-8 overflow-x-auto text-xs font-bold max-w-full">
        {[
          { id: 'home', label: 'Dashboard Home', icon: BarChart3 },
          { id: 'bookings', label: `My Bookings (${bookings.length})`, icon: Calendar },
          { id: 'favorites', label: `Saved Ships (${favorites.length})`, icon: Heart },
          { id: 'offers', label: `Offers (${offers.length})`, icon: Tag },
          { id: 'profile', label: 'Passenger Profile', icon: UserIcon },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as UserSubTab)}
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

      {/* TAB 1: DASHBOARD HOME */}
      {activeSubTab === 'home' && (
        <div className="space-y-8">
          {/* 📊 PASSENGER TRAVEL ANALYTICS & INSIGHTS (Visual Charts) 📊 */}
          <div className="space-y-6">
            {/* Header banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-[#082F5B] text-[#63B8F0] shadow-md flex items-center justify-center">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-extrabold text-[#102B46] tracking-tight">
                      Travel Spending Analytics
                    </h3>
                    <p className="text-xs text-[#102B46]/60">
                      Real-time interactive analysis of your maritime bookings, expenditure, and destinations.
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#EAF4FB] text-[#082F5B] border border-[#082F5B]/10 text-xs font-bold shadow-sm">
                  <Activity className="w-3.5 h-3.5 text-[#1677C8]" />
                  <span>{bookings.length} Total Bookings</span>
                </span>
              </div>
            </div>

            {/* Top 4 Passenger KPI Metric Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl p-5 border border-[#0284c7]/20 shadow-sm space-y-1.5 hover:border-[#0284c7]/50 hover:shadow-md transition">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Total Trips</span>
                  <Calendar className="w-4 h-4 text-[#0284c7]" />
                </div>
                <div className="font-mono-numbers text-3xl font-black text-[#051833]">{bookings.length}</div>
                <p className="text-[11px] text-slate-500 font-medium">
                  {analyticsData.statusCounts.COMPLETED} completed • {analyticsData.statusCounts.CONFIRMED} confirmed
                </p>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-[#0284c7]/20 shadow-sm space-y-1.5 hover:border-[#0284c7]/50 hover:shadow-md transition">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Total Spend</span>
                  <TrendingUp className="w-4 h-4 text-[#0284c7]" />
                </div>
                <div className="font-mono-numbers text-3xl font-black text-[#051833]">
                  {formatINR(analyticsData.totalSpent)}
                </div>
                <p className="text-[11px] text-[#0284c7] font-bold">
                  All valid charters & tours
                </p>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-[#0284c7]/20 shadow-sm space-y-1.5 hover:border-[#0284c7]/50 hover:shadow-md transition">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Promo Savings</span>
                  <Tag className="w-4 h-4 text-[#0284c7]" />
                </div>
                <div className="font-mono-numbers text-3xl font-black text-emerald-600">
                  {formatINR(analyticsData.totalDiscount)}
                </div>
                <p className="text-[11px] text-slate-600 font-semibold">
                  Saved with coupon codes
                </p>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-[#0284c7]/20 shadow-sm space-y-1.5 hover:border-[#0284c7]/50 hover:shadow-md transition">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Sea Milestones</span>
                  <Award className="w-4 h-4 text-[#0284c7]" />
                </div>
                <div className="font-mono-numbers text-3xl font-black text-[#051833]">
                  {analyticsData.totalDaysOnWater} Days
                </div>
                <p className="text-[11px] text-slate-600 font-semibold">
                  {analyticsData.totalGuests} passenger guests hosted
                </p>
              </div>
            </div>

            {/* Dual Chart Row 1: Monthly Spend Trend & Trip Type Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Chart 1: Monthly Travel Spend (2 columns) */}
              <div className="lg:col-span-2 bg-[#F8FCFF] rounded-3xl p-6 sm:p-7 border border-[#082F5B]/10 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-extrabold text-base text-[#102B46] flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-[#1677C8]" />
                      <span>Monthly Trip Spending & Bookings</span>
                    </h4>
                    <p className="text-xs text-[#102B46]/60">Travel spending across months in ₹ INR with booking frequency</p>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="inline-flex items-center gap-1.5 text-[#102B46] font-semibold">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#1677C8]" /> Spending
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-[#102B46] font-semibold">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#082F5B]" /> Trips
                    </span>
                  </div>
                </div>

                {/* Vertical Bar Chart */}
                <div className="pt-4 pb-2">
                  <div className="h-56 flex items-end justify-between gap-1.5 sm:gap-2 border-b border-[#082F5B]/10 px-2">
                    {analyticsData.monthlyTrend.map((m, idx) => {
                      const spendHeight = Math.max(4, Math.round((m.spent / analyticsData.maxMonthlySpent) * 100));
                      const tripsHeight = Math.max(0, Math.min(100, m.count * 18));
                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group relative">
                          {/* Tooltip */}
                          <div className="absolute -top-16 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-[#061D36] text-[#F8FCFF] text-[10px] rounded-xl p-2 whitespace-nowrap z-30 shadow-xl border border-[#63B8F0]/30">
                            <p className="font-bold text-[#F8FCFF]">{m.label}: {m.count} Trips</p>
                            <p className="text-[#63B8F0] font-bold">Spent: {formatINR(m.spent)}</p>
                          </div>

                          {/* Bars */}
                          <div className="w-full flex items-end justify-center gap-1 h-full">
                            <div
                              className="w-1/2 bg-[#1677C8] hover:bg-[#63B8F0] rounded-t-md transition-all duration-300 cursor-pointer shadow-sm"
                              style={{ height: `${m.spent > 0 ? spendHeight : 4}%` }}
                            />
                            {m.count > 0 && (
                              <div
                                className="w-1/2 bg-[#082F5B] hover:bg-[#1677C8] rounded-t-md transition-all duration-300 cursor-pointer shadow-sm"
                                style={{ height: `${tripsHeight}%` }}
                              />
                            )}
                          </div>
                          <span className="text-[10px] font-bold text-[#102B46]/60 mt-2 block truncate">
                            {m.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Chart 2: Category Ratio (Charters vs Scheduled Tours) (1 column) */}
              <div className="bg-[#F8FCFF] rounded-3xl p-6 sm:p-7 border border-[#082F5B]/10 shadow-sm space-y-5 flex flex-col justify-between">
                <div>
                  <h4 className="font-extrabold text-base text-[#102B46] flex items-center gap-2">
                    <PieChart className="w-4 h-4 text-[#1677C8]" />
                    <span>Trip Category Ratio</span>
                  </h4>
                  <p className="text-xs text-[#102B46]/60">Private ship charters vs public scheduled tours</p>

                  {/* Visual Split Bar */}
                  <div className="mt-5 space-y-2">
                    <div className="h-4 w-full bg-[#EAF4FB] rounded-full overflow-hidden flex shadow-inner">
                      <div
                        className="h-full bg-[#1677C8] hover:bg-[#63B8F0] transition-all duration-500 cursor-pointer"
                        style={{ width: `${analyticsData.privatePercent}%` }}
                        title={`Private Charters: ${analyticsData.privatePercent}%`}
                      />
                      <div
                        className="h-full bg-[#082F5B] hover:bg-[#1677C8] transition-all duration-500 cursor-pointer"
                        style={{ width: `${analyticsData.tourPercent}%` }}
                        title={`Public Tours: ${analyticsData.tourPercent}%`}
                      />
                    </div>
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-[#1677C8]">{analyticsData.privatePercent}% Charters</span>
                      <span className="text-[#082F5B]">{analyticsData.tourPercent}% Tours</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="p-3.5 rounded-2xl bg-[#EAF4FB] border border-[#082F5B]/10 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-[#102B46] block">Private Event Charters</span>
                      <span className="text-[11px] text-[#102B46]/60">{analyticsData.privateCount} ships chartered</span>
                    </div>
                    <span className="font-black text-sm text-[#1677C8]">{formatINR(analyticsData.privateSpent)}</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[#EAF4FB] border border-[#082F5B]/10 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-[#102B46] block">Scheduled Cruise Tours</span>
                      <span className="text-[11px] text-[#102B46]/60">{analyticsData.tourCount} tour tickets booked</span>
                    </div>
                    <span className="font-black text-sm text-[#082F5B]">{formatINR(analyticsData.tourSpent)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Dual Chart Row 2: Status Breakdown & Top Destinations */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Chart 3: Booking Status Breakdown */}
              <div className="bg-[#F8FCFF] rounded-3xl p-6 sm:p-7 border border-[#082F5B]/10 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-extrabold text-base text-[#102B46] flex items-center gap-2">
                      <Activity className="w-4 h-4 text-[#1677C8]" />
                      <span>Reservation Lifecycle Breakdown</span>
                    </h4>
                    <p className="text-xs text-[#102B46]/60">Current status distribution of your maritime reservations</p>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  {[
                    { label: 'Confirmed (Upcoming)', count: analyticsData.statusCounts.CONFIRMED, color: 'bg-emerald-500' },
                    { label: 'Completed Trips', count: analyticsData.statusCounts.COMPLETED, color: 'bg-[#1677C8]' },
                    { label: 'Pending Confirmation', count: analyticsData.statusCounts.PENDING, color: 'bg-amber-500' },
                    { label: 'Cancelled / Refunded', count: analyticsData.statusCounts.CANCELLED, color: 'bg-rose-500' },
                  ].map((st, i) => {
                    const pct = bookings.length > 0 ? Math.round((st.count / bookings.length) * 100) : 0;
                    return (
                      <div key={i} className="space-y-1.5">
                        <div className="flex justify-between items-center text-xs font-bold">
                          <span className="flex items-center gap-1.5 text-[#102B46]">
                            <span className={`w-2.5 h-2.5 rounded-full ${st.color}`} />
                            {st.label}
                          </span>
                          <span className="text-[#102B46] font-mono">
                            {st.count} ({pct}%)
                          </span>
                        </div>
                        <div className="h-2 w-full bg-[#EAF4FB] rounded-full overflow-hidden">
                          <div
                            className={`h-full ${st.color} transition-all duration-500`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Chart 4: Top Explored Maritime Destinations */}
              <div className="bg-[#F8FCFF] rounded-3xl p-6 sm:p-7 border border-[#082F5B]/10 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-extrabold text-base text-[#102B46] flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-[#1677C8]" />
                      <span>Top Explored Maritime Destinations</span>
                    </h4>
                    <p className="text-xs text-[#102B46]/60">Your most frequented coastal cruise ports and destinations</p>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  {analyticsData.topDestinations.length === 0 ? (
                    <div className="p-8 text-center text-xs text-[#102B46]/40">No destination data logged yet.</div>
                  ) : (
                    analyticsData.topDestinations.map((d, i) => {
                      const destPct = Math.round((d.count / analyticsData.maxDestCount) * 100);
                      return (
                        <div key={i} className="space-y-1.5">
                          <div className="flex justify-between items-center text-xs font-bold">
                            <span className="flex items-center gap-1.5 text-[#102B46]">
                              <span className="text-[#1677C8] font-mono">#{i + 1}</span>
                              {d.name}
                            </span>
                            <span className="text-[#102B46]/60 text-[11px] font-mono">
                              {d.count} {d.count === 1 ? 'Trip' : 'Trips'} • {formatINR(d.spent)}
                            </span>
                          </div>
                          <div className="h-2 w-full bg-[#EAF4FB] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-[#1677C8] to-[#63B8F0] rounded-full transition-all duration-500"
                              style={{ width: `${destPct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Access: Saved Favorite Ships */}
          {favorites.length > 0 && (
            <div className="bg-[#F8FCFF] rounded-3xl p-6 sm:p-7 border border-[#082F5B]/10 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="font-extrabold text-base text-[#102B46] flex items-center gap-2">
                    <Heart className="w-4 h-4 fill-rose-500 text-rose-500" />
                    <span>Saved Ships ({favorites.length})</span>
                  </h4>
                  <p className="text-xs text-[#102B46]/60">Your bookmarked luxury vessels ready for your next charter or voyage</p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveSubTab('favorites')}
                  className="self-start sm:self-auto px-4 py-1.5 rounded-full bg-white border border-[#082F5B]/15 hover:bg-[#EAF4FB] text-xs font-bold text-[#102B46] transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <span>View All ({favorites.length})</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#1677C8]" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
                {favorites.slice(0, 3).map((item) => (
                  <CruiseCard
                    key={item.id || item.cruise_id}
                    cruise={item.cruise}
                    onSelect={onSelectCruise}
                    onBookNow={onBookCruise}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MY BOOKINGS */}
      {activeSubTab === 'bookings' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
            <div className="flex items-center gap-2 overflow-x-auto text-xs font-bold pb-1">
              {[
                { id: 'ALL', label: `All Bookings (${bookings.length})` },
                { id: 'UPCOMING', label: `Upcoming (${upcomingBookings.length})` },
                { id: 'ACTIVE', label: `Active (${activeBookings.length})` },
                { id: 'COMPLETED', label: `Completed (${completedBookings.length})` },
                { id: 'CANCELLED', label: `Cancelled (${cancelledBookings.length})` },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setBookingFilter(f.id as any)}
                  className={`px-4 py-2 rounded-full transition cursor-pointer whitespace-nowrap text-xs font-bold ${
                    bookingFilter === f.id
                      ? 'bg-[#1677C8] text-[#F8FCFF] shadow-sm shadow-[#1677C8]/25'
                      : 'bg-[#F8FCFF] border border-[#082F5B]/10 text-[#102B46]/70 hover:bg-[#EAF4FB] hover:text-[#102B46]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Search filter input */}
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 text-[#102B46]/50 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by ID, ship, ticket code..."
                value={bookingSearch}
                onChange={(e) => setBookingSearch(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 bg-[#F8FCFF] rounded-full border border-[#082F5B]/15 text-xs text-[#102B46] placeholder-[#102B46]/40 focus:outline-none focus:border-[#1677C8] transition shadow-sm"
              />
            </div>
          </div>

          {loading ? (
            <div className="py-24 text-center">
              <div className="w-10 h-10 mx-auto border-4 border-[#1677C8] border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-4 text-xs font-bold text-[#102B46]/60 uppercase tracking-widest">Loading Your Reservations...</p>
            </div>
          ) : getFilteredBookings().length === 0 ? (
            <div className="py-20 text-center bg-[#F8FCFF] rounded-3xl border border-[#082F5B]/10 p-8 space-y-3">
              <Ship className="w-12 h-12 mx-auto text-[#102B46]/30" />
              <h3 className="text-base font-bold text-[#102B46]">No Reservations Found in this Filter</h3>
              <p className="text-xs text-[#102B46]/60 max-w-sm mx-auto">
                Explore our luxury fleet of boats and cruise ships or book passenger cabins.
              </p>
              <button
                type="button"
                onClick={onExplore}
                className="mt-3 px-6 py-2.5 rounded-full bg-[#1677C8] hover:bg-[#082F5B] text-[#F8FCFF] font-bold text-xs shadow-md transition cursor-pointer"
              >
                Explore Luxury Ships
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {getFilteredBookings().map((b) => {
                const isTarget = targetBookingId === b.booking_id;
                return (
                  <div
                    key={b.id}
                    className={`bg-[#F8FCFF] rounded-3xl border shadow-sm p-6 sm:p-7 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between transition group hover:border-[#63B8F0] ${
                      isTarget
                        ? 'border-[#1677C8] ring-2 ring-[#63B8F0]/50 shadow-[#1677C8]/10'
                        : 'border-[#082F5B]/10'
                    }`}
                  >
                    <div className="flex gap-4 sm:gap-5 items-center">
                      <div className="w-24 h-24 rounded-2xl overflow-hidden shrink-0 border border-[#082F5B]/10 bg-[#EAF4FB]">
                        <img
                          src={b.cruise_image || '/static/images/vessels/cordelia_empress.jpg'}
                          alt={b.cruise_name}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                          onError={(e) => {
                            const target = e.currentTarget;
                            if (!target.src.includes('placeholder.png')) {
                              target.src = '/static/images/placeholder.png';
                            }
                          }}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-[#082F5B] bg-[#EAF4FB] border border-[#082F5B]/10 px-2.5 py-0.5 rounded-full">
                            #{b.booking_id}
                          </span>
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                              b.status === 'CONFIRMED'
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : b.status === 'COMPLETED'
                                ? 'bg-[#EAF4FB] text-[#082F5B] border border-[#082F5B]/15'
                                : b.status === 'CANCELLED'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {b.status}
                          </span>
                          <span className="text-[10px] font-bold text-[#102B46]/70 bg-[#EAF4FB] px-2.5 py-0.5 rounded-full uppercase border border-[#082F5B]/10">
                            {b.booking_type === 'EVENT' ? 'Private Charter' : 'Public Tour Ticket'}
                          </span>
                          {b.ticket_code && (
                            <span className="text-[10px] font-mono font-bold text-[#082F5B] bg-[#63B8F0]/20 px-2.5 py-0.5 rounded-full border border-[#63B8F0]/30">
                              {b.ticket_code}
                            </span>
                          )}
                        </div>

                        <h3 className="text-lg font-bold text-[#102B46]">{b.cruise_title || b.cruise_name}</h3>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-[#102B46]/60 pt-0.5">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-[#1677C8]" />
                            {b.departure_port} → {b.destination}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-[#1677C8]" />
                            <span>{b.booking_date}</span>
                            {b.return_date && b.return_date !== b.booking_date && (
                              <span>- {b.return_date}</span>
                            )}
                          </span>
                          <span className="flex items-center gap-1 font-semibold text-[#1677C8]">
                            <Anchor className="w-3.5 h-3.5 text-[#1677C8]" />
                            <span>{b.duration_display || (b.duration_days ? `${b.duration_days} Days` : `${b.duration_hours || 4}h`)}</span>
                          </span>
                          <span className="font-semibold text-[#102B46]">
                            {b.cabin_name || b.cabin_type || 'Cabin'} • {b.passengers_count || b.number_of_people} Guests
                          </span>
                        </div>

                        {b.tracking_status && b.status !== 'CANCELLED' && (
                          <div className="pt-1 flex items-center gap-2 text-[11px] text-[#102B46]/70 font-semibold">
                            <Compass className="w-3.5 h-3.5 text-[#1677C8] animate-spin" />
                            <span>Trip Status:</span>
                            <span className="text-[#1677C8] font-bold uppercase tracking-wider">{b.tracking_status}</span>
                          </div>
                        )}

                        {/* WhatsApp 24h Tour Reminder Status & Controls */}
                        {b.status !== 'CANCELLED' && (
                          <div className="pt-2 mt-2 border-t border-[#082F5B]/10 flex flex-wrap items-center gap-2 text-xs">
                            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EAF4FB] border border-[#082F5B]/10 text-[#082F5B]">
                              <MessageSquare className="w-3.5 h-3.5 text-[#1677C8] shrink-0" />
                              {b.whatsapp_reminder_sent ? (
                                <span className="font-bold flex items-center gap-1 text-[11px]">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  24h Reminder Dispatched
                                </span>
                              ) : b.whatsapp_reminder_opt_in ? (
                                <span className="font-semibold text-[11px] flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                  <span>24h Reminder Active:</span>
                                  <code className="font-mono font-bold bg-[#F8FCFF] px-1.5 py-0.5 rounded border border-[#082F5B]/10">
                                    {b.customer_whatsapp_masked || b.customer_whatsapp || 'Saved Mobile'}
                                  </code>
                                </span>
                              ) : (
                                <span className="text-[11px] text-[#102B46]/60 font-medium">
                                  Reminders: <span className="font-bold text-amber-600">Opted Out</span>
                                </span>
                              )}
                            </div>

                            {/* Opt-In / Opt-Out Action */}
                            {!b.whatsapp_reminder_sent && (
                              <button
                                type="button"
                                onClick={() => handleToggleWhatsAppOpt(b)}
                                className="px-3 py-1 rounded-full bg-[#F8FCFF] border border-[#082F5B]/15 hover:bg-[#EAF4FB] text-[11px] font-bold text-[#102B46] transition cursor-pointer"
                              >
                                {b.whatsapp_reminder_opt_in ? 'Opt Out' : 'Opt In'}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="w-full md:w-auto flex md:flex-col justify-between md:items-end gap-3 border-t md:border-t-0 pt-4 md:pt-0 border-[#082F5B]/10">
                      <div className="text-left md:text-right">
                        <span className="text-[10px] uppercase font-bold text-[#102B46]/60 block tracking-wider">Total Paid</span>
                        <span className="text-2xl font-black text-[#102B46]">{formatINR(b.total_price)}</span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedTicketBooking(b)}
                          className="px-4 py-2 rounded-full bg-[#051833] hover:bg-[#0a2548] text-[#fff8dc] text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-[#051833]/20"
                        >
                          <Ticket className="w-3.5 h-3.5 text-[#fff8dc]" />
                          <span>Boarding Pass (QR)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedInvoiceId(b.booking_id)}
                          className="px-4 py-2 rounded-full bg-white hover:bg-slate-50 text-[#051833] border border-black/80 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5 text-[#0284c7]" />
                          <span>Invoice</span>
                        </button>

                        {(b.can_review || ((b.status === 'CONFIRMED' || b.status === 'COMPLETED') && !b.review)) && (
                          <button
                            type="button"
                            onClick={() => {
                              setReviewBooking(b);
                              setRatingVal(5);
                              setCommentVal('');
                              setHasComplaint(false);
                              setComplaintCategory('Cleanliness & Hygiene');
                              setComplaintText('');
                            }}
                            className="px-3.5 py-2 rounded-full bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                            title="Rate voyage or report passenger grievance"
                          >
                            <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                            <span>Review / Complaint</span>
                          </button>
                        )}

                        {b.review && (
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
                              <Star className="w-3 h-3 fill-emerald-600 text-emerald-600" />
                              {b.review.rating}★ Reviewed
                            </span>
                            {b.review.has_complaint && (
                              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border flex items-center gap-1 ${
                                b.review.complaint_status === 'WARNING_SENT'
                                  ? 'bg-amber-50 text-amber-900 border-amber-300'
                                  : 'bg-rose-50 text-rose-800 border-rose-200'
                              }`}>
                                <AlertTriangle className="w-3 h-3 text-rose-600" />
                                {b.review.complaint_status === 'WARNING_SENT'
                                  ? 'Owner Warned by Admin'
                                  : 'Complaint Under Review'}
                              </span>
                            )}
                          </div>
                        )}

                        {b.is_cancellable && (
                          <button
                            type="button"
                            onClick={() => handleCancelBooking(b.booking_id)}
                            className="px-3.5 py-2 rounded-full text-rose-600 hover:bg-rose-50 text-xs font-semibold transition cursor-pointer"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: FAVORITE / SAVED SHIPS */}
      {activeSubTab === 'favorites' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-700 text-xs font-bold uppercase tracking-wider mb-1 border border-rose-200">
                <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
                Wishlist & Saved Fleet
              </div>
              <h2 className="text-2xl font-extrabold text-[#102B46] tracking-tight">
                Favorite Cruise Ships & Yachts
              </h2>
              <p className="text-xs text-[#102B46]/60 mt-0.5">
                Vessels you have saved to your passenger account for private charters and sea voyages.
              </p>
            </div>
            {favorites.length > 0 && (
              <button
                type="button"
                onClick={onExplore}
                className="self-start sm:self-auto px-5 py-2.5 rounded-full bg-[#1677C8] hover:bg-[#082F5B] text-[#F8FCFF] text-xs font-bold shadow-md transition flex items-center gap-1.5 cursor-pointer"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Explore More Ships</span>
              </button>
            )}
          </div>

          {favoritesLoading ? (
            <div className="py-24 text-center">
              <div className="w-10 h-10 mx-auto border-4 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-4 text-xs font-bold text-[#102B46]/60 uppercase tracking-widest">Loading Favorite Ships...</p>
            </div>
          ) : favorites.length === 0 ? (
            <div className="py-20 text-center bg-[#F8FCFF] rounded-3xl border border-[#082F5B]/10 p-8 space-y-4">
              <div className="w-16 h-16 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center mx-auto text-rose-500">
                <Heart className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-[#102B46]">No Favorite Ships Saved Yet</h3>
                <p className="text-xs text-[#102B46]/60 max-w-md mx-auto">
                  Browse our premier fleet of luxury yachts, cruise liners, and expedition vessels. Click the heart icon on any ship card or detail page to save it to your passenger panel.
                </p>
              </div>
              <button
                type="button"
                onClick={onExplore}
                className="mt-2 px-6 py-2.5 rounded-full bg-[#1677C8] hover:bg-[#082F5B] text-[#F8FCFF] font-bold text-xs shadow-md transition cursor-pointer inline-flex items-center gap-2"
              >
                <Ship className="w-4 h-4" />
                <span>Explore Fleet & Save Ships</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {favorites.map((item) => (
                <CruiseCard
                  key={item.id || item.cruise_id}
                  cruise={item.cruise}
                  onSelect={onSelectCruise}
                  onBookNow={onBookCruise}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: SPECIAL OFFERS */}
      {activeSubTab === 'offers' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-extrabold text-[#102B46] tracking-tight">Verified Promotional Vouchers</h2>
            <p className="text-xs text-[#102B46]/60 mt-0.5">
              Platform-wide discount coupons applicable during online checkout in INR (₹).
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {offers.map((offer) => (
              <div
                key={offer.id}
                className="bg-[#F8FCFF] rounded-3xl p-6 sm:p-7 border border-[#082F5B]/10 shadow-sm flex flex-col justify-between space-y-4 hover:border-[#63B8F0] transition"
              >
                <div className="space-y-2">
                  <span className="px-3 py-1 rounded-full bg-[#EAF4FB] text-[#1677C8] border border-[#1677C8]/25 text-xs font-bold uppercase tracking-wider inline-block">
                    {offer.discount_type === 'PERCENTAGE' ? `${offer.discount_value}% OFF` : `₹${offer.discount_value} FLAT DISCOUNT`}
                  </span>
                  <h3 className="text-lg font-bold text-[#102B46]">{offer.title}</h3>
                  <p className="text-xs text-[#102B46]/70 leading-relaxed">{offer.description}</p>
                  <p className="text-[11px] text-[#102B46]/50">
                    Min Booking: <strong>{formatINR(offer.min_booking_amount)}</strong> • Expires: {offer.valid_to}
                  </p>
                </div>

                <div className="pt-3 border-t border-[#082F5B]/10 flex items-center justify-between">
                  <code className="text-sm font-mono font-bold text-[#082F5B] bg-[#EAF4FB] px-3 py-1.5 rounded-xl border border-[#082F5B]/15">
                    {offer.code}
                  </code>
                  <button
                    onClick={() => handleCopyCoupon(offer.code)}
                    className="px-4 py-2 rounded-full bg-[#082F5B] text-[#F8FCFF] text-xs font-bold hover:bg-[#1677C8] transition cursor-pointer"
                  >
                    {copiedCoupon === offer.code ? 'Copied!' : 'Copy Code'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: PASSENGER PROFILE */}
      {activeSubTab === 'profile' && (
        <div className="max-w-2xl bg-[#F8FCFF] rounded-3xl p-8 sm:p-9 border border-[#082F5B]/10 shadow-sm space-y-6">
          <div>
            <h2 className="text-2xl font-extrabold text-[#102B46] tracking-tight">Passenger Profile & Preferences</h2>
            <p className="text-xs text-[#102B46]/60 mt-0.5">
              Update your contact details, emergency phone number, and security credentials.
            </p>
          </div>

          {profileMsg && (
            <div
              className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center gap-2 ${
                profileMsg.isError ? 'bg-rose-50 text-rose-800 border border-rose-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              }`}
            >
              {profileMsg.isError ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
              <span>{profileMsg.text}</span>
            </div>
          )}

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[#102B46]/80 block mb-1">First Name</label>
                <input
                  type="text"
                  required
                  value={profileFirstName}
                  onChange={(e) => setProfileFirstName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl bg-white border border-[#082F5B]/15 text-sm text-[#102B46] focus:outline-none focus:border-[#1677C8] transition"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[#102B46]/80 block mb-1">Last Name</label>
                <input
                  type="text"
                  value={profileLastName}
                  onChange={(e) => setProfileLastName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl bg-white border border-[#082F5B]/15 text-sm text-[#102B46] focus:outline-none focus:border-[#1677C8] transition"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-[#102B46]/80 block mb-1">Email Address</label>
              <input
                type="email"
                required
                value={profileEmail}
                onChange={(e) => setProfileEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl bg-white border border-[#082F5B]/15 text-sm text-[#102B46] focus:outline-none focus:border-[#1677C8] transition"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-[#102B46]/80 block mb-1">Phone Number</label>
              <input
                type="text"
                placeholder="+91 98765 43210"
                value={profilePhone}
                onChange={(e) => setProfilePhone(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl bg-white border border-[#082F5B]/15 text-sm text-[#102B46] focus:outline-none focus:border-[#1677C8] transition"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-[#102B46]/80 block mb-1">Billing / Residential Address</label>
              <textarea
                rows={3}
                placeholder="Street address, City, State, PIN Code"
                value={profileAddress}
                onChange={(e) => setProfileAddress(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl bg-white border border-[#082F5B]/15 text-sm text-[#102B46] focus:outline-none focus:border-[#1677C8] transition"
              />
            </div>

            <div className="pt-2 border-t border-[#082F5B]/10">
              <label className="text-xs font-bold uppercase tracking-wider text-[#102B46]/80 block mb-1">
                Change Password (Leave blank to keep current)
              </label>
              <div className="relative">
                <input
                  type={showProfilePassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={profilePassword}
                  onChange={(e) => setProfilePassword(e.target.value)}
                  className="w-full pl-4 pr-10 py-2.5 rounded-2xl bg-white border border-[#082F5B]/15 text-sm text-[#102B46] focus:outline-none focus:border-[#1677C8] transition"
                />
                <button
                  type="button"
                  onClick={() => setShowProfilePassword(!showProfilePassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 transition cursor-pointer"
                  title={showProfilePassword ? 'Hide password' : 'Show password'}
                  aria-label={showProfilePassword ? 'Hide password' : 'Show password'}
                >
                  {showProfilePassword ? <EyeOff className="w-4 h-4 text-[#1677C8]" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-3">
              <button
                type="submit"
                disabled={profileSaving}
                className="px-7 py-3 rounded-full bg-[#1677C8] hover:bg-[#082F5B] text-[#F8FCFF] font-bold text-xs transition cursor-pointer shadow-md disabled:opacity-50"
              >
                {profileSaving ? 'Saving Changes...' : 'Save Profile Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODALS */}
      {selectedTicketBooking && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto"
          onClick={() => setSelectedTicketBooking(null)}
        >
          <div
            className="relative w-full max-w-2xl my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <TicketPass
              booking={selectedTicketBooking}
              onClose={() => setSelectedTicketBooking(null)}
              onViewInvoice={() => {
                const bId = selectedTicketBooking.booking_id;
                setSelectedTicketBooking(null);
                setSelectedInvoiceId(bId);
              }}
            />
          </div>
        </div>
      )}

      {selectedInvoiceId && (
        <InvoiceModal
          bookingId={selectedInvoiceId}
          onClose={() => setSelectedInvoiceId(null)}
        />
      )}

      {reviewBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#061D36]/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#F8FCFF] rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-[#082F5B]/15 space-y-4 text-[#102B46]">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-lg text-[#102B46]">
                Review Your Trip on {reviewBooking.cruise_name}
              </h3>
              <button
                onClick={() => setReviewBooking(null)}
                className="p-1 rounded-full text-[#102B46]/50 hover:text-[#102B46] hover:bg-[#EAF4FB]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitReview} className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[#102B46]/70 block mb-1">
                  Overall Rating (1 to 5 Stars)
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      type="button"
                      key={s}
                      onClick={() => setRatingVal(s)}
                      className="p-1 cursor-pointer transition hover:scale-110"
                    >
                      <Star
                        className={`w-7 h-7 ${
                          s <= ratingVal ? 'fill-[#1677C8] text-[#1677C8]' : 'text-slate-200'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[#102B46]/70 block mb-1">
                  Your Passenger Feedback
                </label>
                <textarea
                  required
                  rows={3}
                  value={commentVal}
                  onChange={(e) => setCommentVal(e.target.value)}
                  placeholder="Share details about the ship amenities, crew service, dining, and scenic route..."
                  className="w-full p-3.5 rounded-2xl bg-white border border-[#082F5B]/15 text-sm text-[#102B46] focus:outline-none focus:border-[#1677C8] transition"
                />
              </div>

              {/* Passenger Complaint & Grievance Option */}
              <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-200 space-y-3">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasComplaint}
                    onChange={(e) => setHasComplaint(e.target.checked)}
                    className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-rose-300"
                  />
                  <span className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    File a Formal Complaint / Grievance against this Vessel
                  </span>
                </label>

                {hasComplaint && (
                  <div className="space-y-3 pt-2 border-t border-rose-200/60 animate-in fade-in duration-150">
                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-wider text-rose-950 block mb-1">
                        Complaint Category
                      </label>
                      <select
                        value={complaintCategory}
                        onChange={(e) => setComplaintCategory(e.target.value)}
                        className="w-full p-2.5 rounded-xl bg-white border border-rose-300 text-xs text-[#102B46] focus:outline-none focus:border-rose-600 font-semibold"
                      >
                        <option value="Cleanliness & Hygiene">Cleanliness & Hygiene</option>
                        <option value="Crew & Staff Behavior">Crew & Staff Behavior</option>
                        <option value="Safety & Security Concerns">Safety & Security Concerns</option>
                        <option value="Voyage Delay / Technical Issue">Voyage Delay / Technical Issue</option>
                        <option value="Food & Dining Quality">Food & Dining Quality</option>
                        <option value="Amenities Missing / Broken">Amenities Missing / Broken</option>
                        <option value="Overcharging / Billing Grievance">Overcharging / Billing Grievance</option>
                        <option value="Other Passenger Grievance">Other Passenger Grievance</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-wider text-rose-950 block mb-1">
                        Complaint Details & Incident Description
                      </label>
                      <textarea
                        rows={3}
                        required={hasComplaint}
                        value={complaintText}
                        onChange={(e) => setComplaintText(e.target.value)}
                        placeholder="Describe the issue or grievance faced during travel so safety moderation can inspect and issue a warning to the ship owner..."
                        className="w-full p-3 rounded-xl bg-white border border-rose-300 text-xs text-[#102B46] focus:outline-none focus:border-rose-600"
                      />
                    </div>

                    <p className="text-[11px] text-rose-700 font-medium">
                      ⚠️ Platform Administration reviews every complaint and dispatches official compliance warnings to ship operators.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setReviewBooking(null);
                    setHasComplaint(false);
                    setComplaintText('');
                  }}
                  className="px-4 py-2 rounded-full text-xs font-bold text-[#102B46]/70 hover:bg-[#EAF4FB] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reviewSubmitting}
                  className={`px-5 py-2.5 rounded-full font-bold text-xs text-white transition shadow-sm cursor-pointer disabled:opacity-50 ${
                    hasComplaint
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : 'bg-[#1677C8] hover:bg-[#082F5B]'
                  }`}
                >
                  {reviewSubmitting
                    ? 'Submitting...'
                    : hasComplaint
                    ? 'Submit Review & File Complaint'
                    : 'Post Verified Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
