import React, { useState, useEffect, useMemo } from 'react';
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  RotateCcw,
  Clock,
  CheckCircle2,
  AlertCircle,
  Download,
  Filter,
  Search,
  ArrowUpRight,
  ShieldCheck,
  Building2,
  Calendar,
  Layers,
  FileText,
  Percent,
  RefreshCw,
  Plus,
  Send,
  X,
  ExternalLink,
  ChevronRight,
  Eye,
  Info
} from 'lucide-react';
import {
  getOwnerFinancialOverview,
  requestOwnerPayout
} from '../../api/dashboards';
import {
  OwnerFinancialOverview,
  OwnerFinancialKPIs,
  BookingLedgerItem,
  OwnerPayoutItem
} from '../../api/types';
import { formatINR, formatINRDecimal } from '../../utils/currency';

export const OperatorEarningsView: React.FC = () => {
  const [data, setData] = useState<OwnerFinancialOverview | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Sub-tabs: 'ledger' | 'payouts' | 'breakdown'
  const [subTab, setSubTab] = useState<'ledger' | 'payouts' | 'breakdown'>('ledger');

  // Ledger Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [payoutFilter, setPayoutFilter] = useState('ALL');

  // Payout Request Modal
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState<number>(0);
  const [payoutBank, setPayoutBank] = useState('HDFC Bank Ltd');
  const [payoutAccount, setPayoutAccount] = useState('•••• •••• 4092');
  const [payoutIFSC, setPayoutIFSC] = useState('HDFC0001234');
  const [payoutNotes, setPayoutNotes] = useState('');
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const [modalFeedback, setModalFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Selected Booking Drawer/Modal
  const [selectedBooking, setSelectedBooking] = useState<BookingLedgerItem | null>(null);

  const fetchOverview = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getOwnerFinancialOverview();
      setData(res);
      if (res.kpis?.pending_payouts) {
        setPayoutAmount(Math.round(res.kpis.pending_payouts));
      }
    } catch (err: any) {
      console.error('Failed to load owner financial overview:', err);
      setError(err?.message || 'Failed to fetch financial details. Please verify your session.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  // Filtered Ledger Items
  const filteredLedger = useMemo(() => {
    if (!data?.booking_ledger) return [];
    return data.booking_ledger.filter((item) => {
      const matchesSearch =
        !searchQuery.trim() ||
        item.ticket_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(item.booking_id).includes(searchQuery);

      const matchesStatus =
        statusFilter === 'ALL' || item.booking_status.toUpperCase() === statusFilter;

      const matchesPayout =
        payoutFilter === 'ALL' || item.payout_status.toUpperCase() === payoutFilter;

      return matchesSearch && matchesStatus && matchesPayout;
    });
  }, [data?.booking_ledger, searchQuery, statusFilter, payoutFilter]);

  // Handle CSV Export
  const handleExportCSV = () => {
    if (!data?.booking_ledger || data.booking_ledger.length === 0) {
      alert('No booking ledger data available to export.');
      return;
    }

    const headers = [
      'Booking ID',
      'Ticket Code',
      'Date',
      'Experience / Vessel',
      'Customer Name',
      'Booking Status',
      'Gross Amount (INR)',
      'Platform Commission 15% (INR)',
      'Payment Gateway Fee 2% (INR)',
      'Refund (INR)',
      'Net Owner Share (INR)',
      'Payout Status',
      'Payment Gateway Ref'
    ];

    const rows = filteredLedger.map((b) => [
      b.booking_id,
      `"${b.ticket_code}"`,
      `"${b.booking_date}"`,
      `"${b.item_name.replace(/"/g, '""')}"`,
      `"${b.customer_name.replace(/"/g, '""')}"`,
      b.booking_status,
      b.gross_amount,
      b.platform_commission,
      b.payment_processing_fee,
      b.refund_amount,
      b.net_owner_share,
      b.payout_status,
      `"${b.payment_gateway_ref}"`
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `CrossHunt_Owner_Revenue_Ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle Payout Request Submit
  const handlePayoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (payoutAmount <= 0) {
      setModalFeedback({ type: 'error', message: 'Payout amount must be greater than ₹0.' });
      return;
    }
    const maxPending = data?.kpis?.pending_payouts || 0;
    if (payoutAmount > maxPending + 1) {
      setModalFeedback({
        type: 'error',
        message: `Requested amount exceeds pending payout balance of ${formatINR(maxPending)}.`
      });
      return;
    }

    setRequestSubmitting(true);
    setModalFeedback(null);
    try {
      const res = await requestOwnerPayout({
        amount: payoutAmount,
        bank_name: payoutBank,
        account_number: payoutAccount,
        ifsc_code: payoutIFSC,
        notes: payoutNotes
      });
      setModalFeedback({ type: 'success', message: res.message || 'Payout request submitted successfully!' });
      setTimeout(() => {
        setShowPayoutModal(false);
        setModalFeedback(null);
        fetchOverview();
      }, 1500);
    } catch (err: any) {
      setModalFeedback({ type: 'error', message: err?.message || 'Failed to submit payout request.' });
    } finally {
      setRequestSubmitting(false);
    }
  };

  const kpis: OwnerFinancialKPIs = data?.kpis || {
    gross_booking_value: 0,
    platform_commission: 0,
    payment_processing_fees: 0,
    refunds: 0,
    net_earnings: 0,
    completed_payouts: 0,
    pending_payouts: 0,
    payout_rate_percentage: 83,
    platform_commission_percentage: 15,
    payment_processing_percentage: 2,
    total_bookings_count: 0,
    confirmed_bookings_count: 0,
    refunded_bookings_count: 0
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* 1. TOP HEADER & ACTION BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#082F5B]/10 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#082F5B] to-[#1677C8] text-[#F8FCFF] shadow-md flex items-center justify-center">
            <DollarSign className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-black text-[#102B46] tracking-tight">
                Owner Earnings & Financial Ledger
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold uppercase tracking-wider">
                Automated Settlement (83% Net)
              </span>
            </div>
            <p className="text-xs text-[#102B46]/70 mt-0.5">
              Comprehensive revenue accounting, platform commission deduction, payment gateway fees, and bank payout records.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={fetchOverview}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl bg-white border border-[#082F5B]/15 hover:bg-slate-50 text-[#102B46] text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-sm"
            title="Refresh Ledger"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#1677C8] ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-4 py-2 rounded-xl bg-white border border-[#082F5B]/15 hover:bg-slate-50 text-[#102B46] text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-[#1677C8]" />
            <span>Export Statement (CSV)</span>
          </button>

          <button
            onClick={() => setShowPayoutModal(true)}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#082F5B] to-[#1677C8] hover:opacity-95 text-white text-xs font-black flex items-center gap-2 transition cursor-pointer shadow-md shadow-[#082F5B]/20"
          >
            <ArrowUpRight className="w-4 h-4 text-emerald-300" />
            <span>Request Payout</span>
          </button>
        </div>
      </div>

      {/* 2. EIGHT ESSENTIAL FINANCIAL KPI CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Card 1: Gross Booking Value */}
        <div className="bg-white rounded-3xl p-5 border border-[#082F5B]/10 shadow-sm hover:border-[#1677C8]/40 hover:shadow-md transition space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              Gross Booking Value (GBV)
            </span>
            <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="font-mono-numbers text-2xl sm:text-3xl font-black text-[#051833]">
            {formatINR(kpis.gross_booking_value)}
          </div>
          <p className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
            <span>Confirmed trip revenues</span>
            <span className="text-slate-400">({kpis.confirmed_bookings_count} bookings)</span>
          </p>
        </div>

        {/* Card 2: Platform Commission (15%) */}
        <div className="bg-white rounded-3xl p-5 border border-[#082F5B]/10 shadow-sm hover:border-[#1677C8]/40 hover:shadow-md transition space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              Platform Commission (15%)
            </span>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Percent className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="font-mono-numbers text-2xl sm:text-3xl font-black text-indigo-700">
            {formatINR(kpis.platform_commission)}
          </div>
          <p className="text-[11px] text-slate-500 font-medium">
            Platform tech, listing & marketing fee
          </p>
        </div>

        {/* Card 3: Payment Processing Fees (2%) */}
        <div className="bg-white rounded-3xl p-5 border border-[#082F5B]/10 shadow-sm hover:border-[#1677C8]/40 hover:shadow-md transition space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              Payment Processing Fees (2%)
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <CreditCard className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="font-mono-numbers text-2xl sm:text-3xl font-black text-amber-700">
            {formatINR(kpis.payment_processing_fees)}
          </div>
          <p className="text-[11px] text-slate-500 font-medium">
            Bank & UPI payment gateway charges
          </p>
        </div>

        {/* Card 4: Refunds */}
        <div className="bg-white rounded-3xl p-5 border border-[#082F5B]/10 shadow-sm hover:border-rose-300 hover:shadow-md transition space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              Refunds & Cancellations
            </span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <RotateCcw className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="font-mono-numbers text-2xl sm:text-3xl font-black text-rose-600">
            {formatINR(kpis.refunds)}
          </div>
          <p className="text-[11px] text-slate-500 font-medium">
            Customer refunds & weather credits
          </p>
        </div>

        {/* Card 5: Net Earnings (Hero Metric) */}
        <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-white rounded-3xl p-5 border border-emerald-300 shadow-sm hover:shadow-md transition space-y-2 ring-1 ring-emerald-200">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider">
              Net Earnings (Owner Share)
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500 text-white flex items-center justify-center shadow-sm">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="font-mono-numbers text-2xl sm:text-3xl font-black text-emerald-800">
            {formatINR(kpis.net_earnings)}
          </div>
          <p className="text-[11px] text-emerald-700 font-bold">
            Total net earned (83% of volume minus refunds)
          </p>
        </div>

        {/* Card 6: Pending Payouts */}
        <div className="bg-white rounded-3xl p-5 border border-amber-300 shadow-sm hover:shadow-md transition space-y-2 ring-1 ring-amber-100">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-amber-700 tracking-wider">
              Pending Payouts
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="font-mono-numbers text-2xl sm:text-3xl font-black text-amber-600">
            {formatINR(kpis.pending_payouts)}
          </div>
          <p className="text-[11px] text-slate-500 font-medium">
            Ready for instant bank transfer
          </p>
        </div>

        {/* Card 7: Completed Payouts */}
        <div className="bg-white rounded-3xl p-5 border border-[#082F5B]/10 shadow-sm hover:border-[#1677C8]/40 hover:shadow-md transition space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              Completed Payouts
            </span>
            <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="font-mono-numbers text-2xl sm:text-3xl font-black text-teal-700">
            {formatINR(kpis.completed_payouts)}
          </div>
          <p className="text-[11px] text-slate-500 font-medium">
            Disbursed to registered bank account
          </p>
        </div>

        {/* Card 8: Settlement Rate */}
        <div className="bg-white rounded-3xl p-5 border border-[#082F5B]/10 shadow-sm hover:border-[#1677C8]/40 hover:shadow-md transition space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              Payout Rate Guarantee
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Building2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="font-mono-numbers text-2xl sm:text-3xl font-black text-[#082F5B]">
            83.0%
          </div>
          <p className="text-[11px] text-slate-500 font-medium">
            T+2 rolling bank transfer schedule
          </p>
        </div>
      </div>

      {/* 3. SUB-NAVIGATION PILLS (LEDGER, PAYOUTS, WATERFALL) */}
      <div className="flex items-center gap-2 border-b border-[#082F5B]/10 pb-3">
        <button
          onClick={() => setSubTab('ledger')}
          className={`px-5 py-2.5 rounded-full font-bold text-xs flex items-center gap-2 cursor-pointer transition ${
            subTab === 'ledger'
              ? 'bg-[#051833] text-[#fff8dc] shadow-md'
              : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Booking-Wise Revenue Ledger ({data?.booking_ledger?.length || 0})</span>
        </button>

        <button
          onClick={() => setSubTab('payouts')}
          className={`px-5 py-2.5 rounded-full font-bold text-xs flex items-center gap-2 cursor-pointer transition ${
            subTab === 'payouts'
              ? 'bg-[#051833] text-[#fff8dc] shadow-md'
              : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Payout & Transaction History ({data?.payouts?.length || 0})</span>
        </button>

        <button
          onClick={() => setSubTab('breakdown')}
          className={`px-5 py-2.5 rounded-full font-bold text-xs flex items-center gap-2 cursor-pointer transition ${
            subTab === 'breakdown'
              ? 'bg-[#051833] text-[#fff8dc] shadow-md'
              : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
          }`}
        >
          <Percent className="w-3.5 h-3.5" />
          <span>Fee Waterfall & Payout Policy</span>
        </button>
      </div>

      {/* =========================================================================
          SUB-TAB 1: BOOKING-WISE REVENUE LEDGER
          ========================================================================= */}
      {subTab === 'ledger' && (
        <div className="space-y-4">
          {/* Search & Filter Toolbar */}
          <div className="bg-white rounded-2xl p-4 border border-[#082F5B]/10 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ticket code, customer, experience..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1677C8]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold">
                <Filter className="w-3.5 h-3.5 text-[#1677C8]" />
                <span>Status:</span>
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-[#102B46] focus:outline-none focus:ring-2 focus:ring-[#1677C8]"
              >
                <option value="ALL">All Bookings</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="COMPLETED">Completed</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="CANCELLED">Cancelled / Refunded</option>
                <option value="PENDING">Pending</option>
              </select>

              <select
                value={payoutFilter}
                onChange={(e) => setPayoutFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-[#102B46] focus:outline-none focus:ring-2 focus:ring-[#1677C8]"
              >
                <option value="ALL">All Settlement States</option>
                <option value="SETTLED">Settled</option>
                <option value="PENDING">Pending Payout</option>
                <option value="REFUNDED">Refunded</option>
              </select>

              <div className="text-xs text-slate-500 font-medium ml-1">
                Showing <strong>{filteredLedger.length}</strong> of{' '}
                <strong>{data?.booking_ledger?.length || 0}</strong> records
              </div>
            </div>
          </div>

          {/* Ledger Table */}
          <div className="bg-white rounded-3xl border border-[#082F5B]/10 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F8FCFF] border-b border-[#082F5B]/10 text-[11px] font-black uppercase text-[#102B46]/70 tracking-wider">
                    <th className="py-3.5 px-4">Ticket & Experience</th>
                    <th className="py-3.5 px-4">Customer</th>
                    <th className="py-3.5 px-4">Trip Date</th>
                    <th className="py-3.5 px-4 text-right">Gross (GBV)</th>
                    <th className="py-3.5 px-4 text-right text-indigo-700">Platform (15%)</th>
                    <th className="py-3.5 px-4 text-right text-amber-700">Gateway (2%)</th>
                    <th className="py-3.5 px-4 text-right text-rose-600">Refund</th>
                    <th className="py-3.5 px-4 text-right text-emerald-700">Net Owner Share</th>
                    <th className="py-3.5 px-4 text-center">Payout Status</th>
                    <th className="py-3.5 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredLedger.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-400">
                        <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        <p className="font-bold text-sm text-slate-600">No ledger records found.</p>
                        <p className="text-xs mt-1">Adjust your search query or status filter.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredLedger.map((b) => {
                      const isCancelled = b.booking_status === 'CANCELLED';
                      return (
                        <tr
                          key={b.booking_id}
                          className="hover:bg-sky-50/40 transition-colors group"
                        >
                          {/* Ticket & Experience */}
                          <td className="py-3 px-4">
                            <div className="font-mono text-xs font-black text-[#082F5B] flex items-center gap-1.5">
                              <span>#{b.ticket_code}</span>
                              <span className="text-[10px] text-slate-400 font-normal">
                                (ID: {b.booking_id})
                              </span>
                            </div>
                            <div className="font-bold text-[#102B46] truncate max-w-[200px]" title={b.item_name}>
                              {b.item_name}
                            </div>
                            <span className="inline-block mt-0.5 px-2 py-0.2 rounded bg-slate-100 text-[10px] font-bold text-slate-600 uppercase">
                              {b.booking_type}
                            </span>
                          </td>

                          {/* Customer */}
                          <td className="py-3 px-4">
                            <div className="font-bold text-[#102B46]">{b.customer_name}</div>
                            {b.customer_whatsapp && (
                              <a
                                href={`https://wa.me/${b.customer_whatsapp.replace(/[^0-9]/g, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[11px] text-emerald-600 font-semibold hover:underline flex items-center gap-1"
                              >
                                <span>{b.customer_whatsapp}</span>
                              </a>
                            )}
                          </td>

                          {/* Trip Date */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="font-bold text-slate-700">{b.booking_date || 'N/A'}</div>
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                b.booking_status === 'COMPLETED'
                                  ? 'bg-teal-50 text-teal-700 border border-teal-200'
                                  : b.booking_status === 'CONFIRMED'
                                  ? 'bg-sky-50 text-sky-700 border border-sky-200'
                                  : b.booking_status === 'IN_PROGRESS'
                                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                  : b.booking_status === 'CANCELLED'
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}
                            >
                              {b.booking_status}
                            </span>
                          </td>

                          {/* Gross Amount */}
                          <td className="py-3 px-4 text-right font-mono-numbers font-black text-[#102B46]">
                            {formatINR(b.gross_amount)}
                          </td>

                          {/* Platform Commission 15% */}
                          <td className="py-3 px-4 text-right font-mono-numbers text-indigo-700 font-bold">
                            - {formatINR(b.platform_commission)}
                          </td>

                          {/* Gateway Fee 2% */}
                          <td className="py-3 px-4 text-right font-mono-numbers text-amber-700 font-bold">
                            - {formatINR(b.payment_processing_fee)}
                          </td>

                          {/* Refund */}
                          <td className="py-3 px-4 text-right font-mono-numbers text-rose-600 font-bold">
                            {b.refund_amount > 0 ? `- ${formatINR(b.refund_amount)}` : '₹0'}
                          </td>

                          {/* Net Owner Share */}
                          <td className="py-3 px-4 text-right font-mono-numbers font-black text-emerald-700 text-sm bg-emerald-50/40">
                            {formatINR(b.net_owner_share)}
                          </td>

                          {/* Payout Status */}
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                                b.payout_status === 'SETTLED'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : b.payout_status === 'REFUNDED'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {b.payout_status === 'SETTLED' && <CheckCircle2 className="w-3 h-3" />}
                              {b.payout_status === 'PENDING' && <Clock className="w-3 h-3" />}
                              {b.payout_status === 'REFUNDED' && <RotateCcw className="w-3 h-3" />}
                              <span>{b.payout_status}</span>
                            </span>
                          </td>

                          {/* Action */}
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => setSelectedBooking(b)}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-[#082F5B] hover:text-white text-slate-600 transition cursor-pointer"
                              title="View Breakdown Details"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Ledger Footer Summary */}
            <div className="bg-[#F8FCFF] border-t border-[#082F5B]/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-bold text-[#102B46]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                <span>Itemized Net Owner Revenue Ledger</span>
              </div>
              <div className="flex items-center gap-6 font-mono-numbers">
                <div>
                  <span className="text-slate-500 font-normal">Filtered Gross: </span>
                  <span className="font-black text-[#102B46]">
                    {formatINR(filteredLedger.reduce((acc, i) => acc + i.gross_amount, 0))}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 font-normal">Filtered Net Owner: </span>
                  <span className="font-black text-emerald-700">
                    {formatINR(filteredLedger.reduce((acc, i) => acc + i.net_owner_share, 0))}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SUB-TAB 2: PAYOUT & TRANSACTION HISTORY
          ========================================================================= */}
      {subTab === 'payouts' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl border border-[#082F5B]/10 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-[#082F5B]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-extrabold text-base text-[#102B46] flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#1677C8]" />
                  Direct Bank Disbursement & Payout Records
                </h3>
                <p className="text-xs text-[#102B46]/60">
                  Every disbursement transaction comes with a unique bank UTR number and reference audit token.
                </p>
              </div>

              <div className="flex items-center gap-2 font-mono-numbers text-xs">
                <span className="px-3 py-1 rounded-full bg-teal-50 text-teal-800 font-bold border border-teal-200">
                  Disbursed: {formatINR(kpis.completed_payouts)}
                </span>
                <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-800 font-bold border border-amber-200">
                  Pending: {formatINR(kpis.pending_payouts)}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F8FCFF] border-b border-[#082F5B]/10 text-[11px] font-black uppercase text-[#102B46]/70 tracking-wider">
                    <th className="py-3.5 px-4">Payout Reference</th>
                    <th className="py-3.5 px-4">Bank & Account</th>
                    <th className="py-3.5 px-4">Bank UTR Number</th>
                    <th className="py-3.5 px-4">Settlement Period</th>
                    <th className="py-3.5 px-4 text-center">Bookings</th>
                    <th className="py-3.5 px-4 text-right">Disbursed Amount</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4">Disbursed At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {!data?.payouts || data.payouts.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <Building2 className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        <p className="font-bold text-sm text-slate-600">No payout records yet.</p>
                        <p className="text-xs mt-1">Initiate a payout request using the "Request Payout" button above.</p>
                      </td>
                    </tr>
                  ) : (
                    data.payouts.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50 transition">
                        {/* Reference */}
                        <td className="py-3.5 px-4">
                          <div className="font-mono text-xs font-black text-[#082F5B]">
                            {p.payout_reference}
                          </div>
                          <span className="text-[10px] text-slate-400 uppercase font-bold">
                            {p.payment_method || 'NEFT'}
                          </span>
                        </td>

                        {/* Bank Details */}
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-[#102B46]">{p.bank_name}</div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            A/C: {p.account_number_masked}
                          </div>
                          <div className="text-[10px] text-slate-400 uppercase font-mono">
                            IFSC: {p.ifsc_code}
                          </div>
                        </td>

                        {/* UTR Number */}
                        <td className="py-3.5 px-4">
                          <div className="font-mono font-black text-slate-700 bg-slate-100 px-2 py-1 rounded inline-block text-[11px]">
                            {p.utr_number || 'Awaiting UTR'}
                          </div>
                        </td>

                        {/* Settlement Period */}
                        <td className="py-3.5 px-4 text-slate-600">
                          {p.period_start && p.period_end ? (
                            <span className="font-medium text-[11px]">
                              {p.period_start} → {p.period_end}
                            </span>
                          ) : (
                            <span className="text-slate-400">Regular Cycle</span>
                          )}
                        </td>

                        {/* Bookings */}
                        <td className="py-3.5 px-4 text-center font-bold text-[#102B46]">
                          {p.bookings_count || 1}
                        </td>

                        {/* Disbursed Amount */}
                        <td className="py-3.5 px-4 text-right font-mono-numbers font-black text-base text-emerald-700">
                          {formatINR(p.amount)}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                              p.status === 'COMPLETED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : p.status === 'PROCESSING'
                                ? 'bg-sky-100 text-sky-800'
                                : p.status === 'FAILED'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {p.status === 'COMPLETED' && <CheckCircle2 className="w-3 h-3" />}
                            {p.status === 'PROCESSING' && <Clock className="w-3 h-3 animate-spin" />}
                            <span>{p.status}</span>
                          </span>
                        </td>

                        {/* Disbursed At */}
                        <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap text-[11px]">
                          {p.processed_at
                            ? new Date(p.processed_at).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                              })
                            : new Date(p.created_at).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                              })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SUB-TAB 3: FEE WATERFALL & PAYOUT POLICY
          ========================================================================= */}
      {subTab === 'breakdown' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#082F5B]/10 shadow-sm space-y-6">
            <div>
              <h3 className="font-black text-xl text-[#102B46] tracking-tight">
                Transparent Revenue Distribution Model
              </h3>
              <p className="text-xs text-[#102B46]/70 mt-1 max-w-2xl">
                Every booking completed on Cross-Hunt distributes 100% of the customer gross payment into three transparent components with no hidden deductions.
              </p>
            </div>

            {/* Waterfall Diagram Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
              {/* Pillar 1: Owner Net Share */}
              <div className="p-6 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-lg space-y-3 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-100">
                    Pillar 1 • Owner Net Revenue
                  </span>
                  <span className="font-mono text-2xl font-black text-white">83.0%</span>
                </div>
                <h4 className="text-xl font-black">Fleet Operator Share</h4>
                <p className="text-xs text-emerald-100 leading-relaxed">
                  Direct net revenue credited to your registered bank account for maintaining vessels, crew salaries, and water activities.
                </p>
                <div className="pt-2 font-mono-numbers text-xs text-emerald-200">
                  Formula: Gross Booking - 15% Platform - 2% Payment Fee - Applicable Refunds
                </div>
              </div>

              {/* Pillar 2: Platform Commission */}
              <div className="p-6 rounded-3xl bg-[#082F5B] text-white shadow-lg space-y-3 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-sky-200">
                    Pillar 2 • Cross-Hunt Platform
                  </span>
                  <span className="font-mono text-2xl font-black text-white">15.0%</span>
                </div>
                <h4 className="text-xl font-black">Marketplace & Concierge Fee</h4>
                <p className="text-xs text-sky-100 leading-relaxed">
                  Powers nationwide tourist marketing, verified guest verification, dynamic QR ticketing engine, WhatsApp reminders, and customer support.
                </p>
                <div className="pt-2 font-mono-numbers text-xs text-sky-300">
                  Flat 15% rate applied on confirmed and completed voyages.
                </div>
              </div>

              {/* Pillar 3: Gateway Processing */}
              <div className="p-6 rounded-3xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg space-y-3 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-amber-100">
                    Pillar 3 • Banking Gateway
                  </span>
                  <span className="font-mono text-2xl font-black text-white">2.0%</span>
                </div>
                <h4 className="text-xl font-black">Merchant Gateway Cost</h4>
                <p className="text-xs text-amber-100 leading-relaxed">
                  Direct third-party transaction processing fees charged by Reserve Bank of India compliant payment gateways (UPI, Cards, NetBanking).
                </p>
                <div className="pt-2 font-mono-numbers text-xs text-amber-200">
                  Includes fraud prevention protocols and instant 3D-secure authorization.
                </div>
              </div>
            </div>

            {/* Payout Policy Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
              <div className="space-y-3">
                <h4 className="font-bold text-sm text-[#102B46] flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#1677C8]" />
                  Settlement & Disbursement Schedule
                </h4>
                <ul className="space-y-2 text-xs text-slate-600">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>T+2 Rolling Cycle:</strong> Funds from completed trips mature into "Pending Payouts" within 48 hours of journey completion.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>Manual or Auto-Sweep:</strong> You can initiate a manual withdrawal anytime or receive weekly automated NEFT batch settlements.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>Zero Hidden Fees:</strong> No withdrawal processing charges or bank deduction surcharges on owner disbursements.</span>
                  </li>
                </ul>
              </div>

              <div className="space-y-3">
                <h4 className="font-bold text-sm text-[#102B46] flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-rose-500" />
                  Refund & Weather Cancellation Policy
                </h4>
                <ul className="space-y-2 text-xs text-slate-600">
                  <li className="flex items-start gap-2">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                    <span><strong>Customer Rescheduling First:</strong> In case of sea weather alerts, passengers are safely rescheduled before refund processing is initiated.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                    <span><strong>Refund Deduction:</strong> When a refund is processed by the owner or platform, the exact refund amount is subtracted from gross volume before payout calculation.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: REQUEST PAYOUT DISBURSEMENT
          ========================================================================= */}
      {showPayoutModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 border border-[#082F5B]/20 shadow-2xl space-y-6 relative animate-scaleUp">
            <button
              onClick={() => {
                setShowPayoutModal(false);
                setModalFeedback(null);
              }}
              className="absolute right-5 top-5 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-[#102B46]">Request Bank Payout</h3>
                <p className="text-xs text-slate-500">
                  Available Pending Balance: <strong>{formatINR(kpis.pending_payouts)}</strong>
                </p>
              </div>
            </div>

            {modalFeedback && (
              <div
                className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 ${
                  modalFeedback.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {modalFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                )}
                <span>{modalFeedback.message}</span>
              </div>
            )}

            <form onSubmit={handlePayoutSubmit} className="space-y-4">
              {/* Amount */}
              <div>
                <label className="block text-xs font-bold text-[#102B46] mb-1">
                  Disbursement Amount (₹ INR) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-black text-slate-400">
                    ₹
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={Math.round(kpis.pending_payouts)}
                    value={payoutAmount}
                    onChange={(e) => setPayoutAmount(Number(e.target.value))}
                    required
                    className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm font-black text-[#102B46] focus:outline-none focus:ring-2 focus:ring-[#1677C8]"
                  />
                </div>
                <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500">
                  <span>Minimum transfer: ₹500</span>
                  <button
                    type="button"
                    onClick={() => setPayoutAmount(Math.round(kpis.pending_payouts))}
                    className="text-[#1677C8] font-bold hover:underline"
                  >
                    Transfer Full Balance ({formatINR(kpis.pending_payouts)})
                  </button>
                </div>
              </div>

              {/* Bank Name */}
              <div>
                <label className="block text-xs font-bold text-[#102B46] mb-1">
                  Recipient Bank *
                </label>
                <input
                  type="text"
                  value={payoutBank}
                  onChange={(e) => setPayoutBank(e.target.value)}
                  required
                  placeholder="e.g. HDFC Bank, State Bank of India"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#1677C8]"
                />
              </div>

              {/* Account Number & IFSC */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#102B46] mb-1">
                    Account Number *
                  </label>
                  <input
                    type="text"
                    value={payoutAccount}
                    onChange={(e) => setPayoutAccount(e.target.value)}
                    required
                    placeholder="•••• •••• 4092"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#1677C8]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#102B46] mb-1">
                    IFSC Code *
                  </label>
                  <input
                    type="text"
                    value={payoutIFSC}
                    onChange={(e) => setPayoutIFSC(e.target.value.toUpperCase())}
                    required
                    placeholder="HDFC0001234"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium uppercase focus:outline-none focus:ring-2 focus:ring-[#1677C8]"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-[#102B46] mb-1">
                  Owner Note / Remark (Optional)
                </label>
                <input
                  type="text"
                  value={payoutNotes}
                  onChange={(e) => setPayoutNotes(e.target.value)}
                  placeholder="e.g. October fleet settlement & fuel reserve"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#1677C8]"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-xl text-[11px] text-slate-500 flex items-start gap-2">
                <Info className="w-3.5 h-3.5 text-[#1677C8] shrink-0 mt-0.5" />
                <span>
                  Disbursements are processed via Reserve Bank of India NEFT/RTGS gateway. Funds will be credited directly to your bank account within 24-48 business hours.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPayoutModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={requestSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#082F5B] to-[#1677C8] hover:opacity-95 text-white text-xs font-black flex items-center gap-2 transition cursor-pointer shadow-md"
                >
                  {requestSubmitting ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>Confirm Payout Request</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: ITEM BOOKING LEDGER BREAKDOWN
          ========================================================================= */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 border border-[#082F5B]/20 shadow-2xl space-y-6 relative animate-scaleUp">
            <button
              onClick={() => setSelectedBooking(null)}
              className="absolute right-5 top-5 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-sky-50 text-[#1677C8] flex items-center justify-center font-black">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-[#102B46]">
                  Revenue Breakdown • #{selectedBooking.ticket_code}
                </h3>
                <p className="text-xs text-slate-500">
                  Booking #{selectedBooking.booking_id} • {selectedBooking.item_name}
                </p>
              </div>
            </div>

            {/* Financial Waterfall for this Booking */}
            <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="font-bold text-slate-600">Customer Gross Paid (GBV):</span>
                <span className="font-mono font-black text-sm text-[#102B46]">
                  {formatINRDecimal(selectedBooking.gross_amount)}
                </span>
              </div>

              <div className="flex items-center justify-between text-indigo-700">
                <span>- Platform Commission (15%):</span>
                <span className="font-mono font-bold">
                  - {formatINRDecimal(selectedBooking.platform_commission)}
                </span>
              </div>

              <div className="flex items-center justify-between text-amber-700">
                <span>- Payment Gateway Fee (2%):</span>
                <span className="font-mono font-bold">
                  - {formatINRDecimal(selectedBooking.payment_processing_fee)}
                </span>
              </div>

              {selectedBooking.refund_amount > 0 && (
                <div className="flex items-center justify-between text-rose-600">
                  <span>- Refund Processed:</span>
                  <span className="font-mono font-bold">
                    - {formatINRDecimal(selectedBooking.refund_amount)}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-slate-200 font-bold text-sm bg-emerald-50/80 -mx-4 -mb-4 p-4 rounded-b-2xl">
                <span className="text-emerald-900">Net Owner Share Disbursable:</span>
                <span className="font-mono font-black text-emerald-800 text-base">
                  {formatINRDecimal(selectedBooking.net_owner_share)}
                </span>
              </div>
            </div>

            {/* Transaction metadata */}
            <div className="space-y-2 text-xs text-slate-600">
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-400">Customer:</span>
                <span className="font-bold text-[#102B46]">{selectedBooking.customer_name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-400">Payment Gateway Reference:</span>
                <span className="font-mono font-bold text-slate-700">{selectedBooking.payment_gateway_ref}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-400">Payment Method:</span>
                <span className="font-bold text-slate-700">{selectedBooking.payment_method}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-400">Payout Status:</span>
                <span className="font-bold uppercase text-emerald-700">{selectedBooking.payout_status}</span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedBooking(null)}
                className="px-5 py-2 rounded-xl bg-[#082F5B] text-white text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
