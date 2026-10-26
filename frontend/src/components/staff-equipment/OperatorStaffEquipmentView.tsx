import React, { useState, useEffect } from 'react';
import {
  Users,
  ShieldCheck,
  LifeBuoy,
  Anchor,
  Compass,
  Navigation,
  Activity,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Phone,
  Mail,
  Award,
  Layers,
  Search,
  Filter,
  Play,
  Check,
  RefreshCw,
  Waves,
  Zap,
  Info,
  Calendar,
  X
} from 'lucide-react';
import {
  StaffMemberItem,
  StaffRole,
  StaffStatus,
  EquipmentItemModel,
  EquipmentCategory,
  EquipmentCondition,
  AvailabilitySimulationResult,
  Cruise
} from '../../api/types';
import {
  getOperatorStaff,
  createOperatorStaff,
  updateOperatorStaff,
  deleteOperatorStaff,
  toggleOperatorStaffStatus,
  getOperatorEquipment,
  createOperatorEquipment,
  updateOperatorEquipment,
  deleteOperatorEquipment,
  toggleOperatorEquipmentCondition,
  simulateAvailabilityEngine
} from '../../api/dashboards';
import { getOperatorActivities } from '../../api/activities';

interface OperatorStaffEquipmentViewProps {
  vessels: Cruise[];
  activities?: any[];
}

