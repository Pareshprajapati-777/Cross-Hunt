import React, { useEffect, useState } from 'react';
import { X, Printer, ShieldCheck, Anchor } from 'lucide-react';
import { getBookingInvoice } from '../../api/bookings';
import { InvoiceData } from '../../api/types';
import { formatINR } from '../../utils/currency';

interface InvoiceModalProps {
  bookingId: string;
  onClose: () => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({ bookingId, onClose }) => {
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await getBookingInvoice(bookingId);
        setInvoice(res.invoice);
      } catch (err: any) {
        setError(err.message || 'Failed to generate tax invoice.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [bookingId]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-3xl my-8 bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden text-slate-800">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <Anchor className="w-5 h-5 text-sky-400" />
            <span className="font-serif font-bold tracking-wider text-sm">CROSS-HUNT TAX INVOICE</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500/20 text-sky-300 hover:bg-sky-500/30 text-xs font-bold transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Print / Save PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center">
            <div className="w-10 h-10 mx-auto border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Generating Official GST Invoice...</p>
          </div>
        ) : error || !invoice ? (
          <div className="py-16 px-6 text-center">
            <p className="text-red-500 font-bold">{error || 'Invoice could not be loaded.'}</p>
            <button onClick={onClose} className="mt-4 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold">Close</button>
          </div>
        ) : (
          <div className="p-8 space-y-8 print:p-0">
            {/* Top Brand & Metadata */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b border-slate-100 pb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-7 h-7 rounded-lg bg-sky-500 text-white flex items-center justify-center font-black text-xs">CH</div>
                  <span className="text-xl font-black tracking-tight text-slate-900 font-serif">CROSS-HUNT</span>
                </div>
                <p className="text-xs text-slate-500">Maritime Cruise Bookings & Luxury Charters India</p>
                <p className="text-xs text-slate-500">GSTIN: 27AABCC1234F1Z5</p>
              </div>
              <div className="sm:text-right">
                <span className="inline-block px-3 py-1 rounded-full text-[11px] font-black tracking-wider uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 mb-2">
                  {invoice.payment_status}
                </span>
                <p className="text-xs font-mono font-bold text-slate-900">{invoice.invoice_number}</p>
                <p className="text-xs text-slate-500">Booking Ref: <span className="font-semibold text-slate-800">{invoice.booking_id}</span></p>
                <p className="text-xs text-slate-500">Issue Date: {invoice.issue_date}</p>
              </div>
            </div>

            {/* Billed To / Operator */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-slate-50 p-5 rounded-2xl border border-slate-100 text-xs">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Billed To (Guest)</p>
                <p className="font-bold text-sm text-slate-900">{invoice.customer_name}</p>
                <p className="text-slate-600">{invoice.customer_email}</p>
                <p className="text-slate-600">{invoice.customer_phone}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Fleet Vessel & Route</p>
                <p className="font-bold text-sm text-slate-900">{invoice.ship_name}</p>
                <p className="text-slate-600">{invoice.departure_port} → {invoice.destination}</p>
                <p className="text-slate-600">Embarkation: {invoice.booking_date} ({invoice.duration})</p>
              </div>
            </div>

            {/* Line Items Table */}
            <div>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="py-2">Item Description</th>
                    <th className="py-2 text-center">Qty</th>
                    <th className="py-2 text-right">Unit Rate</th>
                    <th className="py-2 text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {invoice.line_items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="py-3 font-medium text-slate-800">{item.description}</td>
                      <td className="py-3 text-center text-slate-600">{item.quantity}</td>
                      <td className="py-3 text-right text-slate-600">{formatINR(item.unit_price)}</td>
                      <td className="py-3 text-right font-bold text-slate-900">{formatINR(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Financial Totals */}
            <div className="flex justify-end pt-2">
              <div className="w-full max-w-xs space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-semibold text-slate-900">{formatINR(invoice.subtotal)}</span>
                </div>
                {invoice.extras_amount > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Selected Extras:</span>
                    <span className="font-semibold text-slate-900">{formatINR(invoice.extras_amount)}</span>
                  </div>
                )}
                {invoice.discount_amount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-semibold">
                    <span>Promotional Discount:</span>
                    <span>- {formatINR(invoice.discount_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600">
                  <span>Maritime Tourism GST (18%):</span>
                  <span className="font-semibold text-slate-900">{formatINR(invoice.tax_amount)}</span>
                </div>
                <div className="border-t border-slate-200 pt-2 flex justify-between text-base font-black text-slate-900">
                  <span>Total Amount Paid:</span>
                  <span className="text-sky-600">{formatINR(invoice.total_price)}</span>
                </div>
              </div>
            </div>

            {/* Footer Notice */}
            <div className="flex items-center justify-between pt-6 border-t border-slate-100 text-[11px] text-slate-400">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>Verified System-Generated Maritime Invoice in INR (₹)</span>
              </div>
              <span>Thank you for sailing with Cross-Hunt</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
