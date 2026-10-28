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
  ChevronDown,
  Calendar,
  CloudSun,
  UserCheck,
  LifeBuoy,
  Tag,
  Anchor,
  FileText
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
  // 1. Water Sports
  { id: 'SCUBA', label: 'Scuba Diving', group: 'Water Sports', image: '/static/images/activities/scuba_diving.jpg', defaultPrice: 3499, pricingType: 'PER_PERSON', duration: 60, minParticipants: 1, capacity: 6, instructor: true, equipment: true },
  { id: 'SURFING', label: 'Surfing', group: 'Water Sports', image: '/static/images/activities/surfing.jpg', defaultPrice: 1800, pricingType: 'PER_PERSON', duration: 90, minParticipants: 1, capacity: 8, instructor: true, equipment: true },
  { id: 'KITE_SURFING', label: 'Kite Surfing', group: 'Water Sports', image: '/static/images/activities/kite_surfing.jpg', defaultPrice: 3500, pricingType: 'PER_PERSON', duration: 90, minParticipants: 1, capacity: 4, instructor: true, equipment: true },
  { id: 'JET_SKIING', label: 'Jet Skiing', group: 'Water Sports', image: '/static/images/activities/jet_skiing.jpg', defaultPrice: 2200, pricingType: 'PER_PERSON', duration: 30, minParticipants: 1, capacity: 2, instructor: false, equipment: true },
  { id: 'WATER_SKIING', label: 'Water Skiing', group: 'Water Sports', image: '/static/images/activities/water_skiing.jpg', defaultPrice: 2600, pricingType: 'PER_PERSON', duration: 45, minParticipants: 1, capacity: 4, instructor: true, equipment: true },
  { id: 'PARASAILING', label: 'Parasailing', group: 'Water Sports', image: '/static/images/activities/parasailing.jpg', defaultPrice: 2800, pricingType: 'PER_PERSON', duration: 45, minParticipants: 1, capacity: 4, instructor: true, equipment: true },
  { id: 'RAFTING', label: 'Rafting', group: 'Water Sports', image: '/static/images/activities/rafting.jpg', defaultPrice: 1950, pricingType: 'PER_PERSON', duration: 120, minParticipants: 2, capacity: 8, instructor: true, equipment: true },
  { id: 'ROWING', label: 'Rowing', group: 'Water Sports', image: '/static/images/activities/rowing.jpg', defaultPrice: 1400, pricingType: 'PER_PERSON', duration: 60, minParticipants: 1, capacity: 6, instructor: false, equipment: true },
  { id: 'CLIFF_DIVING', label: 'Cliff Diving', group: 'Water Sports', image: '/static/images/activities/cliff_diving.jpg', defaultPrice: 2400, pricingType: 'PER_PERSON', duration: 90, minParticipants: 1, capacity: 6, instructor: true, equipment: true },
  { id: 'WATER_POLO', label: 'Water Polo', group: 'Water Sports', image: '/static/images/activities/water_polo.jpg', defaultPrice: 1200, pricingType: 'PER_PERSON', duration: 60, minParticipants: 4, capacity: 14, instructor: true, equipment: true },
  // 2. Fishing Experiences
  { id: 'DEEP_SEA_FISHING', label: 'Deep-Sea Fishing', group: 'Fishing Experiences', image: '/static/images/activities/deep_sea_fishing.jpg', defaultPrice: 5500, pricingType: 'PER_PERSON', duration: 180, minParticipants: 2, capacity: 6, instructor: true, equipment: true },
  { id: 'BOAT_FISHING', label: 'Boat Fishing', group: 'Fishing Experiences', image: '/static/images/activities/boat_fishing.jpg', defaultPrice: 3200, pricingType: 'PER_PERSON', duration: 120, minParticipants: 1, capacity: 6, instructor: true, equipment: true },
  { id: 'FISHING_CHARTER', label: 'Fishing Charter', group: 'Fishing Experiences', image: '/static/images/activities/fishing_charter.jpg', defaultPrice: 15000, pricingType: 'PER_PERSON', duration: 240, minParticipants: 1, capacity: 8, instructor: true, equipment: true },
  // 3. Boat & Ship Experiences
  { id: 'YACHT_RENTAL', label: 'Yacht Rental', group: 'Boat & Ship Experiences', image: '/static/images/activities/yacht_rental.jpg', defaultPrice: 16500, pricingType: 'PER_PERSON', duration: 120, minParticipants: 1, capacity: 12, instructor: false, equipment: true },
  { id: 'SPEEDBOAT_RIDE', label: 'Speedboat Ride', group: 'Boat & Ship Experiences', image: '/static/images/activities/speedboat_ride.jpg', defaultPrice: 2500, pricingType: 'PER_PERSON', duration: 45, minParticipants: 1, capacity: 6, instructor: true, equipment: true },
  { id: 'PRIVATE_BOAT_CHARTER', label: 'Private Boat Charter', group: 'Boat & Ship Experiences', image: '/static/images/activities/private_boat_charter.jpg', defaultPrice: 12000, pricingType: 'PER_PERSON', duration: 180, minParticipants: 1, capacity: 10, instructor: true, equipment: true },
  { id: 'SUNSET_CRUISE', label: 'Sunset Cruise', group: 'Boat & Ship Experiences', image: '/static/images/activities/sunset_cruise.jpg', defaultPrice: 1800, pricingType: 'PER_PERSON', duration: 90, minParticipants: 1, capacity: 25, instructor: false, equipment: true },
  { id: 'GROUP_BOAT_TRIPS', label: 'Group Boat Trips', group: 'Boat & Ship Experiences', image: '/static/images/activities/group_boat_trips.jpg', defaultPrice: 1100, pricingType: 'PER_PERSON', duration: 120, minParticipants: 1, capacity: 20, instructor: false, equipment: true },
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

  // Form State (Complete 15 fields requested by Owner Specification)
  const initialForm = {
    title: '',
    activity_type: 'SCUBA',
    category_label: 'Scuba Diving',
    category_group: 'Water Sports',
    description: 'Breathe underwater and explore pristine coral reefs, guided by certified marine masters.',
    image: '/static/images/activities/scuba_diving.jpg',
    location: myShips[0]?.location || 'Goa Coastal Waters',
    departure_port: myShips[0]?.departure_port || 'Mandovi Jetty Pier',
    operating_hours: '08:00 AM - 05:30 PM',
    duration_minutes: 60,
    pricing_type: 'PER_PERSON' as 'PER_PERSON' | 'PER_SESSION',
    price: 3499,
    min_participants: 1,
    capacity_per_slot: 6,
    available_dates_summary: 'Available Daily • All Year Round',
    time_slots_str: '09:00 AM, 11:00 AM, 02:00 PM',
    equipment_required: true,
    included_gear_str: 'Life jacket, Oxygen tank, Scuba regulator, Diving mask, Fins, Wetsuit',
    instructor_available: true,
    instructor_details: 'Certified Master PADI Instructor included for all sessions',
    age_restrictions: 'Minimum age 10 years. Basic swimming capability recommended.',
    requirements: 'Must sign medical clearance disclaimer and safety liability waiver before departure.',
    weather_conditions: 'Operates in calm to moderate sea swell. Activity rescheduled if heavy rain/cyclone warning.',
    cancellation_policy: 'Free cancellation up to 24 hours before start time. 100% refund if cancelled due to weather.',
    safety_guidelines: 'Life vests mandatory during transit. Listen to certified instructor safety briefing before immersion.',
    host_ship_id: myShips[0]?.id || 0, // 0 = Shore-based (no boat needed)
    auto_confirm: true,
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
      category_group: act.category_group || 'Water Sports',
      description: act.description || '',
      image: act.image || '/static/images/activities/jet_skiing.jpg',
      location: act.location,
      departure_port: act.departure_port,
      operating_hours: act.operating_hours || '08:00 AM - 06:00 PM',
      duration_minutes: act.duration_minutes,
      pricing_type: (act.pricing_type as any) === 'PER_SESSION' ? 'PER_SESSION' : 'PER_PERSON',
      price: Number(act.price),
      min_participants: act.min_participants || 1,
      capacity_per_slot: act.capacity_per_slot,
      available_dates_summary: act.available_dates_summary || 'Available Daily • All Year Round',
      time_slots_str: (act.time_slots || []).join(', '),
      equipment_required: Boolean(act.included_gear && act.included_gear.length > 0),
      included_gear_str: (act.included_gear || []).join(', '),
      instructor_available: act.instructor_available ?? true,
      instructor_details: act.instructor_details || 'Certified Master Instructor included',
      age_restrictions: act.age_restrictions || 'Age 10+ years. Basic swimming capability recommended.',
      requirements: act.requirements || '',
      weather_conditions: act.weather_conditions || 'Operates in calm to moderate sea swell. Subject to wind/rain advisories.',
      cancellation_policy: act.cancellation_policy || 'Free cancellation up to 24 hours before start time.',
      safety_guidelines: act.safety_guidelines || '',
      host_ship_id: act.host_ship_id || 0,
      auto_confirm: act.auto_confirm !== false,
      is_active: act.is_active,
    });
    setShowModal(true);
  };

  const handleSelectPreset = (preset: typeof PRESET_ACTIVITIES[0]) => {
    setForm((prev) => ({
      ...prev,
      activity_type: preset.id,
      category_label: preset.label,
      category_group: preset.group,
      price: preset.defaultPrice,
      pricing_type: preset.pricingType as any,
      duration_minutes: preset.duration,
      min_participants: preset.minParticipants,
      capacity_per_slot: preset.capacity,
      instructor_available: preset.instructor,
      equipment_required: preset.equipment,
      image: preset.image,
      title: prev.title || `${preset.label} Expedition`,
    }));
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.title.trim()) {
      alert('Please enter an activity name.');
      return;
    }
    if (form.min_participants > form.capacity_per_slot) {
      alert('Minimum participants cannot exceed maximum slot capacity.');
      return;
    }

    setSubmitting(true);
    setActionMessage(null);

    const hasShip = Number(form.host_ship_id) > 0;
    const chosenShip = hasShip ? myShips.find((s) => s.id === Number(form.host_ship_id)) : null;

    const payload = {
      title: form.title.trim(),
      activity_type: form.activity_type,
      category_label: form.category_label,
      category_group: form.category_group,
      host_ship_id: hasShip ? Number(form.host_ship_id) : null,
      requires_boat: hasShip,
      vessel_requirement_note: hasShip
        ? `Boat Included (${chosenShip?.name || 'Vessel'})`
        : 'Beach & Shore-Based (No Boat Needed)',
      price: Number(form.price),
      pricing_type: form.pricing_type,
      duration_minutes: Number(form.duration_minutes),
      difficulty_level: 'All Skill Levels',
      min_participants: Number(form.min_participants),
      capacity_per_slot: Number(form.capacity_per_slot),
      location: form.location.trim(),
      departure_port: form.departure_port.trim(),
      operating_hours: form.operating_hours.trim(),
      available_dates_summary: form.available_dates_summary.trim(),
      time_slots: form.time_slots_str.split(',').map((s) => s.trim()).filter(Boolean),
      description: form.description.trim(),
      highlights: [
        form.instructor_available ? 'Certified Marine Instructor' : 'Self-guided',
        form.equipment_required ? 'Full Gear & Equipment Included' : 'Standard Gear',
        form.pricing_type === 'PER_SESSION' ? 'Private Session Rate' : 'Per Person Rate',
      ],
      included_gear: form.equipment_required
        ? form.included_gear_str.split(',').map((s) => s.trim()).filter(Boolean)
        : [],
      instructor_available: form.instructor_available,
      instructor_details: form.instructor_available ? form.instructor_details.trim() : 'Self-guided / No instructor required',
      age_restrictions: form.age_restrictions.trim(),
      requirements: form.requirements.trim(),
      weather_conditions: form.weather_conditions.trim(),
      cancellation_policy: form.cancellation_policy.trim(),
      safety_guidelines: form.safety_guidelines.trim(),
      image: form.image.trim(),
      auto_confirm: form.auto_confirm,
      is_active: form.is_active,
    };

    try {
      if (editingActivity) {
        await updateActivity(editingActivity.id, payload as any);
        setActionMessage({ text: `Activity "${payload.title}" updated successfully!` });
      } else {
        await createActivity(payload as any);
        setActionMessage({ text: `Activity "${payload.title}" published successfully!` });
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
    if (!window.confirm(`Are you sure you wish to delete activity "${act.title}"?`)) return;
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
            Owner Activity Command & Management
          </div>
          <h2 className="text-2xl sm:text-3xl font-black font-serif tracking-tight text-white">
            Manage Marine Activities & Adventures
          </h2>
          <p className="text-xs text-white/80 mt-1 max-w-2xl font-medium">
            Configure Scuba Diving, Jet Skiing, Surfing, Fishing Charters, and Boat Excursions. System enforces double-booking prevention across instructors, equipment, and host vessels.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="relative z-10 px-6 py-3 rounded-full bg-[#0284c7] hover:bg-[#0369a1] text-white font-black text-xs flex items-center gap-2 self-start cursor-pointer shadow-lg shadow-[#0284c7]/40 transition-all hover:-translate-y-0.5 active:translate-y-0"
        >
          <Plus className="w-4 h-4 text-white" />
          <span>Add New Activity</span>
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

      {/* 2. KPI Summary Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-white border border-[#0284c7]/15 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider mb-1">
            Total Activities
          </span>
          <div className="text-3xl font-black text-[#051833] font-mono-numbers">
            {activities.length}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Water sports & boat experiences</p>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-[#0284c7]/15 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-emerald-700 block tracking-wider mb-1 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Currently Active
          </span>
          <div className="text-3xl font-black text-emerald-900 font-mono-numbers">
            {activeCount}
          </div>
          <p className="text-[11px] text-emerald-600 font-medium mt-1">Accepting customer reservations</p>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-[#0284c7]/15 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-sky-700 block tracking-wider mb-1">
            Average Base Rate
          </span>
          <div className="text-3xl font-black text-sky-900 font-mono-numbers">
            {formatINR(avgPrice)}
          </div>
          <p className="text-[11px] text-sky-600 font-medium mt-1">Per person / per session</p>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-[#0284c7]/15 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-amber-700 block tracking-wider mb-1 flex items-center gap-1">
            <Ship className="w-3.5 h-3.5 text-amber-600" />
            Authorized Vessels
          </span>
          <div className="text-3xl font-black text-amber-900 font-mono-numbers">
            {myShips.length}
          </div>
          <p className="text-[11px] text-amber-600 font-medium mt-1">Available for marine activities</p>
        </div>
      </div>

      {/* 3. Filter Dock */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-[#0284c7]/15 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by activity name, vessel, or port..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-2xl border border-slate-200 text-xs focus:outline-none focus:border-[#0284c7] bg-slate-50 font-medium"
            />
          </div>
          <span className="text-xs text-slate-400 font-semibold">
            Showing {filtered.length} of {activities.length} activities
          </span>
        </div>

        {/* Categories Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              selectedCategory === 'ALL'
                ? 'bg-[#051833] text-white shadow-sm font-black'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Categories
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
          <p className="text-xs text-slate-500 mt-3 font-semibold">Loading activities inventory...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center space-y-3">
          <Waves className="w-12 h-12 text-[#0284c7]/40 mx-auto" />
          <h3 className="font-extrabold text-[#051833] text-base">No Activities Found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {activities.length === 0
              ? 'You have not listed any activities yet. Click "Add New Activity" above to configure your water sports, fishing adventures, and boat charters.'
              : 'No activities match your current search and category filters.'}
          </p>
          {activities.length === 0 && (
            <button
              onClick={handleOpenAddModal}
              className="px-5 py-2.5 rounded-full bg-[#0284c7] text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-md shadow-[#0284c7]/25"
            >
              <Plus className="w-4 h-4" />
              <span>Add First Activity</span>
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
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />

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

                {/* Associated Vessel or Shore badge */}
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-xs">
                  <div className="flex items-center gap-1.5 font-bold truncate max-w-[65%]">
                    {act.host_ship_name ? (
                      <>
                        <Ship className="w-3.5 h-3.5 text-[#38bdf8] shrink-0" />
                        <span className="truncate">Vessel: {act.host_ship_name}</span>
                      </>
                    ) : (
                      <>
                        <Waves className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                        <span className="truncate">Beach / Shore-Based</span>
                      </>
                    )}
                  </div>
                  <span className="font-mono text-xs font-black text-[#fff8dc] shrink-0">
                    {formatINR(act.price)}
                    <span className="text-[10px] font-normal text-white/80 block text-right">
                      {act.pricing_type === 'PER_SESSION' ? 'per session' : 'per person'}
                    </span>
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

                  {/* Specs Grid */}
                  <div className="grid grid-cols-3 gap-2 text-center text-xs bg-slate-50 p-2.5 rounded-2xl border border-slate-100 mt-2">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Duration</span>
                      <span className="font-bold text-[#051833]">{act.duration_minutes}m</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Capacity</span>
                      <span className="font-bold text-[#051833]">
                        {act.min_participants || 1}–{act.capacity_per_slot} Max
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Pricing</span>
                      <span className="font-bold text-[#0284c7] truncate block text-[11px]">
                        {act.pricing_type === 'PER_SESSION' ? 'Per Session' : 'Per Person'}
                      </span>
                    </div>
                  </div>

                  {/* Badges for Instructor & Equipment */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border flex items-center gap-1 ${
                      act.instructor_available !== false
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}>
                      <UserCheck className="w-3 h-3" />
                      {act.instructor_available !== false ? 'Instructor Required' : 'Self-Guided'}
                    </span>

                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border flex items-center gap-1 ${
                      act.included_gear && act.included_gear.length > 0
                        ? 'bg-sky-50 text-[#0284c7] border-sky-200'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}>
                      <LifeBuoy className="w-3 h-3" />
                      {act.included_gear && act.included_gear.length > 0 ? 'Gear Included' : 'Standard'}
                    </span>

                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border flex items-center gap-1 ${
                      act.auto_confirm !== false
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}>
                      <Clock className="w-3 h-3" />
                      {act.auto_confirm !== false ? 'Instant Auto-Confirm' : 'Manual Approval'}
                    </span>
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
                          className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-200"
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
                      title="Edit activity details"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(act)}
                      className="p-2 rounded-full hover:bg-rose-50 text-rose-600 transition cursor-pointer"
                      title="Delete activity"
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

      {/* 5. ADD / EDIT ACTIVITY MODAL - COMPLETE 15 SPECIFICATION FIELDS */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-[#0284c7]/20 shadow-2xl max-w-3xl w-full p-6 sm:p-8 space-y-6 my-6 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-sky-50 text-[#0284c7] flex items-center justify-center">
                  <Waves className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-[#051833]">
                    {editingActivity ? 'Edit Activity Configuration' : 'Add New Activity'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Owner operations panel • Full control over vessel, equipment, instructor & schedule
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Anti Double-Booking Guard Banner */}
            <div className="p-3.5 rounded-2xl bg-sky-50/80 border border-sky-200 text-xs text-[#0369a1] flex items-start gap-2.5">
              <Shield className="w-4 h-4 text-[#0284c7] shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Smart Double-Booking Prevention:</span>
                <span>The booking engine automatically ensures the assigned instructor, equipment, and host vessel cannot be double-booked across overlapping time slots.</span>
              </div>
            </div>

            {/* Quick Presets (Only when adding) */}
            {!editingActivity && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-700 block">
                  Quick Category Presets (1-Click Fill):
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {PRESET_ACTIVITIES.slice(0, 8).map((p) => {
                    const isSel = form.activity_type === p.id;
                    return (
                      <button
                        type="button"
                        key={p.id}
                        onClick={() => handleSelectPreset(p)}
                        className={`p-2.5 rounded-xl text-left text-xs transition border cursor-pointer ${
                          isSel
                            ? 'bg-[#0284c7] text-white border-[#0284c7] shadow-sm font-bold'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-sky-50'
                        }`}
                      >
                        <span className="block truncate font-bold">{p.label}</span>
                        <span className={`text-[10px] block ${isSel ? 'text-sky-100' : 'text-slate-400'}`}>
                          {formatINR(p.defaultPrice)} ({p.pricingType === 'PER_SESSION' ? 'session' : 'person'})
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmitForm} className="space-y-6">
              {/* SECTION A: Associated Ship or Vessel */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                <div className="flex items-center gap-2">
                  <Anchor className="w-4 h-4 text-[#0284c7]" />
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#051833]">
                    1. Associated Ship or Vessel (If Required)
                  </h4>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Select Operating Host Vessel:</label>
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
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#0284c7] bg-white"
                  >
                    <option value={0}>🏖️ Beach & Shore-Based (No boat or vessel required)</option>
                    {myShips.map((s) => (
                      <option key={s.id} value={s.id}>
                        🚢 {s.name} ({s.location || 'Coastal Pier'} • Capacity: {s.capacity || 'Vessel'})
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-500">
                    Important: Har activity ko ship ki zaroorat nahi hoti. Scuba diving ya deep-sea fishing ke liye boat select karein; surfing ya beach sports ke liye shore-based option select karein.
                  </p>
                </div>
              </div>

              {/* SECTION B: Identity & Category */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-[#0284c7]" />
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#051833]">
                    2. Activity Name & Category
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Activity Name *</label>
                    <input
                      type="text"
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      placeholder="e.g. Scuba Diving Expedition"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#0284c7] bg-white"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Category / Type *</label>
                    <input
                      type="text"
                      value={form.category_label}
                      onChange={(e) => setForm({ ...form, category_label: e.target.value })}
                      placeholder="e.g. Scuba Diving / Water Sports"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#0284c7] bg-white"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Description *</label>
                  <textarea
                    rows={2}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Describe the adventure, corals, wildlife, and experience details..."
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#0284c7] bg-white"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Activity Images / Video URL *</label>
                  <input
                    type="text"
                    value={form.image}
                    onChange={(e) => setForm({ ...form, image: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#0284c7] bg-white"
                    required
                  />
                </div>
              </div>

              {/* SECTION C: Pricing, Duration & Participants */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#0284c7]" />
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#051833]">
                    3. Pricing, Duration & Participant Capacity
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Pricing Model *</label>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, pricing_type: 'PER_PERSON' })}
                      className="w-full py-2 px-3 rounded-xl text-xs font-bold border border-[#0284c7] bg-[#0284c7] text-white transition cursor-pointer"
                    >
                      Per Person (₹/person)
                    </button>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">
                      Rate Amount (₹ INR Per Person) *
                    </label>
                    <input
                      type="number"
                      min={100}
                      value={form.price}
                      onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#0284c7] bg-white font-mono"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Duration (Minutes) *</label>
                    <input
                      type="number"
                      min={15}
                      value={form.duration_minutes}
                      onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#0284c7] bg-white font-mono"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Min Participants *</label>
                    <input
                      type="number"
                      min={1}
                      value={form.min_participants}
                      onChange={(e) => setForm({ ...form, min_participants: Number(e.target.value) })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#0284c7] bg-white font-mono"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Max Participants (Slot Cap) *</label>
                    <input
                      type="number"
                      min={1}
                      value={form.capacity_per_slot}
                      onChange={(e) => setForm({ ...form, capacity_per_slot: Number(e.target.value) })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#0284c7] bg-white font-mono"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* SECTION D: Operating Location, Dates & Time Slots */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#0284c7]" />
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#051833]">
                    4. Operating Location, Dates & Booking Slots
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Operating Location *</label>
                    <input
                      type="text"
                      value={form.location}
                      onChange={(e) => setForm({ ...form, location: e.target.value })}
                      placeholder="e.g. Grand Island, Goa"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#0284c7] bg-white"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Departure Port / Jetty Pier *</label>
                    <input
                      type="text"
                      value={form.departure_port}
                      onChange={(e) => setForm({ ...form, departure_port: e.target.value })}
                      placeholder="e.g. Mandovi Jetty Pier"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#0284c7] bg-white"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Available Dates Summary *</label>
                    <input
                      type="text"
                      value={form.available_dates_summary}
                      onChange={(e) => setForm({ ...form, available_dates_summary: e.target.value })}
                      placeholder="e.g. Available Daily • Today onwards"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#0284c7] bg-white"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Booking Time Slots (Comma-separated) *</label>
                    <input
                      type="text"
                      value={form.time_slots_str}
                      onChange={(e) => setForm({ ...form, time_slots_str: e.target.value })}
                      placeholder="e.g. 09:00 AM, 11:00 AM, 02:00 PM"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#0284c7] bg-white"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* SECTION E: Equipment & Instructor Requirements */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-[#0284c7]" />
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#051833]">
                    5. Equipment & Instructor Requirements
                  </h4>
                </div>

                {/* Instructor */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <span>Instructor Requirement:</span>
                    </label>
                    <label className="inline-flex items-center gap-2 text-xs font-bold text-[#0284c7] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.instructor_available}
                        onChange={(e) => setForm({ ...form, instructor_available: e.target.checked })}
                        className="rounded text-[#0284c7] focus:ring-[#0284c7]"
                      />
                      <span>Instructor Required / Provided</span>
                    </label>
                  </div>
                  {form.instructor_available && (
                    <input
                      type="text"
                      value={form.instructor_details}
                      onChange={(e) => setForm({ ...form, instructor_details: e.target.value })}
                      placeholder="e.g. Certified Master PADI Instructor included for all sessions"
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#0284c7] bg-white"
                    />
                  )}
                </div>

                {/* Equipment */}
                <div className="space-y-2 pt-2 border-t border-slate-200/60">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <span>Equipment Requirement:</span>
                    </label>
                    <label className="inline-flex items-center gap-2 text-xs font-bold text-[#0284c7] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.equipment_required}
                        onChange={(e) => setForm({ ...form, equipment_required: e.target.checked })}
                        className="rounded text-[#0284c7] focus:ring-[#0284c7]"
                      />
                      <span>Equipment Required / Provided</span>
                    </label>
                  </div>
                  {form.equipment_required && (
                    <input
                      type="text"
                      value={form.included_gear_str}
                      onChange={(e) => setForm({ ...form, included_gear_str: e.target.value })}
                      placeholder="e.g. Life jacket, Oxygen tank, Scuba regulator, Diving mask, Fins"
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#0284c7] bg-white"
                    />
                  )}
                </div>
              </div>

              {/* SECTION F: Restrictions, Weather & Safety */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[#0284c7]" />
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#051833]">
                    6. Restrictions, Weather, Cancellation & Safety Rules
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Age & Eligibility Restrictions *</label>
                    <input
                      type="text"
                      value={form.age_restrictions}
                      onChange={(e) => setForm({ ...form, age_restrictions: e.target.value })}
                      placeholder="e.g. Minimum age 10 years. Good physical health."
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#0284c7] bg-white"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Weather Conditions Rules *</label>
                    <input
                      type="text"
                      value={form.weather_conditions}
                      onChange={(e) => setForm({ ...form, weather_conditions: e.target.value })}
                      placeholder="e.g. Operates in calm to moderate swell. Rescheduled if rain/cyclone alert."
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#0284c7] bg-white"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Cancellation & Refund Policy *</label>
                    <input
                      type="text"
                      value={form.cancellation_policy}
                      onChange={(e) => setForm({ ...form, cancellation_policy: e.target.value })}
                      placeholder="e.g. Free cancellation up to 24 hours before start time."
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#0284c7] bg-white"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Safety Instructions *</label>
                    <input
                      type="text"
                      value={form.safety_guidelines}
                      onChange={(e) => setForm({ ...form, safety_guidelines: e.target.value })}
                      placeholder="e.g. Life vests mandatory at all times. Follow master guide instructions."
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#0284c7] bg-white"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* SECTION G: Booking Policy & Confirmation Mode */}
              <div className="p-4 rounded-2xl bg-sky-50/60 border border-[#0284c7]/20 space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#0284c7]" />
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#051833]">
                    7. Booking Confirmation Policy
                  </h4>
                </div>
                <p className="text-[11px] text-slate-600">
                  Control whether paid bookings for this activity are confirmed immediately by the system or require your manual approval in Booking Management.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, auto_confirm: true })}
                    className={`p-3.5 rounded-2xl border text-left transition flex items-start gap-3 cursor-pointer ${
                      form.auto_confirm
                        ? 'bg-white border-[#0284c7] ring-2 ring-[#0284c7]/20 shadow-sm'
                        : 'bg-white/60 border-slate-200 hover:bg-white text-slate-600'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full mt-0.5 border flex items-center justify-center shrink-0 ${
                      form.auto_confirm ? 'border-[#0284c7] bg-[#0284c7]' : 'border-slate-300'
                    }`}>
                      {form.auto_confirm && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#051833] flex items-center gap-1.5">
                        <span>Automatic Instant Confirmation</span>
                        <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">Recommended</span>
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Paid bookings are automatically confirmed with valid digital pass tickets.
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setForm({ ...form, auto_confirm: false })}
                    className={`p-3.5 rounded-2xl border text-left transition flex items-start gap-3 cursor-pointer ${
                      !form.auto_confirm
                        ? 'bg-white border-amber-500 ring-2 ring-amber-500/20 shadow-sm'
                        : 'bg-white/60 border-slate-200 hover:bg-white text-slate-600'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full mt-0.5 border flex items-center justify-center shrink-0 ${
                      !form.auto_confirm ? 'border-amber-500 bg-amber-500' : 'border-slate-300'
                    }`}>
                      {!form.auto_confirm && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#051833] flex items-center gap-1.5">
                        <span>Manual Owner Confirmation</span>
                        <span className="text-[10px] font-extrabold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">Owner Action</span>
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Paid bookings stay 'Pending' until you manually review & approve them.
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Submit / Cancel Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3 sticky bottom-0 bg-white py-2">
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
                  <span>{editingActivity ? 'Save Changes' : 'Publish Activity'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
