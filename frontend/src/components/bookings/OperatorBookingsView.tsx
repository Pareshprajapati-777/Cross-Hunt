import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Clock,
  Users,
  DollarSign,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  AlertCircle,
  CloudSun,
  Wind,
  MessageSquare,
  Send,
  RotateCcw,
  Eye,
  FileText,
  Check,
  X,
  Sparkles,
  Search,
  Filter,
  RefreshCw,
  Phone,
  Mail,
  QrCode,
  Tag,
  ArrowRight,
  Waves,
  Ship,
  Receipt,
  UserCheck,
  ChevronDown
} from 'lucide-react';
import { Booking } from '../../api/types';
import {
  operatorBookingAction,
  operatorUpdateSchedule,
  operatorWeatherReschedule,
  operatorUpdateParticipants,
  operatorProcessRefund,
  operatorSendCustomerMessage
} from '../../api/dashboards';
import { formatINR } from '../../utils/currency';

interface OperatorBookingsViewProps {
  bookings: Booking[];
  onRefresh: () => void;
  onOpenInvoice?: (bookingId: string) => void;
}

type StatusFilter = 'ALL' | 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED' | 'CANCELLED' | 'EXPIRED';
type TypeFilter = 'ALL' | 'ACTIVITY' | 'EVENT' | 'TOUR';

