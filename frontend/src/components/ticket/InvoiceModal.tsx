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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#051833]/60 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-3xl my-8 bg-[#F8FCFF] rounded-3xl shadow-2xl border border-[#38bdf8]/30 overflow-hidden text-[#102B46]">
        {/* Header Bar - Midnight Oceanic Navy */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#051833] text-[#fff8dc] border-b border-[#38bdf8]/20">
          <div className="flex items-center gap-2">
            <Anchor className="w-5 h-5 text-[#38bdf8]" />
            <span className="font-serif font-bold tracking-wider text-sm">CROSS-HUNT TAX INVOICE</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#38bdf8]/20 text-[#38bdf8] hover:bg-[#38bdf8]/30 text-xs font-bold transition cursor-pointer border border-[#38bdf8]/30"
            >
              <Printer className="w-3.5 h-3.5" />
              Print / Save PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-[#fff8dc] transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center">
            <div className="w-10 h-10 mx-auto border-4 border-[#1677C8] border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-xs font-bold text-[#102B46]/60 uppercase tracking-widest">Generating Official GST Invoice...</p>
          </div>
        ) : error || !invoice ? (
          <div className="py-16 px-6 text-center">
            <p className="text-red-500 font-bold">{error || 'Invoice could not be loaded.'}</p>
            <button onClick={onClose} className="mt-4 px-4 py-2 bg-[#082F5B] text-white rounded-full text-xs font-bold">Close</button>
          </div>
        ) : (
          <div className="p-8 space-y-8 print:p-0">
            {/* Top Brand & Metadata */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b border-[#082F5B]/10 pb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-7 h-7 rounded-lg bg-[#1677C8] text-white flex items-center justify-center font-black text-xs">CH</div>
                  <span className="text-xl font-black tracking-tight text-[#102B46] font-serif">CROSS-HUNT</span>
                </div>
                <p className="text-xs text-[#102B46]/70">Cruise Bookings & Boat Rentals India</p>
                <p className="text-xs text-[#102B46]/60">GSTIN: 27AABCC1234F1Z5</p>
              </div>
              <div className="sm:text-right">
                <span className="inline-block px-3 py-1 rounded-full text-[11px] font-black tracking-wider uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 mb-2">
                  {invoice.payment_status}
                </span>
                <p className="text-xs font-mono font-bold text-[#102B46]">{invoice.invoice_number}</p>
                <p className="text-xs text-[#102B46]/60">Booking Ref: <span className="font-semibold text-[#102B46]">{invoice.booking_id}</span></p>
                <p className="text-xs text-[#102B46]/60">Issue Date: {invoice.issue_date}</p>
              </div>
            </div>

            {/* Billed To / Operator */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-[#EAF4FB] p-5 rounded-2xl border border-[#082F5B]/10 text-xs">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#102B46]/60 mb-1">Billed To (Guest)</p>
                <p className="font-bold text-sm text-[#102B46]">{invoice.customer_name}</p>
                <p className="text-[#102B46]/70">{invoice.customer_email}</p>
                <p className="text-[#102B46]/70">{invoice.customer_phone}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#102B46]/60 mb-1">Boat / Ship & Route</p>
                <p className="font-bold text-sm text-[#102B46]">{invoice.ship_name}</p>
                <p className="text-[#102B46]/70">{invoice.departure_port} → {invoice.destination}</p>
                <p className="text-[#102B46]/70">Trip Date: {invoice.booking_date} ({invoice.duration})</p>
              </div>
            </div>

            {/* Line Items Table */}
            <div>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#082F5B]/10 text-[10px] font-bold uppercase tracking-wider text-[#102B46]/60">
                    <th className="py-2">Item Description</th>
                    <th className="py-2 text-center">Qty</th>
                    <th className="py-2 text-right">Unit Rate</th>
                    <th className="py-2 text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#082F5B]/10 text-xs">
                  {invoice.line_items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-[#EAF4FB]/50">
                      <td className="py-3 font-medium text-[#102B46]">{item.description}</td>
                      <td className="py-3 text-center text-[#102B46]/70">{item.quantity}</td>
                      <td className="py-3 text-right text-[#102B46]/70">{formatINR(item.unit_price)}</td>
                      <td className="py-3 text-right font-bold text-[#102B46]">{formatINR(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Financial Totals */}
            <div className="flex justify-end pt-2">
              <div className="w-full max-w-xs space-y-2 text-xs">
                <div className="flex justify-between text-[#102B46]/70">
                  <span>Subtotal:</span>
                  <span className="font-semibold text-[#102B46]">{formatINR(invoice.subtotal)}</span>
                </div>
                {invoice.extras_amount > 0 && (
                  <div className="flex justify-between text-[#102B46]/70">
                    <span>Selected Extras:</span>
                    <span className="font-semibold text-[#102B46]">{formatINR(invoice.extras_amount)}</span>
                  </div>
                )}
                {invoice.discount_amount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-semibold">
                    <span>Promotional Discount:</span>
                    <span>- {formatINR(invoice.discount_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-[#102B46]/70">
                  <span>GST (18%):</span>
                  <span className="font-semibold text-[#102B46]">{formatINR(invoice.tax_amount)}</span>
                </div>
                <div className="border-t border-[#082F5B]/15 pt-2 flex justify-between text-base font-black text-[#102B46]">
                  <span>Total Amount Paid:</span>
                  <span className="text-[#1677C8]">{formatINR(invoice.total_price)}</span>
                </div>
              </div>
            </div>

            {/* Footer Notice */}
            <div className="flex items-center justify-between pt-6 border-t border-[#082F5B]/10 text-[11px] text-[#102B46]/60">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>Verified GST Invoice in INR (₹)</span>
              </div>
              <span>Thank you for traveling with Cross-Hunt</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
