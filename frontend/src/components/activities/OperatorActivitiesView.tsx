import React, { useState, useEffect } from 'react';
import {
  Compass,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Ship,
  Clock,
  Users,
  MapPin,
  Search,
  Sparkles,
  Waves,
  Shield,
  Eye,
  Check,
  X,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import { ActivityItem } from '../../api/types';
import {
  getOperatorActivities,
  createActivity,
  updateActivity,
  deleteActivity
} from '../../api/activities';
import { formatINR } from '../../utils/currency';

interface OperatorActivitiesViewProps {
  myShips: Array<{ id: number; name: string; location?: string; departure_port?: string; capacity?: number; image?: string }>;
}

const PRESET_ACTIVITIES = [
  { id: 'SCUBA', label: 'Scuba Diving', image: '/static/images/activities/scuba_diving.jpg', defaultPrice: 4500, duration: 90, capacity: 6 },
  { id: 'JET_SKIING', label: 'Jet Skiing', image: '/static/images/activities/jet_skiing.jpg', defaultPrice: 2200, duration: 30, capacity: 2 },
  { id: 'PARASAILING', label: 'Parasailing', image: '/static/images/activities/parasailing.jpg', defaultPrice: 2800, duration: 45, capacity: 4 },
  { id: 'SURFING', label: 'Wave Surfing', image: '/static/images/activities/surfing.jpg', defaultPrice: 1800, duration: 120, capacity: 8 },
  { id: 'FISHING', label: 'Deep Sea Fishing', image: '/static/images/activities/deep_sea_fishing.jpg', defaultPrice: 5500, duration: 180, capacity: 6 },
  { id: 'RAFTING', label: 'River Rafting', image: '/static/images/activities/rafting.jpg', defaultPrice: 1950, duration: 120, capacity: 8 },
  { id: 'KITE_SURFING', label: 'Kite Surfing', image: '/static/images/activities/kite_surfing.jpg', defaultPrice: 3500, duration: 90, capacity: 4 },
  { id: 'SNORKELING', label: 'Snorkeling & Kayak', image: '/static/images/activities/snorkeling.jpg', defaultPrice: 1600, duration: 60, capacity: 10 },
  { id: 'WATER_SKIING', label: 'Water Skiing', image: '/static/images/activities/water_skiing.jpg', defaultPrice: 2600, duration: 45, capacity: 4 },
  { id: 'CLIFF_DIVING', label: 'Cliff Diving Safari', image: '/static/images/activities/cliff_diving.jpg', defaultPrice: 2400, duration: 90, capacity: 6 },
  { id: 'ROWING', label: 'Rowing & Sculling', image: '/static/images/activities/rowing.jpg', defaultPrice: 1400, duration: 60, capacity: 6 },
  { id: 'WATER_POLO', label: 'Water Polo Arena', image: '/static/images/activities/water_polo.jpg', defaultPrice: 1200, duration: 60, capacity: 14 },
];

export const OperatorActivitiesView: React.FC<OperatorActivitiesViewProps> = ({ myShips }) => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [showModal, setShowModal] = useState(false);
  const [editingActivity, setEditingActivity] = useState<ActivityItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ text: string; isError?: boolean } | null>(null);

  // Form State
  const initialForm = {
    title: '',
    activity_type: 'JET_SKIING',
    category_label: 'Jet Skiing',
    host_ship_id: myShips[0]?.id || 0,
    price: 2500,
    duration_minutes: 45,
    difficulty_level: 'All Skill Levels',
    capacity_per_slot: 4,
    location: myShips[0]?.location || 'Goa Coastal Waters',
    departure_port: myShips[0]?.departure_port || 'Mandovi Jetty Pier',
    operating_hours: '08:00 AM - 06:00 PM',
    time_slots_str: '08:30 AM, 11:00 AM, 02:30 PM, 04:30 PM',
    description: '',
    highlights_str: 'Certified safety instructor, Premium marine gear, GoPro action photos',
    included_gear_str: 'Life jacket, Safety harness, Helmet, First aid kit',
    safety_guidelines: 'Basic swimming capability recommended. Life vests mandatory at all times.',
    requirements: 'Minimum age 12 years. Must sign safety waiver before boarding.',
    image: '/static/images/activities/jet_skiing.jpg',
    is_active: true,
  };

  const [form, setForm] = useState(initialForm);

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const res = await getOperatorActivities();
      setActivities(res.activities || []);
    } catch (err) {
      console.error('Failed to load operator activities:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, []);

  const handleOpenAddModal = () => {
    setEditingActivity(null);
    const firstShip = myShips[0];
    setForm({
      ...initialForm,
      host_ship_id: firstShip?.id || 0,
      location: firstShip?.location || 'Goa Coastal Waters',
      departure_port: firstShip?.departure_port || 'Mandovi Jetty Pier',
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (act: ActivityItem) => {
    setEditingActivity(act);
    setForm({
      title: act.title,
      activity_type: act.activity_type,
      category_label: act.category_label,
      host_ship_id: act.host_ship_id,
      price: act.price,
      duration_minutes: act.duration_minutes,
      difficulty_level: act.difficulty_level || 'All Skill Levels',
      capacity_per_slot: act.capacity_per_slot,
      location: act.location,
      departure_port: act.departure_port,
      operating_hours: act.operating_hours,
      time_slots_str: (act.time_slots || []).join(', '),
      description: act.description,
      highlights_str: (act.highlights || []).join(', '),
      included_gear_str: (act.included_gear || []).join(', '),
      safety_guidelines: act.safety_guidelines || '',
      requirements: act.requirements || '',
      image: act.image || '/static/images/activities/jet_skiing.jpg',
      is_active: act.is_active,
    });
    setShowModal(true);
  };

  const handleSelectPreset = (preset: typeof PRESET_ACTIVITIES[0]) => {
    setForm((prev) => ({
      ...prev,
      activity_type: preset.id,
      category_label: preset.label,
      price: preset.defaultPrice,
      duration_minutes: preset.duration,
      capacity_per_slot: preset.capacity,
      image: preset.image,
      title: prev.title || `${preset.label} Expedition`,
    }));
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.host_ship_id) {
      alert('Please select a host ship from your registered fleet.');
      return;
    }

    setSubmitting(true);
    setActionMessage(null);

    const payload = {
      title: form.title.trim(),
      activity_type: form.activity_type,
      category_label: form.category_label,
      host_ship_id: Number(form.host_ship_id),
      price: Number(form.price),
      duration_minutes: Number(form.duration_minutes),
      difficulty_level: form.difficulty_level,
      capacity_per_slot: Number(form.capacity_per_slot),
      location: form.location.trim(),
      departure_port: form.departure_port.trim(),
      operating_hours: form.operating_hours.trim(),
      time_slots: form.time_slots_str.split(',').map((s) => s.trim()).filter(Boolean),
      description: form.description.trim(),
      highlights: form.highlights_str.split(',').map((s) => s.trim()).filter(Boolean),
      included_gear: form.included_gear_str.split(',').map((s) => s.trim()).filter(Boolean),
      safety_guidelines: form.safety_guidelines.trim(),
      requirements: form.requirements.trim(),
      image: form.image,
      is_active: form.is_active,
    };

    try {
      if (editingActivity) {
        await updateActivity(editingActivity.id, payload as any);
        setActionMessage({ text: `Ride "${payload.title}" updated successfully!` });
      } else {
        await createActivity(payload as any);
        setActionMessage({ text: `Water sports ride "${payload.title}" listed successfully!` });
      }
      setShowModal(false);
      await fetchActivities();
    } catch (err: any) {
      setActionMessage({ text: err.message || 'Operation failed. Please verify form details.', isError: true });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (act: ActivityItem) => {
    try {
      await updateActivity(act.id, { is_active: !act.is_active });
      setActivities((prev) =>
        prev.map((a) => (a.id === act.id ? { ...a, is_active: !a.is_active } : a))
      );
    } catch (err: any) {
      alert(err.message || 'Failed to toggle active status');
    }
  };

  const handleDelete = async (act: ActivityItem) => {
    if (!window.confirm(`Are you sure you wish to deactivate "${act.title}"?`)) return;
    try {
      await deleteActivity(act.id);
      setActivities((prev) => prev.filter((a) => a.id !== act.id));
    } catch (err: any) {
      alert(err.message || 'Failed to delete activity');
    }
  };

  const filtered = activities.filter((act) => {
    const matchesCat = selectedCategory === 'ALL' || act.activity_type === selectedCategory;
    const matchesSearch =
      !search.trim() ||
      act.title.toLowerCase().includes(search.toLowerCase()) ||
      act.category_label.toLowerCase().includes(search.toLowerCase()) ||
      act.host_ship_name?.toLowerCase().includes(search.toLowerCase()) ||
      act.location?.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const activeCount = activities.filter((a) => a.is_active).length;
  const avgPrice = activities.length > 0
    ? Math.round(activities.reduce((s, a) => s + Number(a.price), 0) / activities.length)
    : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-[#030d1c] via-[#051833] to-[#0a2548] rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-[#051833]/15 border border-[#0284c7]/25 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-[#38bdf8] text-xs font-black uppercase tracking-wider mb-2 border border-white/15 backdrop-blur-md">
            <Waves className="w-3.5 h-3.5 text-[#38bdf8]" />
            Owner Water Sports Fleet Operations
          </div>
          <h2 className="text-2xl sm:text-3xl font-black font-serif tracking-tight text-white">
            Water Sports & Adventure Rides
          </h2>
          <p className="text-xs text-white/80 mt-1 max-w-2xl font-medium">
            List, price, and schedule thrilling ocean rides (Scuba Diving, Jet Skiing, Surfing, Parasailing, Fishing, Rafting) tied directly to your registered host vessels.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="relative z-10 px-6 py-3 rounded-full bg-[#0284c7] hover:bg-[#0369a1] text-white font-black text-xs flex items-center gap-2 self-start cursor-pointer shadow-lg shadow-[#0284c7]/40 transition-all hover:-translate-y-0.5 active:translate-y-0"
        >
          <Plus className="w-4 h-4 text-white" />
          <span>List New Ride</span>
        </button>
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

      {/* 2. KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-white border border-[#0284c7]/15 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider mb-1">
            Total Listed Rides
          </span>
          <div className="text-3xl font-black text-[#051833] font-mono-numbers">
            {activities.length}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Across all categories</p>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-[#0284c7]/15 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-emerald-700 block tracking-wider mb-1 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Active for Booking
          </span>
          <div className="text-3xl font-black text-emerald-900 font-mono-numbers">
            {activeCount}
          </div>
          <p className="text-[11px] text-emerald-600 font-medium mt-1">Accepting passenger slots</p>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-[#0284c7]/15 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-sky-700 block tracking-wider mb-1">
            Average Slot Price
          </span>
          <div className="text-3xl font-black text-sky-900 font-mono-numbers">
            {formatINR(avgPrice)}
          </div>
          <p className="text-[11px] text-sky-600 font-medium mt-1">Per participant rate</p>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-[#0284c7]/15 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-amber-700 block tracking-wider mb-1 flex items-center gap-1">
            <Ship className="w-3.5 h-3.5 text-amber-600" />
            Host Vessels
          </span>
          <div className="text-3xl font-black text-amber-900 font-mono-numbers">
            {myShips.length}
          </div>
          <p className="text-[11px] text-amber-600 font-medium mt-1">Registered support boats</p>
        </div>
      </div>

      {/* 3. Search and Category Filter Dock */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-[#0284c7]/15 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by ride title, host ship, or location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-full border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#0284c7] bg-slate-50"
            />
          </div>

          <div className="text-xs text-slate-500 font-bold">
            Showing <span className="text-[#0284c7] font-black">{filtered.length}</span> of {activities.length} rides
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              selectedCategory === 'ALL'
                ? 'bg-[#051833] text-white shadow-sm font-black'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Rides
          </button>
          {PRESET_ACTIVITIES.map((p) => {
            const isSel = selectedCategory === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setSelectedCategory(p.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  isSel
                    ? 'bg-[#0284c7] text-white shadow-sm font-black'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Listed Activities Grid */}
      {loading ? (
        <div className="p-16 flex flex-col items-center justify-center">
          <div className="w-10 h-10 border-4 border-[#0284c7] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-500 mt-3 font-semibold">Loading water sports inventory...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center space-y-3">
          <Waves className="w-12 h-12 text-[#0284c7]/40 mx-auto" />
          <h3 className="font-extrabold text-[#051833] text-base">No Water Sports Rides Found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {activities.length === 0
              ? 'You have not listed any water sports yet. Click "List New Ride" above to add scuba diving, jet skiing, parasailing, and more tied to your vessels.'
              : 'No rides match your current search and category filters.'}
          </p>
          {activities.length === 0 && (
            <button
              onClick={handleOpenAddModal}
              className="px-5 py-2.5 rounded-full bg-[#0284c7] text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-md shadow-[#0284c7]/25"
            >
              <Plus className="w-4 h-4" />
              <span>List First Ride</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((act) => (
            <div
              key={act.id}
              className="bg-white rounded-3xl border border-[#0284c7]/20 shadow-sm overflow-hidden hover:shadow-lg hover:border-[#0284c7]/50 transition-all flex flex-col group"
            >
              {/* Image banner */}
              <div className="relative h-48 overflow-hidden bg-slate-900">
                <img
                  src={act.image || '/static/images/activities/jet_skiing.jpg'}
                  alt={act.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                {/* Badges on top */}
                <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                  <span className="px-3 py-1 rounded-full bg-white/90 backdrop-blur-md text-[#051833] text-[10px] font-black uppercase tracking-wider shadow-sm">
                    {act.category_label || act.activity_type}
                  </span>
                  <span
                    className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider backdrop-blur-md ${
                      act.is_active
                        ? 'bg-emerald-500/90 text-white'
                        : 'bg-rose-500/90 text-white'
                    }`}
                  >
                    {act.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                {/* Host Ship Badge */}
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-xs">
                  <div className="flex items-center gap-1.5 font-bold truncate">
                    <Ship className="w-3.5 h-3.5 text-[#38bdf8]" />
                    <span className="truncate">Host: {act.host_ship_name || 'Assigned Vessel'}</span>
                  </div>
                  <span className="font-mono text-xs font-black text-[#fff8dc]">
                    {formatINR(act.price)}/slot
                  </span>
                </div>
              </div>

              {/* Body */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <h3 className="font-extrabold text-base text-[#051833] line-clamp-1">
                    {act.title}
                  </h3>
                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {act.description || 'Premium water sports experience conducted with certified instructors.'}
                  </p>

                  {/* Specs Pill Grid */}
                  <div className="grid grid-cols-3 gap-2 text-center text-xs bg-slate-50 p-2.5 rounded-2xl border border-slate-100 mt-2">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Duration</span>
                      <span className="font-bold text-[#051833]">{act.duration_minutes}m</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Slot Cap</span>
                      <span className="font-bold text-[#051833]">{act.capacity_per_slot} Max</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Level</span>
                      <span className="font-bold text-[#051833] truncate block text-[11px]">{act.difficulty_level || 'All'}</span>
                    </div>
                  </div>

                  {/* Port Info */}
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 pt-1">
                    <MapPin className="w-3.5 h-3.5 text-[#0284c7] shrink-0" />
                    <span className="truncate">{act.departure_port} • {act.location}</span>
                  </div>

                  {/* Time Slots Preview */}
                  {act.time_slots && act.time_slots.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {act.time_slots.slice(0, 3).map((slot, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-md bg-sky-50 text-[#0284c7] text-[10px] font-bold border border-sky-200"
                        >
                          {slot}
                        </span>
                      ))}
                      {act.time_slots.length > 3 && (
                        <span className="text-[10px] text-slate-400 font-semibold self-center">
                          +{act.time_slots.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions Footer */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleToggleActive(act)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
                      act.is_active
                        ? 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                        : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                    }`}
                  >
                    {act.is_active ? 'Pause' : 'Activate'}
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenEditModal(act)}
                      className="p-2 rounded-full hover:bg-slate-100 text-slate-600 transition cursor-pointer"
                      title="Edit ride details"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(act)}
                      className="p-2 rounded-full hover:bg-rose-50 text-rose-600 transition cursor-pointer"
                      title="Deactivate ride"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 5. ADD / EDIT ACTIVITY MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-[#0284c7]/20 shadow-2xl max-w-2xl w-full p-6 sm:p-8 space-y-6 my-8 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-sky-50 text-[#0284c7] flex items-center justify-center">
                  <Waves className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-[#051833]">
                    {editingActivity ? 'Edit Water Sports Ride' : 'List New Water Sport Experience'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Tie this adventure to your vessel for passenger booking.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Preset Selector */}
            {!editingActivity && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-600 block">
                  Quick Template / Category Presets:
                </span>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {PRESET_ACTIVITIES.map((p) => {
                    const isSel = form.activity_type === p.id;
                    return (
                      <button
                        type="button"
                        key={p.id}
                        onClick={() => handleSelectPreset(p)}
                        className={`p-2 rounded-xl text-left text-xs transition border cursor-pointer ${
                          isSel
                            ? 'bg-[#0284c7] text-white border-[#0284c7] shadow-sm font-bold'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-sky-50'
                        }`}
                      >
                        <span className="block truncate font-bold">{p.label}</span>
                        <span className={`text-[10px] block ${isSel ? 'text-sky-100' : 'text-slate-400'}`}>
                          ~{formatINR(p.defaultPrice)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmitForm} className="space-y-4">
              {/* Host Ship Picker */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Ship className="w-3.5 h-3.5 text-[#0284c7]" />
                  <span>Host Vessel Conducting the Ride *</span>
                </label>
                <select
                  value={form.host_ship_id}
                  onChange={(e) => {
                    const sId = Number(e.target.value);
                    const chosen = myShips.find((s) => s.id === sId);
                    setForm((prev) => ({
                      ...prev,
                      host_ship_id: sId,
                      location: chosen?.location || prev.location,
                      departure_port: chosen?.departure_port || prev.departure_port,
                    }));
                  }}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#0284c7] bg-slate-50"
                  required
                >
                  <option value={0} disabled>Select host ship from your fleet...</option>
                  {myShips.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.location || 'Coastal Pier'} • Capacity {s.capacity || 'Vessel'})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400">
                  When a customer books this ride, this vessel and its departure port are reserved.
                </p>
              </div>

              {/* Title & Category Label */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Ride Title *</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="e.g. Speed Jet Ski Wave Blast"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#0284c7] bg-slate-50"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Category Label *</label>
                  <input
                    type="text"
                    value={form.category_label}
                    onChange={(e) => setForm({ ...form, category_label: e.target.value })}
                    placeholder="e.g. Jet Skiing"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#0284c7] bg-slate-50"
                    required
                  />
                </div>
              </div>

              {/* Price, Duration, Capacity */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Price (₹ INR/person) *</label>
                  <input
                    type="number"
                    min={100}
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#0284c7] bg-slate-50"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Duration (Minutes) *</label>
                  <input
                    type="number"
                    min={15}
                    value={form.duration_minutes}
                    onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#0284c7] bg-slate-50"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Slot Capacity *</label>
                  <input
                    type="number"
                    min={1}
                    value={form.capacity_per_slot}
                    onChange={(e) => setForm({ ...form, capacity_per_slot: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#0284c7] bg-slate-50"
                    required
                  />
                </div>
              </div>

              {/* Location & Departure Port */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Location / Coastal Area *</label>
                  <input
                    type="text"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#0284c7] bg-slate-50"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Departure Port / Jetty Pier *</label>
                  <input
                    type="text"
                    value={form.departure_port}
                    onChange={(e) => setForm({ ...form, departure_port: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#0284c7] bg-slate-50"
                    required
                  />
                </div>
              </div>

              {/* Time Slots */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Daily Time Slots (Comma-separated) *</label>
                <input
                  type="text"
                  value={form.time_slots_str}
                  onChange={(e) => setForm({ ...form, time_slots_str: e.target.value })}
                  placeholder="08:30 AM, 11:00 AM, 02:30 PM, 04:30 PM"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#0284c7] bg-slate-50"
                  required
                />
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Description *</label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Describe the adventure, certified trainers, and onboard amenities..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#0284c7] bg-slate-50"
                  required
                />
              </div>

              {/* Included Gear & Highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Included Gear (Comma-separated)</label>
                  <input
                    type="text"
                    value={form.included_gear_str}
                    onChange={(e) => setForm({ ...form, included_gear_str: e.target.value })}
                    placeholder="Life jacket, Oxygen tank, Helmet"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#0284c7] bg-slate-50"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Highlights (Comma-separated)</label>
                  <input
                    type="text"
                    value={form.highlights_str}
                    onChange={(e) => setForm({ ...form, highlights_str: e.target.value })}
                    placeholder="Certified instructor, GoPro photos"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#0284c7] bg-slate-50"
                  />
                </div>
              </div>

              {/* Image URL Picker */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">High-Resolution Image URL *</label>
                <input
                  type="text"
                  value={form.image}
                  onChange={(e) => setForm({ ...form, image: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#0284c7] bg-slate-50"
                  required
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 rounded-full border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-full bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-black transition cursor-pointer shadow-md shadow-[#0284c7]/25 flex items-center gap-2"
                >
                  {submitting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  <span>{editingActivity ? 'Save Changes' : 'Publish Ride'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
