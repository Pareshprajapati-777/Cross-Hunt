import React, { useState, useEffect } from 'react';
import { getMyBookings, cancelBooking, submitReview } from '../api/bookings';
import { Booking } from '../api/types';
import { useAuth } from '../context/AuthContext';
import { TicketPass } from '../components/ticket/TicketPass';
import {
  Ship,
  Calendar,
  Clock,
  MapPin,
  Ticket,
  X,
  Star,
} from 'lucide-react';

interface UserDashboardPageProps {
  onExplore: () => void;
}

export const UserDashboardPage: React.FC<UserDashboardPageProps> = ({ onExplore }) => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'UPCOMING' | 'PAST' | 'EVENTS'>('UPCOMING');

  // Modal ticket view
  const [selectedTicketBooking, setSelectedTicketBooking] = useState<Booking | null>(null);

  // Review modal
  const [reviewBooking, setReviewBooking] = useState<Booking | null>(null);
  const [ratingVal, setRatingVal] = useState<number>(5);
  const [commentVal, setCommentVal] = useState<string>('');
  const [reviewSubmitting, setReviewSubmitting] = useState<boolean>(false);

  const fetchBookings = () => {
    setLoading(true);
    getMyBookings()
      .then((res) => setBookings(res.bookings))
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
    (b) => b.booking_type === 'CRUISE_TOUR' && b.booking_date >= todayStr && b.status !== 'CANCELLED'
  );
  const pastBookings = bookings.filter(
    (b) => b.booking_type === 'CRUISE_TOUR' && (b.booking_date < todayStr || b.status === 'CANCELLED')
  );
  const eventBookings = bookings.filter((b) => b.booking_type === 'PRIVATE_EVENT');

  const displayedList =
    activeTab === 'UPCOMING'
      ? upcomingBookings
      : activeTab === 'PAST'
      ? pastBookings
      : eventBookings;

  return (
    <div className="min-h-screen pt-28 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 bg-[#f8fafc]">
      {/* Top Banner / User Identity */}
      <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-200 pb-8">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-100 border border-sky-200 text-sky-800 text-xs font-bold uppercase tracking-wider mb-2">
            <Ship className="w-3.5 h-3.5 text-sky-600" />
            Personal Voyage Center
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-black text-slate-900 tracking-tight">
            My Voyages & Stateroom Passes
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Welcome aboard, <span className="text-sky-700 font-bold">{user?.full_name || user?.username}</span>. View boarding passes, schedules, and maritime receipts.
          </p>
        </div>

        <button
          onClick={onExplore}
          className="px-6 py-3 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-display font-bold text-sm tracking-wide shadow-md shadow-sky-500/20 transition cursor-pointer self-start md:self-auto"
        >
          Book Another Voyage
        </button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-slate-200 mb-8 pb-3">
        <button
          onClick={() => setActiveTab('UPCOMING')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition cursor-pointer ${
            activeTab === 'UPCOMING'
              ? 'bg-sky-100 text-sky-800 border border-sky-300'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          Upcoming Journeys ({upcomingBookings.length})
        </button>
        <button
          onClick={() => setActiveTab('EVENTS')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition cursor-pointer ${
            activeTab === 'EVENTS'
              ? 'bg-amber-100 text-amber-800 border border-amber-300'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          Private Events ({eventBookings.length})
        </button>
        <button
          onClick={() => setActiveTab('PAST')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition cursor-pointer ${
            activeTab === 'PAST'
              ? 'bg-slate-200 text-slate-800 border border-slate-300'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          Past Trips & Archives ({pastBookings.length})
        </button>
      </div>

      {/* Bookings List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((n) => (
            <div key={n} className="h-44 rounded-3xl bg-slate-200/60 border border-slate-200 animate-pulse" />
          ))}
        </div>
      ) : displayedList.length === 0 ? (
        <div className="text-center py-20 rounded-3xl bg-white border border-sky-100 shadow-sm space-y-4">
          <Ship className="w-12 h-12 text-slate-400 mx-auto" />
          <h3 className="text-xl font-display font-bold text-slate-800">No Bookings Found in this Section</h3>
          <p className="text-slate-500 text-sm max-w-sm mx-auto">
            Ready to set sail across the seas? Explore our fleet to discover your next ocean escape.
          </p>
          <button
            onClick={onExplore}
            className="px-6 py-2.5 rounded-xl bg-sky-100 border border-sky-300 text-sky-800 text-xs font-bold hover:bg-sky-200 transition cursor-pointer"
          >
            Explore Flagship Liners
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {displayedList.map((b) => (
            <div
              key={b.id}
              className="bg-white rounded-3xl p-6 sm:p-8 border border-sky-100 shadow-md flex flex-col lg:flex-row lg:items-center justify-between gap-6 hover:border-sky-300 hover:shadow-lg transition"
            >
              {/* Left Details */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200 shadow-sm">
                  <img
                    src={b.cruise_image || '/static/images/placeholder.png'}
                    alt={b.cruise_title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1548574505-5e239809ee19?auto=format&fit=crop&w=400&q=80';
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        b.status === 'CONFIRMED'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : b.status === 'PENDING'
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : 'bg-rose-100 text-rose-800 border border-rose-300'
                      }`}
                    >
                      {b.status}
                    </span>
                    <span className="text-xs font-mono text-slate-500 font-semibold">REF #{b.booking_id}</span>
                  </div>

                  <h3 className="text-xl font-display font-bold text-slate-900">{b.cruise_title}</h3>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 font-medium">
                    <span className="flex items-center gap-1 text-sky-700 font-semibold">
                      <MapPin className="w-3.5 h-3.5 text-sky-600" />
                      {b.destination}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      {b.booking_date}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      {b.start_time} - {b.end_time}
                    </span>
                    <span>•</span>
                    <span className="text-amber-700 font-bold">
                      {b.cabin_name || (b.booking_type === 'PRIVATE_EVENT' ? 'Private Event Charter' : 'Stateroom')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Fare & Action Buttons */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between lg:justify-end gap-6 pt-4 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                <div className="lg:text-right">
                  <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block">Total Investment</span>
                  <span className="text-2xl font-display font-black text-amber-600">
                    ${Number(b.total_price).toLocaleString()}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Digital Boarding Pass Button */}
                  <button
                    onClick={() => setSelectedTicketBooking(b)}
                    className="px-4 py-2.5 rounded-xl bg-sky-50 hover:bg-sky-100 border border-sky-300 text-sky-800 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                  >
                    <Ticket className="w-4 h-4 text-sky-600" />
                    <span>View Boarding Pass</span>
                  </button>

                  {/* Review Button for Past or Confirmed */}
                  {b.status === 'CONFIRMED' && !b.review && (
                    <button
                      onClick={() => setReviewBooking(b)}
                      className="px-3.5 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-800 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                    >
                      <Star className="w-3.5 h-3.5 text-amber-600" />
                      <span>Review</span>
                    </button>
                  )}

                  {/* Cancel if pending */}
                  {b.status === 'PENDING' && (
                    <button
                      onClick={() => handleCancelBooking(b.booking_id)}
                      className="px-3.5 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold transition cursor-pointer shadow-sm"
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

      {/* ============================================================ */}
      {/* MODAL: DIGITAL TICKET / PASS                                 */}
      {/* ============================================================ */}
      {selectedTicketBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedTicketBooking(null)}
              className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-white shadow-md text-slate-600 hover:text-slate-900 flex items-center justify-center transition border border-slate-200"
            >
              <X className="w-5 h-5" />
            </button>
            <TicketPass booking={selectedTicketBooking} />
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: SUBMIT VOYAGE REVIEW                                  */}
      {/* ============================================================ */}
      {reviewBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 sm:p-8 border border-sky-200 shadow-2xl">
            <button
              onClick={() => setReviewBooking(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-display font-bold text-slate-900 mb-2">
              Review Your Voyage
            </h3>
            <p className="text-xs text-slate-500 mb-6">
              Share your feedback for <span className="text-sky-700 font-bold">{reviewBooking.cruise_title}</span>.
            </p>

            <form onSubmit={handleSubmitReview} className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-2">
                  Rating
                </label>
                <div className="flex items-center space-x-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRatingVal(star)}
                      className="p-1 cursor-pointer"
                    >
                      <Star
                        className={`w-7 h-7 ${
                          star <= ratingVal
                            ? 'fill-amber-500 text-amber-500'
                            : 'text-slate-300'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="text-sm font-bold text-amber-600 ml-2">
                    {ratingVal} of 5 Stars
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-2">
                  Your Ocean Experience Feedback
                </label>
                <textarea
                  rows={4}
                  required
                  value={commentVal}
                  onChange={(e) => setCommentVal(e.target.value)}
                  placeholder="The stateroom views were breathtaking, dining exceptional..."
                  className="w-full p-3.5 rounded-2xl bg-white border border-slate-300 text-slate-800 text-sm focus:outline-none focus:border-sky-500 transition"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setReviewBooking(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reviewSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-white font-bold text-xs shadow transition cursor-pointer"
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