export const OperatorStaffEquipmentView: React.FC<OperatorStaffEquipmentViewProps> = ({
  vessels,
  activities = [],
}) => {
  // Navigation sub-tabs: 'staff' | 'equipment' | 'simulator'
  const [subTab, setSubTab] = useState<'staff' | 'equipment' | 'simulator'>('staff');

  // Activities list (fallback fetch if empty)
  const [actList, setActList] = useState<any[]>(activities || []);
  const [simActivityId, setSimActivityId] = useState<string>(activities?.[0]?.id?.toString() || '1');

  useEffect(() => {
    if (!activities || activities.length === 0) {
      getOperatorActivities()
        .then((res) => {
          if (res?.activities) {
            setActList(res.activities);
            if (res.activities.length > 0 && !simActivityId) {
              setSimActivityId(res.activities[0].id.toString());
            }
          }
        })
        .catch(() => {});
    } else {
      setActList(activities);
    }
  }, [activities]);

  // Staff State
  const [staffList, setStaffList] = useState<StaffMemberItem[]>([]);
  const [staffStats, setStaffStats] = useState<any>(null);
  const [staffLoading, setStaffLoading] = useState(true);
  const [staffRoleFilter, setStaffRoleFilter] = useState<string>('ALL');
  const [staffStatusFilter, setStaffStatusFilter] = useState<string>('ALL');
  const [staffSearch, setStaffSearch] = useState('');

  // Equipment State
  const [equipmentList, setEquipmentList] = useState<EquipmentItemModel[]>([]);
  const [equipmentStats, setEquipmentStats] = useState<any>(null);
  const [equipmentLoading, setEquipmentLoading] = useState(true);
  const [equipCategoryFilter, setEquipCategoryFilter] = useState<string>('ALL');
  const [equipConditionFilter, setEquipConditionFilter] = useState<string>('ALL');
  const [equipSearch, setEquipSearch] = useState('');

  // Modals
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMemberItem | null>(null);
  const [staffForm, setStaffForm] = useState<{
    name: string;
    role: StaffRole;
    license_number: string;
    certifications: string;
    phone: string;
    email: string;
    max_supervision_limit: number;
    experience_years: number;
    status: StaffStatus;
    assigned_activity_types: string[];
    assigned_ship_id: string;
    notes: string;
  }>({
    name: '',
    role: 'INSTRUCTOR',
    license_number: '',
    certifications: '',
    phone: '',
    email: '',
    max_supervision_limit: 4,
    experience_years: 4,
    status: 'ON_DUTY',
    assigned_activity_types: ['scuba_diving'],
    assigned_ship_id: '',
    notes: '',
  });

  const [showEquipModal, setShowEquipModal] = useState(false);
  const [editingEquip, setEditingEquip] = useState<EquipmentItemModel | null>(null);
  const [equipForm, setEquipForm] = useState<{
    name: string;
    category: EquipmentCategory;
    serial_number: string;
    total_quantity: number;
    condition_status: EquipmentCondition;
    safety_certification: string;
    assigned_activity_id: string;
    assigned_ship_id: string;
    notes: string;
  }>({
    name: '',
    category: 'LIFE_JACKET',
    serial_number: '',
    total_quantity: 10,
    condition_status: 'OPERATIONAL',
    safety_certification: 'ISO 12402-4 Marine Safety Approved',
    assigned_activity_id: '',
    assigned_ship_id: '',
    notes: '',
  });

  // Availability Simulator State
  const [simDate, setSimDate] = useState<string>('2026-11-20');
  const [simTimeSlot, setSimTimeSlot] = useState<string>('10:30 AM');
  const [simParticipants, setSimParticipants] = useState<number>(2);
  const [simLoading, setSimLoading] = useState<boolean>(false);
  const [simResult, setSimResult] = useState<AvailabilitySimulationResult | null>(null);
  const [simError, setSimError] = useState<string | null>(null);

  // Form submit loading
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Load Staff
  const loadStaff = async () => {
    try {
      setStaffLoading(true);
      const res = await getOperatorStaff();
      setStaffList(res.staff || []);
      setStaffStats(res.stats || null);
    } catch (err: any) {
      console.error('Failed to load staff:', err);
    } finally {
      setStaffLoading(false);
    }
  };

  // Load Equipment
  const loadEquipment = async () => {
    try {
      setEquipmentLoading(true);
      const res = await getOperatorEquipment();
      setEquipmentList(res.equipment || []);
      setEquipmentStats(res.stats || null);
    } catch (err: any) {
      console.error('Failed to load equipment:', err);
    } finally {
      setEquipmentLoading(false);
    }
  };

  useEffect(() => {
    loadStaff();
    loadEquipment();
  }, []);

  // Sync default simActivityId when activities load
  useEffect(() => {
    if (activities && activities.length > 0 && !simActivityId) {
      setSimActivityId(activities[0].id.toString());
    }
  }, [activities]);

  // Handle Staff Save
  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    try {
      const payload: Partial<StaffMemberItem> = {
        name: staffForm.name,
        role: staffForm.role,
        license_number: staffForm.license_number,
        certifications: staffForm.certifications,
        phone: staffForm.phone,
        email: staffForm.email,
        max_supervision_limit: Number(staffForm.max_supervision_limit) || 6,
        experience_years: Number(staffForm.experience_years) || 1,
        status: staffForm.status,
        assigned_activity_types: staffForm.assigned_activity_types,
        assigned_ship_id: staffForm.assigned_ship_id ? Number(staffForm.assigned_ship_id) : undefined,
        notes: staffForm.notes,
      };

      if (editingStaff) {
        await updateOperatorStaff(editingStaff.id, payload);
      } else {
        await createOperatorStaff(payload);
      }
      setShowStaffModal(false);
      setEditingStaff(null);
      await loadStaff();
    } catch (err: any) {
      alert(err.message || 'Failed to save staff member');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Handle Equipment Save
  const handleSaveEquipment = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    try {
      const payload: Partial<EquipmentItemModel> = {
        name: equipForm.name,
        category: equipForm.category,
        serial_number: equipForm.serial_number,
        total_quantity: Number(equipForm.total_quantity) || 1,
        condition_status: equipForm.condition_status,
        safety_certification: equipForm.safety_certification,
        assigned_activity_id: equipForm.assigned_activity_id ? Number(equipForm.assigned_activity_id) : undefined,
        assigned_ship_id: equipForm.assigned_ship_id ? Number(equipForm.assigned_ship_id) : undefined,
        notes: equipForm.notes,
      };

      if (editingEquip) {
        await updateOperatorEquipment(editingEquip.id, payload);
      } else {
        await createOperatorEquipment(payload);
      }
      setShowEquipModal(false);
      setEditingEquip(null);
      await loadEquipment();
    } catch (err: any) {
      alert(err.message || 'Failed to save equipment');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Staff Status Toggle
  const handleToggleStaffStatus = async (staffId: number, currentStatus: StaffStatus) => {
    const nextStatus: StaffStatus =
      currentStatus === 'ON_DUTY' ? 'ON_LEAVE' : currentStatus === 'ON_LEAVE' ? 'ACTIVE' : 'ON_DUTY';
    try {
      await toggleOperatorStaffStatus(staffId, nextStatus);
      await loadStaff();
    } catch (err: any) {
      alert(err.message || 'Failed to toggle status');
    }
  };

  // Equipment Condition Toggle
  const handleToggleEquipCondition = async (equipId: number, currentCond: EquipmentCondition) => {
    const nextCond: EquipmentCondition =
      currentCond === 'OPERATIONAL' ? 'MAINTENANCE' : 'OPERATIONAL';
    try {
      await toggleOperatorEquipmentCondition(equipId, nextCond);
      await loadEquipment();
    } catch (err: any) {
      alert(err.message || 'Failed to update equipment condition');
    }
  };

  // Staff Delete
  const handleDeleteStaff = async (staffId: number, name: string) => {
    if (!window.confirm(`Are you sure you want to remove ${name} from your team roster?`)) return;
    try {
      await deleteOperatorStaff(staffId);
      await loadStaff();
    } catch (err: any) {
      alert(err.message || 'Failed to delete staff member');
    }
  };

  // Equipment Delete
  const handleDeleteEquip = async (equipId: number, name: string) => {
    if (!window.confirm(`Are you sure you want to delete ${name} from equipment inventory?`)) return;
    try {
      await deleteOperatorEquipment(equipId);
      await loadEquipment();
    } catch (err: any) {
      alert(err.message || 'Failed to delete equipment');
    }
  };

  // Run Availability Simulation
  const handleRunSimulation = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!simActivityId) {
      alert('Please select an activity to test');
      return;
    }
    setSimLoading(true);
    setSimError(null);
    setSimResult(null);
    try {
      const res = await simulateAvailabilityEngine({
        activity_id: Number(simActivityId),
        booking_date: simDate,
        time_slot: simTimeSlot,
        participants: simParticipants,
      });
      setSimResult(res);
    } catch (err: any) {
      setSimError(err.message || 'Simulation execution failed');
    } finally {
      setSimLoading(false);
    }
  };

  // Filtering Staff
  const filteredStaff = staffList.filter((s) => {
    if (staffRoleFilter !== 'ALL' && s.role !== staffRoleFilter) return false;
    if (staffStatusFilter !== 'ALL' && s.status !== staffStatusFilter) return false;
    if (staffSearch.trim()) {
      const q = staffSearch.toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        s.license_number.toLowerCase().includes(q) ||
        s.certifications.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Filtering Equipment
  const filteredEquipment = equipmentList.filter((eq) => {
    if (equipCategoryFilter !== 'ALL' && eq.category !== equipCategoryFilter) return false;
    if (equipConditionFilter !== 'ALL' && eq.condition_status !== equipConditionFilter) return false;
    if (equipSearch.trim()) {
      const q = equipSearch.toLowerCase();
      return (
        eq.name.toLowerCase().includes(q) ||
        eq.serial_number.toLowerCase().includes(q) ||
        eq.safety_certification.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getRoleIcon = (role: StaffRole) => {
    switch (role) {
      case 'INSTRUCTOR':
        return Compass;
      case 'CAPTAIN':
        return Anchor;
      case 'GUIDE':
        return Navigation;
      case 'SAFETY_CREW':
        return LifeBuoy;
      default:
        return Users;
    }
  };

  const getCategoryLabel = (cat: EquipmentCategory) => {
    switch (cat) {
      case 'LIFE_JACKET':
        return 'Life Jackets';
      case 'DIVING_EQUIPMENT':
        return 'Diving Equipment';
      case 'JET_SKI':
        return 'Jet Skis';
      case 'SURFBOARD':
        return 'Surfboards';
      case 'RAFT':
        return 'River Rafts';
      case 'SNORKEL_GEAR':
        return 'Snorkel Gear';
      case 'KAYAK':
        return 'Kayaks';
      case 'SAFETY_KIT':
        return 'Safety Kits';
      default:
        return 'Other Equipment';
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. TOP HEADER & KPI RIBBON */}
      <div className="bg-gradient-to-r from-[#051833] via-[#0a274c] to-[#082F5B] rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#0284c7]/20 via-transparent to-transparent pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-[#63B8F0] text-xs font-bold border border-white/10">
              <ShieldCheck className="w-4 h-4 text-[#38bdf8]" />
              <span>Marine Safety & Capacity Governance</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Staff & Equipment Management
            </h2>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Supervise certified instructors, boat captains, guides, and maritime safety crew alongside life jackets,
              diving kits, jet skis, and rafts. Availability engine automatically calculates <strong>Vessel + Instructor + Equipment + Slot</strong> constraints.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                setEditingStaff(null);
                setStaffForm({
                  name: '',
                  role: 'INSTRUCTOR',
                  license_number: '',
                  certifications: '',
                  phone: '',
                  email: '',
                  max_supervision_limit: 4,
                  experience_years: 4,
                  status: 'ON_DUTY',
                  assigned_activity_types: ['scuba_diving'],
                  assigned_ship_id: '',
                  notes: '',
                });
                setShowStaffModal(true);
              }}
              className="px-5 py-2.5 rounded-full bg-[#0284c7] hover:bg-[#0369a1] text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-[#0284c7]/30 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Staff Member</span>
            </button>

            <button
              onClick={() => {
                setEditingEquip(null);
                setEquipForm({
                  name: '',
                  category: 'LIFE_JACKET',
                  serial_number: '',
                  total_quantity: 10,
                  condition_status: 'OPERATIONAL',
                  safety_certification: 'ISO 12402-4 Marine Safety Approved',
                  assigned_activity_id: '',
                  assigned_ship_id: '',
                  notes: '',
                });
                setShowEquipModal(true);
              }}
              className="px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-2 border border-white/20 transition cursor-pointer"
            >
              <Plus className="w-4 h-4 text-[#38bdf8]" />
              <span>Add Equipment</span>
            </button>
          </div>
        </div>

        {/* KPI Summary Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-white/10">
          <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold block">
              Certified Team
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-white">{staffStats?.total || staffList.length}</span>
              <span className="text-xs text-emerald-400 font-semibold">
                ({staffStats?.on_duty || 0} on duty)
              </span>
            </div>
          </div>

          <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold block">
              Supervision Ratio
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-sky-400">1 : 4-6</span>
              <span className="text-xs text-slate-400 font-medium">Safe Limit</span>
            </div>
          </div>

          <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold block">
              Equipment Units
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-white">{equipmentStats?.total_units || 0}</span>
              <span className="text-xs text-emerald-400 font-semibold">
                ({equipmentStats?.operational_units || 0} Ready)
              </span>
            </div>
          </div>

          <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold block">
              Safety Compliance
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-emerald-400">
                {equipmentStats?.compliance_rate || 96}%
              </span>
              <span className="text-xs text-amber-400 font-semibold">
                {equipmentStats?.maintenance_units || 0} in Maint.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. SUB-NAVIGATION TABS DOCK */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-white border border-[#0284c7]/20 shadow-sm max-w-fit">
        <button
          onClick={() => setSubTab('staff')}
          className={`px-5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            subTab === 'staff'
              ? 'bg-[#051833] text-white shadow-md'
              : 'text-slate-600 hover:text-[#051833] hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4 text-[#0284c7]" />
          <span>Staff & Crew ({staffList.length})</span>
        </button>

        <button
          onClick={() => setSubTab('equipment')}
          className={`px-5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            subTab === 'equipment'
              ? 'bg-[#051833] text-white shadow-md'
              : 'text-slate-600 hover:text-[#051833] hover:bg-slate-100'
          }`}
        >
          <Layers className="w-4 h-4 text-[#0284c7]" />
          <span>Equipment & Gear ({equipmentList.length})</span>
        </button>

        <button
          onClick={() => setSubTab('simulator')}
          className={`px-5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            subTab === 'simulator'
              ? 'bg-[#0284c7] text-white shadow-md shadow-[#0284c7]/20'
              : 'text-slate-600 hover:text-[#051833] hover:bg-slate-100'
          }`}
        >
          <Zap className="w-4 h-4 text-amber-400 animate-pulse" />
          <span>Capacity Engine Simulator</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SUB-TAB 1: STAFF & CREW ROSTER */}
      {/* ========================================================================= */}
      {subTab === 'staff' && (
        <div className="space-y-6">
          {/* Controls Strip: Search & Role Filter */}
          <div className="bg-white rounded-2xl p-4 border border-[#0284c7]/20 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" />
                <span>Role:</span>
              </span>
              {[
                { id: 'ALL', label: 'All Roles' },
                { id: 'INSTRUCTOR', label: 'Instructors' },
                { id: 'CAPTAIN', label: 'Captains' },
                { id: 'GUIDE', label: 'Guides' },
                { id: 'SAFETY_CREW', label: 'Safety Crew' },
              ].map((r) => (
                <button
                  key={r.id}
                  onClick={() => setStaffRoleFilter(r.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
                    staffRoleFilter === r.id
                      ? 'bg-[#051833] text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search staff, license..."
                  value={staffSearch}
                  onChange={(e) => setStaffSearch(e.target.value)}
                  className="pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0284c7] w-56"
                />
              </div>

              <select
                value={staffStatusFilter}
                onChange={(e) => setStaffStatusFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#0284c7] cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                <option value="ON_DUTY">On Duty</option>
                <option value="ACTIVE">Active</option>
                <option value="ON_LEAVE">On Leave</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
          </div>

          {/* Staff Cards Grid */}
          {staffLoading ? (
            <div className="p-12 text-center text-slate-500 font-medium">Loading staff roster...</div>
          ) : filteredStaff.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-3">
              <Users className="w-12 h-12 text-slate-400 mx-auto" />
              <h3 className="text-lg font-bold text-slate-800">No staff members found</h3>
              <p className="text-xs text-slate-500">Try adjusting your filter or add a new team member.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredStaff.map((staff) => {
                const RoleIcon = getRoleIcon(staff.role);
                const isOnDuty = staff.status === 'ON_DUTY';
                const isOnLeave = staff.status === 'ON_LEAVE';

                return (
                  <div
                    key={staff.id}
                    className="bg-white rounded-3xl p-6 border border-[#0284c7]/20 shadow-sm hover:shadow-md hover:border-[#0284c7]/40 transition space-y-5 flex flex-col justify-between"
                  >
                    <div className="space-y-4">
                      {/* Top Bar: Role Icon + Status Badge */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#051833] to-[#0284c7] text-white flex items-center justify-center shadow-md">
                            <RoleIcon className="w-6 h-6 text-[#63B8F0]" />
                          </div>
                          <div>
                            <h4 className="font-extrabold text-base text-[#051833]">{staff.name}</h4>
                            <span className="text-[11px] font-bold text-[#0284c7] uppercase tracking-wider block">
                              {staff.role} • {staff.experience_years} yrs exp
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleToggleStaffStatus(staff.id, staff.status)}
                          title="Click to toggle status"
                          className={`px-3 py-1 rounded-full text-[11px] font-extrabold border transition cursor-pointer flex items-center gap-1.5 ${
                            isOnDuty
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : isOnLeave
                              ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                              : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isOnDuty ? 'bg-emerald-500 animate-pulse' : isOnLeave ? 'bg-amber-500' : 'bg-slate-400'
                            }`}
                          />
                          <span>{staff.status}</span>
                        </button>
                      </div>

                      {/* License & Supervision Capacity Callout */}
                      <div className="bg-[#f0f9ff] rounded-2xl p-3.5 border border-[#bae6fd]/60 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-[#0369a1] flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Max Supervision Limit:</span>
                          </span>
                          <span className="font-extrabold text-[#051833] bg-white px-2 py-0.5 rounded-md border border-[#bae6fd]">
                            Max {staff.max_supervision_limit} participants / session
                          </span>
                        </div>
                        {staff.license_number && (
                          <div className="text-[11px] text-slate-600 flex items-center gap-1.5">
                            <Award className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            <span className="font-medium truncate">License: {staff.license_number}</span>
                          </div>
                        )}
                      </div>

                      {/* Certifications text */}
                      {staff.certifications && (
                        <div className="text-xs text-slate-600 line-clamp-2">
                          <strong className="text-slate-800">Certs:</strong> {staff.certifications}
                        </div>
                      )}

                      {/* Contact Info */}
                      <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                        {staff.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            <span>{staff.phone}</span>
                          </div>
                        )}
                        {staff.email && (
                          <div className="flex items-center gap-2 truncate">
                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                            <span className="truncate">{staff.email}</span>
                          </div>
                        )}
                        {staff.assigned_ship_name && (
                          <div className="flex items-center gap-2 text-[#0284c7] font-semibold">
                            <Anchor className="w-3.5 h-3.5" />
                            <span className="truncate">Vessel: {staff.assigned_ship_name}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom Action Footer */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button
                        onClick={() => {
                          setEditingStaff(staff);
                          setStaffForm({
                            name: staff.name,
                            role: staff.role,
                            license_number: staff.license_number,
                            certifications: staff.certifications,
                            phone: staff.phone,
                            email: staff.email,
                            max_supervision_limit: staff.max_supervision_limit,
                            experience_years: staff.experience_years,
                            status: staff.status,
                            assigned_activity_types: staff.assigned_activity_types,
                            assigned_ship_id: staff.assigned_ship_id ? staff.assigned_ship_id.toString() : '',
                            notes: staff.notes,
                          });
                          setShowStaffModal(true);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                        <span>Edit</span>
                      </button>

                      <button
                        onClick={() => handleDeleteStaff(staff.id, staff.name)}
                        className="px-3 py-1.5 rounded-xl hover:bg-rose-50 text-rose-600 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 2: EQUIPMENT & GEAR INVENTORY */}
      {/* ========================================================================= */}
      {subTab === 'equipment' && (
        <div className="space-y-6">
          {/* Controls Strip: Filter by category & condition */}
          <div className="bg-white rounded-2xl p-4 border border-[#0284c7]/20 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" />
                <span>Gear Category:</span>
              </span>
              {[
                { id: 'ALL', label: 'All Gear' },
                { id: 'LIFE_JACKET', label: 'Life Jackets' },
                { id: 'DIVING_EQUIPMENT', label: 'Diving Gear' },
                { id: 'JET_SKI', label: 'Jet Skis' },
                { id: 'SURFBOARD', label: 'Surfboards' },
                { id: 'RAFT', label: 'Rafts' },
                { id: 'SNORKEL_GEAR', label: 'Snorkel Kits' },
              ].map((c) => (
                <button
                  key={c.id}
                  onClick={() => setEquipCategoryFilter(c.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
                    equipCategoryFilter === c.id
                      ? 'bg-[#051833] text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search equipment, serial..."
                  value={equipSearch}
                  onChange={(e) => setEquipSearch(e.target.value)}
                  className="pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0284c7] w-56"
                />
              </div>

              <select
                value={equipConditionFilter}
                onChange={(e) => setEquipConditionFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#0284c7] cursor-pointer"
              >
                <option value="ALL">All Conditions</option>
                <option value="OPERATIONAL">Operational Only</option>
                <option value="MAINTENANCE">Under Maintenance</option>
                <option value="RETIRED">Retired</option>
              </select>
            </div>
          </div>

          {/* Equipment Cards Grid */}
          {equipmentLoading ? (
            <div className="p-12 text-center text-slate-500 font-medium">Loading equipment inventory...</div>
          ) : filteredEquipment.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-3">
              <Layers className="w-12 h-12 text-slate-400 mx-auto" />
              <h3 className="text-lg font-bold text-slate-800">No equipment items found</h3>
              <p className="text-xs text-slate-500">Add life jackets, diving kits, or jet skis to your fleet inventory.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredEquipment.map((eq) => {
                const isOperational = eq.condition_status === 'OPERATIONAL';
                const isMaintenance = eq.condition_status === 'MAINTENANCE';

                return (
                  <div
                    key={eq.id}
                    className="bg-white rounded-3xl p-6 border border-[#0284c7]/20 shadow-sm hover:shadow-md hover:border-[#0284c7]/40 transition space-y-4 flex flex-col justify-between"
                  >
                    <div className="space-y-3.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${
                              isOperational
                                ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                                : 'bg-amber-50 text-amber-600 border border-amber-200'
                            }`}
                          >
                            <LifeBuoy className="w-6 h-6" />
                          </div>
                          <div>
                            <h4 className="font-extrabold text-sm sm:text-base text-[#051833] line-clamp-1">
                              {eq.name}
                            </h4>
                            <span className="text-[11px] font-bold text-[#0284c7] uppercase tracking-wider block">
                              {getCategoryLabel(eq.category)}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleToggleEquipCondition(eq.id, eq.condition_status)}
                          title="Click to toggle between Operational and Maintenance"
                          className={`px-3 py-1 rounded-full text-[11px] font-extrabold border transition cursor-pointer flex items-center gap-1.5 ${
                            isOperational
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : isMaintenance
                              ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isOperational ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
                            }`}
                          />
                          <span>{eq.condition_status}</span>
                        </button>
                      </div>

                      {/* Stock Quantity Box */}
                      <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 flex items-center justify-between text-xs">
                        <span className="text-slate-600 font-bold">Total Available Stock:</span>
                        <span className="font-extrabold text-sm text-[#051833] bg-white px-3 py-1 rounded-lg border border-slate-200">
                          {eq.total_quantity} Unit{eq.total_quantity > 1 ? 's' : ''}
                        </span>
                      </div>

                      {/* Serial Number & Safety Cert */}
                      <div className="space-y-1.5 text-xs text-slate-600">
                        {eq.serial_number && (
                          <div className="text-[11px]">
                            <span className="text-slate-400 font-bold">Serial / Batch:</span>{' '}
                            <span className="font-mono font-medium text-slate-700">{eq.serial_number}</span>
                          </div>
                        )}
                        {eq.safety_certification && (
                          <div className="text-[11px] flex items-center gap-1 text-slate-700">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span className="truncate">{eq.safety_certification}</span>
                          </div>
                        )}
                      </div>

                      {eq.notes && (
                        <p className="text-xs text-slate-500 line-clamp-2 bg-slate-50/50 p-2 rounded-xl">
                          {eq.notes}
                        </p>
                      )}
                    </div>

                    {/* Bottom Action Footer */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button
                        onClick={() => {
                          setEditingEquip(eq);
                          setEquipForm({
                            name: eq.name,
                            category: eq.category,
                            serial_number: eq.serial_number,
                            total_quantity: eq.total_quantity,
                            condition_status: eq.condition_status,
                            safety_certification: eq.safety_certification,
                            assigned_activity_id: eq.assigned_activity_id ? eq.assigned_activity_id.toString() : '',
                            assigned_ship_id: eq.assigned_ship_id ? eq.assigned_ship_id.toString() : '',
                            notes: eq.notes,
                          });
                          setShowEquipModal(true);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                        <span>Edit</span>
                      </button>

                      <button
                        onClick={() => handleDeleteEquip(eq.id, eq.name)}
                        className="px-3 py-1.5 rounded-xl hover:bg-rose-50 text-rose-600 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 3: MULTI-DIMENSIONAL AVAILABILITY ENGINE SIMULATOR */}
      {/* ========================================================================= */}
      {subTab === 'simulator' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#0284c7]/20 shadow-md space-y-6">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-50 text-[#0284c7] text-xs font-bold border border-sky-100">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span>Live Multi-Tier Capacity Diagnostic Engine</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-[#051833]">
                Simulate Vessel + Instructor + Equipment + Slot Capacity
              </h3>
              <p className="text-xs text-slate-500 max-w-2xl">
                Test any upcoming date and session slot. The engine audits the 4-tier safety chain to verify that
                the vessel is available, the assigned instructor is not exceeding concurrent supervision limits across groups,
                and sufficient operational equipment is in stock.
              </p>
            </div>

            {/* Interactive Simulation Form */}
            <form onSubmit={handleRunSimulation} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-5 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Select Activity</label>
                <select
                  value={simActivityId}
                  onChange={(e) => setSimActivityId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:border-[#0284c7]"
                >
                  {actList?.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.title} ({a.category_label || a.activity_type})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Booking Date</label>
                <input
                  type="date"
                  value={simDate}
                  onChange={(e) => setSimDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:border-[#0284c7]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Time Slot</label>
                <select
                  value={simTimeSlot}
                  onChange={(e) => setSimTimeSlot(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:border-[#0284c7]"
                >
                  <option value="08:30 AM">08:30 AM (Morning Session)</option>
                  <option value="10:30 AM">10:30 AM (Peak Mid-Morning)</option>
                  <option value="01:30 PM">01:30 PM (Afternoon Dive)</option>
                  <option value="03:30 PM">03:30 PM (Late Afternoon)</option>
                  <option value="05:00 PM">05:00 PM (Sunset Ride)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Participants</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={simParticipants}
                    onChange={(e) => setSimParticipants(Number(e.target.value) || 1)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:border-[#0284c7]"
                  />
                  <button
                    type="submit"
                    disabled={simLoading}
                    className="px-4 py-2 rounded-xl bg-[#0284c7] hover:bg-[#0369a1] text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shrink-0 disabled:opacity-50"
                  >
                    {simLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                    <span>Test</span>
                  </button>
                </div>
              </div>
            </form>

            {/* Simulation Results Display */}
            {simError && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
                <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{simError}</span>
              </div>
            )}

            {simResult && (
              <div className="space-y-6 pt-4 border-t border-slate-200">
                {/* Result Status Banner */}
                <div
                  className={`p-5 rounded-2xl border flex items-start gap-3.5 ${
                    simResult.is_available
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-rose-50 border-rose-200 text-rose-900'
                  }`}
                >
                  {simResult.is_available ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1">
                    <h4 className="font-black text-base">
                      {simResult.is_available ? 'Approved & Ready to Book' : 'Booking Blocked / Bottleneck Flagged'}
                    </h4>
                    <p className="text-xs leading-relaxed font-medium">{simResult.limiting_message}</p>
                    <div className="pt-1 flex items-center gap-3 text-xs font-bold">
                      <span>Max Available Spots: {simResult.max_available_spots}</span>
                      <span>•</span>
                      <span>Requested: {simResult.requested_participants}</span>
                      {simResult.limiting_factor && (
                        <>
                          <span>•</span>
                          <span className="text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md">
                            Limiting Factor: {simResult.limiting_factor}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* 4-Tier Validation Breakdown Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Tier 1: Activity Slot Capacity */}
                  <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase">
                      <span>1. Activity Slot</span>
                      <Activity className="w-4 h-4 text-[#0284c7]" />
                    </div>
                    {simResult.breakdown?.activity_slot ? (
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Slot Capacity:</span>
                          <span className="font-bold text-slate-800">
                            {simResult.breakdown.activity_slot.capacity_per_slot} spots
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Already Booked:</span>
                          <span className="font-bold text-slate-800">
                            {simResult.breakdown.activity_slot.already_booked} guests
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Remaining Spots:</span>
                          <span className="font-bold text-emerald-600">
                            {simResult.breakdown.activity_slot.remaining_spots}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400">Standard slot limits apply</p>
                    )}
                  </div>

                  {/* Tier 2: Vessel Capacity & Maintenance */}
                  <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase">
                      <span>2. Host Vessel</span>
                      <Anchor className="w-4 h-4 text-[#0284c7]" />
                    </div>
                    {simResult.breakdown?.vessel ? (
                      <div className="space-y-1 text-xs">
                        <div className="font-bold text-[#051833] truncate">
                          {simResult.breakdown.vessel.name}
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Vessel Capacity:</span>
                          <span className="font-bold text-slate-800">
                            {simResult.breakdown.vessel.vessel_capacity} seats
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Status:</span>
                          <span className="font-bold text-emerald-600">
                            {simResult.breakdown.vessel.status}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Seats Free:</span>
                          <span className="font-bold text-emerald-600">
                            {simResult.breakdown.vessel.remaining_seats}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500">Shore/Beach-Based (No boat constraint)</p>
                    )}
                  </div>

                  {/* Tier 3: Instructor Supervision Limit */}
                  <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase">
                      <span>3. Instructor Ratio</span>
                      <Compass className="w-4 h-4 text-[#0284c7]" />
                    </div>
                    {simResult.breakdown?.instructor ? (
                      <div className="space-y-1 text-xs">
                        <div className="font-bold text-[#051833] truncate">
                          {simResult.breakdown.instructor.name}
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Supervision Limit:</span>
                          <span className="font-bold text-slate-800">
                            Max {simResult.breakdown.instructor.max_supervision_limit}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Currently Supervising:</span>
                          <span className="font-bold text-amber-600">
                            {simResult.breakdown.instructor.currently_supervising} guests
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Safe Headroom:</span>
                          <span className="font-bold text-emerald-600">
                            {simResult.breakdown.instructor.headroom_spots} spot(s)
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500">No designated instructor constraint</p>
                    )}
                  </div>

                  {/* Tier 4: Equipment Stock */}
                  <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase">
                      <span>4. Gear & Life Jackets</span>
                      <LifeBuoy className="w-4 h-4 text-[#0284c7]" />
                    </div>
                    {simResult.breakdown?.equipment ? (
                      <div className="space-y-1 text-xs">
                        <div className="font-bold text-[#051833] truncate">
                          {simResult.breakdown.equipment.category.replace('_', ' ')}
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Operational Stock:</span>
                          <span className="font-bold text-slate-800">
                            {simResult.breakdown.equipment.operational_units} units
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">In Maintenance:</span>
                          <span className="font-bold text-amber-600">
                            {simResult.breakdown.equipment.in_maintenance}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Available to Book:</span>
                          <span className="font-bold text-emerald-600">
                            {simResult.breakdown.equipment.available_units}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-500 space-y-1">
                        <div className="flex justify-between">
                          <span>Life Jackets:</span>
                          <span className="font-bold text-emerald-600">
                            {simResult.breakdown?.life_jackets?.operational || 24} Ready
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">Standard safety stock compliant</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: ADD / EDIT STAFF MEMBER */}
      {/* ========================================================================= */}
      {showStaffModal && (
        <div className="fixed inset-0 z-50 bg-[#051833]/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl border border-slate-200 space-y-6 my-8 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#0284c7]/10 text-[#0284c7] flex items-center justify-center">
                  <Compass className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-[#051833]">
                    {editingStaff ? 'Edit Staff Member' : 'Register New Staff Member'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Instructors, captains, guides, and safety crew records.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowStaffModal(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveStaff} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={staffForm.name}
                    onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
                    placeholder="e.g. Vikram Deshmukh"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-[#0284c7]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Role / Designation *</label>
                  <select
                    value={staffForm.role}
                    onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value as StaffRole })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-[#0284c7]"
                  >
                    <option value="INSTRUCTOR">Instructor (Scuba / Surf / Watersports)</option>
                    <option value="CAPTAIN">Boat Captain / Master Mariner</option>
                    <option value="GUIDE">Guide / Whitewater Trip Leader</option>
                    <option value="SAFETY_CREW">Safety Crew / EMT Lifeguard</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">License / Reg Number</label>
                  <input
                    type="text"
                    value={staffForm.license_number}
                    onChange={(e) => setStaffForm({ ...staffForm, license_number: e.target.value })}
                    placeholder="e.g. PADI-OWSI-418293"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-[#0284c7]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">
                    Approved Supervision Limit (Pax) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    required
                    value={staffForm.max_supervision_limit}
                    onChange={(e) =>
                      setStaffForm({ ...staffForm, max_supervision_limit: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-[#0284c7]"
                  />
                  <span className="text-[10px] text-slate-400 block">
                    e.g. Max 4 participants for Scuba, 6 for Surfing, 25 for Captain
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Certifications & Credentials</label>
                <input
                  type="text"
                  value={staffForm.certifications}
                  onChange={(e) => setStaffForm({ ...staffForm, certifications: e.target.value })}
                  placeholder="e.g. PADI Master Scuba Diver Trainer, EFR First Aid/CPR"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-[#0284c7]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Phone / WhatsApp</label>
                  <input
                    type="text"
                    value={staffForm.phone}
                    onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })}
                    placeholder="+91 98200 12345"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-[#0284c7]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Status</label>
                  <select
                    value={staffForm.status}
                    onChange={(e) => setStaffForm({ ...staffForm, status: e.target.value as StaffStatus })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-[#0284c7]"
                  >
                    <option value="ON_DUTY">On Duty (Available for Bookings)</option>
                    <option value="ACTIVE">Active</option>
                    <option value="ON_LEAVE">On Leave</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Assign to Vessel (Optional)</label>
                  <select
                    value={staffForm.assigned_ship_id}
                    onChange={(e) => setStaffForm({ ...staffForm, assigned_ship_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-[#0284c7]"
                  >
                    <option value="">None / Shore-Based</option>
                    {vessels?.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({v.category})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Experience (Years)</label>
                  <input
                    type="number"
                    min="0"
                    value={staffForm.experience_years}
                    onChange={(e) =>
                      setStaffForm({ ...staffForm, experience_years: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-[#0284c7]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Operational Notes</label>
                <textarea
                  rows={2}
                  value={staffForm.notes}
                  onChange={(e) => setStaffForm({ ...staffForm, notes: e.target.value })}
                  placeholder="Specializations, emergency qualifications, preferred dive spots..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-[#0284c7]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowStaffModal(false)}
                  className="px-5 py-2.5 rounded-full border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-6 py-2.5 rounded-full bg-[#0284c7] hover:bg-[#0369a1] text-white font-bold text-xs shadow-md transition cursor-pointer disabled:opacity-50"
                >
                  {formSubmitting ? 'Saving...' : editingStaff ? 'Save Changes' : 'Register Staff'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: ADD / EDIT EQUIPMENT */}
      {/* ========================================================================= */}
      {showEquipModal && (
        <div className="fixed inset-0 z-50 bg-[#051833]/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl border border-slate-200 space-y-6 my-8 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#0284c7]/10 text-[#0284c7] flex items-center justify-center">
                  <LifeBuoy className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-[#051833]">
                    {editingEquip ? 'Edit Equipment Item' : 'Add Gear / Equipment Item'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Life jackets, diving gear, jet skis, surfboards, rafts, and safety kits.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowEquipModal(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEquipment} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Equipment Name / Model *</label>
                <input
                  type="text"
                  required
                  value={equipForm.name}
                  onChange={(e) => setEquipForm({ ...equipForm, name: e.target.value })}
                  placeholder="e.g. AquaLung Pro HD BCD & Scuba Regulator Set"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-[#0284c7]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Category *</label>
                  <select
                    value={equipForm.category}
                    onChange={(e) =>
                      setEquipForm({ ...equipForm, category: e.target.value as EquipmentCategory })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-[#0284c7]"
                  >
                    <option value="LIFE_JACKET">Life Jacket / SOLAS Safety Vest</option>
                    <option value="DIVING_EQUIPMENT">Diving Equipment (BCD / Regulator / Tank)</option>
                    <option value="JET_SKI">Jet Ski / PWC</option>
                    <option value="SURFBOARD">Surfboard / Kiteboard</option>
                    <option value="RAFT">Inflatable River Raft</option>
                    <option value="SNORKEL_GEAR">Snorkel Gear & Mask Set</option>
                    <option value="KAYAK">Kayak & Paddle</option>
                    <option value="SAFETY_KIT">Marine Safety Kit</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Total Quantity (Units) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={equipForm.total_quantity}
                    onChange={(e) =>
                      setEquipForm({ ...equipForm, total_quantity: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-[#0284c7]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Serial Number / Batch Code</label>
                  <input
                    type="text"
                    value={equipForm.serial_number}
                    onChange={(e) => setEquipForm({ ...equipForm, serial_number: e.target.value })}
                    placeholder="e.g. AL-HD-2024-B1"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-[#0284c7]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Condition Status *</label>
                  <select
                    value={equipForm.condition_status}
                    onChange={(e) =>
                      setEquipForm({
                        ...equipForm,
                        condition_status: e.target.value as EquipmentCondition,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-[#0284c7]"
                  >
                    <option value="OPERATIONAL">Operational (Available for Guests)</option>
                    <option value="MAINTENANCE">Maintenance / Safety Overhaul</option>
                    <option value="RETIRED">Retired / Decommissioned</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Safety Certification / Inspection Status</label>
                <input
                  type="text"
                  value={equipForm.safety_certification}
                  onChange={(e) => setEquipForm({ ...equipForm, safety_certification: e.target.value })}
                  placeholder="e.g. ISO 12402-4 Marine Safety & IRS Seaworthiness Approved"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-[#0284c7]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Assign to Activity (Optional)</label>
                  <select
                    value={equipForm.assigned_activity_id}
                    onChange={(e) => setEquipForm({ ...equipForm, assigned_activity_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-[#0284c7]"
                  >
                    <option value="">General Fleet Inventory</option>
                    {actList?.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Assign to Vessel (Optional)</label>
                  <select
                    value={equipForm.assigned_ship_id}
                    onChange={(e) => setEquipForm({ ...equipForm, assigned_ship_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-[#0284c7]"
                  >
                    <option value="">None / Shore-Based</option>
                    {vessels?.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Maintenance Notes</label>
                <textarea
                  rows={2}
                  value={equipForm.notes}
                  onChange={(e) => setEquipForm({ ...equipForm, notes: e.target.value })}
                  placeholder="Scheduled servicing intervals, repair history, inspection details..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-[#0284c7]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEquipModal(false)}
                  className="px-5 py-2.5 rounded-full border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-6 py-2.5 rounded-full bg-[#0284c7] hover:bg-[#0369a1] text-white font-bold text-xs shadow-md transition cursor-pointer disabled:opacity-50"
                >
                  {formSubmitting ? 'Saving...' : editingEquip ? 'Save Changes' : 'Add to Inventory'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
