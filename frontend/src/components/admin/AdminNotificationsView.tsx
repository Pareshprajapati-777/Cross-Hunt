import React, { useState, useEffect } from 'react';
import {
  Bell,
  Send,
  AlertTriangle,
  Tag,
  Megaphone,
  Users,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  Sparkles,
  UserCheck,
  ShieldAlert,
  Info
} from 'lucide-react';
import {
  getAdminNotifications,
  createAdminNotification,
  getAdminUsers,
  PlatformNotificationItem
} from '../../api/dashboards';

interface AdminNotificationsViewProps {
  initialTargetUserId?: number | null;
  initialTargetUserName?: string | null;
}

export const AdminNotificationsView: React.FC<AdminNotificationsViewProps> = ({
  initialTargetUserId,
  initialTargetUserName,
}) => {
  const [notifications, setNotifications] = useState<PlatformNotificationItem[]>([]);
  const [stats, setStats] = useState({
    total_sent: 0,
    updates_count: 0,
    offers_count: 0,
    announcements_count: 0,
    total_reach: 0,
  });
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Available users list for specific user selector
  const [usersList, setUsersList] = useState<any[]>([]);

  // Compose Form
  const [notifType, setNotifType] = useState<'IMPORTANT_UPDATE' | 'OFFER' | 'ANNOUNCEMENT'>('IMPORTANT_UPDATE');
  const [targetAudience, setTargetAudience] = useState<'ALL_USERS' | 'ALL_OWNERS' | 'SPECIFIC_USER'>('ALL_USERS');
  const [selectedUserId, setSelectedUserId] = useState<number | ''>(initialTargetUserId || '');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [actionLink, setActionLink] = useState('');
  const [senderName, setSenderName] = useState('Chief Marine Officer - Cross Hunt');

  useEffect(() => {
    if (initialTargetUserId) {
      setTargetAudience('SPECIFIC_USER');
      setSelectedUserId(initialTargetUserId);
      if (initialTargetUserName) {
        setTitle(`Private Maritime Update for ${initialTargetUserName}`);
      }
    }
  }, [initialTargetUserId, initialTargetUserName]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const [notifsRes, usersRes] = await Promise.all([
        getAdminNotifications(),
        getAdminUsers(),
      ]);
      const sortedNotifs = [...(notifsRes.notifications || [])].sort((a, b) => {
        const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
        if (bTime !== aTime) return bTime - aTime;
        return (Number(b.id) || 0) - (Number(a.id) || 0);
      });
      setNotifications(sortedNotifs);
      if (notifsRes.stats) {
        setStats(notifsRes.stats);
      }
      setUsersList(usersRes.users || []);
    } catch (err) {
      console.error('Failed to load notifications history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  // Quick template fills
  const handleApplyTemplate = (type: 'UPDATE' | 'OFFER' | 'ANNOUNCEMENT') => {
    if (type === 'UPDATE') {
      setNotifType('IMPORTANT_UPDATE');
      setTitle('Mandovi & Arabian Sea Weather & High Tide Advisory');
      setMessage('Indian Coast Guard has flagged moderate wave activity for tomorrow morning. All cruise departures between 06:00 - 10:00 AM will proceed via calm inland Mandovi River channel. Safety lifejackets are mandatory.');
      setActionLink('/explore');
      setSenderName('Safety & Maritime Operations');
    } else if (type === 'OFFER') {
      setNotifType('OFFER');
      setTitle('Festive Season Flash Deal: Flat 15% OFF Private Yacht Charters');
      setMessage('Celebrate your upcoming wedding, milestone birthday, or private sunset gathering on water. Use promo voucher FESTIVE15 at checkout to enjoy 15% instant platform discount.');
      setActionLink('/tours');
      setSenderName('VIP Cruise Concierge');
    } else {
      setNotifType('ANNOUNCEMENT');
      setTitle('New 85-Foot Luxury Flybridge Cruiser Added to Mumbai Fleet');
      setMessage('Cross Hunt is thrilled to announce the arrival of "Oceanic Sovereign" at Gateway Jetty, equipped with master stateroom, jacuzzi lounge deck, and live BBQ kitchen.');
      setActionLink('/explore');
      setSenderName('Executive Platform Management');
    }
  };

  const handleSubmitNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      alert('Please fill both notification title and message body.');
      return;
    }
    if (targetAudience === 'SPECIFIC_USER' && !selectedUserId) {
      alert('Please select a specific customer to send this notification to.');
      return;
    }

    setSending(true);
    try {
      const res = await createAdminNotification({
        title,
        message,
        notification_type: notifType,
        target_audience: targetAudience,
        target_user_id: targetAudience === 'SPECIFIC_USER' ? Number(selectedUserId) : undefined,
        action_link: actionLink,
        sender_name: senderName,
      });

      if (res.success) {
        setSuccessBanner(res.message);
        setTitle('');
        setMessage('');
        setActionLink('');
        loadNotifications();
        setTimeout(() => setSuccessBanner(null), 5000);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to dispatch notification');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. BROADCAST KPI CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <div className="spatial-card p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Sent</span>
            <Bell className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono-numbers">{stats.total_sent}</div>
          <p className="text-[10px] text-slate-400">Total broadcasts logged</p>
        </div>

        <div className="spatial-card p-4 rounded-2xl bg-white border border-amber-100 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-amber-700">
            <span className="text-[11px] font-bold uppercase tracking-wider">Important Updates</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-600 font-mono-numbers">{stats.updates_count}</div>
          <p className="text-[10px] text-amber-700 font-medium">Weather & safety alerts</p>
        </div>

        <div className="spatial-card p-4 rounded-2xl bg-white border border-rose-100 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-rose-700">
            <span className="text-[11px] font-bold uppercase tracking-wider">Offers & Promos</span>
            <Tag className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-600 font-mono-numbers">{stats.offers_count}</div>
          <p className="text-[10px] text-rose-600/80 font-medium">Discount vouchers sent</p>
        </div>

        <div className="spatial-card p-4 rounded-2xl bg-white border border-indigo-100 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-indigo-700">
            <span className="text-[11px] font-bold uppercase tracking-wider">Announcements</span>
            <Megaphone className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-indigo-600 font-mono-numbers">{stats.announcements_count}</div>
          <p className="text-[10px] text-indigo-700 font-medium">New vessels & fleet news</p>
        </div>

        <div className="spatial-card p-4 rounded-2xl bg-white border border-emerald-100 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-emerald-700">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total User Reach</span>
            <Users className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600 font-mono-numbers">{stats.total_reach}</div>
          <p className="text-[10px] text-emerald-600/80 font-medium">Customer inboxes reached</p>
        </div>
      </div>

      {/* SUCCESS BANNER */}
      {successBanner && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center justify-between animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successBanner}</span>
          </div>
          <button onClick={() => setSuccessBanner(null)} className="text-emerald-700 hover:text-emerald-900 cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* 2. COMPOSE NOTIFICATION DISPATCHER */}
      <div className="spatial-card bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-800 text-[10px] font-bold uppercase tracking-wider mb-1">
              <Send className="w-3 h-3 text-indigo-600" />
              Direct Customer Notification System
            </div>
            <h3 className="text-xl font-bold font-serif text-slate-900">Compose & Dispatch Broadcast</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Directly send important updates, offers, and announcements to user dashboards and inboxes.
            </p>
          </div>

          {/* Quick Template Presets */}
          <div className="flex items-center gap-1.5 text-xs font-bold">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider mr-1">Quick Presets:</span>
            <button
              type="button"
              onClick={() => handleApplyTemplate('UPDATE')}
              className="px-2.5 py-1 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition cursor-pointer text-[11px]"
            >
              Weather Alert
            </button>
            <button
              type="button"
              onClick={() => handleApplyTemplate('OFFER')}
              className="px-2.5 py-1 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100 transition cursor-pointer text-[11px]"
            >
              Promo Deal
            </button>
            <button
              type="button"
              onClick={() => handleApplyTemplate('ANNOUNCEMENT')}
              className="px-2.5 py-1 rounded-xl bg-indigo-50 text-indigo-800 border border-indigo-200 hover:bg-indigo-100 transition cursor-pointer text-[11px]"
            >
              New Ship
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmitNotification} className="space-y-5">
          {/* Channel Type Selector (Requirements 4: Important update, offers, announcements) */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-2">
              1. Select Notification Category
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setNotifType('IMPORTANT_UPDATE')}
                className={`p-3.5 rounded-2xl border text-left cursor-pointer transition flex items-start gap-3 ${
                  notifType === 'IMPORTANT_UPDATE'
                    ? 'bg-amber-50 border-amber-400 shadow-sm'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-xs text-slate-900">Important Update</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Safety, weather alerts, schedule changes</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setNotifType('OFFER')}
                className={`p-3.5 rounded-2xl border text-left cursor-pointer transition flex items-start gap-3 ${
                  notifType === 'OFFER'
                    ? 'bg-rose-50 border-rose-400 shadow-sm'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                  <Tag className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-xs text-slate-900">Special Offer / Deal</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Coupons, festive discounts, flash sales</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setNotifType('ANNOUNCEMENT')}
                className={`p-3.5 rounded-2xl border text-left cursor-pointer transition flex items-start gap-3 ${
                  notifType === 'ANNOUNCEMENT'
                    ? 'bg-indigo-50 border-indigo-400 shadow-sm'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                  <Megaphone className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-xs text-slate-900">Platform Announcement</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">New luxury ships, new ports & routes</div>
                </div>
              </button>
            </div>
          </div>

          {/* Target Audience Selector */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-2">
              2. Target Audience (Direct Delivery)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label
                className={`p-3 rounded-2xl border flex items-center gap-3 cursor-pointer transition ${
                  targetAudience === 'ALL_USERS'
                    ? 'bg-slate-900 text-white border-slate-800'
                    : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="audience"
                  value="ALL_USERS"
                  checked={targetAudience === 'ALL_USERS'}
                  onChange={() => setTargetAudience('ALL_USERS')}
                  className="hidden"
                />
                <Users className="w-4 h-4 shrink-0 text-sky-400" />
                <div>
                  <div className="font-bold text-xs">All Registered Customers</div>
                  <div className={`text-[10px] ${targetAudience === 'ALL_USERS' ? 'text-slate-300' : 'text-slate-400'}`}>
                    Broadcast to every user inbox
                  </div>
                </div>
              </label>

              <label
                className={`p-3 rounded-2xl border flex items-center gap-3 cursor-pointer transition ${
                  targetAudience === 'ALL_OWNERS'
                    ? 'bg-slate-900 text-white border-slate-800'
                    : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="audience"
                  value="ALL_OWNERS"
                  checked={targetAudience === 'ALL_OWNERS'}
                  onChange={() => setTargetAudience('ALL_OWNERS')}
                  className="hidden"
                />
                <UserCheck className="w-4 h-4 shrink-0 text-amber-400" />
                <div>
                  <div className="font-bold text-xs">Ship Owners & Operators</div>
                  <div className={`text-[10px] ${targetAudience === 'ALL_OWNERS' ? 'text-slate-300' : 'text-slate-400'}`}>
                    Maritime hosts & fleet operators
                  </div>
                </div>
              </label>

              <label
                className={`p-3 rounded-2xl border flex items-center gap-3 cursor-pointer transition ${
                  targetAudience === 'SPECIFIC_USER'
                    ? 'bg-slate-900 text-white border-slate-800'
                    : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="audience"
                  value="SPECIFIC_USER"
                  checked={targetAudience === 'SPECIFIC_USER'}
                  onChange={() => setTargetAudience('SPECIFIC_USER')}
                  className="hidden"
                />
                <Users className="w-4 h-4 shrink-0 text-emerald-400" />
                <div>
                  <div className="font-bold text-xs">Specific User Account</div>
                  <div className={`text-[10px] ${targetAudience === 'SPECIFIC_USER' ? 'text-slate-300' : 'text-slate-400'}`}>
                    Direct private message to single passenger
                  </div>
                </div>
              </label>
            </div>

            {/* If Specific User is chosen, show user dropdown selector */}
            {targetAudience === 'SPECIFIC_USER' && (
              <div className="mt-3 p-3.5 rounded-2xl bg-sky-50/70 border border-sky-200 animate-in fade-in duration-150">
                <label className="text-[11px] font-bold text-sky-900 uppercase block mb-1">
                  Select Recipient Customer:
                </label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-3 py-2 rounded-xl border border-sky-300 text-xs bg-white text-slate-800 font-semibold"
                  required
                >
                  <option value="">-- Choose User by Name or Username --</option>
                  {usersList.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name} (@{u.username}) • {u.email} {u.phone ? `• ${u.phone}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Title & Message Content */}
          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1">
                Notification Headline / Title
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Cyclone Monsoon Warning: Goa Port Channel or Flat 20% Off Festive Yacht Deals"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1">
                Message Body
              </label>
              <textarea
                rows={4}
                required
                placeholder="Type the message body that will be delivered directly to the user's dashboard and alerts feed..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 block mb-1">
                  Action Link / Button URL (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. /explore, /tours, /events"
                  value={actionLink}
                  onChange={(e) => setActionLink(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white text-slate-800 font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 block mb-1">
                  Sender Signature
                </label>
                <input
                  type="text"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white text-slate-800 font-semibold"
                />
              </div>
            </div>
          </div>

          {/* DISPATCH ACTION BUTTON */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-sky-600" />
              <span>Saved in user dashboard inbox and alert dock in real-time.</span>
            </div>

            <button
              type="submit"
              disabled={sending}
              className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-blue-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-lg shadow-indigo-950/20 hover:shadow-indigo-600/30 transition hover:-translate-y-0.5 active:translate-y-0"
            >
              {sending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>{sending ? 'Dispatching...' : 'Send Notification Directly'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* 3. DISPATCH HISTORY & AUDIT LOG */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-base font-bold text-slate-900 font-serif">Broadcast History & Reach Log</h4>
            <p className="text-xs text-slate-500 mt-0.5">Audit all sent updates, deals, and announcements across the platform.</p>
          </div>
          <button
            onClick={loadNotifications}
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
            title="Refresh History"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Headline / Title</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Audience</th>
                <th className="py-3 px-4">Message Excerpt</th>
                <th className="py-3 px-4">Link</th>
                <th className="py-3 px-4">Sender Signature</th>
                <th className="py-3 px-4">Sent At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-sky-600" />
                    Loading broadcast logs...
                  </td>
                </tr>
              ) : notifications.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No notifications sent yet. Use the composer above to dispatch your first broadcast!
                  </td>
                </tr>
              ) : (
                notifications.map((n) => (
                  <tr key={n.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-bold text-slate-900 max-w-[220px]">
                      {n.title}
                    </td>

                    <td className="py-3 px-4">
                      {n.notification_type === 'IMPORTANT_UPDATE' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                          <AlertTriangle className="w-2.5 h-2.5" />
                          Update
                        </span>
                      ) : n.notification_type === 'OFFER' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                          <Tag className="w-2.5 h-2.5" />
                          Offer
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800">
                          <Megaphone className="w-2.5 h-2.5" />
                          Announcement
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">
                        {n.target_audience === 'ALL_USERS'
                          ? `All Customers (${n.recipients_count})`
                          : n.target_audience === 'ALL_OWNERS'
                          ? `Ship Owners (${n.recipients_count})`
                          : `Specific: ${n.target_user_name || '1 User'}`}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-slate-600 max-w-xs truncate" title={n.message}>
                      {n.message}
                    </td>

                    <td className="py-3 px-4">
                      {n.action_link ? (
                        <span className="font-mono text-sky-600 font-bold text-[10px] bg-sky-50 px-2 py-0.5 rounded">
                          {n.action_link}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-slate-500">{n.sender_name}</td>

                    <td className="py-3 px-4 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                      {n.created_at}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