export const OperatorBookingsView: React.FC<OperatorBookingsViewProps> = ({
  bookings,
  onRefresh,
  onOpenInvoice,
}) => {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Active Modals State
  const [detailsBooking, setDetailsBooking] = useState<Booking | null>(null);
  const [scheduleBooking, setScheduleBooking] = useState<Booking | null>(null);
  const [weatherBooking, setWeatherBooking] = useState<Booking | null>(null);
  const [participantsBooking, setParticipantsBooking] = useState<Booking | null>(null);
  const [refundBooking, setRefundBooking] = useState<Booking | null>(null);
  const [messageBooking, setMessageBooking] = useState<Booking | null>(null);
  const [rejectBooking, setRejectBooking] = useState<Booking | null>(null);

  // Form states for modals
  const [scheduleForm, setScheduleForm] = useState({
    booking_date: '',
    start_time: '10:00 AM',
    end_time: '12:00 PM',
    reason: 'Customer requested departure adjustment',
    notify_customer: true,
  });

  const [weatherForm, setWeatherForm] = useState({
    new_date: '',
    new_time_slot: '10:30 AM',
    weather_condition: 'High Wind & Sea Swell Alert (> 22 knots)',
    customer_note: 'Rescheduled for high safety due to choppy sea conditions. Boarding pass remains valid.',
    notify_customer: true,
  });

  const [participantsForm, setParticipantsForm] = useState({
    number_of_people: 1,
    adults_count: 1,
    children_count: 0,
    notes: 'Verified passenger count at pier embarkation point.',
    recalculate_price: false,
  });

  const [refundForm, setRefundForm] = useState({
    refund_amount: 0,
    refund_reason: 'Weather-related trip cancellation & rescheduling declined',
    cancel_booking: true,
    customer_notes: '',
  });

  const [messageForm, setMessageForm] = useState({
    template_type: 'CONFIRMATION',
    custom_message: '',
  });

  const [rejectReason, setRejectReason] = useState('Slot over capacity / vessel under maintenance inspection');

  // Counts for filter pills
  const counts = useMemo(() => {
    return {
      all: bookings.length,
      pending: bookings.filter((b) => b.status === 'PENDING').length,
      confirmed: bookings.filter((b) => b.status === 'CONFIRMED').length,
      in_progress: bookings.filter((b) => b.status === 'IN_PROGRESS' || b.tracking_status === 'ON_CRUISE').length,
      completed: bookings.filter((b) => b.status === 'COMPLETED').length,
      rejected: bookings.filter((b) => b.status === 'REJECTED').length,
      cancelled: bookings.filter((b) => b.status === 'CANCELLED').length,
      expired: bookings.filter((b) => b.status === 'EXPIRED').length,
    };
  }, [bookings]);

  // Filtered Bookings
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      // Status filter
      if (statusFilter !== 'ALL') {
        if (b.status !== statusFilter) return false;
      }

      // Type filter
      if (typeFilter !== 'ALL') {
        if (typeFilter === 'ACTIVITY' && b.booking_type !== 'ACTIVITY') return false;
        if (typeFilter === 'EVENT' && !['EVENT', 'PRIVATE_EVENT'].includes(b.booking_type)) return false;
        if (typeFilter === 'TOUR' && !['TOUR', 'CRUISE_TOUR'].includes(b.booking_type)) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesId = b.booking_id?.toLowerCase().includes(q);
        const matchesTicket = b.ticket_code?.toLowerCase().includes(q);
        const matchesName = b.customer_name?.toLowerCase().includes(q);
        const matchesVessel = (b.cruise_name || b.cruise_title || '').toLowerCase().includes(q);
        const matchesActivity = (b.activity_title || '').toLowerCase().includes(q);
        if (!matchesId && !matchesTicket && !matchesName && !matchesVessel && !matchesActivity) {
          return false;
        }
      }

      return true;
    });
  }, [bookings, statusFilter, typeFilter, searchQuery]);

  // Generic Status Transition Action
  const handleAction = async (
    bookingId: string,
    action: 'confirm' | 'approve' | 'in_progress' | 'complete' | 'reject' | 'cancel' | 'board' | 'depart' | 'arrive'
  ) => {
    setActionLoading(`${bookingId}-${action}`);
    try {
      const res = await operatorBookingAction(bookingId, action);
      alert(res.message || 'Status updated successfully.');
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Action failed. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  // Submit Schedule Update
  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleBooking) return;
    setActionLoading(`schedule-${scheduleBooking.booking_id}`);
    try {
      const res = await operatorUpdateSchedule(scheduleBooking.booking_id, scheduleForm);
      alert(res.message || 'Schedule updated successfully.');
      setScheduleBooking(null);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to update schedule.');
    } finally {
      setActionLoading(null);
    }
  };

  // Submit Weather Reschedule
  const handleWeatherSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!weatherBooking) return;
    setActionLoading(`weather-${weatherBooking.booking_id}`);
    try {
      const res = await operatorWeatherReschedule(weatherBooking.booking_id, weatherForm);
      alert(res.message || 'Weather-related rescheduling applied and passenger notified.');
      setWeatherBooking(null);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to apply weather rescheduling.');
    } finally {
      setActionLoading(null);
    }
  };

  // Submit Participants Verification
  const handleParticipantsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!participantsBooking) return;
    setActionLoading(`participants-${participantsBooking.booking_id}`);
    try {
      const res = await operatorUpdateParticipants(participantsBooking.booking_id, participantsForm);
      alert(res.message || 'Participant count verified and updated.');
      setParticipantsBooking(null);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to update participant count.');
    } finally {
      setActionLoading(null);
    }
  };

  // Submit Refund
  const handleRefundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refundBooking) return;
    setActionLoading(`refund-${refundBooking.booking_id}`);
    try {
      const res = await operatorProcessRefund(refundBooking.booking_id, refundForm);
      alert(res.message || 'Refund successfully recorded and processed.');
      setRefundBooking(null);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to process refund.');
    } finally {
      setActionLoading(null);
    }
  };

  // Submit Customer Message
  const handleMessageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageBooking) return;
    const msg = messageForm.custom_message.trim();
    if (!msg) {
      alert('Please enter a message to send.');
      return;
    }
    setActionLoading(`message-${messageBooking.booking_id}`);
    try {
      const res = await operatorSendCustomerMessage(messageBooking.booking_id, {
        message: msg,
        template_type: messageForm.template_type,
      });
      if (res.whatsapp_url) {
        if (window.confirm('Message saved to customer history! Would you like to open WhatsApp Web to dispatch directly?')) {
          window.open(res.whatsapp_url, '_blank');
        }
      } else {
        alert(res.message || 'Message sent to customer.');
      }
      setMessageBooking(null);
    } catch (err: any) {
      alert(err.message || 'Failed to send message.');
    } finally {
      setActionLoading(null);
    }
  };

  // Submit Reject
  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectBooking) return;
    setActionLoading(`reject-${rejectBooking.booking_id}`);
    try {
      const res = await operatorBookingAction(rejectBooking.booking_id, 'reject');
      alert(`Booking #${rejectBooking.booking_id} rejected. Reason: ${rejectReason}`);
      setRejectBooking(null);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to reject booking.');
    } finally {
      setActionLoading(null);
    }
  };

  // Helper for quick prefilled message templates
  const applyMessageTemplate = (type: string, b: Booking) => {
    const title = b.activity_title || b.cruise_name || 'Marine Charter';
    let text = '';
    if (type === 'CONFIRMATION') {
      text = `Hello ${b.customer_name || 'Guest'}! Your booking for "${title}" on ${b.booking_date} at ${b.start_time || '10:00 AM'} is confirmed. Your boarding ticket code is ${b.ticket_code}. Please arrive 15 minutes before departure.`;
    } else if (type === 'BOARDING') {
      text = `Attention ${b.customer_name || 'Guest'}: Boarding is now open for "${title}" at ${b.departure_port || 'Jetty Pier'}. Please present your digital ticket pass #${b.ticket_code} to the deckmaster.`;
    } else if (type === 'WEATHER') {
      text = `Important Weather Notice: Due to harbor swell/safety advisories, your scheduled session for "${title}" on ${b.booking_date} has a schedule update. Please contact fleet operations for your safe rescheduled slot.`;
    } else if (type === 'RESCHEDULE') {
      text = `Hello ${b.customer_name || 'Guest'}, your trip for "${title}" has been updated to ${b.booking_date} at ${b.start_time}. Your boarding pass #${b.ticket_code} remains valid.`;
    }
    setMessageForm({ template_type: type, custom_message: text });
  };

  // Status badge stylings
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-50 text-amber-900 border border-amber-300 shadow-sm flex items-center gap-1.5 animate-pulse">
            <Clock className="w-3 h-3 text-amber-600" />
            <span>Pending Approval</span>
          </span>
        );
      case 'CONFIRMED':
        return (
          <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-sm flex items-center gap-1.5">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>Confirmed</span>
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-sky-50 text-sky-800 border border-sky-300 shadow-sm flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-sky-500 animate-ping" />
            <span>In Progress</span>
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-blue-50 text-blue-800 border border-blue-200 flex items-center gap-1.5">
            <Check className="w-3 h-3 text-blue-600" />
            <span>Completed</span>
          </span>
        );
      case 'REJECTED':
        return (
          <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-rose-50 text-rose-800 border border-rose-300 flex items-center gap-1.5">
            <XCircle className="w-3 h-3 text-rose-600" />
            <span>Rejected</span>
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-300 flex items-center gap-1.5">
            <X className="w-3 h-3 text-slate-500" />
            <span>Cancelled</span>
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-orange-50 text-orange-800 border border-orange-300 shadow-sm flex items-center gap-1.5">
            <AlertCircle className="w-3 h-3 text-orange-600" />
            <span>Expired</span>
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#082F5B]/10 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-black tracking-widest uppercase text-[#0284c7] bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
              Fleet Operations & Reservations
            </span>
            <span className="text-[11px] font-bold text-slate-500">• Lifecycle Status Tracking</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-[#051833] font-heading tracking-tight">
            Booking & Reservation Management
          </h2>
          <p className="text-xs text-slate-600 mt-1 max-w-3xl">
            Review incoming requests, verify participant capacities, update voyage schedules, dispatch passenger alerts, initiate marine weather rescheduling, and process refunds.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onRefresh}
            className="px-4 py-2 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 shadow-sm transition flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#0284c7]" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filter Dock & Search Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Status Filter Chips */}
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'ALL', label: 'All Bookings', count: counts.all },
            { id: 'PENDING', label: 'Pending', count: counts.pending, alert: counts.pending > 0 },
            { id: 'CONFIRMED', label: 'Confirmed', count: counts.confirmed },
            { id: 'IN_PROGRESS', label: 'In Progress', count: counts.in_progress },
            { id: 'COMPLETED', label: 'Completed', count: counts.completed },
            { id: 'REJECTED', label: 'Rejected', count: counts.rejected },
            { id: 'CANCELLED', label: 'Cancelled', count: counts.cancelled },
            ...(counts.expired > 0 ? [{ id: 'EXPIRED', label: 'Expired', count: counts.expired }] : []),
          ].map((chip) => {
            const isActive = statusFilter === chip.id;
            return (
              <button
                key={chip.id}
                onClick={() => setStatusFilter(chip.id as StatusFilter)}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border ${
                  isActive
                    ? 'bg-[#0284c7] text-white border-[#0284c7] shadow-sm font-black'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300 shadow-xs'
                }`}
              >
                <span>{chip.label}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : chip.alert
                      ? 'bg-amber-100 text-amber-900 border border-amber-300'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {chip.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search & Category Filter */}
        <div className="flex items-center gap-2.5">
          {/* Category Dropdown */}
          <div className="relative">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
              className="appearance-none pl-3.5 pr-8 py-2 rounded-full border border-slate-200 bg-white text-xs font-bold text-slate-700 focus:outline-none focus:border-[#0284c7] cursor-pointer shadow-xs"
            >
              <option value="ALL">All Types</option>
              <option value="ACTIVITY">Water Sports / Activities</option>
              <option value="EVENT">Private Charters</option>
              <option value="TOUR">Public Cruise Tours</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by ID, name, ticket..."
              className="w-full pl-9 pr-3.5 py-2 rounded-full border border-slate-200 bg-white text-xs font-semibold focus:outline-none focus:border-[#0284c7] shadow-xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4. Bookings List / Cards */}
      <div className="space-y-4">
        {filteredBookings.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-500 shadow-sm">
            <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="font-extrabold text-[#051833] text-base">No Bookings Found</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              No reservation records match your selected status and search criteria.
            </p>
          </div>
        ) : (
          filteredBookings.map((b) => {
            const isActivity = b.booking_type === 'ACTIVITY';
            const displayTitle = b.activity_title || b.cruise_name || b.cruise_title || 'Charter Cruise';
            const totalGuests = b.number_of_people || b.passengers_count || 1;
            const isPending = b.status === 'PENDING';
            const isConfirmed = b.status === 'CONFIRMED';
            const isInProgress = b.status === 'IN_PROGRESS';
            const isCancelled = b.status === 'CANCELLED';
            const isRejected = b.status === 'REJECTED';

            return (
              <div
                key={b.id || b.booking_id}
                className="bg-white rounded-3xl border border-[#0284c7]/20 shadow-xs hover:shadow-md hover:border-[#0284c7]/40 transition-all p-5 sm:p-6 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6"
              >
                {/* Left Section: Details & Meta */}
                <div className="space-y-3 flex-1 min-w-0">
                  {/* Top Bar Badges */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-black font-mono text-[#051833] bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
                      #{b.booking_id}
                    </span>

                    {renderStatusBadge(b.status)}

                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#0284c7] bg-sky-50/70 px-2.5 py-0.5 rounded-full border border-[#0284c7]/20 flex items-center gap-1">
                      {isActivity ? (
                        <>
                          <Waves className="w-3 h-3" />
                          <span>Water Sports Ride</span>
                        </>
                      ) : b.booking_type === 'EVENT' ? (
                        <>
                          <Ship className="w-3 h-3" />
                          <span>Private Charter</span>
                        </>
                      ) : (
                        <>
                          <Ship className="w-3 h-3" />
                          <span>Public Cruise Tour</span>
                        </>
                      )}
                    </span>

                    {b.ticket_code && (
                      <span className="text-[10px] font-mono font-bold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200 flex items-center gap-1">
                        <QrCode className="w-3 h-3 text-slate-400" />
                        <span>{b.ticket_code}</span>
                      </span>
                    )}

                    {b.payment_status && (
                      <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                        b.payment_status === 'PAID'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}>
                        {b.payment_status}
                      </span>
                    )}

                    {b.refund_amount && Number(b.refund_amount) > 0 && (
                      <span className="text-[10px] font-extrabold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                        Refunded {formatINR(b.refund_amount)}
                      </span>
                    )}
                  </div>

                  {/* Main Title & Passenger Contact */}
                  <div>
                    <h3 className="font-extrabold text-xl text-[#051833] font-heading tracking-tight">
                      {displayTitle}
                    </h3>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 mt-1 font-medium">
                      <span>
                        Passenger: <strong className="text-[#051833] font-bold">{b.customer_name || 'Guest User'}</strong>
                      </span>
                      <span>•</span>
                      {b.customer_phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {b.customer_phone}
                        </span>
                      )}
                      {b.customer_email && (
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3 text-slate-400" />
                          {b.customer_email}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Trip Timing & Capacity details */}
                  <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs text-slate-600 font-medium pt-0.5">
                    <span className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-200">
                      <Calendar className="w-3.5 h-3.5 text-[#0284c7]" />
                      Date: <strong className="text-[#051833]">{b.booking_date}</strong>
                    </span>

                    <span className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-200">
                      <Clock className="w-3.5 h-3.5 text-[#0284c7]" />
                      Time Slot:{' '}
                      <strong className="text-[#051833]">
                        {b.time_slot_display || `${b.start_time || '10:00 AM'} - ${b.end_time || '11:00 AM'}`}
                      </strong>
                    </span>

                    <span className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-200">
                      <Users className="w-3.5 h-3.5 text-[#0284c7]" />
                      Participants:{' '}
                      <strong className="text-[#051833]">
                        {totalGuests} {totalGuests === 1 ? 'Guest' : 'Guests'}
                      </strong>
                    </span>

                    <span className="text-slate-500">
                      Port: <strong className="text-slate-700">{b.departure_port || 'Mandovi Pier'}</strong>
                    </span>
                  </div>

                  {/* Notes / Weather advisory snippet */}
                  {b.special_request && (
                    <div className="text-[11px] text-slate-500 bg-amber-50/60 p-2.5 rounded-xl border border-amber-200/80 font-mono line-clamp-2">
                      <span className="font-bold text-amber-900">Notes / Log: </span>
                      {b.special_request}
                    </div>
                  )}
                </div>

                {/* Right Section: Price & Action Buttons */}
                <div className="flex flex-col items-start xl:items-end justify-between gap-3.5 shrink-0 w-full xl:w-auto pt-4 xl:pt-0 border-t xl:border-t-0 border-slate-100">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-[#051833] font-heading tracking-tight">
                      {formatINR(b.total_price)}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      (Net Payout: {formatINR(b.owner_payout_amount || Math.round(Number(b.total_price) * 0.85))})
                    </span>
                  </div>

                  {/* Primary & Secondary Action Toolbars */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* 1. View Details Modal */}
                    <button
                      onClick={() => setDetailsBooking(b)}
                      className="px-3 py-1.5 rounded-full border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 transition cursor-pointer flex items-center gap-1 shadow-2xs"
                      title="View Complete Booking Details"
                    >
                      <Eye className="w-3.5 h-3.5 text-[#0284c7]" />
                      <span>Details</span>
                    </button>

                    {/* GST Invoice */}
                    {onOpenInvoice && (
                      <button
                        onClick={() => onOpenInvoice(b.booking_id)}
                        className="px-3 py-1.5 rounded-full border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 transition cursor-pointer flex items-center gap-1 shadow-2xs"
                        title="View GST Invoice"
                      >
                        <Receipt className="w-3.5 h-3.5 text-[#0284c7]" />
                        <span>Invoice</span>
                      </button>
                    )}

                    {/* 2. Direct Customer Messaging / WhatsApp */}
                    <button
                      onClick={() => {
                        setMessageBooking(b);
                        applyMessageTemplate('CONFIRMATION', b);
                      }}
                      className="px-3 py-1.5 rounded-full border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-xs font-bold text-emerald-800 transition cursor-pointer flex items-center gap-1 shadow-2xs"
                      title="Send WhatsApp or Platform Message to Customer"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Message</span>
                    </button>

                    {/* 3. Schedule Update Button */}
                    <button
                      onClick={() => {
                        setScheduleBooking(b);
                        setScheduleForm({
                          booking_date: b.booking_date,
                          start_time: b.start_time || '10:00 AM',
                          end_time: b.end_time || '11:00 AM',
                          reason: 'Owner schedule update',
                          notify_customer: true,
                        });
                      }}
                      className="px-3 py-1.5 rounded-full border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 transition cursor-pointer flex items-center gap-1 shadow-2xs"
                      title="Update Date & Slot Schedule"
                    >
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      <span>Schedule</span>
                    </button>

                    {/* 4. Verify & Adjust Participants */}
                    <button
                      onClick={() => {
                        setParticipantsBooking(b);
                        setParticipantsForm({
                          number_of_people: totalGuests,
                          adults_count: b.adults_count || totalGuests,
                          children_count: b.children_count || 0,
                          notes: 'Verified at boarding dock.',
                          recalculate_price: false,
                        });
                      }}
                      className="px-3 py-1.5 rounded-full border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 transition cursor-pointer flex items-center gap-1 shadow-2xs"
                      title="Verify and adjust participant count"
                    >
                      <UserCheck className="w-3.5 h-3.5 text-slate-500" />
                      <span>Participants</span>
                    </button>

                    {/* 5. Weather Rescheduling Action */}
                    <button
                      onClick={() => {
                        setWeatherBooking(b);
                        setWeatherForm({
                          new_date: b.booking_date,
                          new_time_slot: b.time_slot_display || '10:30 AM',
                          weather_condition: 'High Wind & Sea Swell Alert (> 22 knots)',
                          customer_note: 'Rescheduled for high marine safety due to choppy swell conditions.',
                          notify_customer: true,
                        });
                      }}
                      className="px-3 py-1.5 rounded-full border border-sky-300 bg-sky-50 hover:bg-sky-100 text-xs font-bold text-sky-800 transition cursor-pointer flex items-center gap-1 shadow-2xs"
                      title="Initiate Weather-Related Rescheduling"
                    >
                      <CloudSun className="w-3.5 h-3.5 text-[#0284c7]" />
                      <span>Weather Reschedule</span>
                    </button>

                    {/* 6. Process Refund Action */}
                    <button
                      onClick={() => {
                        setRefundBooking(b);
                        setRefundForm({
                          refund_amount: Number(b.total_price) - Number(b.refund_amount || 0),
                          refund_reason: 'Weather cancellation / customer reschedule declined',
                          cancel_booking: true,
                          customer_notes: '',
                        });
                      }}
                      className="px-3 py-1.5 rounded-full border border-rose-200 bg-rose-50/60 hover:bg-rose-100 text-xs font-bold text-rose-700 transition cursor-pointer flex items-center gap-1 shadow-2xs"
                      title="Process Customer Refund"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
                      <span>Refund</span>
                    </button>
                  </div>

                  {/* 7. LIFECYCLE ACTION BUTTONS: Pending Approve/Reject OR Trip Transitions */}
                  <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 w-full xl:w-auto justify-end">
                    {/* When PENDING: Approve or Reject */}
                    {isPending && (
                      <>
                        <button
                          onClick={() => handleAction(b.booking_id, 'confirm')}
                          disabled={actionLoading === `${b.booking_id}-confirm`}
                          className="px-4 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs transition cursor-pointer shadow-sm hover:shadow flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Approve Booking</span>
                        </button>

                        <button
                          onClick={() => {
                            setRejectBooking(b);
                            setRejectReason('Slot full / operational restriction');
                          }}
                          disabled={actionLoading === `${b.booking_id}-reject`}
                          className="px-3.5 py-1.5 rounded-full bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 font-extrabold text-xs transition cursor-pointer"
                        >
                          Reject Request
                        </button>
                      </>
                    )}

                    {/* When CONFIRMED: Can Start Trip / Boarding / Depart / Complete */}
                    {isConfirmed && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          onClick={() => handleAction(b.booking_id, 'in_progress')}
                          disabled={actionLoading === `${b.booking_id}-in_progress`}
                          className="px-3.5 py-1.5 rounded-full bg-[#0284c7] hover:bg-[#0369a1] text-white font-extrabold text-xs transition cursor-pointer shadow-sm flex items-center gap-1"
                        >
                          <Ship className="w-3 h-3" />
                          <span>Start Trip (In Progress)</span>
                        </button>

                        <button
                          onClick={() => handleAction(b.booking_id, 'complete')}
                          disabled={actionLoading === `${b.booking_id}-complete`}
                          className="px-3.5 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs transition cursor-pointer shadow-sm flex items-center gap-1"
                        >
                          <Check className="w-3 h-3" />
                          <span>Mark Complete</span>
                        </button>
                      </div>
                    )}

                    {/* When IN PROGRESS: Complete Trip */}
                    {isInProgress && (
                      <button
                        onClick={() => handleAction(b.booking_id, 'complete')}
                        disabled={actionLoading === `${b.booking_id}-complete`}
                        className="px-4 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs transition cursor-pointer shadow-sm flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Complete Session</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: COMPLETE BOOKING DETAILS DRAWER / MODAL */}
      {/* ========================================================================= */}
      {detailsBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase text-[#0284c7] tracking-wider block">
                  Reservation Dossier
                </span>
                <h3 className="text-xl font-black text-[#051833]">
                  Booking #{detailsBooking.booking_id}
                </h3>
              </div>
              <button
                onClick={() => setDetailsBooking(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Status Bar */}
            <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500">Status:</span>
                {renderStatusBadge(detailsBooking.status)}
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-slate-500">Boarding Ticket:</span>
                <p className="font-mono text-xs font-black text-[#051833]">{detailsBooking.ticket_code}</p>
              </div>
            </div>

            {/* Passenger & Voyage Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1 p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] font-black uppercase text-slate-400 block">Passenger Details</span>
                <p className="font-extrabold text-[#051833] text-sm">{detailsBooking.customer_name || 'Guest User'}</p>
                <p className="text-slate-600">Email: {detailsBooking.customer_email || 'N/A'}</p>
                <p className="text-slate-600">Phone: {detailsBooking.customer_phone || 'N/A'}</p>
                {detailsBooking.customer_whatsapp && (
                  <p className="text-emerald-700 font-bold">WhatsApp: {detailsBooking.customer_whatsapp}</p>
                )}
              </div>

              <div className="space-y-1 p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] font-black uppercase text-slate-400 block">Voyage & Vessel</span>
                <p className="font-extrabold text-[#051833] text-sm">
                  {detailsBooking.activity_title || detailsBooking.cruise_name || detailsBooking.cruise_title}
                </p>
                <p className="text-slate-600">Category: {detailsBooking.booking_type}</p>
                <p className="text-slate-600">Departure Port: {detailsBooking.departure_port || 'Pier Jetty'}</p>
                <p className="text-slate-600">Cabin / Slot: {detailsBooking.cabin_name || detailsBooking.cabin_type || 'Open Deck'}</p>
              </div>

              <div className="space-y-1 p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] font-black uppercase text-slate-400 block">Schedule & Participants</span>
                <p className="font-bold text-[#051833]">Date: {detailsBooking.booking_date}</p>
                <p className="text-slate-600">
                  Time: {detailsBooking.time_slot_display || `${detailsBooking.start_time} - ${detailsBooking.end_time}`}
                </p>
                <p className="text-slate-600">
                  Total Guests: <strong>{detailsBooking.number_of_people || detailsBooking.passengers_count}</strong>
                  {detailsBooking.adults_count ? ` (${detailsBooking.adults_count} Adults, ${detailsBooking.children_count || 0} Children)` : ''}
                </p>
              </div>

              <div className="space-y-1 p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] font-black uppercase text-slate-400 block">Financial Breakdown</span>
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span>{formatINR(detailsBooking.subtotal)}</span>
                </div>
                {detailsBooking.tax_amount ? (
                  <div className="flex justify-between text-slate-600">
                    <span>Tax (GST):</span>
                    <span>{formatINR(detailsBooking.tax_amount)}</span>
                  </div>
                ) : null}
                <div className="flex justify-between font-black text-[#051833] text-sm pt-1 border-t border-slate-200">
                  <span>Total Paid:</span>
                  <span>{formatINR(detailsBooking.total_price)}</span>
                </div>
                <div className="flex justify-between text-emerald-700 font-bold text-xs pt-0.5">
                  <span>Owner Net Payout:</span>
                  <span>{formatINR(detailsBooking.owner_payout_amount || Math.round(Number(detailsBooking.total_price) * 0.85))}</span>
                </div>
              </div>
            </div>

            {/* Special Request / Log Notes */}
            {detailsBooking.special_request && (
              <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs">
                <span className="text-[10px] font-black uppercase text-amber-900 block mb-1">
                  Log Notes & Special Requests
                </span>
                <p className="font-mono text-slate-700 whitespace-pre-wrap">{detailsBooking.special_request}</p>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDetailsBooking(null)}
                className="px-5 py-2.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: UPDATE SCHEDULE & TIME SLOT */}
      {/* ========================================================================= */}
      {scheduleBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-black text-[#051833]">Update Voyage Schedule</h3>
                <p className="text-xs text-slate-500">Booking #{scheduleBooking.booking_id}</p>
              </div>
              <button
                onClick={() => setScheduleBooking(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleScheduleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">New Booking Date *</label>
                <input
                  type="date"
                  value={scheduleForm.booking_date}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, booking_date: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#0284c7]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Start Time *</label>
                  <input
                    type="text"
                    value={scheduleForm.start_time}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, start_time: e.target.value })}
                    placeholder="e.g. 10:00 AM or 10:00"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#0284c7]"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">End Time (Optional)</label>
                  <input
                    type="text"
                    value={scheduleForm.end_time}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, end_time: e.target.value })}
                    placeholder="e.g. 12:00 PM"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#0284c7]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Reason for Rescheduling</label>
                <textarea
                  rows={2}
                  value={scheduleForm.reason}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, reason: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-[#0284c7]"
                  placeholder="e.g. Passenger schedule adjustment / Harbor traffic optimization"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                <input
                  type="checkbox"
                  checked={scheduleForm.notify_customer}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, notify_customer: e.target.checked })}
                  className="rounded border-slate-300 text-[#0284c7] focus:ring-[#0284c7]"
                />
                <span>Notify passenger via in-app alert & WhatsApp reminder log</span>
              </label>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setScheduleBooking(null)}
                  className="px-4 py-2 rounded-full border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading === `schedule-${scheduleBooking.booking_id}`}
                  className="px-5 py-2 rounded-full bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-black shadow-md cursor-pointer"
                >
                  Save Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: WEATHER-RELATED RESCHEDULING */}
      {/* ========================================================================= */}
      {weatherBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-sky-200">
            <div className="flex items-center justify-between border-b border-sky-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-sky-100 text-[#0284c7] flex items-center justify-center">
                  <CloudSun className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-[#051833]">Weather-Related Rescheduling</h3>
                  <p className="text-xs text-slate-500">Booking #{weatherBooking.booking_id}</p>
                </div>
              </div>
              <button
                onClick={() => setWeatherBooking(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-sky-50 border border-sky-200 text-xs text-sky-900">
              <p className="font-bold">Marine Weather Safety Protocol</p>
              <p className="text-[11px] mt-0.5 text-sky-800">
                Rescheduling due to unfavorable tide, swell, or wind allows moving passengers to a safe future slot without cancellation penalties.
              </p>
            </div>

            <form onSubmit={handleWeatherSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Adverse Weather Reason *</label>
                <select
                  value={weatherForm.weather_condition}
                  onChange={(e) => setWeatherForm({ ...weatherForm, weather_condition: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#0284c7]"
                >
                  <option value="High Wind & Sea Swell Alert (> 22 knots)">High Wind & Sea Swell Alert (&gt; 22 knots)</option>
                  <option value="Heavy Monsoon Rain & Low Visibility">Heavy Monsoon Rain & Low Visibility</option>
                  <option value="Port Authority Harbor Traffic Halt">Port Authority Harbor Traffic Halt</option>
                  <option value="Turbulent Ocean Wave Height Safety Warning">Turbulent Ocean Wave Height Safety Warning</option>
                  <option value="Precautionary Marine Safety Advisory">Precautionary Marine Safety Advisory</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Safe Rescheduled Date *</label>
                  <input
                    type="date"
                    value={weatherForm.new_date}
                    onChange={(e) => setWeatherForm({ ...weatherForm, new_date: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#0284c7]"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Proposed Time Slot *</label>
                  <input
                    type="text"
                    value={weatherForm.new_time_slot}
                    onChange={(e) => setWeatherForm({ ...weatherForm, new_time_slot: e.target.value })}
                    placeholder="e.g. 10:30 AM"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#0284c7]"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Passenger Advisory Note</label>
                <textarea
                  rows={2}
                  value={weatherForm.customer_note}
                  onChange={(e) => setWeatherForm({ ...weatherForm, customer_note: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-[#0284c7]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setWeatherBooking(null)}
                  className="px-4 py-2 rounded-full border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading === `weather-${weatherBooking.booking_id}`}
                  className="px-5 py-2 rounded-full bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-black shadow-md cursor-pointer"
                >
                  Apply Weather Rescheduling
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: VERIFY & ADJUST PARTICIPANTS */}
      {/* ========================================================================= */}
      {participantsBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-black text-[#051833]">Verify Participant Count</h3>
                <p className="text-xs text-slate-500">Booking #{participantsBooking.booking_id}</p>
              </div>
              <button
                onClick={() => setParticipantsBooking(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleParticipantsSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Total Verified Participants *</label>
                <input
                  type="number"
                  min={1}
                  value={participantsForm.number_of_people}
                  onChange={(e) =>
                    setParticipantsForm({
                      ...participantsForm,
                      number_of_people: Number(e.target.value),
                      adults_count: Number(e.target.value),
                    })
                  }
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#0284c7]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Adults Count</label>
                  <input
                    type="number"
                    min={1}
                    value={participantsForm.adults_count}
                    onChange={(e) => setParticipantsForm({ ...participantsForm, adults_count: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#0284c7]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Children Count</label>
                  <input
                    type="number"
                    min={0}
                    value={participantsForm.children_count}
                    onChange={(e) => setParticipantsForm({ ...participantsForm, children_count: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#0284c7]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Verification Notes</label>
                <textarea
                  rows={2}
                  value={participantsForm.notes}
                  onChange={(e) => setParticipantsForm({ ...participantsForm, notes: e.target.value })}
                  placeholder="e.g. Passenger headcount verified at pier gate."
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-[#0284c7]"
                />
              </div>

              {participantsBooking.booking_type === 'ACTIVITY' && (
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={participantsForm.recalculate_price}
                    onChange={(e) => setParticipantsForm({ ...participantsForm, recalculate_price: e.target.checked })}
                    className="rounded border-slate-300 text-[#0284c7] focus:ring-[#0284c7]"
                  />
                  <span>Recalculate total price per adjusted participant count</span>
                </label>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setParticipantsBooking(null)}
                  className="px-4 py-2 rounded-full border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading === `participants-${participantsBooking.booking_id}`}
                  className="px-5 py-2 rounded-full bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-black shadow-md cursor-pointer"
                >
                  Confirm Verification
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: PROCESS REFUND */}
      {/* ========================================================================= */}
      {refundBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-rose-200">
            <div className="flex items-center justify-between border-b border-rose-100 pb-3">
              <div>
                <h3 className="text-lg font-black text-rose-900">Process Passenger Refund</h3>
                <p className="text-xs text-slate-500">Booking #{refundBooking.booking_id}</p>
              </div>
              <button
                onClick={() => setRefundBooking(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-rose-50/70 border border-rose-200 text-xs space-y-1">
              <div className="flex justify-between font-bold text-slate-700">
                <span>Total Booking Value:</span>
                <span>{formatINR(refundBooking.total_price)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Already Refunded:</span>
                <span>{formatINR(refundBooking.refund_amount || 0)}</span>
              </div>
              <div className="flex justify-between font-black text-rose-800 pt-1 border-t border-rose-200">
                <span>Max Refundable:</span>
                <span>
                  {formatINR(Math.max(0, Number(refundBooking.total_price) - Number(refundBooking.refund_amount || 0)))}
                </span>
              </div>
            </div>

            <form onSubmit={handleRefundSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Refund Amount (₹) *</label>
                <input
                  type="number"
                  min={1}
                  max={Math.max(0, Number(refundBooking.total_price) - Number(refundBooking.refund_amount || 0))}
                  value={refundForm.refund_amount}
                  onChange={(e) => setRefundForm({ ...refundForm, refund_amount: Number(e.target.value) })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-rose-500 font-mono"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Reason for Refund *</label>
                <select
                  value={refundForm.refund_reason}
                  onChange={(e) => setRefundForm({ ...refundForm, refund_reason: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-rose-500"
                >
                  <option value="Weather-related trip cancellation & rescheduling declined">
                    Weather cancellation / rescheduling declined
                  </option>
                  <option value="Vessel maintenance inspection hold">
                    Vessel maintenance inspection hold
                  </option>
                  <option value="Customer cancellation within published policy">
                    Customer cancellation within published policy
                  </option>
                  <option value="Mutual owner-customer cancellation agreement">
                    Mutual owner-customer cancellation agreement
                  </option>
                  <option value="Participant count reduction adjustment">
                    Participant count reduction adjustment
                  </option>
                </select>
              </div>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                <input
                  type="checkbox"
                  checked={refundForm.cancel_booking}
                  onChange={(e) => setRefundForm({ ...refundForm, cancel_booking: e.target.checked })}
                  className="rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                />
                <span>Set booking status to CANCELLED and invalidate ticket</span>
              </label>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRefundBooking(null)}
                  className="px-4 py-2 rounded-full border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading === `refund-${refundBooking.booking_id}`}
                  className="px-5 py-2 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-md cursor-pointer"
                >
                  Process Refund
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: SEND MESSAGE / WHATSAPP MODAL */}
      {/* ========================================================================= */}
      {messageBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-emerald-200">
            <div className="flex items-center justify-between border-b border-emerald-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-[#051833]">Message Passenger</h3>
                  <p className="text-xs text-slate-500">
                    To: {messageBooking.customer_name} ({messageBooking.customer_whatsapp || messageBooking.customer_phone || 'Customer'})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setMessageBooking(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Templates Buttons */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">
                Quick Message Templates
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'CONFIRMATION', label: 'Confirmation & Gate' },
                  { id: 'BOARDING', label: 'Boarding Call' },
                  { id: 'WEATHER', label: 'Weather Delay' },
                  { id: 'RESCHEDULE', label: 'Reschedule Alert' },
                ].map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => applyMessageTemplate(tpl.id, messageBooking)}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-[11px] font-bold text-slate-700 transition cursor-pointer"
                  >
                    {tpl.label}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleMessageSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Message Body *</label>
                <textarea
                  rows={4}
                  value={messageForm.custom_message}
                  onChange={(e) => setMessageForm({ ...messageForm, custom_message: e.target.value })}
                  placeholder="Type your message here..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-emerald-600"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setMessageBooking(null)}
                  className="px-4 py-2 rounded-full border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading === `message-${messageBooking.booking_id}`}
                  className="px-5 py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Notification & WhatsApp</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 7: REJECT REQUEST MODAL */}
      {/* ========================================================================= */}
      {rejectBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-rose-200">
            <div className="flex items-center justify-between border-b border-rose-100 pb-3">
              <div>
                <h3 className="text-lg font-black text-rose-900">Reject Booking Request</h3>
                <p className="text-xs text-slate-500">Booking #{rejectBooking.booking_id}</p>
              </div>
              <button
                onClick={() => setRejectBooking(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRejectSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Reason for Rejection *</label>
                <select
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-rose-500"
                >
                  <option value="Requested time slot is fully booked / over capacity">
                    Requested time slot is fully booked / over capacity
                  </option>
                  <option value="Vessel undergoing scheduled maintenance & safety overhaul">
                    Vessel undergoing scheduled maintenance & safety overhaul
                  </option>
                  <option value="Port authority harbor traffic constraint">
                    Port authority harbor traffic constraint
                  </option>
                  <option value="Certified marine instructor unavailable for slot">
                    Certified marine instructor unavailable for slot
                  </option>
                  <option value="Customer requested cancellation">
                    Customer requested cancellation
                  </option>
                </select>
              </div>

              <div className="p-3 rounded-2xl bg-rose-50 text-[11px] text-rose-800 border border-rose-200">
                The booking status will update to <strong className="font-bold">REJECTED</strong>. If the passenger was charged online, you can initiate their refund from the Refund option.
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRejectBooking(null)}
                  className="px-4 py-2 rounded-full border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading === `reject-${rejectBooking.booking_id}`}
                  className="px-5 py-2 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-md cursor-pointer"
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
