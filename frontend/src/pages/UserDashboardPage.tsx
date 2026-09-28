import React, { useState, useEffect } from 'react';
import { getMyBookings, cancelBooking, submitReview } from '../api/bookings';
import { Booking } from '../api/types';
import { useAuth } from '../context/AuthContext';
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
  Compass
} from 'lucide-react';
import { formatINR } from '../utils/currency';

interface UserDashboardPageProps {
  onExplore: () => void;
}

export const UserDashboardPage: React.FC<UserDashboardPageProps> = ({ onExplore }) => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'UPCOMING' | 'PAST' | 'CHARTERS' | 'TOURS'>('UPCOMING');

  // Modals
  const [selectedTicketBooking, setSelectedTicketBooking] = useState<Booking | null>(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);

  // Review modal
  const [reviewBooking, setReviewBooking] = useState<Booking | null>(null);
  const [ratingVal, setRatingVal] = useState<number>(5);
  const [commentVal, setCommentVal] = useState<string>('');
  const [reviewSubmitting, setReviewSubmitting] = useState<boolean>(false);

  const fetchBookings = () => {
    setLoading(true);
    getMyBookings()
      .then((res) => setBookings(res.bookings || []))
      .catch((err) => console.error('Failed to load my bookings:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchBookings();
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

  const todayStr = new Date().toISOString().split('T')[0];

  const upcomingBookings = bookings.filter(
    (b) => b.booking_date >= todayStr && b.status !== 'CANCELLED' && b.status !== 'COMPLETED'
  );
  const pastBookings = bookings.filter(
    (b) => b.booking_date < todayStr || b.status === 'COMPLETED' || b.status === 'CANCELLED'
  );
  const charterBookings = bookings.filter(
    (b) => b.booking_type === 'EVENT' || b.booking_type === 'PRIVATE_EVENT'
  );
  const tourBookings = bookings.filter(
    (b) => b.booking_type === 'TOUR' || b.booking_type === 'CRUISE_TOUR'
  );

  let displayedBookings: Booking[] = [];
  if (activeTab === 'UPCOMING') displayedBookings = upcomingBookings;
  else if (activeTab === 'PAST') displayedBookings = pastBookings;
  else if (activeTab === 'CHARTERS') displayedBookings = charterBookings;
  else if (activeTab === 'TOURS') displayedBookings = tourBookings;

  return (
    <div className="min-h-screen pt-28 pb-20 bg-slate-50/70 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header Profile Summary */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <span className="text-xs font-bold text-sky-700 uppercase tracking-widest block">
            MY VOYAGES & STATEROOM LOG
          </span>
          <h1 className="text-2xl sm:text-4xl font-display font-black text-slate-900 mt-1 font-serif">
            Welcome, {user?.first_name || user?.username}!
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Account Email: {user?.email} • Verified Passenger Profile
          </p>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-3 gap-3 text-center sm:text-left">
          <div className="p-3.5 rounded-2xl bg-sky-50 border border-sky-100">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Upcoming</span>
            <span className="text-xl font-black text-sky-800">{upcomingBookings.length}</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Charters</span>
            <span className="text-xl font-black text-slate-900">{charterBookings.length}</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-100">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Tours</span>
            <span className="text-xl font-black text-emerald-800">{tourBookings.length}</span>
          </div>
        </div>
      </div>

      {/* Tabs Row */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-4 mb-8 overflow-x-auto text-xs font-bold">
        {[
          { id: 'UPCOMING', label: `Upcoming Voyages (${upcomingBookings.length})` },
          { id: 'TOURS', label: `Public Tour Tickets (${tourBookings.length})` },
          { id: 'CHARTERS', label: `Private Charters (${charterBookings.length})` },
          { id: 'PAST', label: `Past & Cancelled (${pastBookings.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-xl transition cursor-pointer whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-sky-500 text-white shadow-sm shadow-sky-500/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Booking List Cards */}
      {loading ? (
        <div className="py-24 text-center">
          <div className="w-10 h-10 mx-auto border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Loading Your Reservations...</p>
        </div>
      ) : displayedBookings.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-3xl border border-slate-200/80 p-8">
          <Ship className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <h3 className="text-lg font-bold text-slate-800">No bookings in this section</h3>
          <p className="text-xs text-slate-500 mt-1">Discover luxury cruise ships and scheduled public voyages departing soon.</p>
          <button
            onClick={onExplore}
            className="mt-5 px-6 py-2.5 rounded-2xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold transition shadow-sm"
          >
            Explore Fleet & Tours
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {displayedBookings.map((b) => {
            const isCharter = b.booking_type === 'EVENT' || b.booking_type === 'PRIVATE_EVENT';
            return (
              <div
                key={b.id}
                className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm hover:shadow-md transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-6"
              >
                {/* Left: Thumbnail & Route Details */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                  <div className="w-full sm:w-28 h-28 rounded-2xl overflow-hidden bg-slate-100 shrink-0">
                    <img
                      src={b.cruise_image || 'https://images.unsplash.com/photo-1548574505-5e239809ee19?auto=format&fit=crop&w=400&q=80'}
                      alt={b.cruise_title}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          b.status === 'CONFIRMED'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : b.status === 'COMPLETED'
                            ? 'bg-slate-100 text-slate-800 border border-slate-300'
                            : b.status === 'PENDING'
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-rose-100 text-rose-800 border border-rose-300'
                        }`}
                      >
                        {b.status}
                      </span>
                      <span className="text-xs font-mono font-bold text-slate-500">REF #{b.booking_id}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold uppercase">
                        {isCharter ? 'Private Charter' : 'Public Tour Ticket'}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-slate-900 font-serif">{b.cruise_title}</h3>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 font-medium">
                      <span className="flex items-center gap-1 text-sky-700 font-semibold">
                        <MapPin className="w-3.5 h-3.5 text-sky-500" />
                        {b.departure_port} → {b.destination}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {b.booking_date}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {b.start_time} - {b.end_time}
                      </span>
                      <span className="font-semibold text-slate-800">
                        {b.cabin_name || b.cabin_type || 'Stateroom'} • {b.passengers_count || b.number_of_people} Guests
                      </span>
                    </div>

                    {/* Voyage Tracking Progress */}
                    {b.tracking_status && b.status !== 'CANCELLED' && (
                      <div className="pt-1 flex items-center gap-2 text-[11px] text-slate-500 font-semibold">
                        <Compass className="w-3.5 h-3.5 text-sky-500 animate-spin-slow" />
                        <span>Voyage State:</span>
                        <span className="text-sky-700 font-bold uppercase tracking-wider">{b.tracking_status}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Price & Action Buttons */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between lg:justify-end gap-6 pt-4 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                  <div className="lg:text-right">
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">Paid Total</span>
                    <span className="text-xl font-black text-sky-700 font-serif">
                      {formatINR(b.total_price)}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* View Boarding Pass */}
                    <button
                      onClick={() => setSelectedTicketBooking(b)}
                      className="px-3.5 py-2 rounded-xl bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-800 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Ticket className="w-3.5 h-3.5 text-sky-600" />
                      <span>Boarding Pass</span>
                    </button>

                    {/* View GST Tax Invoice */}
                    <button
                      onClick={() => setSelectedInvoiceId(b.booking_id)}
                      className="px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5 text-slate-600" />
                      <span>Tax Invoice</span>
                    </button>

                    {/* Review Button if completed */}
                    {b.status === 'COMPLETED' && !b.review && (
                      <button
                        onClick={() => setReviewBooking(b)}
                        className="px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                      >
                        <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                        <span>Review</span>
                      </button>
                    )}

                    {/* Cancel Action if permitted */}
                    {b.status === 'PENDING' && (
                      <button
                        onClick={() => handleCancelBooking(b.booking_id)}
                        className="px-3 py-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold transition cursor-pointer"
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

      {/* Ticket Pass Modal */}
      {selectedTicketBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-2xl my-8">
            <button
              onClick={() => setSelectedTicketBooking(null)}
              className="absolute -top-3 -right-3 z-10 p-2 rounded-full bg-white text-slate-700 hover:text-slate-900 shadow-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <TicketPass
              booking={selectedTicketBooking}
              onViewInvoice={() => {
                const id = selectedTicketBooking.booking_id;
                setSelectedTicketBooking(null);
                setSelectedInvoiceId(id);
              }}
            />
          </div>
        </div>
      )}

      {/* Invoice Modal */}
      {selectedInvoiceId && (
        <InvoiceModal
          bookingId={selectedInvoiceId}
          onClose={() => setSelectedInvoiceId(null)}
        />
      )}

      {/* Review Modal */}
      {reviewBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold font-serif text-slate-900">Review {reviewBooking.cruise_title}</h3>
              <button onClick={() => setReviewBooking(null)} className="p-1 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitReview} className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-2">Rating</label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setRatingVal(num)}
                      className={`p-2 rounded-xl transition ${ratingVal >= num ? 'text-amber-500' : 'text-slate-300'}`}
                    >
                      <Star className="w-6 h-6 fill-current" />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1">Your Feedback</label>
                <textarea
                  rows={4}
                  required
                  value={commentVal}
                  onChange={(e) => setCommentVal(e.target.value)}
                  placeholder="Share details of your cruise voyage experience..."
                  className="w-full p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:border-sky-500"
                />
              </div>

              <button
                type="submit"
                disabled={reviewSubmitting}
                className="w-full py-3.5 rounded-2xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs shadow-md transition disabled:opacity-50"
              >
                {reviewSubmitting ? 'Publishing Review...' : 'Publish Voyage Review'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
