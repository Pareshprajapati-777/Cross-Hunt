import React, { useState, useEffect } from 'react';
import { getMyBookings, cancelBooking, submitReview } from '../api/bookings';
import { getCruises } from '../api/cruises';
import { getTours } from '../api/tours';
import { getActiveOffers } from '../api/offers';
import { updateUserProfile } from '../api/auth';
import { Booking, Cruise, PublicTour, Offer } from '../api/types';
import { useAuth } from '../context/AuthContext';
import { TicketPass } from '../components/ticket/TicketPass';
import { InvoiceModal } from '../components/ticket/InvoiceModal';
import { RequirementSearch } from '../components/home/RequirementSearch';
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
  Copy,
  Search,
  Waves,
  ArrowRight,
  Anchor
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
  | 'find-ship'
  | 'tours'
  | 'bookings'
  | 'tickets'
  | 'invoices'
  | 'offers'
  | 'profile';

export const UserDashboardPage: React.FC<UserDashboardPageProps> = ({
  onExplore,
  onSelectCruise,
  onSelectTour,
  onBookTour,
}) => {
  const { user, refreshUser } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<UserSubTab>('home');

  // Bookings state
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [bookingFilter, setBookingFilter] = useState<'ALL' | 'UPCOMING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'>('ALL');

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
  const [reviewSubmitting, setReviewSubmitting] = useState<boolean>(false);

  // Profile Form state
  const [profileFirstName, setProfileFirstName] = useState(user?.first_name || '');
  const [profileLastName, setProfileLastName] = useState(user?.last_name || '');
  const [profileEmail, setProfileEmail] = useState(user?.email || '');
  const [profilePhone, setProfilePhone] = useState(user?.phone || '');
  const [profileAddress, setProfileAddress] = useState(user?.address || '');
  const [profilePassword, setProfilePassword] = useState('');
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

  const fetchBookings = () => {
    setLoading(true);
    getMyBookings()
      .then((res) => setBookings(res.bookings || []))
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

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewBooking) return;
    setReviewSubmitting(true);
    try {
      await submitReview(reviewBooking.booking_id, ratingVal, commentVal);
      setReviewBooking(null);
      setCommentVal('');
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

  const todayStr = new Date().toISOString().split('T')[0];

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

  // Next upcoming booking highlight
  const nextVoyage = upcomingBookings.length > 0 ? upcomingBookings[0] : null;

  // Filtered list for 'bookings' tab
  const getFilteredBookings = () => {
    switch (bookingFilter) {
      case 'UPCOMING':
        return upcomingBookings;
      case 'ACTIVE':
        return activeBookings;
      case 'COMPLETED':
        return completedBookings;
      case 'CANCELLED':
        return cancelledBookings;
      default:
        return bookings;
    }
  };

  return (
    <div className="min-h-screen pt-28 pb-20 bg-slate-50/70 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* 1. CUSTOMER IDENTITY & WELCOME HEADER */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-sky-200/80 shadow-sm mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-100 text-sky-800 text-xs font-bold uppercase tracking-wider mb-2 border border-sky-200">
            <Anchor className="w-3.5 h-3.5 text-sky-600" />
            Passenger & Charter Client Hub
          </div>
          <h1 className="text-2xl sm:text-4xl font-display font-black text-slate-900 tracking-tight font-serif">
            Welcome, {user?.first_name || user?.username}!
          </h1>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
            <span>Passholder: {user?.email}</span>
            <span>•</span>
            <span className="text-sky-700 font-semibold">Pass ID: CR-{(user?.id || 1).toString().padStart(6, '0')}</span>
          </p>
        </div>

        {/* Overview KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div className="p-3 rounded-2xl bg-sky-50 border border-sky-100">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Upcoming</span>
            <span className="text-xl font-black text-sky-800">{upcomingBookings.length}</span>
          </div>
          <div className="p-3 rounded-2xl bg-blue-50 border border-blue-100">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Active</span>
            <span className="text-xl font-black text-blue-800">{activeBookings.length}</span>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-100">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Completed</span>
            <span className="text-xl font-black text-emerald-800">{completedBookings.length}</span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Total</span>
            <span className="text-xl font-black text-slate-800">{bookings.length}</span>
          </div>
        </div>
      </div>

      {/* 2. SUB-NAVIGATION TABS BAR */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 mb-8 overflow-x-auto text-xs font-bold">
        {[
          { id: 'home', label: 'Dashboard Home', icon: Ship },
          { id: 'find-ship', label: 'Find a Ship', icon: Search },
          { id: 'tours', label: 'Upcoming Tours', icon: Waves },
          { id: 'bookings', label: `My Bookings (${bookings.length})`, icon: Calendar },
          { id: 'tickets', label: `My Tickets (${publicTickets.length})`, icon: Ticket },
          { id: 'invoices', label: `My Invoices (${bookings.length})`, icon: FileText },
          { id: 'offers', label: `Offers (${offers.length})`, icon: Tag },
          { id: 'profile', label: 'Passenger Profile', icon: UserIcon },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as UserSubTab)}
              className={`px-4 py-2.5 rounded-xl transition flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-sky-500 text-white shadow-sm shadow-sky-500/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
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
        <div className="space-y-10">
          {/* Next Upcoming Voyage Hero Banner */}
          {nextVoyage ? (
            <div className="bg-gradient-to-r from-sky-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-xl border border-sky-800">
              <div className="absolute right-0 top-0 bottom-0 w-1/2 opacity-20 pointer-events-none hidden lg:block">
                <img
                  src={nextVoyage.cruise_image || 'https://images.unsplash.com/photo-1548574505-5e239809ee19?auto=format&fit=crop&w=1200&q=80'}
                  alt={nextVoyage.cruise_name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="relative z-10 max-w-2xl space-y-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/30 text-sky-200 text-xs font-bold uppercase tracking-wider border border-sky-400/40">
                  <Clock className="w-3.5 h-3.5 text-sky-300" />
                  Next Departure Imminent
                </span>
                <h2 className="text-2xl sm:text-3xl font-black font-serif">
                  {nextVoyage.cruise_name}
                </h2>
                <p className="text-sky-100 text-sm">
                  {nextVoyage.route || `${nextVoyage.departure_port} → ${nextVoyage.destination}`} • Departure Date: <strong className="text-white">{nextVoyage.booking_date}</strong>
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                  <div className="p-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/10">
                    <span className="text-[10px] uppercase font-bold text-sky-200 block">Stateroom</span>
                    <span className="font-bold text-sm">{nextVoyage.cabin_name || nextVoyage.cabin_type || 'Standard Suite'}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/10">
                    <span className="text-[10px] uppercase font-bold text-sky-200 block">Passengers</span>
                    <span className="font-bold text-sm">{nextVoyage.passengers_count || nextVoyage.number_of_people} Guests</span>
                  </div>
                  <div className="p-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/10">
                    <span className="text-[10px] uppercase font-bold text-sky-200 block">Booking Reference</span>
                    <span className="font-bold text-sm text-sky-300">#{nextVoyage.booking_id}</span>
                  </div>
                </div>

                <div className="pt-2 flex flex-wrap gap-3">
                  <button
                    onClick={() => setSelectedTicketBooking(nextVoyage)}
                    className="px-5 py-2.5 rounded-xl bg-sky-400 hover:bg-sky-300 text-slate-950 text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-md"
                  >
                    <Ticket className="w-4 h-4" />
                    <span>View Digital Boarding Pass</span>
                  </button>
                  <button
                    onClick={() => setSelectedInvoiceId(nextVoyage.booking_id)}
                    className="px-5 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/20 text-xs font-bold transition flex items-center gap-2 cursor-pointer"
                  >
                    <FileText className="w-4 h-4" />
                    <span>Tax Invoice</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center space-y-4 shadow-sm">
              <Compass className="w-12 h-12 mx-auto text-sky-600 animate-pulse" />
              <h2 className="text-xl font-bold text-slate-900 font-serif">No Upcoming Voyages Scheduled</h2>
              <p className="text-slate-500 text-xs max-w-md mx-auto">
                Ready for the open sea? Book a private milestone charter for weddings and galas, or grab stateroom tickets for scheduled cruise tours.
              </p>
              <div className="flex justify-center gap-3 pt-2">
                <button
                  onClick={() => setActiveSubTab('find-ship')}
                  className="px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold transition cursor-pointer shadow-sm"
                >
                  Find a Ship
                </button>
                <button
                  onClick={() => setActiveSubTab('tours')}
                  className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition cursor-pointer"
                >
                  Browse Tours
                </button>
              </div>
            </div>
          )}

          {/* Available Offers Grid */}
          {offers.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 font-serif flex items-center gap-2">
                    <Tag className="w-4 h-4 text-amber-500" />
                    Active Passenger Promos & Coupons
                  </h3>
                  <p className="text-xs text-slate-500">Apply these verified codes during checkout for instant savings in ₹ INR.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {offers.map((offer) => (
                  <div key={offer.id} className="p-5 rounded-2xl bg-white border border-sky-100 shadow-sm relative overflow-hidden flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-bold uppercase tracking-wider">
                          {offer.discount_type === 'PERCENTAGE' ? `${offer.discount_value}% OFF` : `₹${offer.discount_value} OFF`}
                        </span>
                        <span className="text-[10px] text-slate-400">Valid to {offer.valid_to}</span>
                      </div>
                      <h4 className="font-bold text-sm text-slate-900">{offer.title}</h4>
                      <p className="text-xs text-slate-500 leading-relaxed">{offer.description}</p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <code className="text-xs font-mono font-bold text-sky-700 bg-sky-50 px-2.5 py-1 rounded-md border border-sky-200">
                        {offer.code}
                      </code>
                      <button
                        onClick={() => handleCopyCoupon(offer.code)}
                        className="text-xs font-bold text-slate-600 hover:text-sky-600 transition flex items-center gap-1 cursor-pointer"
                      >
                        {copiedCoupon === offer.code ? (
                          <span className="text-emerald-600 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Copied!
                          </span>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" /> Copy Code
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommended Ships & Tours */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900 font-serif flex items-center gap-2">
                  <Anchor className="w-4 h-4 text-sky-600" />
                  Recommended Vessels for Private Charter
                </h3>
                <button
                  onClick={onExplore}
                  className="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1 cursor-pointer"
                >
                  View All Ships <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-3">
                {recommendedShips.map((ship) => (
                  <div
                    key={ship.id}
                    className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-4 hover:border-sky-300 transition"
                  >
                    <img
                      src={ship.image || (ship as any).image_url || 'https://images.unsplash.com/photo-1548574505-5e239809ee19?auto=format&fit=crop&w=300&q=80'}
                      alt={ship.name}
                      className="w-20 h-20 rounded-xl object-cover shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm text-slate-900 truncate font-serif">{ship.name}</h4>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-slate-400" /> {ship.location} • Up to {ship.capacity} Guests
                      </p>
                      <p className="text-xs font-black text-slate-900 mt-1">
                        {formatINR(ship.price)} <span className="text-[10px] font-normal text-slate-400">/ day</span>
                      </p>
                    </div>
                    <button
                      onClick={() => onSelectCruise ? onSelectCruise(ship) : onExplore()}
                      className="px-3.5 py-1.5 rounded-xl border border-sky-200 text-sky-700 hover:bg-sky-50 text-xs font-bold transition cursor-pointer shrink-0"
                    >
                      Inspect Ship
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900 font-serif flex items-center gap-2">
                  <Waves className="w-4 h-4 text-sky-600" />
                  Featured Scheduled Tours
                </h3>
                <button
                  onClick={() => setActiveSubTab('tours')}
                  className="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1 cursor-pointer"
                >
                  View All Tours <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-3">
                {upcomingTours.map((tour) => (
                  <div
                    key={tour.id}
                    className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-4 hover:border-sky-300 transition"
                  >
                    <img
                      src={tour.ship_image || 'https://images.unsplash.com/photo-1548574505-5e239809ee19?auto=format&fit=crop&w=300&q=80'}
                      alt={tour.tour_title}
                      className="w-20 h-20 rounded-xl object-cover shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded">
                          {tour.duration_days} Days
                        </span>
                        <span className="text-[10px] font-bold text-emerald-700">
                          {tour.remaining_capacity} Seats Left
                        </span>
                      </div>
                      <h4 className="font-bold text-sm text-slate-900 truncate font-serif mt-1">{tour.tour_title}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {tour.departure_port} → {tour.destination} ({tour.departure_date})
                      </p>
                      <p className="text-xs font-black text-slate-900 mt-1">
                        From {formatINR(tour.adult_price)} <span className="text-[10px] font-normal text-slate-400">/ adult</span>
                      </p>
                    </div>
                    <button
                      onClick={() => onSelectTour ? onSelectTour(tour) : setActiveSubTab('tours')}
                      className="px-3.5 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold transition cursor-pointer shrink-0 shadow-sm"
                    >
                      Book Ticket
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: FIND A SHIP */}
      {activeSubTab === 'find-ship' && (
        <div className="space-y-8">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-sky-100 shadow-sm">
            <div className="max-w-2xl mb-6">
              <span className="text-xs font-bold uppercase tracking-wider text-sky-700 block mb-1">
                Product A — Private Vessel Charters
              </span>
              <h2 className="text-2xl font-black text-slate-900 font-serif">
                Charter the Exact Ship for Your Occasion
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Enter your milestone celebration criteria (guest count, purpose, location, date) to match available flagships with anti-double-booking guarantee.
              </p>
            </div>

            <RequirementSearch
              onSearch={(_criteria) => {
                onExplore();
              }}
            />
          </div>
        </div>
      )}

      {/* TAB 3: UPCOMING PUBLIC TOURS */}
      {activeSubTab === 'tours' && (
        <div className="space-y-6">
          <div>
            <span className="text-xs font-bold text-sky-700 uppercase tracking-widest block">
              Product B — Scheduled Departures
            </span>
            <h2 className="text-2xl font-black text-slate-900 font-serif">
              Browse Scheduled Cruise Tours
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Reserve individual stateroom cabins on pre-scheduled maritime itineraries across India.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {upcomingTours.map((tour) => (
              <div
                key={tour.id}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex flex-col justify-between hover:shadow-md transition"
              >
                <div className="relative aspect-[16/10] overflow-hidden">
                  <img
                    src={tour.ship_image || 'https://images.unsplash.com/photo-1548574505-5e239809ee19?auto=format&fit=crop&w=600&q=80'}
                    alt={tour.tour_title}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 left-3">
                    <span className="px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-white text-[10px] font-bold uppercase">
                      {tour.ship_name}
                    </span>
                  </div>
                  <div className="absolute top-3 right-3">
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500 text-white text-[10px] font-bold uppercase">
                      {tour.remaining_capacity} Seats Left
                    </span>
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <p className="text-[11px] font-bold text-sky-700 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {tour.departure_port} → {tour.destination}
                    </p>
                    <h3 className="font-bold text-base text-slate-900 font-serif mt-1">{tour.tour_title}</h3>
                    <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100 mt-3">
                      <span className="flex items-center gap-1 text-slate-600">
                        <Calendar className="w-3.5 h-3.5 text-sky-500" />
                        {tour.departure_date}
                      </span>
                      <span className="flex items-center gap-1 text-slate-600">
                        <Clock className="w-3.5 h-3.5 text-sky-500" />
                        {tour.duration_days} Days Voyage
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">From</span>
                      <span className="text-lg font-black text-slate-900">{formatINR(tour.adult_price)}</span>
                      <span className="text-[10px] text-slate-400 block">/ adult</span>
                    </div>

                    <button
                      onClick={() => onBookTour ? onBookTour(tour) : onExplore()}
                      className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold transition cursor-pointer shadow-sm"
                    >
                      Book Ticket
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: MY BOOKINGS */}
      {activeSubTab === 'bookings' && (
        <div className="space-y-6">
          <div className="flex items-center gap-2 overflow-x-auto text-xs font-bold pb-2">
            {[
              { id: 'ALL', label: `All Bookings (${bookings.length})` },
              { id: 'UPCOMING', label: `Upcoming (${upcomingBookings.length})` },
              { id: 'ACTIVE', label: `Active (${activeBookings.length})` },
              { id: 'COMPLETED', label: `Completed (${completedBookings.length})` },
              { id: 'CANCELLED', label: `Cancelled (${cancelledBookings.length})` },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setBookingFilter(f.id as any)}
                className={`px-3.5 py-1.5 rounded-xl transition cursor-pointer ${
                  bookingFilter === f.id
                    ? 'bg-slate-900 text-white'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="py-24 text-center">
              <div className="w-10 h-10 mx-auto border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Loading Your Reservations...</p>
            </div>
          ) : getFilteredBookings().length === 0 ? (
            <div className="py-20 text-center bg-white rounded-3xl border border-slate-200 p-8 space-y-3">
              <Ship className="w-12 h-12 mx-auto text-slate-300" />
              <h3 className="text-base font-bold text-slate-700">No Reservations Found in this Filter</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Explore our luxury fleet of ocean cruise ships or reserve individual passenger staterooms.
              </p>
              <button
                onClick={onExplore}
                className="mt-3 px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs shadow-md transition cursor-pointer"
              >
                Explore Luxury Ships
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {getFilteredBookings().map((b) => (
                <div
                  key={b.id}
                  className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between hover:border-sky-300 transition"
                >
                  <div className="flex gap-4 items-center">
                    <img
                      src={b.cruise_image || 'https://images.unsplash.com/photo-1548574505-5e239809ee19?auto=format&fit=crop&w=300&q=80'}
                      alt={b.cruise_name}
                      className="w-24 h-24 rounded-2xl object-cover shrink-0 border border-slate-100"
                    />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-sky-700 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-md">
                          #{b.booking_id}
                        </span>
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                            b.status === 'CONFIRMED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : b.status === 'COMPLETED'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : b.status === 'CANCELLED'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {b.status}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md uppercase">
                          {b.booking_type === 'EVENT' ? 'Private Charter' : 'Public Tour Ticket'}
                        </span>
                      </div>

                      <h3 className="text-lg font-bold text-slate-900 font-serif">{b.cruise_name}</h3>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-1">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          {b.departure_port} → {b.destination}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {b.booking_date}
                        </span>
                        <span className="font-semibold text-slate-800">
                          {b.cabin_name || b.cabin_type || 'Stateroom'} • {b.passengers_count || b.number_of_people} Guests
                        </span>
                      </div>

                      {b.tracking_status && b.status !== 'CANCELLED' && (
                        <div className="pt-1 flex items-center gap-2 text-[11px] text-slate-500 font-semibold">
                          <Compass className="w-3.5 h-3.5 text-sky-500 animate-spin" />
                          <span>Voyage State:</span>
                          <span className="text-sky-700 font-bold uppercase tracking-wider">{b.tracking_status}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="w-full md:w-auto flex md:flex-col justify-between md:items-end gap-3 border-t md:border-t-0 pt-4 md:pt-0 border-slate-100">
                    <div className="text-left md:text-right">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Total Paid</span>
                      <span className="text-xl font-black text-slate-900">{formatINR(b.total_price)}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => setSelectedTicketBooking(b)}
                        className="px-3.5 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                      >
                        <Ticket className="w-3.5 h-3.5" />
                        <span>Pass</span>
                      </button>

                      <button
                        onClick={() => setSelectedInvoiceId(b.booking_id)}
                        className="px-3.5 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Invoice</span>
                      </button>

                      {b.can_review && (
                        <button
                          onClick={() => {
                            setReviewBooking(b);
                            setRatingVal(5);
                            setCommentVal('');
                          }}
                          className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                        >
                          <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                          <span>Review</span>
                        </button>
                      )}

                      {b.is_cancellable && (
                        <button
                          onClick={() => handleCancelBooking(b.booking_id)}
                          className="px-3 py-1.5 rounded-xl text-rose-600 hover:bg-rose-50 text-xs font-semibold transition cursor-pointer"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: MY TICKETS */}
      {activeSubTab === 'tickets' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-black text-slate-900 font-serif">Public Cruise Digital Tickets</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Instant boarding passes with cryptographic QR verification for scheduled cruise departures.
            </p>
          </div>

          {publicTickets.length === 0 ? (
            <div className="py-20 text-center bg-white rounded-3xl border border-slate-200 p-8 space-y-3">
              <Ticket className="w-12 h-12 mx-auto text-slate-300" />
              <h3 className="text-base font-bold text-slate-700">No Cruise Tickets Issued Yet</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Book a passenger stateroom on any upcoming public cruise tour to receive digital boarding passes.
              </p>
              <button
                onClick={() => setActiveSubTab('tours')}
                className="mt-2 px-5 py-2 rounded-xl bg-sky-500 text-white font-bold text-xs cursor-pointer shadow-sm"
              >
                Browse Scheduled Departures
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {publicTickets.map((t) => (
                <div
                  key={t.id}
                  className="bg-white rounded-3xl border border-sky-200/80 shadow-sm p-6 space-y-4 hover:shadow-md transition flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-1 rounded-full bg-sky-100 text-sky-800 text-[10px] font-bold uppercase tracking-wider">
                        Boarding Pass #{t.booking_id}
                      </span>
                      <span className="text-[11px] font-mono font-bold text-slate-400">
                        QR: {(t.qr_code_hash || t.booking_id).slice(0, 10)}
                      </span>
                    </div>

                    <h3 className="text-lg font-black text-slate-900 font-serif">{t.cruise_name}</h3>
                    <p className="text-xs text-slate-600">
                      {t.departure_port} → {t.destination} • <strong>{t.booking_date}</strong>
                    </p>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-2xl border border-slate-100">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Stateroom Tier</span>
                        <span className="font-bold text-slate-800">{t.cabin_name || t.cabin_type || 'Standard Balcony'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Passengers</span>
                        <span className="font-bold text-slate-800">{t.passengers_count || t.number_of_people} Seats Reserved</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-base font-black text-slate-900">{formatINR(t.total_price)}</span>
                    <button
                      onClick={() => setSelectedTicketBooking(t)}
                      className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <Ticket className="w-4 h-4" />
                      <span>Open Boarding Pass</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 6: MY INVOICES */}
      {activeSubTab === 'invoices' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-black text-slate-900 font-serif">Official GST Maritime Tax Invoices</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Review, verify, and print compliant Indian maritime tax invoices in INR (₹) with 18% GST itemized.
            </p>
          </div>

          {bookings.length === 0 ? (
            <div className="py-20 text-center bg-white rounded-3xl border border-slate-200 p-8">
              <FileText className="w-12 h-12 mx-auto text-slate-300" />
              <h3 className="text-base font-bold text-slate-700 mt-2">No Invoices Available</h3>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3.5 px-4">Invoice #</th>
                      <th className="py-3.5 px-4">Date</th>
                      <th className="py-3.5 px-4">Vessel / Service</th>
                      <th className="py-3.5 px-4">Type</th>
                      <th className="py-3.5 px-4 text-right">Amount (₹)</th>
                      <th className="py-3.5 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {bookings.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-4 px-4 font-mono font-bold text-sky-700">
                          {b.invoice_number || `INV-2026-${b.booking_id.slice(-6).toUpperCase()}`}
                        </td>
                        <td className="py-4 px-4 text-slate-600">{b.booking_date}</td>
                        <td className="py-4 px-4 font-semibold text-slate-900">{b.cruise_name}</td>
                        <td className="py-4 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 uppercase">
                            {b.booking_type === 'EVENT' ? 'Charter' : 'Ticket'}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right font-black text-slate-900">
                          {formatINR(b.total_price)}
                        </td>
                        <td className="py-4 px-4 text-right">
                          <button
                            onClick={() => setSelectedInvoiceId(b.booking_id)}
                            className="px-3 py-1 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 font-bold text-[11px] transition cursor-pointer"
                          >
                            View Invoice
                          </button>
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

      {/* TAB 7: SPECIAL OFFERS */}
      {activeSubTab === 'offers' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-black text-slate-900 font-serif">Verified Promotional Vouchers</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Platform-wide discount coupons applicable during online checkout in INR (₹).
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {offers.map((offer) => (
              <div
                key={offer.id}
                className="bg-white rounded-3xl p-6 border border-sky-100 shadow-sm flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold uppercase tracking-wider inline-block">
                    {offer.discount_type === 'PERCENTAGE' ? `${offer.discount_value}% OFF` : `₹${offer.discount_value} FLAT DISCOUNT`}
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 font-serif">{offer.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{offer.description}</p>
                  <p className="text-[11px] text-slate-400">
                    Min Booking: <strong>{formatINR(offer.min_booking_amount)}</strong> • Expires: {offer.valid_to}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <code className="text-sm font-mono font-bold text-sky-800 bg-sky-50 px-3 py-1.5 rounded-lg border border-sky-200">
                    {offer.code}
                  </code>
                  <button
                    onClick={() => handleCopyCoupon(offer.code)}
                    className="px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition cursor-pointer"
                  >
                    {copiedCoupon === offer.code ? 'Copied!' : 'Copy Code'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 8: PASSENGER PROFILE */}
      {activeSubTab === 'profile' && (
        <div className="max-w-2xl bg-white rounded-3xl p-8 border border-slate-200/80 shadow-sm space-y-6">
          <div>
            <h2 className="text-2xl font-black text-slate-900 font-serif">Passenger Profile & Preferences</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Update your contact details, emergency maritime phone, and security credentials.
            </p>
          </div>

          {profileMsg && (
            <div
              className={`p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
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
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1">First Name</label>
                <input
                  type="text"
                  required
                  value={profileFirstName}
                  onChange={(e) => setProfileFirstName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1">Last Name</label>
                <input
                  type="text"
                  value={profileLastName}
                  onChange={(e) => setProfileLastName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1">Email Address</label>
              <input
                type="email"
                required
                value={profileEmail}
                onChange={(e) => setProfileEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1">Phone Number</label>
              <input
                type="text"
                placeholder="+91 98765 43210"
                value={profilePhone}
                onChange={(e) => setProfilePhone(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1">Billing / Residential Address</label>
              <textarea
                rows={3}
                placeholder="Street address, City, State, PIN Code"
                value={profileAddress}
                onChange={(e) => setProfileAddress(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div className="pt-2 border-t border-slate-100">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1">
                Change Password (Leave blank to keep current)
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={profilePassword}
                onChange={(e) => setProfilePassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={profileSaving}
                className="px-6 py-3 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs transition cursor-pointer shadow-md disabled:opacity-50"
              >
                {profileSaving ? 'Saving Changes...' : 'Save Profile Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODALS */}
      {selectedTicketBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg">
            <button
              onClick={() => setSelectedTicketBooking(null)}
              className="absolute -top-12 right-0 p-2 rounded-full bg-white/20 text-white hover:bg-white/30 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <TicketPass booking={selectedTicketBooking} />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-sky-100 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-extrabold text-lg text-slate-900">
                Review Your Voyage on {reviewBooking.cruise_name}
              </h3>
              <button
                onClick={() => setReviewBooking(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitReview} className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1">
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
                          s <= ratingVal ? 'fill-amber-400 text-amber-400' : 'text-slate-200'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1">
                  Your Passenger Feedback
                </label>
                <textarea
                  required
                  rows={4}
                  value={commentVal}
                  onChange={(e) => setCommentVal(e.target.value)}
                  placeholder="Share details about the vessel amenities, crew service, dining, and scenic route..."
                  className="w-full p-3 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReviewBooking(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reviewSubmitting}
                  className="px-5 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {reviewSubmitting ? 'Submitting...' : 'Post Verified Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
