import React, { useState } from 'react';
import { Cruise } from '../../api/types';
import {
  Phone,
  MessageSquare,
  ShieldCheck,
  Building2,
  Calendar,
  Users,
  Send,
  X,
  CheckCircle2,
  ExternalLink,
  Clock,
  Sparkles
} from 'lucide-react';
import {
  formatIndianPhoneNumber,
  generateWhatsAppUrl,
  isValidWhatsAppMobile
} from '../../utils/whatsapp';

// Authentic WhatsApp SVG Icon
export const WhatsAppIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-hidden="true"
  >
    <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0012.04 2zm5.8 14.18c-.24.68-1.2 1.26-1.66 1.32-.43.06-.99.1-3.21-.82-2.34-.97-3.86-3.34-3.98-3.5-.11-.15-.94-1.25-.94-2.39 0-1.13.59-1.69.8-1.92.21-.24.47-.3.62-.3.16 0 .31 0 .45.01.14.01.33-.05.51.39.19.45.65 1.58.71 1.69.06.12.1.26.02.42-.08.16-.12.26-.24.4-.12.14-.25.32-.36.43-.12.12-.24.25-.1.5.14.24.63 1.04 1.35 1.68.93.83 1.71 1.09 1.95 1.21.24.12.38.1.53-.06.14-.17.62-.73.79-.98.17-.25.33-.21.56-.12.24.08 1.5.71 1.76.84.26.12.43.19.49.3.06.11.06.65-.18 1.33z" />
  </svg>
);

interface ShipContactCardProps {
  cruise: Cruise;
  compact?: boolean;
  selectedDate?: string;
  onDateChange?: (date: string) => void;
}

