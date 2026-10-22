import React, { useState, useEffect } from 'react';
import { MessageSquare, ShieldCheck, CheckCircle2, AlertCircle, Sparkles, Phone, Lock } from 'lucide-react';
import { isValidWhatsAppMobile, formatIndianPhoneNumber } from '../../utils/whatsapp';

interface WhatsAppReminderCardProps {
  whatsappNumber: string;
  onWhatsAppNumberChange: (value: string) => void;
  optIn: boolean;
  onOptInChange: (value: boolean) => void;
  userDefaultPhone?: string;
  disabled?: boolean;
}

const COUNTRY_CODES = [
  { code: '+91', label: '🇮🇳 India (+91)', digitsLength: 10 },
  { code: '+971', label: '🇦🇪 UAE (+971)', digitsLength: 9 },
  { code: '+1', label: '🇺🇸 / 🇨🇦 USA/Canada (+1)', digitsLength: 10 },
  { code: '+44', label: '🇬🇧 UK (+44)', digitsLength: 10 },
  { code: '+65', label: '🇸🇬 Singapore (+65)', digitsLength: 8 },
  { code: '+61', label: '🇦🇺 Australia (+61)', digitsLength: 9 },
  { code: '+49', label: '🇩🇪 Germany (+49)', digitsLength: 11 },
];

