import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  IndianRupee,
  RotateCcw,
  AlertCircle,
  Percent,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  FileText,
  RefreshCw,
  X,
  ExternalLink,
  ChevronDown,
  Building,
  ArrowUpRight,
  TrendingUp,
  AlertTriangle,
  Receipt
} from 'lucide-react';
import {
  getAdminTransactions,
  adminProcessRefund,
  adminRetryPayment,
  AdminTransaction
} from '../../api/dashboards';
import { formatINR } from '../../utils/currency';

interface AdminTransactionsViewProps {
  onOpenInvoice?: (bookingId: string) => void;
}

type TransactionTab = 'ALL' | 'PAID' | 'REFUNDED' | 'FAILED';

export const AdminTransactionsView: React.FC<AdminTransactionsViewProps> = ({ onOpenInvoice }) => {
  const [transactions, setTransactions] = useState<AdminTransaction[]>([]);
  const [stats, setStats] = useState({
    gross_volume: 0,
    total_commission: 0,
    total_payouts: 0,
    total_refunds: 0,
    failed_count: 0,
    pending_settlements: 0,
    settled_payouts: 0,
  });
  const [loading, setLoading] = useState(true);

  // Filters
  const [activeSubTab, setActiveSubTab] = useState<TransactionTab>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Refund Modal
  const [refundTarget, setRefundTarget] = useState<AdminTransaction | null>(null);
  const [refundAmount, setRefundAmount] = useState<number>(0);
  const [refundReason, setRefundReason] = useState<string>('');
  const [refundLoading, setRefundLoading] = useState(false);

  // Inspect Failure Modal
  const [inspectTarget, setInspectTarget] = useState<AdminTransaction | null>(null);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      let statusParam = '';
      if (activeSubTab === 'PAID') statusParam = 'PAID';
      else if (activeSubTab === 'REFUNDED') statusParam = 'REFUNDED';
      else if (activeSubTab === 'FAILED') statusParam = 'FAILED';

      const res = await getAdminTransactions({
        q: searchQuery,
        status: statusParam,
        page_size: 500,
      });

      const sortedTx = [...(res.transactions || [])].sort((a, b) => {
        const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
        if (bTime !== aTime) return bTime - aTime;
        return (Number(b.id) || 0) - (Number(a.id) || 0);
      });
      setTransactions(sortedTx);
      if (res.stats) {
        setStats(res.stats);
      }
    } catch (err) {
      console.error('Failed to load admin transactions ledger:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [activeSubTab, searchQuery]);

  const handleOpenRefund = (txn: AdminTransaction) => {
    setRefundTarget(txn);
    setRefundAmount(txn.gross_amount);
    setRefundReason('Customer requested cancellation / weather hold');
  };

  const handleProcessRefundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refundTarget) return;
    setRefundLoading(true);
    try {
      const res = await adminProcessRefund(refundTarget.booking_id, refundAmount, refundReason);
      if (res.success) {
        setRefundTarget(null);
        fetchTransactions();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to process refund');
    } finally {
      setRefundLoading(false);
    }
  };

  const handleRetryPayment = async (bookingId: string) => {
    try {
      const res = await adminRetryPayment(bookingId);
      if (res.success) {
        alert(`Payment session reset for #${bookingId}. Customer can now retry checkout.`);
        fetchTransactions();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to retry payment');
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. FINANCIAL AUDIT & REVENUE LEDGER METRICS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="spatial-card p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Gross Volume</span>
            <CreditCard className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono-numbers">{formatINR(stats.gross_volume)}</div>
          <p className="text-[10px] text-slate-400">Total customer receipts</p>
        </div>

        <div className="spatial-card p-4 rounded-2xl bg-white border border-emerald-100 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-emerald-700">
            <span className="text-[11px] font-bold uppercase tracking-wider">Commission (15%)</span>
            <Percent className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600 font-mono-numbers">{formatINR(stats.total_commission)}</div>
          <p className="text-[10px] text-emerald-600/80 font-medium">Platform earned profit</p>
        </div>

        <div className="spatial-card p-4 rounded-2xl bg-white border border-sky-100 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-sky-700">
            <span className="text-[11px] font-bold uppercase tracking-wider">Owner Payout (85%)</span>
            <Building className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-black text-sky-700 font-mono-numbers">{formatINR(stats.total_payouts)}</div>
          <p className="text-[10px] text-slate-400">Paid to ship operators</p>
        </div>

        <div className="spatial-card p-4 rounded-2xl bg-white border border-purple-100 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-purple-700">
            <span className="text-[11px] font-bold uppercase tracking-wider">Refunds Issued</span>
            <RotateCcw className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-purple-600 font-mono-numbers">{formatINR(stats.total_refunds)}</div>
          <p className="text-[10px] text-purple-700 font-medium">Reversals & cancellations</p>
        </div>

        <div className="spatial-card p-4 rounded-2xl bg-white border border-rose-100 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-rose-700">
            <span className="text-[11px] font-bold uppercase tracking-wider">Failed Txns</span>
            <AlertCircle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-600 font-mono-numbers">{stats.failed_count}</div>
          <p className="text-[10px] text-rose-500 font-medium">Dropouts / bank declines</p>
        </div>
      </div>

      {/* 2. SUB-TABS & SEARCH / FILTER DOCK */}
      <div className="p-2.5 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Sub Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-bold scrollbar-none">
          {[
            { id: 'ALL', label: `All Transactions (${transactions.length})` },
            { id: 'PAID', label: 'Completed Payments' },
            { id: 'REFUNDED', label: 'Refunds & Reversals' },
            { id: 'FAILED', label: `Failed Transactions (${stats.failed_count})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as TransactionTab)}
              className={`px-4 py-1.5 rounded-full cursor-pointer transition whitespace-nowrap border ${
                activeSubTab === tab.id
                  ? 'bg-[#0284c7] text-white border-[#0284c7] shadow-sm font-black'
                  : 'bg-white text-slate-600 border-slate-200 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search & Refresh */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search TXN, Booking Ref, Customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-300 text-xs w-60 bg-slate-50 focus:bg-white focus:outline-none"
            />
          </div>

          <button
            onClick={() => {
              setSearchQuery('');
              fetchTransactions();
            }}
            className="p-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
            title="Refresh Ledger"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 3. TRANSACTIONS LEDGER TABLE */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Transaction / Ref</th>
                <th className="py-3 px-4">Customer & Contact</th>
                <th className="py-3 px-4">Vessel / Trip</th>
                <th className="py-3 px-4 text-right">Customer Paid</th>
                <th className="py-3 px-4 text-right">Platform Comm (15%)</th>
                <th className="py-3 px-4 text-right">Owner Payout (85%)</th>
                <th className="py-3 px-4">Payment Status</th>
                <th className="py-3 px-4">Gateway & Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-sky-600" />
                    Auditing transaction ledger...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No transactions found for the selected view.
                  </td>
                </tr>
              ) : (
                transactions.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4">
                      <div className="font-mono font-bold text-sky-800 text-xs">{t.transaction_id}</div>
                      <div className="text-[11px] text-slate-400 font-mono">Ref: #{t.booking_id}</div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{t.customer_name}</div>
                      <div className="text-[10px] text-slate-500">{t.customer_email}</div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800 line-clamp-1">{t.ship_name}</div>
                      <div className="text-[10px] text-slate-400">
                        {t.booking_type === 'EVENT' ? 'Private Charter' : 'Tour Ticket'} • {t.booking_date}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="font-black text-slate-900 font-mono-numbers">{formatINR(t.gross_amount)}</div>
                      {t.discount_amount > 0 && (
                        <div className="text-[10px] text-emerald-600">-₹{t.discount_amount} promo</div>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="font-bold text-emerald-600 font-mono-numbers">{formatINR(t.platform_commission_amount)}</div>
                      <div className="text-[10px] text-slate-400 font-semibold">15% fee</div>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="font-bold text-sky-700 font-mono-numbers">{formatINR(t.owner_payout_amount)}</div>
                      <div className="text-[10px] text-slate-400 font-semibold">85% to host</div>
                    </td>

                    <td className="py-3 px-4">
                      {t.payment_status === 'PAID' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold whitespace-nowrap">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          PAID
                        </span>
                      ) : t.payment_status === 'REFUNDED' ? (
                        <div>
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-100 text-purple-800 text-[10px] font-bold whitespace-nowrap">
                            <RotateCcw className="w-3 h-3 text-purple-600" />
                            REFUNDED
                          </span>
                          <div className="text-[10px] text-purple-700 font-mono mt-0.5 font-semibold">
                            {formatINR(t.refund_amount)}
                          </div>
                        </div>
                      ) : t.payment_status === 'FAILED' ? (
                        <button
                          onClick={() => setInspectTarget(t)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold cursor-pointer hover:bg-rose-200 whitespace-nowrap"
                        >
                          <AlertCircle className="w-3 h-3 text-rose-600" />
                          FAILED
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold whitespace-nowrap">
                          <Clock className="w-3 h-3 text-amber-600" />
                          PENDING
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <div className="text-slate-800 font-semibold">{t.payment_method}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{t.created_at}</div>
                    </td>

                    <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                      {/* Invoice */}
                      {onOpenInvoice && (
                        <button
                          onClick={() => onOpenInvoice(t.booking_id)}
                          className="px-2 py-1 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 font-bold text-[11px] cursor-pointer transition border border-sky-200"
                          title="View Tax Invoice"
                        >
                          <Receipt className="w-3 h-3 inline mr-1" />
                          Invoice
                        </button>
                      )}

                      {/* Refund Trigger */}
                      {t.payment_status === 'PAID' && (
                        <button
                          onClick={() => handleOpenRefund(t)}
                          className="px-2 py-1 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 font-bold text-[11px] cursor-pointer transition border border-purple-200"
                          title="Issue Full / Partial Refund"
                        >
                          <RotateCcw className="w-3 h-3 inline mr-1" />
                          Refund
                        </button>
                      )}

                      {/* Retry Failed Session */}
                      {t.payment_status === 'FAILED' && (
                        <button
                          onClick={() => handleRetryPayment(t.booking_id)}
                          className="px-2 py-1 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold text-[11px] cursor-pointer transition border border-rose-200"
                          title="Reset Payment Link for Customer Retry"
                        >
                          <RefreshCw className="w-3 h-3 inline mr-1" />
                          Retry
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. PROCESS REFUND MODAL */}
      {refundTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-purple-600" />
                <span>Process Customer Refund</span>
              </h3>
              <button onClick={() => setRefundTarget(null)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Booking Reference:</span>
                <span className="font-mono font-bold text-slate-800">#{refundTarget.booking_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Customer:</span>
                <span className="font-bold text-slate-800">{refundTarget.customer_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Original Amount Paid:</span>
                <span className="font-bold text-slate-900 font-mono-numbers">{formatINR(refundTarget.gross_amount)}</span>
              </div>
            </div>

            <form onSubmit={handleProcessRefundSubmit} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">
                  Refund Amount (INR ₹)
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  max={refundTarget.gross_amount}
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-mono font-bold"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Full refund or partial cancellation fee deduction.
                </p>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">
                  Reason for Refund
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Passenger cancelled 48h prior, maritime weather cancellation by port authority..."
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-slate-50 focus:bg-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRefundTarget(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={refundLoading}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs cursor-pointer shadow-sm shadow-purple-600/30 flex items-center gap-1.5"
                >
                  {refundLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                  Confirm & Reverse Funds
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. INSPECT FAILED TRANSACTION MODAL */}
      {inspectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-rose-700 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                <span>Failed Transaction Audit</span>
              </h3>
              <button onClick={() => setInspectTarget(null)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-rose-50/70 border border-rose-100 text-xs space-y-2">
              <div className="font-bold text-rose-900">Failure Diagnostic Log:</div>
              <p className="font-mono text-[11px] text-rose-800 bg-white p-2.5 rounded-xl border border-rose-200 break-words">
                {inspectTarget.failure_reason || 'ERR_PAYMENT_TIMEOUT: Gateway connection dropped before authorization.'}
              </p>
            </div>

            <div className="space-y-1.5 text-xs text-slate-600">
              <div className="flex justify-between">
                <span className="text-slate-400">Customer:</span>
                <span className="font-bold text-slate-800">{inspectTarget.customer_name} ({inspectTarget.customer_phone || inspectTarget.customer_email})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Attempted Amount:</span>
                <span className="font-bold text-slate-900 font-mono-numbers">{formatINR(inspectTarget.gross_amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Payment Gateway Ref:</span>
                <span className="font-mono text-slate-700">{inspectTarget.payment_gateway_ref}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setInspectTarget(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => {
                  const bId = inspectTarget.booking_id;
                  setInspectTarget(null);
                  handleRetryPayment(bId);
                }}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 cursor-pointer shadow-sm flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Resend Payment Session
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