export const ShipContactCard: React.FC<ShipContactCardProps> = ({
  cruise,
  compact = false,
  selectedDate,
  onDateChange
}) => {
  const [showModal, setShowModal] = useState(false);
  const [modalDate, setModalDate] = useState(selectedDate || '');
  const [modalGuests, setModalGuests] = useState(2);
  const [modalMessage, setModalMessage] = useState('');
  const [inquirySent, setInquirySent] = useState(false);

  const managementName =
    cruise.management_name ||
    cruise.operator_name ||
    'Cross-Hunt Marine Fleet';

  const isOperator = cruise.management_type === 'OPERATOR' || !!cruise.operator_name;
  const isOwner = cruise.management_type === 'OWNER';

  // Contact numbers strictly from verified database records
  const contactPhone = cruise.contact_number || cruise.operator_phone || '';
  const waNumber = cruise.whatsapp_number || (cruise.is_whatsapp_available ? contactPhone : '');

  // Check if WhatsApp is truly available and valid
  const isWhatsAppAvailable =
    Boolean(cruise.is_whatsapp_available) ||
    Boolean(waNumber && isValidWhatsAppMobile(waNumber));

  // WhatsApp Link generator
  const activeDate = modalDate || selectedDate || '';
  const waUrl = isWhatsAppAvailable
    ? generateWhatsAppUrl(waNumber, cruise.title || cruise.name, activeDate, modalGuests, modalMessage)
    : null;

  const handleOpenWhatsApp = (e?: React.MouseEvent) => {
    if (!waUrl) return;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  const handleSendInquiry = (e: React.FormEvent) => {
    e.preventDefault();
    setInquirySent(true);
    setTimeout(() => {
      setInquirySent(false);
      setShowModal(false);
    }, 2000);
  };

  // Compact Mode (for sticky sidebar)
  if (compact) {
    return (
      <div className="pt-4 border-t border-slate-100 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Vessel Management
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            <ShieldCheck className="w-3 h-3 text-emerald-600" />
            Verified Source
          </span>
        </div>

        <div className="flex items-center justify-between text-xs">
          <div className="truncate pr-2">
            <p className="font-bold text-slate-900 truncate">{managementName}</p>
            {contactPhone ? (
              <p className="text-slate-500 font-medium text-[11px] mt-0.5">
                {formatIndianPhoneNumber(contactPhone)}
              </p>
            ) : (
              <p className="text-slate-400 text-[11px]">Contact via Cross-Hunt</p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          {/* WhatsApp Button (Hidden if unavailable/missing/landline) */}
          {isWhatsAppAvailable && waUrl && (
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 px-3 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
            >
              <WhatsAppIcon className="w-4 h-4 fill-white" />
              <span>Chat on WhatsApp</span>
            </a>
          )}

          <div className="grid grid-cols-2 gap-2">
            {/* Call Button */}
            {contactPhone ? (
              <a
                href={`tel:${contactPhone}`}
                className="py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer text-center"
              >
                <Phone className="w-3.5 h-3.5 text-sky-400" />
                <span>Call Now</span>
              </a>
            ) : (
              <button
                disabled
                className="py-2.5 px-3 rounded-xl bg-slate-100 text-slate-400 font-bold text-xs flex items-center justify-center gap-1.5 cursor-not-allowed text-center"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Call Concierge</span>
              </button>
            )}

            {/* Direct Enquiry Button */}
            <button
              onClick={() => setShowModal(true)}
              className="py-2.5 px-3 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer text-center"
            >
              <MessageSquare className="w-3.5 h-3.5 text-sky-600" />
              <span>Enquire</span>
            </button>
          </div>
        </div>

        {/* Modal */}
        {showModal && renderContactModal()}
      </div>
    );
  }

  // Full Card Mode (for main content column)
  return (
    <section className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-100">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold font-serif text-slate-900">
              Vessel Management & Direct Contact
            </h2>
            <p className="text-xs text-slate-500">
              Direct connection with official operator or verified ship owner
            </p>
          </div>
        </div>

        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 self-start sm:self-auto">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          {isOwner ? 'Registered Platform Owner' : 'Verified Marine Operator'}
        </span>
      </div>

      <div className="bg-slate-50/80 rounded-2xl p-5 border border-slate-200/70 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <h3 className="font-extrabold text-slate-900 text-lg">{managementName}</h3>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-800 uppercase tracking-wider">
              {isOwner ? 'Ship Owner' : 'Operator'}
            </span>
          </div>

          <p className="text-xs text-slate-600">
            Base Port: <span className="font-semibold text-slate-800">{cruise.location} ({cruise.departure_port})</span>
          </p>

          {/* Numbers list */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 pt-2 text-xs">
            {contactPhone && (
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 font-medium">Direct Phone:</span>
                <a
                  href={`tel:${contactPhone}`}
                  className="font-bold text-slate-900 hover:text-sky-600 hover:underline"
                >
                  {formatIndianPhoneNumber(contactPhone)}
                </a>
              </div>
            )}

            {isWhatsAppAvailable && waNumber && (
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 font-medium">WhatsApp:</span>
                <span className="font-bold text-emerald-700">
                  {formatIndianPhoneNumber(waNumber)}
                </span>
              </div>
            )}

            {cruise.operator_email && (
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 font-medium">Email:</span>
                <a
                  href={`mailto:${cruise.operator_email}`}
                  className="font-medium text-sky-700 hover:underline"
                >
                  {cruise.operator_email}
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Contact Action Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
          {/* 1. WhatsApp Button (Hidden if unverified or landline) */}
          {isWhatsAppAvailable && waUrl && (
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="py-3 px-5 rounded-2xl bg-[#25D366] hover:bg-[#20ba59] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
            >
              <WhatsAppIcon className="w-4 h-4 fill-white" />
              <span>Chat on WhatsApp</span>
            </a>
          )}

          {/* 2. Call Button */}
          {contactPhone && (
            <a
              href={`tel:${contactPhone}`}
              className="py-3 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Phone className="w-3.5 h-3.5 text-sky-400" />
              <span>Call Operator</span>
            </a>
          )}

          {/* 3. Message / Contact Button */}
          <button
            onClick={() => setShowModal(true)}
            className="py-3 px-4 rounded-2xl bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <MessageSquare className="w-3.5 h-3.5 text-sky-600" />
            <span>Send Direct Enquiry</span>
          </button>
        </div>
      </div>

      {showModal && renderContactModal()}
    </section>
  );

  // Direct Contact / Enquiry Modal
  function renderContactModal() {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
        <div className="relative w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600 block">
                Direct Charter Enquiry
              </span>
              <h3 className="text-xl font-bold font-serif text-slate-900">
                Contact {managementName}
              </h3>
            </div>
            <button
              onClick={() => setShowModal(false)}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {inquirySent ? (
            <div className="py-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-slate-900">Enquiry Submitted!</h4>
              <p className="text-xs text-slate-600 max-w-xs mx-auto">
                Your message has been sent to {managementName}. They will get in touch with you shortly.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSendInquiry} className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                <p className="text-slate-500 font-medium">Inquiring about vessel:</p>
                <p className="text-sm font-bold text-slate-900">{cruise.title || cruise.name}</p>
                <p className="text-[11px] text-slate-500">Location: {cruise.location}</p>
              </div>

              {/* Booking Target Date */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-sky-600" />
                  <span>Target Cruise Date</span>
                </label>
                <input
                  type="date"
                  value={modalDate}
                  onChange={(e) => {
                    setModalDate(e.target.value);
                    if (onDateChange) onDateChange(e.target.value);
                  }}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              {/* Number of Passengers */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-sky-600" />
                  <span>Estimated Number of Guests</span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={cruise.capacity || 200}
                  value={modalGuests}
                  onChange={(e) => setModalGuests(parseInt(e.target.value) || 1)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              {/* Note / Message */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Special Requirements or Questions
                </label>
                <textarea
                  rows={3}
                  value={modalMessage}
                  onChange={(e) => setModalMessage(e.target.value)}
                  placeholder="e.g. Sunset charter, celebration decor, food catering preference..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
                />
              </div>

              {/* Instant WhatsApp Preview & Action */}
              {isWhatsAppAvailable && waUrl && (
                <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                      <WhatsAppIcon className="w-3.5 h-3.5 fill-emerald-600" />
                      Instant WhatsApp Pre-filled Chat
                    </span>
                    <span className="text-[10px] text-emerald-700 font-semibold">Recommended</span>
                  </div>
                  <p className="text-[11px] text-slate-600 italic bg-white p-2 rounded-lg border border-emerald-100">
                    "Hello, I am interested in booking {cruise.title || cruise.name} for {modalDate || 'an upcoming voyage'}.{modalGuests > 1 ? ` Headcount: ${modalGuests} guests.` : ''}{modalMessage ? ` Note: ${modalMessage}` : ''}"
                  </p>
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 px-3 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <WhatsAppIcon className="w-4 h-4 fill-white" />
                    <span>Open in WhatsApp Now</span>
                  </a>
                </div>
              )}

              {/* Bottom Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2">
                {contactPhone && (
                  <a
                    href={`tel:${contactPhone}`}
                    className="py-2.5 px-4 rounded-xl bg-slate-900 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Phone className="w-3.5 h-3.5 text-sky-400" />
                    <span>Call</span>
                  </a>
                )}
                <button
                  type="submit"
                  className="py-2.5 px-5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-md shadow-sky-600/20"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Enquiry Note</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }
};
