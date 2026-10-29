import React, { useState, useEffect } from 'react';
import {
  Ship,
  Anchor,
  Plus,
  Edit2,
  Trash2,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Shield,
  Award,
  Wrench,
  Waves,
  Users,
  MapPin,
  Search,
  Star,
  ExternalLink,
  X,
  Check,
  Upload,
  Link as LinkIcon,
  FileText,
  Sparkles,
  Filter,
  ChevronRight,
  Eye,
  Loader2,
  DollarSign
} from 'lucide-react';
import { Cruise, ActivityItem } from '../../api/types';
import {
  createOperatorShip,
  updateOperatorShip,
  deleteOperatorShip,
  uploadOperatorImage,
  getOperatorAvailability
} from '../../api/dashboards';
import { getOperatorActivities } from '../../api/activities';
import { formatINR } from '../../utils/currency';
import { saveCustomShip, removeCustomShip } from '../../utils/persistentFleetStore';

interface OperatorShipsViewProps {
  myShips: Cruise[];
  onRefresh: () => void;
}

const VESSEL_TYPES = [
  'Motor Yacht',
  'Speedboat',
  'Catamaran Cruiser',
  'Superyacht',
  'Traditional Dhow',
  'Fishing Trawler / Boat',
  'Expedition Vessel',
  'Luxury Ocean Cruise',
];

const PRESET_ACTIVITIES_LIST = [
  'Scuba Diving',
  'Surfing',
  'Deep-Sea Fishing',
  'Boat Fishing',
  'Fishing Charter',
  'Yacht Rental',
  'Speedboat Ride',
  'Private Boat Charter',
  'Sunset Cruise',
  'Parasailing',
  'Water Skiing',
  'Kite Surfing',
  'Rafting',
  'Group Boat Trips'
];

export type OperationalStatus = 'AVAILABLE' | 'ON_TOUR' | 'BOOKED' | 'UNDER_MAINTENANCE' | 'INACTIVE';

export const getNormalizedShipStatus = (s: Cruise): OperationalStatus => {
  const raw = String(s.operational_status || s.availability_status || '').toUpperCase();
  if (raw === 'ON_TOUR' || raw === 'TOUR') return 'ON_TOUR';
  if (raw === 'BOOKED') return 'BOOKED';
  if (raw === 'UNDER_MAINTENANCE' || raw === 'MAINTENANCE') return 'UNDER_MAINTENANCE';
  if (raw === 'INACTIVE' || s.is_active === false) return 'INACTIVE';
  return 'AVAILABLE';
};