export const WhatsAppReminderCard: React.FC<WhatsAppReminderCardProps> = ({
  whatsappNumber,
  onWhatsAppNumberChange,
  optIn,
  onOptInChange,
  userDefaultPhone,
  disabled = false,
}) => {
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>('+91');
  const [localNumber, setLocalNumber] = useState<string>('');

  // Synchronize incoming whatsappNumber or userDefaultPhone on mount
  useEffect(() => {
    if (whatsappNumber && whatsappNumber.trim()) {
      const trimmed = whatsappNumber.trim();
      const matchedCode = COUNTRY_CODES.find((c) => trimmed.startsWith(c.code));
      if (matchedCode) {
        setSelectedCountryCode(matchedCode.code);
        setLocalNumber(trimmed.slice(matchedCode.code.length).replace(/\D/g, ''));
      } else if (trimmed.startsWith('+')) {
        setSelectedCountryCode('+91');
        setLocalNumber(trimmed.replace(/\D/g, ''));
      } else {
        setLocalNumber(trimmed.replace(/\D/g, ''));
      }
    } else if (userDefaultPhone && userDefaultPhone.trim()) {
      const clean = userDefaultPhone.trim().replace(/\D/g, '');
      if (clean.length === 10) {
        setLocalNumber(clean);
        onWhatsAppNumberChange(`+91${clean}`);
      } else if (clean.length === 12 && clean.startsWith('91')) {
        setLocalNumber(clean.slice(2));
        onWhatsAppNumberChange(`+${clean}`);
      }
    }
  }, []);

  const handleCountryCodeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const code = e.target.value;
    setSelectedCountryCode(code);
    if (localNumber) {
      onWhatsAppNumberChange(`${code}${localNumber}`);
    }
  };

  const handlePhoneInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^\d]/g, '').slice(0, 15);
    setLocalNumber(val);
    if (val.length >= 7) {
      onWhatsAppNumberChange(`${selectedCountryCode}${val}`);
    } else if (val.length === 0) {
      onWhatsAppNumberChange('');
    } else {
      onWhatsAppNumberChange(`${selectedCountryCode}${val}`);
    }
  };

  const handleUseProfilePhone = () => {
    if (!userDefaultPhone) return;
    const clean = userDefaultPhone.replace(/\D/g, '');
    let digits = clean;
    if (clean.length === 12 && clean.startsWith('91')) {
      digits = clean.slice(2);
      setSelectedCountryCode('+91');
    } else if (clean.length === 10) {
      digits = clean;
      setSelectedCountryCode('+91');
    }
    setLocalNumber(digits);
    onWhatsAppNumberChange(`+91${digits}`);
  };

  const fullNormalized = localNumber ? `${selectedCountryCode}${localNumber}` : '';
  const isValid = isValidWhatsAppMobile(fullNormalized);

  return (
    <div className="rounded-3xl border border-emerald-200/90 bg-gradient-to-br from-white via-emerald-50/20 to-teal-50/30 p-6 sm:p-7 shadow-sm transition space-y-5">
      {/* Header with WhatsApp branding & Flow tag */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/25 shrink-0">
            <MessageSquare className="w-6 h-6 fill-white text-emerald-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight font-serif">
                WhatsApp Tour Reminder
              </h3>
              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                <Sparkles className="w-2.5 h-2.5 text-emerald-600" />
                Automated 24h
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Embarkation details, jetty directions & ticket code straight to your WhatsApp.
            </p>
          </div>
        </div>

        {/* Simple Workflow Pill */}
        <div className="hidden lg:flex items-center gap-1 px-3 py-1 rounded-full bg-slate-100/90 border border-slate-200 text-[11px] font-mono font-medium text-slate-600">
          <span className="text-sky-700 font-bold">Book</span>
          <span>→</span>
          <span className="text-emerald-700 font-bold">Verify</span>
          <span>→</span>
          <span className="text-emerald-700 font-bold">Consent</span>
          <span>→</span>
          <span className="text-teal-700 font-bold">24h Reminder</span>
        </div>
      </div>

      {/* Input row */}
      <div className="space-y-3">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
          Customer WhatsApp Number <span className="text-rose-500">*</span>
        </label>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {/* Country Code Selector */}
          <div className="relative shrink-0">
            <select
              value={selectedCountryCode}
              onChange={handleCountryCodeChange}
              disabled={disabled}
              className="w-full sm:w-auto px-3.5 py-3 rounded-2xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 cursor-pointer transition shadow-sm"
            >
              {COUNTRY_CODES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Number Input */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Phone className="w-4 h-4 text-emerald-600" />
            </div>
            <input
              type="tel"
              inputMode="numeric"
              placeholder="e.g. 98765 43210"
              value={localNumber}
              onChange={handlePhoneInputChange}
              disabled={disabled}
              maxLength={15}
              className={`w-full pl-10 pr-10 py-3 rounded-2xl border text-sm font-semibold transition shadow-sm focus:outline-none ${
                localNumber && isValid
                  ? 'border-emerald-400 bg-white text-slate-900 focus:ring-2 focus:ring-emerald-400/30'
                  : localNumber && !isValid
                  ? 'border-amber-300 bg-amber-50/30 text-slate-900 focus:ring-2 focus:ring-amber-300/30'
                  : 'border-slate-200 bg-white text-slate-900 focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500'
              }`}
            />
            {/* Status icon inside input */}
            <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
              {localNumber && isValid && (
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              )}
              {localNumber && !isValid && (
                <AlertCircle className="w-5 h-5 text-amber-500" />
              )}
            </div>
          </div>

          {/* Auto-fill button if user has phone */}
          {userDefaultPhone && !localNumber && (
            <button
              type="button"
              onClick={handleUseProfilePhone}
              className="px-3.5 py-2.5 rounded-2xl bg-white border border-slate-200 text-sky-700 hover:bg-sky-50 text-xs font-bold transition shadow-sm cursor-pointer whitespace-nowrap"
            >
              Autofill Phone
            </button>
          )}
        </div>

        {/* Validation Feedback & Preview */}
        <div className="flex flex-wrap items-center justify-between text-xs pt-1">
          <div>
            {localNumber && isValid && (
              <span className="inline-flex items-center gap-1.5 text-emerald-700 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Verified Mobile Format: <code className="bg-emerald-100 text-emerald-900 px-1.5 py-0.5 rounded font-mono text-[11px]">{selectedCountryCode} {localNumber}</code>
              </span>
            )}
            {localNumber && !isValid && (
              <span className="inline-flex items-center gap-1.5 text-amber-700 font-semibold">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                Please enter a valid 10-digit mobile number.
              </span>
            )}
            {!localNumber && (
              <span className="text-slate-400 text-[11px]">
                Enter 10-digit mobile number without leading 0.
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Opt-In / Consent Checkbox */}
      <div className="pt-2 border-t border-emerald-100/80">
        <label className="flex items-start gap-3 cursor-pointer select-none group">
          <input
            type="checkbox"
            checked={optIn}
            onChange={(e) => onOptInChange(e.target.checked)}
            disabled={disabled}
            className="mt-1 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer accent-emerald-600"
          />
          <div className="space-y-0.5">
            <span className="text-xs sm:text-sm font-bold text-slate-800 group-hover:text-emerald-800 transition">
              I agree to receive automated WhatsApp tour reminders (24h before trip)
            </span>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Includes departure countdown, boarding pass link, ship gate details, and weather alerts. You can opt-out at any time from your dashboard.
            </p>
          </div>
        </label>
      </div>

      {/* Security and Privacy Assurance */}
      <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-white/80 border border-slate-200/80 text-[11px] text-slate-600">
        <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
          <Lock className="w-3 h-3" />
        </div>
        <p className="leading-tight">
          <strong className="text-slate-800 font-semibold">Privacy Protected:</strong> Your WhatsApp number is securely encrypted and will <span className="underline decoration-emerald-400">never</span> be displayed publicly on ticket pages or passenger lists.
        </p>
      </div>
    </div>
  );
};
