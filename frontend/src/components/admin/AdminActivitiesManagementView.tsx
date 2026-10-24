import React, { useState, useEffect } from 'react';
import {
  Compass,
  Search,
  CheckCircle2,
  AlertCircle,
  Ship,
  Clock,
  Users,
  MapPin,
  Star,
  Trash2,
  ExternalLink,
  Waves,
  Shield,
  Eye,
  Check,
  X,
  Sparkles,
  DollarSign
} from 'lucide-react';
import { ActivityItem } from '../../api/types';
import { getActivities, updateActivity, deleteActivity } from '../../api/activities';
import { formatINR } from '../../utils/currency';

export const AdminActivitiesManagementView: React.FC = () => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [actionMessage, setActionMessage] = useState<{ text: string; isError?: boolean } | null>(null);

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const res = await getActivities({ sort_by: 'popular' });
      setActivities(res.activities || []);
    } catch (err) {
      console.error('Failed to load platform activities for admin:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, []);

  const handleToggleActive = async (act: ActivityItem) => {
    try {
      const nextState = !act.is_active;
      await updateActivity(act.id, { is_active: nextState });
      setActivities((prev) =>
        prev.map((a) => (a.id === act.id ? { ...a, is_active: nextState } : a))
      );
      setActionMessage({
        text: `Activity "${act.title}" is now ${nextState ? 'ACTIVE' : 'INACTIVE'} platform-wide.`,
      });
    } catch (err: any) {
      setActionMessage({ text: err.message || 'Failed to update activity status.', isError: true });
    }
  };

  const handleToggleFeatured = async (act: ActivityItem) => {
    try {
      const nextFeatured = !act.is_featured;
      await updateActivity(act.id, { is_featured: nextFeatured });
      setActivities((prev) =>
        prev.map((a) => (a.id === act.id ? { ...a, is_featured: nextFeatured } : a))
      );
      setActionMessage({
        text: `Activity "${act.title}" ${nextFeatured ? 'marked as FEATURED' : 'unfeatured'}.`,
      });
    } catch (err: any) {
      setActionMessage({ text: err.message || 'Failed to update featured flag.', isError: true });
    }
  };

  const handleDelete = async (act: ActivityItem) => {
    if (!window.confirm(`Are you sure you want to deactivate activity "${act.title}"?`)) return;
    try {
      await deleteActivity(act.id);
      setActivities((prev) => prev.filter((a) => a.id !== act.id));
      setActionMessage({ text: `Activity "${act.title}" deactivated successfully.` });
    } catch (err: any) {
      setActionMessage({ text: err.message || 'Failed to delete activity.', isError: true });
    }
  };

  const filtered = activities.filter((act) => {
    const matchesCat = selectedCategory === 'ALL' || act.activity_type === selectedCategory;
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' && act.is_active) ||
      (statusFilter === 'INACTIVE' && !act.is_active);
    const matchesSearch =
      !search.trim() ||
      act.title.toLowerCase().includes(search.toLowerCase()) ||
      act.category_label.toLowerCase().includes(search.toLowerCase()) ||
      act.host_ship_name?.toLowerCase().includes(search.toLowerCase()) ||
      act.location?.toLowerCase().includes(search.toLowerCase()) ||
      act.owner_name?.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesStatus && matchesSearch;
  });

  const totalCount = activities.length;
  const activeCount = activities.filter((a) => a.is_active).length;
  const avgPrice =
    totalCount > 0
      ? Math.round(activities.reduce((s, a) => s + Number(a.price), 0) / totalCount)
      : 0;
  const hostShipsCount = new Set(activities.map((a) => a.host_ship_id)).size;

  const categories = [
    { id: 'ALL', label: 'All Activities' },
    { id: 'SCUBA', label: 'Scuba Diving' },
    { id: 'JET_SKIING', label: 'Jet Skiing' },
    { id: 'PARASAILING', label: 'Parasailing' },
    { id: 'SURFING', label: 'Surfing' },
    { id: 'FISHING', label: 'Deep Sea Fishing' },
    { id: 'RAFTING', label: 'River Rafting' },
    { id: 'KITE_SURFING', label: 'Kite Surfing' },
    { id: 'SNORKELING', label: 'Snorkeling' },
    { id: 'WATER_SKIING', label: 'Water Skiing' },
    { id: 'CLIFF_DIVING', label: 'Cliff Diving' },
    { id: 'ROWING', label: 'Rowing' },
    { id: 'WATER_POLO', label: 'Water Polo' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. Admin Header */}
      <div className="bg-gradient-to-r from-[#030d1c] via-[#051833] to-[#0a2548] rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-[#051833]/15 border border-[#0284c7]/25 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-[#38bdf8] text-xs font-black uppercase tracking-wider mb-2 border border-white/15 backdrop-blur-md">
            <Compass className="w-3.5 h-3.5 text-[#38bdf8]" />
            Global Water Sports & Ride Governance
          </div>
          <h2 className="text-2xl sm:text-3xl font-black font-serif tracking-tight text-white">
            Water Sports & Experience Rides Inventory
          </h2>
          <p className="text-xs text-white/80 mt-1 max-w-2xl font-medium">
            Monitor, verify, activate, and manage platform-wide water sports adventures (Scuba, Jet Ski, Parasailing, Surfing, Fishing, Rafting) conducted aboard host vessels.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-2">
          <span className="px-4 py-2 rounded-full bg-white/10 backdrop-blur-md text-xs font-bold text-white border border-white/20">
            {activeCount} / {totalCount} Active Platform Rides
          </span>
        </div>
      </div>

      {actionMessage && (
        <div
          className={`p-4 rounded-2xl text-xs font-bold flex items-center justify-between ${
            actionMessage.isError
              ? 'bg-rose-50 text-rose-800 border border-rose-200'
              : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionMessage.isError ? (
              <AlertCircle className="w-4 h-4 text-rose-600" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            )}
            <span>{actionMessage.text}</span>
          </div>
          <button onClick={() => setActionMessage(null)} className="p-1 hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-white border border-[#0284c7]/15 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider mb-1">
            Total Platform Rides
          </span>
          <div className="text-3xl font-black text-[#051833] font-mono-numbers">{totalCount}</div>
          <p className="text-[11px] text-slate-400 mt-1">Catalogued water sports</p>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-[#0284c7]/15 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-emerald-700 block tracking-wider mb-1 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Active Experiences
          </span>
          <div className="text-3xl font-black text-emerald-900 font-mono-numbers">{activeCount}</div>
          <p className="text-[11px] text-emerald-600 font-medium mt-1">Live for passenger booking</p>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-[#0284c7]/15 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-sky-700 block tracking-wider mb-1">
            Platform Average Price
          </span>
          <div className="text-3xl font-black text-sky-900 font-mono-numbers">{formatINR(avgPrice)}</div>
          <p className="text-[11px] text-sky-600 font-medium mt-1">Per participant slot</p>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-[#0284c7]/15 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-amber-700 block tracking-wider mb-1 flex items-center gap-1">
            <Ship className="w-3.5 h-3.5 text-amber-600" />
            Host Vessels Engaged
          </span>
          <div className="text-3xl font-black text-amber-900 font-mono-numbers">{hostShipsCount}</div>
          <p className="text-[11px] text-amber-600 font-medium mt-1">Conducting adventure rides</p>
        </div>
      </div>

      {/* 3. Filter Controls */}
      <div className="bg-white rounded-3xl p-5 border border-[#0284c7]/15 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by title, host ship, port, or operator..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-full border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#0284c7] bg-slate-50"
            />
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-1.5 self-start sm:self-auto">
            {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
                  statusFilter === st
                    ? 'bg-[#051833] text-white shadow-sm font-black'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st === 'ALL' ? 'All Status' : st === 'ACTIVE' ? 'Active Only' : 'Inactive'}
              </button>
            ))}
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((c) => {
            const isSel = selectedCategory === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setSelectedCategory(c.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  isSel
                    ? 'bg-[#0284c7] text-white shadow-sm font-black'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Inventory Table / Grid */}
      {loading ? (
        <div className="p-16 flex flex-col items-center justify-center">
          <div className="w-10 h-10 border-4 border-[#0284c7] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-500 mt-3 font-semibold">Loading platform activities...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center space-y-3">
          <Waves className="w-12 h-12 text-[#0284c7]/40 mx-auto" />
          <h3 className="font-extrabold text-[#051833] text-base">No Matching Activities</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Try adjusting your search keywords or category filters.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-[#0284c7]/15 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3.5 px-4">Activity & Category</th>
                  <th className="py-3.5 px-4">Host Vessel</th>
                  <th className="py-3.5 px-4">Port / Location</th>
                  <th className="py-3.5 px-4">Slot Price</th>
                  <th className="py-3.5 px-4">Duration & Cap</th>
                  <th className="py-3.5 px-4">Operator</th>
                  <th className="py-3.5 px-4">Featured</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filtered.map((act) => (
                  <tr key={act.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={act.image || '/static/images/activities/jet_skiing.jpg'}
                          alt={act.title}
                          className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0"
                        />
                        <div className="min-w-0">
                          <span className="font-bold text-[#051833] block truncate max-w-[200px]">
                            {act.title}
                          </span>
                          <span className="text-[10px] font-black uppercase text-[#0284c7] bg-sky-50 px-2 py-0.5 rounded-full border border-sky-200 inline-block mt-0.5">
                            {act.category_label || act.activity_type}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 font-bold text-[#051833]">
                        <Ship className="w-3.5 h-3.5 text-[#0284c7] shrink-0" />
                        <span className="truncate max-w-[150px]">{act.host_ship_name || 'Vessel'}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 block">ID: #{act.host_ship_id}</span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1 text-slate-700 truncate max-w-[140px]">
                        <MapPin className="w-3.5 h-3.5 text-[#0284c7] shrink-0" />
                        <span>{act.departure_port}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 block">{act.location}</span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-mono font-black text-sm text-[#051833]">
                        {formatINR(act.price)}
                      </span>
                      <span className="text-[10px] text-slate-400 block">/participant</span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-bold text-slate-800 block">{act.duration_minutes} mins</span>
                      <span className="text-[10px] text-slate-400 block">Cap: {act.capacity_per_slot} per slot</span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-bold text-slate-800 block truncate max-w-[120px]">
                        {act.owner_name || 'Fleet Operator'}
                      </span>
                      <span className="text-[10px] text-slate-400 block">{act.owner_phone || 'Verified'}</span>
                    </td>

                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => handleToggleFeatured(act)}
                        className={`p-1.5 rounded-lg border transition cursor-pointer ${
                          act.is_featured
                            ? 'bg-amber-50 text-amber-600 border-amber-300'
                            : 'bg-slate-50 text-slate-300 border-slate-200 hover:text-amber-500'
                        }`}
                        title={act.is_featured ? 'Click to unfeature' : 'Click to feature on catalog'}
                      >
                        <Sparkles className="w-4 h-4" />
                      </button>
                    </td>

                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => handleToggleActive(act)}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition cursor-pointer border ${
                          act.is_active
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                        }`}
                      >
                        {act.is_active ? 'Active' : 'Paused'}
                      </button>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleDelete(act)}
                        className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-500 transition cursor-pointer"
                        title="Deactivate activity"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