export const OperatorShipsView: React.FC<OperatorShipsViewProps> = ({ myShips, onRefresh }) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | OperationalStatus>('ALL');
  const [selectedShipForCalendar, setSelectedShipForCalendar] = useState<Cruise | null>(null);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [calendarDays, setCalendarDays] = useState<any[]>([]);

  // Add / Edit Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingShip, setEditingShip] = useState<Cruise | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [shipToDelete, setShipToDelete] = useState<Cruise | null>(null);
  const [actionMessage, setActionMessage] = useState<{ text: string; isError?: boolean } | null>(null);

  // Activities attached to ships
  const [operatorActivities, setOperatorActivities] = useState<ActivityItem[]>([]);

  // Image Upload state
  const [imageUploadMode, setImageUploadMode] = useState<'upload' | 'url'>('url');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState('');

  // Form State
  const initialForm = {
    name: '',
    registration_number: 'IND-GA-2024-REG',
    vessel_type: 'Motor Yacht',
    capacity: 12,
    capacity_note: 'Vessel passenger capacity (activity diving/equipment capacity set separately)',
    price: 35000,
    price_unit: 'day base charter',
    location: 'Goa Coastal Waters',
    departure_port: 'Mandovi Jetty Pier',
    destination: 'Goa & Arabian Sea',
    route: 'Panaji - Mandovi River - Arabian Sea',
    operational_status: 'AVAILABLE' as OperationalStatus,
    image_url: '/static/images/vessels/cordelia_empress.jpg',
    ship_length_meters: 35,
    beam_meters: 8,
    decks_count: 2,
    cabin_count: 4,
    maintenance_schedule: 'Routine bi-weekly engine and hull service; Next scheduled drydock: 15-20 Nov 2026',
    certifications: 'IRS Seaworthiness Class A1, Annual Marine Safety Inspection Passed Oct 2026, Comprehensive Passenger Liability Insurance Active',
    supported_activities_str: 'Scuba Diving, Deep-Sea Fishing, Sunset Cruise, Private Boat Charter, Speedboat Ride',
    description: 'High-performance commercial vessel equipped for coastal charters, scuba diving logistics, and ocean adventures.',
    facilities: 'Wi-Fi, Sun Deck, Air Conditioning, Fresh Water Shower, First Aid Marine Kit, Sound System',
  };

  const [form, setForm] = useState(initialForm);

  // Fetch operator activities to cross-reference host ships
  useEffect(() => {
    getOperatorActivities()
      .then((res) => setOperatorActivities(res.activities || []))
      .catch((err) => console.error('Failed to load activities for fleet:', err));
  }, []);

  const handleOpenAddModal = () => {
    setEditingShip(null);
    setForm(initialForm);
    setImagePreview('');
    setShowModal(true);
  };

  const handleOpenEditModal = (ship: Cruise) => {
    setEditingShip(ship);
    const opStatus = getNormalizedShipStatus(ship);

    setForm({
      name: ship.name,
      registration_number: ship.registration_number || 'IND-GA-2024-REG',
      vessel_type: ship.vessel_type || ship.category || 'Motor Yacht',
      capacity: ship.capacity || 12,
      capacity_note: ship.capacity_note || 'Vessel passenger capacity (activity diving/equipment capacity set separately)',
      price: ship.price || 35000,
      price_unit: ship.price_unit || 'day base charter',
      location: ship.location || 'Goa Coastal Waters',
      departure_port: ship.departure_port || 'Mandovi Jetty Pier',
      destination: ship.destination || 'Goa & Arabian Sea',
      route: ship.route || 'Panaji - Mandovi River - Arabian Sea',
      operational_status: opStatus,
      image_url: ship.image_url || ship.image || '/static/images/vessels/cordelia_empress.jpg',
      ship_length_meters: ship.ship_length_meters || 35,
      beam_meters: ship.beam_meters || 8,
      decks_count: ship.decks_count || 2,
      cabin_count: ship.cabin_count || 4,
      maintenance_schedule: ship.maintenance_schedule || 'Routine bi-weekly engine and hull service; Next scheduled drydock: 15-20 Nov 2026',
      certifications: ship.certifications || 'IRS Seaworthiness Class A1, Annual Marine Safety Inspection Passed Oct 2026, Comprehensive Passenger Liability Insurance Active',
      supported_activities_str: ship.supported_activities || 'Scuba Diving, Deep-Sea Fishing, Sunset Cruise, Private Boat Charter, Speedboat Ride',
      description: ship.description || '',
      facilities: Array.isArray(ship.facilities) ? ship.facilities.join(', ') : (ship.facilities || ''),
    });
    setImagePreview(ship.image_url || ship.image || '');
    setShowModal(true);
  };

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const res = await uploadOperatorImage(file);
      if (res.success && res.url) {
        setForm((prev) => ({ ...prev, image_url: res.url }));
        setImagePreview(res.url);
      }
    } catch (err: any) {
      alert(err.message || 'Image upload failed');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      alert('Please enter vessel name.');
      return;
    }
    if (form.capacity <= 0) {
      alert('Passenger capacity must be at least 1.');
      return;
    }

    setSubmitting(true);
    setActionMessage(null);

    const payload: any = {
      name: form.name.trim(),
      registration_number: form.registration_number.trim(),
      vessel_type: form.vessel_type,
      category: form.vessel_type,
      capacity: Number(form.capacity),
      capacity_note: form.capacity_note.trim(),
      price: Number(form.price),
      price_unit: form.price_unit,
      location: form.location.trim(),
      departure_port: form.departure_port.trim(),
      destination: form.destination.trim(),
      route: form.route.trim(),
      availability_status: form.operational_status,
      operational_status: form.operational_status,
      image_url: form.image_url.trim(),
      image: form.image_url.trim(),
      ship_length_meters: Number(form.ship_length_meters),
      beam_meters: Number(form.beam_meters),
      decks_count: Number(form.decks_count),
      cabin_count: Number(form.cabin_count),
      maintenance_schedule: form.maintenance_schedule.trim(),
      certifications: form.certifications.trim(),
      supported_activities: form.supported_activities_str.trim(),
      description: form.description.trim(),
      facilities: form.facilities,
      is_active: form.operational_status !== 'INACTIVE',
      is_approved: true,
    };

    try {
      if (editingShip) {
        const res = await updateOperatorShip(editingShip.id, payload);
        saveCustomShip(res?.ship || ({ ...editingShip, ...payload } as any));
        setActionMessage({ text: `Vessel "${payload.name}" updated successfully!` });
      } else {
        const res = await createOperatorShip(payload);
        const created = res?.ship || ({
          id: Date.now(),
          ...payload,
          name: payload.name,
          operational_status: payload.operational_status || 'AVAILABLE',
          is_active: true,
          is_approved: true,
        } as any);
        saveCustomShip(created);
        setActionMessage({ text: `New vessel "${payload.name}" registered successfully!` });
      }
      setShowModal(false);
      onRefresh();
    } catch (err: any) {
      setActionMessage({ text: err.message || 'Failed to save vessel details.', isError: true });
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickStatusChange = async (ship: Cruise, newStatus: OperationalStatus) => {
    try {
      saveCustomShip({
        ...ship,
        availability_status: newStatus,
        operational_status: newStatus,
        is_active: newStatus !== 'INACTIVE',
        is_approved: true,
      });
      await updateOperatorShip(ship.id, {
        availability_status: newStatus,
        operational_status: newStatus,
        is_active: newStatus !== 'INACTIVE',
        is_approved: true,
      } as any);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to update operational status');
    }
  };

  const handleDeleteShip = async () => {
    if (!shipToDelete) return;
    try {
      removeCustomShip(shipToDelete.id);
      await deleteOperatorShip(shipToDelete.id);
      setShipToDelete(null);
      setActionMessage({ text: `Vessel "${shipToDelete.name}" decommissioned successfully.` });
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to delete vessel');
    }
  };

  const handleOpenCalendar = async (ship: Cruise) => {
    setSelectedShipForCalendar(ship);
    setCalendarLoading(true);
    try {
      const res = await getOperatorAvailability(ship.id);
      setCalendarDays(res.timeline || (res as any).days || []);
    } catch (err) {
      console.error('Failed to load ship availability:', err);
      setCalendarDays([]);
    } finally {
      setCalendarLoading(false);
    }
  };

  // Filtered ships
  const filteredShips = myShips.filter((s) => {
    const opStatus = getNormalizedShipStatus(s);

    const matchesStatus = statusFilter === 'ALL' || opStatus === statusFilter;
    const matchesSearch =
      !search.trim() ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.registration_number && s.registration_number.toLowerCase().includes(search.toLowerCase())) ||
      (s.vessel_type && s.vessel_type.toLowerCase().includes(search.toLowerCase())) ||
      (s.location && s.location.toLowerCase().includes(search.toLowerCase())) ||
      (s.departure_port && s.departure_port.toLowerCase().includes(search.toLowerCase()));

    return matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status?: string) => {
    const norm = status ? status.toUpperCase() : 'AVAILABLE';
    switch (norm) {
      case 'ON_TOUR':
      case 'TOUR':
        return (
          <span className="px-3 py-1 rounded-full text-[10px] font-black bg-blue-50 text-blue-700 border border-blue-200 uppercase inline-flex items-center gap-1.5 shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            On Tour
          </span>
        );
      case 'AVAILABLE':
        return (
          <span className="px-3 py-1 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-800 border border-emerald-200 uppercase inline-flex items-center gap-1.5 shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Available
          </span>
        );
      case 'BOOKED':
        return (
          <span className="px-3 py-1 rounded-full text-[10px] font-black bg-rose-50 text-rose-800 border border-rose-200 uppercase inline-flex items-center gap-1.5 shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            Booked
          </span>
        );
      case 'UNDER_MAINTENANCE':
      case 'MAINTENANCE':
        return (
          <span className="px-3 py-1 rounded-full text-[10px] font-black bg-amber-50 text-amber-800 border border-amber-200 uppercase inline-flex items-center gap-1.5 shadow-xs">
            <Wrench className="w-3 h-3 text-amber-600" />
            Under Maintenance
          </span>
        );
      case 'INACTIVE':
        return (
          <span className="px-3 py-1 rounded-full text-[10px] font-black bg-slate-100 text-slate-700 border border-slate-300 uppercase inline-flex items-center gap-1.5 shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            Inactive
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-800 border border-emerald-200 uppercase inline-flex items-center gap-1.5 shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Available
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-[#030d1c] via-[#051833] to-[#0a2548] rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-[#051833]/15 border border-[#0284c7]/25 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-[#38bdf8] text-xs font-black uppercase tracking-wider mb-2 border border-white/15 backdrop-blur-md">
            <Anchor className="w-3.5 h-3.5 text-[#38bdf8]" />
            Owner Fleet Management Command
          </div>
          <h2 className="text-2xl sm:text-3xl font-black font-serif tracking-tight text-white">
            Manage Ships &amp; Boats Registry
          </h2>
          <p className="text-xs text-white/80 mt-1 max-w-2xl font-medium">
            Dedicated records for all authorized fleet vessels. Configure registrations, passenger capacity, certifications, maintenance drydocks, and real-time operational availability.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="relative z-10 px-6 py-3 rounded-full bg-[#0284c7] hover:bg-[#0369a1] text-white font-black text-xs flex items-center gap-2 self-start cursor-pointer shadow-lg shadow-[#0284c7]/40 transition-all hover:-translate-y-0.5 active:translate-y-0"
        >
          <Plus className="w-4 h-4 text-white" />
          <span>Register New Vessel</span>
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

      {/* 2. Vessel Capacity vs Activity Capacity Operational Guideline */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-sky-50 to-indigo-50 border border-sky-200 text-xs text-[#0369a1] flex items-start gap-3 shadow-xs">
        <Shield className="w-5 h-5 text-[#0284c7] shrink-0 mt-0.5" />
        <div>
          <span className="font-extrabold block text-sm text-[#051833]">
            Key Architecture: Vessel Passenger Capacity vs. Activity Slot Capacity
          </span>
          <p className="text-[#051833]/80 mt-0.5 leading-relaxed font-medium">
            A vessel may have a physical license for <strong>12 to 25 passengers</strong>, but specific activities conducted aboard (such as Scuba Diving or Deep-Sea Fishing) may restrict bookings to <strong>6 participants</strong> due to instructor ratios and available diving equipment. Vessel capacity and activity capacities are managed as independent entities.
          </p>
        </div>
      </div>

      {/* 3. Search and Status Filter Chips */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-[#0284c7]/15 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by vessel name, registration number, type, or home port..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-2xl border border-slate-200 text-xs focus:outline-none focus:border-[#0284c7] bg-slate-50 font-medium"
            />
          </div>
          <span className="text-xs text-slate-400 font-semibold">
            Showing {filteredShips.length} of {myShips.length} vessels
          </span>
        </div>

        {/* 5 Vessel Status Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'ALL', label: 'All Fleet Ships', count: myShips.length },
            { id: 'AVAILABLE', label: 'Available', count: myShips.filter((s) => getNormalizedShipStatus(s) === 'AVAILABLE').length },
            { id: 'ON_TOUR', label: 'On Tour', count: myShips.filter((s) => getNormalizedShipStatus(s) === 'ON_TOUR').length },
            { id: 'BOOKED', label: 'Booked', count: myShips.filter((s) => getNormalizedShipStatus(s) === 'BOOKED').length },
            { id: 'UNDER_MAINTENANCE', label: 'Under Maintenance', count: myShips.filter((s) => getNormalizedShipStatus(s) === 'UNDER_MAINTENANCE').length },
            { id: 'INACTIVE', label: 'Inactive', count: myShips.filter((s) => getNormalizedShipStatus(s) === 'INACTIVE').length },
          ].map((chip) => {
            const isActive = statusFilter === chip.id;
            return (
              <button
                key={chip.id}
                onClick={() => setStatusFilter(chip.id as any)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                  isActive
                    ? 'bg-[#0284c7] text-white border-[#0284c7] shadow-sm font-black'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-sky-50'
                }`}
              >
                <span>{chip.label}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                }`}>
                  {chip.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Dedicated Vessel Cards Grid */}
      {filteredShips.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center space-y-3">
          <Ship className="w-12 h-12 text-[#0284c7]/40 mx-auto" />
          <h3 className="font-extrabold text-[#051833] text-base">No Fleet Vessels Found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {myShips.length === 0
              ? 'You have not registered any ships or boats in your fleet yet. Click "Register New Vessel" above to add your first boat.'
              : 'No vessels match your current search and operational status filter.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredShips.map((ship) => {
            const opStatus = getNormalizedShipStatus(ship);

            // Find activities hosted on this ship
            const hostedActs = operatorActivities.filter((a) => a.host_ship_id === ship.id);

            return (
              <div
                key={ship.id}
                className="bg-white rounded-3xl border border-[#0284c7]/20 shadow-sm p-6 sm:p-7 space-y-5 hover:border-[#0284c7]/50 hover:shadow-lg transition-all flex flex-col justify-between group"
              >
                <div className="space-y-4">
                  {/* Top Bar: Image, Name, Registration & Operational Status */}
                  <div className="flex gap-4 sm:gap-5">
                    <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden shrink-0 bg-slate-900 border border-slate-200 relative group">
                      <img
                        src={ship.image || (ship as any).image_url || '/static/images/vessels/cordelia_empress.jpg'}
                        alt={ship.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                      />
                    </div>

                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        {getStatusBadge(opStatus)}
                        <span className="text-[11px] font-mono font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                          {ship.registration_number || 'REG: IND-GA-2024'}
                        </span>
                      </div>

                      <h3 className="font-extrabold text-lg text-[#051833] truncate pt-0.5">
                        {ship.name}
                      </h3>

                      <p className="text-xs text-[#0284c7] font-bold">
                        {ship.vessel_type || ship.category || 'Motor Yacht'}
                      </p>

                      <div className="flex items-center gap-1.5 text-xs text-slate-500 pt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-[#0284c7] shrink-0" />
                        <span className="truncate">{ship.departure_port} • {ship.location}</span>
                      </div>

                      <p className="text-sm font-black text-[#051833] pt-1">
                        {formatINR(ship.price)}
                        <span className="text-[10px] font-normal text-slate-400"> / {ship.price_unit || 'day base charter'}</span>
                      </p>
                    </div>
                  </div>

                  {/* Technical & Capacity Specs Grid */}
                  <div className="grid grid-cols-3 gap-2 text-center text-xs bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Vessel Capacity</span>
                      <span className="font-black text-[#051833] text-sm">{ship.capacity} Passengers</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Length / Beam</span>
                      <span className="font-bold text-[#051833]">{ship.ship_length_meters || 35}m × {ship.beam_meters || 8}m</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Decks / Cabins</span>
                      <span className="font-bold text-[#051833]">{ship.decks_count || 2} Decks • {ship.cabin_count || 4}</span>
                    </div>
                  </div>

                  {/* Certifications & Inspection Records */}
                  <div className="p-3 rounded-2xl bg-amber-50/60 border border-amber-200/80 text-xs space-y-1">
                    <span className="text-[10px] font-black uppercase text-amber-900 tracking-wider flex items-center gap-1">
                      <Award className="w-3.5 h-3.5 text-amber-600" />
                      Certifications &amp; Inspection Records
                    </span>
                    <p className="text-amber-950 font-medium text-[11px] leading-relaxed">
                      {ship.certifications || 'IRS Seaworthiness Class A1, Annual Marine Safety Inspection Passed Oct 2026, Comprehensive Passenger Liability Insurance Active'}
                    </p>
                  </div>

                  {/* Maintenance Schedule */}
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                    <span className="text-[10px] font-black uppercase text-slate-600 tracking-wider flex items-center gap-1">
                      <Wrench className="w-3.5 h-3.5 text-[#0284c7]" />
                      Maintenance Schedule
                    </span>
                    <p className="text-slate-700 font-medium text-[11px] leading-relaxed">
                      {ship.maintenance_schedule || 'Routine bi-weekly engine and hull service; Next scheduled drydock: 15-20 Nov 2026'}
                    </p>
                  </div>

                  {/* Supported Activities & Attached Rides */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-700 flex items-center gap-1">
                        <Waves className="w-3.5 h-3.5 text-[#0284c7]" />
                        Supported Activities:
                      </span>
                      <span className="text-[11px] text-[#0284c7] font-semibold">
                        {hostedActs.length} Live Attached {hostedActs.length === 1 ? 'Ride' : 'Rides'}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {(ship.supported_activities || 'Scuba Diving, Deep-Sea Fishing, Sunset Cruise, Private Boat Charter')
                        .split(',')
                        .map((actName, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-0.5 rounded-lg bg-sky-50 text-[#0284c7] text-[10px] font-bold border border-sky-200"
                          >
                            {actName.trim()}
                          </span>
                        ))}
                    </div>
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  {/* Quick Status Selector */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-slate-400 font-bold">Status:</span>
                    <select
                      value={opStatus}
                      onChange={(e) => handleQuickStatusChange(ship, e.target.value as OperationalStatus)}
                      className="px-2.5 py-1 rounded-xl text-xs font-bold border border-slate-200 bg-white text-slate-700 focus:outline-none focus:border-[#0284c7]"
                    >
                      <option value="AVAILABLE">Available</option>
                      <option value="ON_TOUR">On Tour</option>
                      <option value="BOOKED">Booked</option>
                      <option value="UNDER_MAINTENANCE">Under Maintenance</option>
                      <option value="INACTIVE">Inactive</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenCalendar(ship)}
                      className="px-3.5 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition cursor-pointer flex items-center gap-1"
                      title="View 30-day Availability Schedule"
                    >
                      <Calendar className="w-3.5 h-3.5 text-[#0284c7]" />
                      <span>Calendar</span>
                    </button>

                    <button
                      onClick={() => handleOpenEditModal(ship)}
                      className="p-2 rounded-full hover:bg-slate-100 text-slate-600 transition cursor-pointer"
                      title="Edit vessel record"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => setShipToDelete(ship)}
                      className="p-2 rounded-full hover:bg-rose-50 text-rose-600 transition cursor-pointer"
                      title="Decommission vessel"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. DEDICATED AVAILABILITY CALENDAR MODAL */}
      {selectedShipForCalendar && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-[#0284c7]/20 shadow-2xl max-w-4xl w-full p-6 sm:p-8 space-y-6 my-6 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-sky-50 text-[#0284c7] flex items-center justify-center">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-[#051833]">
                    Availability Calendar: {selectedShipForCalendar.name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Registration: {selectedShipForCalendar.registration_number || 'IND-GA-2024'} • Vessel Capacity: {selectedShipForCalendar.capacity} Guests
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedShipForCalendar(null)}
                className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Calendar Legend */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-3 font-semibold">
                <span className="inline-flex items-center gap-1.5 text-emerald-800">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  Available for Charters
                </span>
                <span className="inline-flex items-center gap-1.5 text-indigo-800">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#1677C8]" />
                  Charter Booked
                </span>
                <span className="inline-flex items-center gap-1.5 text-amber-800">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  Maintenance / Drydock Block
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-bold">Chronological 30-Day Window</span>
            </div>

            {/* Calendar Days Grid */}
            {calendarLoading ? (
              <div className="py-16 text-center space-y-3">
                <Loader2 className="w-8 h-8 text-[#0284c7] animate-spin mx-auto" />
                <p className="text-xs text-slate-500 font-semibold">Loading vessel operational calendar...</p>
              </div>
            ) : calendarDays.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                No active bookings or schedule conflicts found for this vessel in the next 30 days.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {calendarDays.map((day, idx) => {
                  const isMaintenance = day.status_type === 'MAINTENANCE' || day.status?.toLowerCase().includes('maintenance');
                  const isAvailable = Boolean(day.is_available);
                  const isBooked = !isAvailable && !isMaintenance;

                  return (
                    <div
                      key={idx}
                      className={`p-3 rounded-2xl border text-xs space-y-1.5 transition ${
                        isMaintenance
                          ? 'bg-amber-50 border-amber-200 text-amber-900'
                          : isBooked
                          ? 'bg-sky-50 border-sky-200 text-[#051833]'
                          : 'bg-white border-slate-200 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold">
                        <span>{day.formatted_date || day.date}</span>
                        <span className={`w-2 h-2 rounded-full ${
                          isMaintenance ? 'bg-amber-500' : isBooked ? 'bg-[#0284c7]' : 'bg-emerald-500'
                        }`} />
                      </div>

                      <div className="text-[11px] font-bold">
                        {isMaintenance ? (
                          <span className="text-amber-800 flex items-center gap-1">
                            <Wrench className="w-3 h-3" />
                            Drydock Service
                          </span>
                        ) : isBooked ? (
                          <span className="text-[#0284c7] font-extrabold truncate block">
                            {day.details?.tour_title || day.status || 'Charter Reserved'}
                          </span>
                        ) : (
                          <span className="text-emerald-700">Open for Booking</span>
                        )}
                      </div>

                      {day.booked_time && (
                        <div className="text-[10px] text-slate-500 truncate pt-1 border-t border-sky-200/60 font-mono">
                          {day.booked_time}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedShipForCalendar(null)}
                className="px-5 py-2 rounded-full bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition cursor-pointer"
              >
                Close Calendar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. ADD / EDIT VESSEL MODAL - WITH ALL 10 FIELDS */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-[#0284c7]/20 shadow-2xl max-w-3xl w-full p-6 sm:p-8 space-y-6 my-6 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-sky-50 text-[#0284c7] flex items-center justify-center">
                  <Ship className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-[#051833]">
                    {editingShip ? 'Edit Vessel Record' : 'Register New Vessel in Fleet'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Dedicated marine record with passenger capacity, certifications &amp; maintenance schedule.
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

            <form onSubmit={handleSubmitForm} className="space-y-6">
              {/* SECTION 1: Vessel Name & Registration */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#051833] flex items-center gap-2">
                  <Anchor className="w-4 h-4 text-[#0284c7]" />
                  1. Vessel Name, Registration &amp; Type
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1 sm:col-span-1">
                    <label className="text-xs font-bold text-slate-700">Vessel Name *</label>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="e.g. MV Ocean Explorer"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#0284c7] bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Registration Details *</label>
                    <input
                      type="text"
                      required
                      value={form.registration_number}
                      onChange={(e) => setForm({ ...form, registration_number: e.target.value })}
                      placeholder="e.g. IND-GA-2024-Y8972"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#0284c7] bg-white font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Vessel Type *</label>
                    <select
                      value={form.vessel_type}
                      onChange={(e) => setForm({ ...form, vessel_type: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#0284c7] bg-white"
                    >
                      {VESSEL_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* SECTION 2: Capacity & Operational Status */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#051833] flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#0284c7]" />
                  2. Passenger Capacity &amp; Operational Status
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Max Passenger Capacity *</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={form.capacity}
                      onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#0284c7] bg-white font-mono"
                    />
                    <span className="text-[10px] text-slate-400 block">
                      Max guests vessel physically holds.
                    </span>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Operational Status *</label>
                    <select
                      value={form.operational_status}
                      onChange={(e) => setForm({ ...form, operational_status: e.target.value as OperationalStatus })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#0284c7] bg-white font-bold"
                    >
                      <option value="AVAILABLE">Available</option>
                      <option value="ON_TOUR">On Tour</option>
                      <option value="BOOKED">Booked</option>
                      <option value="UNDER_MAINTENANCE">Under Maintenance</option>
                      <option value="INACTIVE">Inactive</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Base Rate (₹ INR) *</label>
                    <input
                      type="number"
                      required
                      min={1000}
                      value={form.price}
                      onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#0284c7] bg-white font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Capacity &amp; Activity Separation Note</label>
                  <input
                    type="text"
                    value={form.capacity_note}
                    onChange={(e) => setForm({ ...form, capacity_note: e.target.value })}
                    placeholder="e.g. Vessel accommodates 12 guests; scuba diving equipment limited to 6 divers per session"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#0284c7] bg-white"
                  />
                </div>
              </div>

              {/* SECTION 3: Location, Home Port & Dimensions */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#051833] flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#0284c7]" />
                  3. Location &amp; Maritime Dimensions
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Operating Location *</label>
                    <input
                      type="text"
                      required
                      value={form.location}
                      onChange={(e) => setForm({ ...form, location: e.target.value })}
                      placeholder="e.g. Goa Coastal Waters"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#0284c7] bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Departure Port / Jetty Pier *</label>
                    <input
                      type="text"
                      required
                      value={form.departure_port}
                      onChange={(e) => setForm({ ...form, departure_port: e.target.value })}
                      placeholder="e.g. Mandovi Jetty Pier"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#0284c7] bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Length (m)</label>
                    <input
                      type="number"
                      value={form.ship_length_meters}
                      onChange={(e) => setForm({ ...form, ship_length_meters: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#0284c7] bg-white font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Beam (m)</label>
                    <input
                      type="number"
                      value={form.beam_meters}
                      onChange={(e) => setForm({ ...form, beam_meters: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#0284c7] bg-white font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Decks</label>
                    <input
                      type="number"
                      value={form.decks_count}
                      onChange={(e) => setForm({ ...form, decks_count: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#0284c7] bg-white font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Cabins</label>
                    <input
                      type="number"
                      value={form.cabin_count}
                      onChange={(e) => setForm({ ...form, cabin_count: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#0284c7] bg-white font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 4: Maintenance Schedule & Certifications */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#051833] flex items-center gap-2">
                  <Award className="w-4 h-4 text-[#0284c7]" />
                  4. Certifications &amp; Maintenance Schedule
                </h4>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">
                    Applicable Certifications &amp; Inspection Records *
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={form.certifications}
                    onChange={(e) => setForm({ ...form, certifications: e.target.value })}
                    placeholder="e.g. IRS Seaworthiness Class A1, Annual Hull Inspection Passed Oct 2026, Comprehensive Passenger Insurance Active"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#0284c7] bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">
                    Maintenance Schedule &amp; Drydock Dates *
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={form.maintenance_schedule}
                    onChange={(e) => setForm({ ...form, maintenance_schedule: e.target.value })}
                    placeholder="e.g. Routine bi-weekly engine and hull service; Next scheduled drydock: 15-20 Nov 2026"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#0284c7] bg-white"
                  />
                </div>
              </div>

              {/* SECTION 5: Supported Activities & Media */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#051833] flex items-center gap-2">
                  <Waves className="w-4 h-4 text-[#0284c7]" />
                  5. Supported Activities &amp; Vessel Media
                </h4>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">
                    Supported Marine Activities (Comma-separated) *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.supported_activities_str}
                    onChange={(e) => setForm({ ...form, supported_activities_str: e.target.value })}
                    placeholder="e.g. Scuba Diving, Deep-Sea Fishing, Sunset Cruise, Private Boat Charter, Speedboat Ride"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#0284c7] bg-white"
                  />
                </div>

                {/* Image URL with Preview */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700">Vessel Image *</label>
                    <div className="flex items-center gap-1 bg-slate-200/60 p-0.5 rounded-lg text-[10px] font-bold">
                      <button
                        type="button"
                        onClick={() => setImageUploadMode('url')}
                        className={`px-2.5 py-0.5 rounded-md transition cursor-pointer ${
                          imageUploadMode === 'url' ? 'bg-white text-[#0284c7] shadow-xs' : 'text-slate-600'
                        }`}
                      >
                        Image URL
                      </button>
                      <button
                        type="button"
                        onClick={() => setImageUploadMode('upload')}
                        className={`px-2.5 py-0.5 rounded-md transition cursor-pointer ${
                          imageUploadMode === 'upload' ? 'bg-white text-[#0284c7] shadow-xs' : 'text-slate-600'
                        }`}
                      >
                        Local Upload
                      </button>
                    </div>
                  </div>

                  {imageUploadMode === 'url' ? (
                    <input
                      type="text"
                      required
                      value={form.image_url}
                      onChange={(e) => {
                        setForm({ ...form, image_url: e.target.value });
                        setImagePreview(e.target.value);
                      }}
                      placeholder="https://images.unsplash.com/photo-xxx..."
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#0284c7] bg-white"
                    />
                  ) : (
                    <div className="space-y-2">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageFileChange}
                        className="text-xs font-medium text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-sky-50 file:text-[#0284c7] hover:file:bg-sky-100 cursor-pointer"
                      />
                      {uploadingImage && (
                        <span className="text-[11px] text-[#0284c7] font-bold flex items-center gap-1">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading image...
                        </span>
                      )}
                    </div>
                  )}

                  {imagePreview && (
                    <div className="flex items-center gap-3 p-2 rounded-xl bg-white border border-slate-200">
                      <img
                        src={imagePreview}
                        alt="Vessel Preview"
                        className="w-16 h-12 rounded-lg object-cover border"
                        onError={(e: any) => {
                          e.target.src = '/static/images/placeholder.png';
                        }}
                      />
                      <span className="text-[11px] text-slate-500 truncate flex-1 font-mono">
                        {imagePreview}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Buttons */}
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
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  <span>{editingShip ? 'Save Vessel Changes' : 'Register Vessel'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. DELETE CONFIRMATION MODAL */}
      {shipToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in fade-in">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="font-extrabold text-base text-[#051833]">
                Decommission Vessel "{shipToDelete.name}"?
              </h3>
              <p className="text-xs text-slate-500">
                Are you sure you wish to remove this vessel from your active registry? Existing confirmed historical records will be archived.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShipToDelete(null)}
                className="px-4 py-2 rounded-full border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteShip}
                className="px-5 py-2 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-black transition cursor-pointer shadow-sm"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
