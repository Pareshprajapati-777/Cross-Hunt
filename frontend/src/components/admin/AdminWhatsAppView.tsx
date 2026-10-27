import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Clock,
  Send,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  Sliders,
  Check,
  Eye,
  EyeOff,
  Radio,
  FileText,
  Key,
  ExternalLink,
  Settings,
  ArrowUpRight,
  HelpCircle
} from 'lucide-react';
import { WhatsAppIcon } from '../common/WhatsAppIcon';
import {
  getAdminWhatsAppConfig,
  updateAdminWhatsAppConfig,
  triggerAdminWhatsAppDispatch,
  getAdminWhatsAppLogs,
  getAdminWhatsAppCredentials,
  updateAdminWhatsAppCredentials,
  testAdminWhatsAppConnection
} from '../../api/dashboards';
import { sendTestWhatsAppReminder } from '../../api/bookings';
import {
  WhatsAppConfig,
  WhatsAppQueueItem,
  WhatsAppLog,
  WhatsAppConnectionTestResult
} from '../../api/types';

export const AdminWhatsAppView: React.FC = () => {
  const [config, setConfig] = useState<WhatsAppConfig | null>(null);
  const [queue, setQueue] = useState<WhatsAppQueueItem[]>([]);
  const [logs, setLogs] = useState<WhatsAppLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Timing Config State
  const [hoursInput, setHoursInput] = useState<number>(24);
  const [savingHours, setSavingHours] = useState<boolean>(false);
  const [configSuccessMsg, setConfigSuccessMsg] = useState<string | null>(null);

  // Credentials State
  const [apiTokenInput, setApiTokenInput] = useState<string>('');
  const [phoneIdInput, setPhoneIdInput] = useState<string>('');
  const [businessIdInput, setBusinessIdInput] = useState<string>('');
  const [showToken, setShowToken] = useState<boolean>(false);
  const [savingCreds, setSavingCreds] = useState<boolean>(false);
  const [credsSuccessMsg, setCredsSuccessMsg] = useState<string | null>(null);
  const [credsErrorMsg, setCredsErrorMsg] = useState<string | null>(null);
  const [testingConn, setTestingConn] = useState<boolean>(false);
  const [connResult, setConnResult] = useState<WhatsAppConnectionTestResult | null>(null);

  // Dispatch Action State
  const [isDryRun, setIsDryRun] = useState<boolean>(false);
  const [dispatching, setDispatching] = useState<boolean>(false);
  const [dispatchResult, setDispatchResult] = useState<any | null>(null);

  // Interactive Test State
  const [testingBookingId, setTestingBookingId] = useState<string | null>(null);
  const [showFullNumbers, setShowFullNumbers] = useState<boolean>(false);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [resConfig, resCreds] = await Promise.all([
        getAdminWhatsAppConfig(),
        getAdminWhatsAppCredentials().catch(() => null)
      ]);
      setConfig(resConfig.config);
      setQueue(resConfig.upcoming_queue || []);
      setLogs(resConfig.recent_logs || []);
      if (resConfig.config?.configured_hours) {
        setHoursInput(resConfig.config.configured_hours);
      }
      if (resCreds) {
        if (resCreds.phone_number_id) setPhoneIdInput(resCreds.phone_number_id);
        if (resCreds.business_account_id) setBusinessIdInput(resCreds.business_account_id);
      }
    } catch (err: any) {
      console.error('Failed to load WhatsApp admin config:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const handleSaveHours = async (h?: number) => {
    const val = h !== undefined ? h : hoursInput;
    if (val < 1 || val > 168) {
      alert('Please select a valid timing between 1 hour and 168 hours (7 days).');
      return;
    }
    setSavingHours(true);
    setConfigSuccessMsg(null);
    try {
      const res = await updateAdminWhatsAppConfig(val);
      setHoursInput(res.configured_hours);
      setConfigSuccessMsg(`Reminder timing successfully set to ${res.configured_hours} hours before departure.`);
      await fetchAllData();
      setTimeout(() => setConfigSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to update reminder hours.');
    } finally {
      setSavingHours(false);
    }
  };

  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCreds(true);
    setCredsSuccessMsg(null);
    setCredsErrorMsg(null);
    setConnResult(null);
    try {
      const res = await updateAdminWhatsAppCredentials({
        api_token: apiTokenInput || '[UNCHANGED]',
        phone_number_id: phoneIdInput.trim(),
        business_account_id: businessIdInput.trim()
      });
      setCredsSuccessMsg(res.message);
      setApiTokenInput('');
      await fetchAllData();
      setTimeout(() => setCredsSuccessMsg(null), 5000);
    } catch (err: any) {
      setCredsErrorMsg(err.message || 'Failed to save credentials.');
    } finally {
      setSavingCreds(false);
    }
  };

  const handleTestConnection = async () => {
    setTestingConn(true);
    setConnResult(null);
    try {
      const res = await testAdminWhatsAppConnection();
      setConnResult(res);
      await fetchAllData();
    } catch (err: any) {
      setConnResult({
        success: false,
        is_live: false,
        message: err.message || 'Connection test failed.'
      });
    } finally {
      setTestingConn(false);
    }
  };

  const handleTriggerDispatch = async () => {
    if (!window.confirm(`Run automated reminder dispatch now for bookings departing within ${hoursInput} hours? (Dry Run: ${isDryRun ? 'YES' : 'NO'})`)) {
      return;
    }
    setDispatching(true);
    setDispatchResult(null);
    try {
      const res = await triggerAdminWhatsAppDispatch(hoursInput, isDryRun);
      setDispatchResult(res.summary);
      await fetchAllData();
    } catch (err: any) {
      alert(err.message || 'Failed to execute dispatch engine.');
    } finally {
      setDispatching(false);
    }
  };

  const handleSendSingleTest = async (bookingId: string, itemWaLink?: string) => {
    setTestingBookingId(bookingId);
    try {
      const res = await sendTestWhatsAppReminder(bookingId);
      const link = res.wa_link || itemWaLink;
      if (link) {
        window.open(link, '_blank');
        alert(`${res.message}\n\n✅ Opening WhatsApp Web / App with prefilled reminder so the message delivers directly to the traveler's phone!`);
      } else {
        alert(res.message);
      }
      await fetchAllData();
    } catch (err: any) {
      alert(err.message || 'Failed to send test reminder.');
    } finally {
      setTestingBookingId(null);
    }
  };

  if (loading && !config) {
    return (
      <div className="py-24 text-center">
        <div className="w-10 h-10 mx-auto border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
          Loading WhatsApp Engine & Logs...
        </p>
      </div>
    );
  }

  const timingPresets = [6, 12, 24, 48, 72];

  return (
    <div className="space-y-8">
      {/* 1. Header Banner & Architecture Explanation */}
      <div className="rounded-3xl bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 p-6 sm:p-8 text-white shadow-xl border border-emerald-800 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold uppercase tracking-wider border border-emerald-500/30">
              <WhatsAppIcon className="w-4 h-4" variant="solid" />
              WhatsApp Business Engine & Embarkation Automation
            </div>
            <h2 className="text-2xl sm:text-3xl font-black font-serif tracking-tight">
              Automated WhatsApp Trip Reminders
            </h2>

          </div>

          <div className="shrink-0 flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <button
              onClick={fetchAllData}
              className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition flex items-center gap-2 border border-white/20 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Status</span>
            </button>
          </div>
        </div>

      </div>

      {/* 2. Top Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Configured Window</span>
          <span className="text-3xl font-black text-emerald-700">{config?.configured_hours || 24}h</span>
          <p className="text-[11px] text-slate-500">Departure trigger threshold</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Scheduled in Queue</span>
          <span className="text-3xl font-black text-sky-700">{config?.total_scheduled || 0}</span>
          <p className="text-[11px] text-slate-500">Opted-in upcoming trips</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Successfully Sent</span>
          <span className="text-3xl font-black text-emerald-600">{config?.total_sent || 0}</span>
          <p className="text-[11px] text-emerald-600 font-semibold">Delivered reminders</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Opted Out by Customer</span>
          <span className="text-3xl font-black text-slate-600">{config?.total_opted_out || 0}</span>
          <p className="text-[11px] text-slate-400">Respecting user preference</p>
        </div>
      </div>

      {/* 3. Configuration & Dispatch Controls Grid */}
      <div className="space-y-8">


        {/* 2-Column Grid: Timing & Batch Execution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Timing Configuration Card */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm space-y-6">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                Admin Configuration
              </span>
              <h3 className="text-xl font-bold text-slate-900 font-serif mt-2 flex items-center gap-2">
                <Sliders className="w-5 h-5 text-emerald-600" />
                Automated Reminder Timing
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Configure how many hours prior to departure the automated reminder engine will dispatch messages to customers. Default is <strong className="text-slate-800">24 hours</strong>.
              </p>
            </div>

            {configSuccessMsg && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{configSuccessMsg}</span>
              </div>
            )}

            {/* Preset Buttons */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                Quick Presets
              </label>
              <div className="flex flex-wrap gap-2">
                {timingPresets.map((h) => {
                  const isSelected = hoursInput === h;
                  return (
                    <button
                      key={h}
                      type="button"
                      onClick={() => {
                        setHoursInput(h);
                        handleSaveHours(h);
                      }}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {h} Hours {h === 24 && '(Default)'}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Input & Save */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                Custom Timing (Hours)
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="number"
                    min="1"
                    max="168"
                    value={hoursInput}
                    onChange={(e) => setHoursInput(parseInt(e.target.value) || 24)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    Hours Before
                  </span>
                </div>
                <button
                  type="button"
                  disabled={savingHours}
                  onClick={() => handleSaveHours()}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition cursor-pointer disabled:opacity-50"
                >
                  {savingHours ? 'Saving...' : 'Save Timing'}
                </button>
              </div>
              <p className="text-[11px] text-slate-400">
                Valid range: 1 hour up to 168 hours (7 days) prior to embarkation.
              </p>
            </div>

            {/* Security & Anti-Spam note */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-slate-800">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Anti-Duplicate Protection
              </div>
              <p className="text-[11px] leading-relaxed text-slate-500">
                The dispatch engine records <code className="bg-slate-200 px-1 rounded font-mono">whatsapp_reminder_sent = True</code> in the database once sent. Customers will never receive duplicate notifications for the same reservation.
              </p>
            </div>
          </div>

          {/* Live Batch Dispatch Card */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm space-y-6">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-sky-700 bg-sky-50 px-2.5 py-1 rounded-full">
                Automated Dispatch Engine
              </span>
              <h3 className="text-xl font-bold text-slate-900 font-serif mt-2 flex items-center gap-2">
                <Send className="w-5 h-5 text-sky-600" />
                Manual Batch Execution
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Trigger a batch reminder run right now across all candidate bookings departing within the next {hoursInput} hours.
              </p>
            </div>

            {/* Dry Run Toggle */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <span className="text-xs font-bold text-slate-900 block">Dry Run Simulation Mode</span>
                  <span className="text-[11px] text-slate-500">
                    Evaluates eligible bookings without actually marking them as sent
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={isDryRun}
                  onChange={(e) => setIsDryRun(e.target.checked)}
                  className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 border-slate-300 accent-sky-600 cursor-pointer"
                />
              </label>
            </div>

            {/* Trigger Button */}
            <button
              type="button"
              disabled={dispatching}
              onClick={handleTriggerDispatch}
              className={`w-full py-4 rounded-2xl text-white font-bold text-xs uppercase tracking-wider shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${
                isDryRun
                  ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
                  : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/25'
              }`}
            >
              <Send className="w-4 h-4" />
              <span>
                {dispatching
                  ? 'Executing Dispatch Engine...'
                  : isDryRun
                  ? `Run Dry Run Evaluation (${hoursInput}h Window)`
                  : `Trigger Batch Reminders Now (${hoursInput}h Window)`}
              </span>
            </button>

            {/* Dispatch Feedback Display */}
            {dispatchResult && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs space-y-2">
                <div className="font-bold flex items-center gap-1.5 text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Dispatch Engine Execution Completed
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>Total Evaluated: <strong>{dispatchResult.total_evaluated}</strong></div>
                  <div>Eligible in {dispatchResult.hours_before}h: <strong>{dispatchResult.eligible_in_window}</strong></div>
                  <div>Dispatched Successfully: <strong className="text-emerald-700">{dispatchResult.sent}</strong></div>
                  <div>Failed: <strong className="text-rose-600">{dispatchResult.failed}</strong></div>
                </div>
                {dispatchResult.results && dispatchResult.results.length > 0 && (
                  <div className="max-h-32 overflow-y-auto space-y-1 text-[11px] bg-white/70 p-2 rounded-xl border border-emerald-100">
                    {dispatchResult.results.map((r: any, idx: number) => (
                      <div key={idx} className="flex justify-between">
                        <span className="font-mono">{r.booking_id} ({r.customer})</span>
                        <span className={`font-bold ${r.status === 'SENT' ? 'text-emerald-700' : 'text-slate-600'}`}>{r.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* CLI Management Command helper */}
            <div className="p-3.5 rounded-2xl bg-slate-900 text-slate-300 text-xs font-mono space-y-1">
              <span className="text-[10px] text-slate-500 uppercase tracking-widest block">Automated Cron / CLI Command</span>
              <code className="text-emerald-400 text-[11px] block select-all">
                python manage.py send_whatsapp_reminders --hours {hoursInput}
              </code>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Live WhatsApp Message Template Preview */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
              Backend Message Template
            </span>
            <h3 className="text-xl font-bold text-slate-900 font-serif mt-2 flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-600" />
              Live Message Format Preview
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Exact formatting delivered directly to customer WhatsApp via Meta Cloud API / simulator.
            </p>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-mono font-bold">
            <span>Encoding: UTF-8 WhatsApp Markdown</span>
          </div>
        </div>

        {/* Realistic WhatsApp Chat Bubble Container */}
        <div className="max-w-2xl mx-auto rounded-3xl p-6 bg-[#efeae2] border border-[#d1d7db] shadow-inner font-sans space-y-3">
          <div className="text-center">
            <span className="inline-block px-3 py-1 rounded-full bg-white/80 text-[10px] font-bold uppercase tracking-wider text-slate-600 shadow-sm">
              Today • 24 Hours Before Departure
            </span>
          </div>

          {/* Speech Bubble */}
          <div className="bg-white rounded-2xl rounded-tl-sm p-4 sm:p-5 shadow-sm text-xs sm:text-sm text-slate-900 space-y-3 border border-slate-200/60 leading-relaxed font-sans">
            <div className="font-bold text-slate-900 text-sm">
              🚢 *CRUISE-HUNT EMBARKATION REMINDER* ⚓
            </div>

            <p>
              Hello *Rahul Sharma*,<br />
              Your upcoming trip is scheduled to depart soon! Here are your official tour & boarding details:
            </p>

            <div className="space-y-1 font-mono text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div>📋 *Booking Ref:* #CRS-2026-B8F12A</div>
              <div>🎫 *Boarding Pass Code:* <strong className="text-emerald-700">*TK-B8F12A*</strong></div>
              <div>🛳️ *Ship / Tour:* Mumbai → Goa Royal Sunset Trip</div>
              <div>📍 *Route:* Mumbai Cruise Terminal → Mormugao Port</div>
              <div>📅 *Trip Date:* Saturday, 24 October 2026</div>
              <div>⏰ *Departure Time:* 04:00 PM (IST)</div>
              <div>⚓ *Boarding Location:* Yellow Gate, Mumbai Domestic Terminal</div>
              <div>👥 *Party Headcount:* 2 Passengers</div>
            </div>

            <div className="space-y-1 text-xs text-slate-700">
              <div className="font-bold text-slate-900">ℹ️ *Crucial Boarding Instructions:*</div>
              <div>• Please arrive at the jetty at least *30 minutes prior* to scheduled departure.</div>
              <div>• Present your Digital Boarding Pass QR or pass code for express gate entry.</div>
              <div>• Carry a government-approved photo ID (Aadhaar / Passport) for port security.</div>
            </div>

            <div className="space-y-1 text-xs pt-1 border-t border-slate-100">
              <div>📱 *Digital Boarding Pass:* <span className="text-sky-600 underline">https://cruise-hunt.in/ticket/verify/TK-B8F12A</span></div>
              <div>📞 *Ship Operator Assistance:* +91 98200 12345</div>
            </div>

            <p className="text-slate-600 pt-1 text-xs">
              We wish you a wonderful and safe trip across Indian waters!<br />
              🌊 *Team Cruise-Hunt India*
            </p>

            <div className="text-right text-[10px] text-slate-400 font-mono">
              04:00 PM • <span className="text-sky-500 font-bold">✓✓</span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Upcoming Departures Dispatch Queue Table */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-slate-900 font-serif flex items-center gap-2">
              <Clock className="w-5 h-5 text-sky-600" />
              Upcoming Departures & Reminder Queue
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Scheduled reservations evaluated by the automated {hoursInput}h departure window.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowFullNumbers(!showFullNumbers)}
            className="px-3.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 transition flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
          >
            {showFullNumbers ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{showFullNumbers ? 'Mask Phone Numbers' : 'Reveal Contact Numbers'}</span>
          </button>
        </div>

        {queue.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs font-bold space-y-2">
            <MessageSquare className="w-8 h-8 mx-auto text-slate-300" />
            <p>No upcoming tour bookings currently in queue.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-3">Booking ID</th>
                  <th className="py-3 px-3">Customer</th>
                  <th className="py-3 px-3">WhatsApp Mobile</th>
                  <th className="py-3 px-3">Vessel / Tour</th>
                  <th className="py-3 px-3">Departure Date & Time</th>
                  <th className="py-3 px-3">In {hoursInput}h Window</th>
                  <th className="py-3 px-3">Reminder Status</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {queue.map((item) => (
                  <tr key={item.booking_id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-3 font-mono font-bold text-sky-700">
                      #{item.booking_id}
                    </td>
                    <td className="py-3.5 px-3 font-semibold text-slate-900">
                      {item.customer_name}
                    </td>
                    <td className="py-3.5 px-3 font-mono text-slate-700">
                      {showFullNumbers
                        ? item.customer_whatsapp || 'Not set'
                        : item.customer_whatsapp_masked || item.customer_whatsapp || 'Not set'}
                    </td>
                    <td className="py-3.5 px-3 text-slate-700 max-w-xs truncate">
                      {item.vessel_or_tour}
                    </td>
                    <td className="py-3.5 px-3 font-mono text-slate-600">
                      {item.departure_date} • {item.departure_time}
                    </td>
                    <td className="py-3.5 px-3">
                      {item.in_window ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] uppercase">
                          Due Now
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold text-[10px]">
                          Scheduled
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          item.sent
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : item.opt_in === false
                            ? 'bg-slate-100 text-slate-600'
                            : item.status === 'FAILED'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-sky-50 text-sky-700 border border-sky-200'
                        }`}
                      >
                        {item.sent ? 'Sent' : item.opt_in ? item.status : 'Opted Out'}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {item.wa_link ? (
                          <a
                            href={item.wa_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1 shadow-sm shadow-emerald-600/30 cursor-pointer"
                            title="Directly opens WhatsApp Web or Mobile with complete reminder prefilled"
                          >
                            <MessageSquare className="w-3 h-3 fill-white" />
                            <span>Open WhatsApp</span>
                            <ArrowUpRight className="w-3 h-3 opacity-80" />
                          </a>
                        ) : (
                          <span className="text-slate-400 text-xs font-mono">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 6. Live Delivery Audit Log Table */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        <div>
          <h3 className="text-xl font-bold text-slate-900 font-serif flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-emerald-600" />
            WhatsApp Message Delivery Audit Log
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Cryptographic ledger of sent WhatsApp notifications with provider message IDs and delivery timestamps.
          </p>
        </div>

        {logs.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs font-bold space-y-2">
            <MessageSquare className="w-8 h-8 mx-auto text-slate-300" />
            <p>No dispatch logs recorded yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-3">Date & Time</th>
                  <th className="py-3 px-3">Recipient</th>
                  <th className="py-3 px-3">Booking</th>
                  <th className="py-3 px-3">Provider Message ID</th>
                  <th className="py-3 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-3 font-mono text-slate-600 whitespace-nowrap">
                      {log.created_at}
                    </td>
                    <td className="py-3.5 px-3 font-mono font-bold text-slate-900">
                      {showFullNumbers ? log.recipient : log.recipient_masked || log.recipient}
                    </td>
                    <td className="py-3.5 px-3 font-mono text-sky-700">
                      {log.booking_id ? `#${log.booking_id}` : 'General'}
                    </td>
                    <td className="py-3.5 px-3 font-mono text-slate-500 text-[11px] max-w-xs truncate">
                      {log.provider_message_id}
                    </td>
                    <td className="py-3.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          log.status === 'SENT' || log.status === 'DELIVERED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                        title={log.error_message || undefined}
                      >
                        {log.status}
                      </span>
                      {log.error_message && (
                        <div className="text-[10px] text-rose-600 font-mono mt-0.5 max-w-[160px] truncate" title={log.error_message}>
                          {log.error_message}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
