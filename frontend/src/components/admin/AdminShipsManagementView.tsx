import React, { useState, useEffect } from 'react';
import {
  Ship,
  Search,
  Plus,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Edit3,
  Trash2,
  MapPin,
  Users,
  Anchor,
  Clock,
  ExternalLink,
  RefreshCw,
  X,
  Sparkles,
  DollarSign
} from 'lucide-react';
import {
  getAdminShips,
  adminShipAction,
  updateAdminShip,
  createAdminShip
} from '../../api/dashboards';
import { formatINR } from '../../utils/currency';

export const AdminShipsManagementView: React.FC = () => {
  const [ships, setShips] = useState<any[]>([]);
  const [stats, setStats] = useState({
    total_ships: 0,
    active_ships: 0,
    approved_ships: 0,
    pending_ships: 0,
    total_fleet_capacity: 0,
  });
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');

  // Modals
  const [editingShip, setEditingShip] = useState<any | null>(null);
  const [showAddShipModal, setShowAddShipModal] = useState(false);

  // Add Ship Form
  const defaultEmptyShip = {
    name: '',
    category: 'YACHT',
    location: '',
    address: '',
    price: '' as unknown as number,
    price_unit: 'PER_DAY',
    capacity: '' as unknown as number,
    duration_display: '',
    description: '',
    image_url: '',
    is_active: true,
  };

  const [newShipForm, setNewShipForm] = useState(defaultEmptyShip);

  const handleOpenAddShipModal = () => {
    setNewShipForm(defaultEmptyShip);
    setShowAddShipModal(true);
  };

  const fetchShips = async () => {
    setLoading(true);
    try {
      const res = await getAdminShips({
        q: searchQuery,
        category: categoryFilter,
        status: statusFilter,
        location: locationFilter,
        page_size: 500,
      });
      const sortedShips = [...(res.ships || [])].sort((a, b) => {
        const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
        if (bTime !== aTime) return bTime - aTime;
        return (Number(b.id) || 0) - (Number(a.id) || 0);
      });
      setShips(sortedShips);
      if (res.stats) {
        setStats(res.stats);
      }
    } catch (err) {
      console.error('Failed to load ships:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShips();
  }, [searchQuery, categoryFilter, statusFilter, locationFilter]);

  const handleToggleActive = async (ship: any) => {
    try {
      const res = await adminShipAction(ship.id, 'toggle_active');
      setShips((prev) =>
        prev.map((s) => (s.id === ship.id ? { ...s, is_active: !s.is_active } : s))
      );
    } catch (err: any) {
      alert(err.message || 'Failed to toggle ship active status');
    }
  };

  const handleRevokeOrApprove = async (ship: any) => {
    try {
      if (!ship.is_approved) {
        // Approve ship and mark it active
        await adminShipAction(ship.id, 'approve');
        setShips((prev) =>
          prev.map((s) => (s.id === ship.id ? { ...s, is_approved: true, is_active: true } : s))
        );
      } else if (ship.is_active) {
        // Revoke hone par approval me changes nahi, active me unactive hona chahiye!
        await adminShipAction(ship.id, 'revoke');
        setShips((prev) =>
          prev.map((s) => (s.id === ship.id ? { ...s, is_active: false } : s))
        );
      } else {
        // Vessel is approved but inactive, clicking reactivates it
        await adminShipAction(ship.id, 'toggle_active');
        setShips((prev) =>
          prev.map((s) => (s.id === ship.id ? { ...s, is_active: true } : s))
        );
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update vessel status');
    }
  };

  const handleDeleteShip = async (shipId: number, shipName: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete vessel "${shipName}"?`)) return;
    try {
      await adminShipAction(shipId, 'delete');
      setShips((prev) => prev.filter((s) => s.id !== shipId));
    } catch (err: any) {
      alert(err.message || 'Failed to delete ship');
    }
  };

  const handleSaveEditShip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingShip) return;
    try {
      await updateAdminShip(editingShip.id, editingShip);
      setShips((prev) =>
        prev.map((s) => (s.id === editingShip.id ? { ...s, ...editingShip } : s))
      );
      setEditingShip(null);
    } catch (err: any) {
      alert(err.message || 'Failed to update ship specifications');
    }
  };

  const handleCreateShip = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...newShipForm,
        location: newShipForm.location || 'Goa',
        price: newShipForm.price ? Number(newShipForm.price) : 25000,
        capacity: newShipForm.capacity ? Number(newShipForm.capacity) : 20,
      };
      const res = await createAdminShip(payload as any);
      if (res.success) {
        setNewShipForm(defaultEmptyShip);
        setShowAddShipModal(false);
        fetchShips();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to create vessel');
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. FLEET METRICS & KPI DOCK */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <div className="spatial-card p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Fleet</span>
            <Ship className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono-numbers">{stats.total_ships}</div>
          <p className="text-[10px] text-slate-400">All registered vessels</p>
        </div>

        <div className="spatial-card p-4 rounded-2xl bg-white border border-emerald-100 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-emerald-700">
            <span className="text-[11px] font-bold uppercase tracking-wider">Active Ships</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600 font-mono-numbers">{stats.active_ships}</div>
          <p className="text-[10px] text-emerald-600/80 font-medium">Ready for trip bookings</p>
        </div>

        <div className="spatial-card p-4 rounded-2xl bg-white border border-sky-100 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-sky-700">
            <span className="text-[11px] font-bold uppercase tracking-wider">Approved</span>
            <Anchor className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-black text-sky-700 font-mono-numbers">{stats.approved_ships}</div>
          <p className="text-[10px] text-slate-400">Safety & seaworthy certified</p>
        </div>

        <div className="spatial-card p-4 rounded-2xl bg-white border border-amber-100 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-amber-700">
            <span className="text-[11px] font-bold uppercase tracking-wider">Pending Audit</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-600 font-mono-numbers">{stats.pending_ships}</div>
          <p className="text-[10px] text-amber-700 font-medium">Awaiting inspection</p>
        </div>

        <div className="spatial-card p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Fleet Capacity</span>
            <Users className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-indigo-700 font-mono-numbers">{stats.total_fleet_capacity}</div>
          <p className="text-[10px] text-slate-400">Total guest passenger berths</p>
        </div>
      </div>

      {/* 2. TOOLBAR WITH SEARCH, CATEGORY, STATUS & ADD BUTTON */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            <input
              type="text"
              placeholder="Search ship by name, port location, or operator..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-300 text-xs bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white text-slate-700 focus:outline-none"
          >
            <option value="">All Categories</option>
            <option value="YACHT">Private Yacht</option>
            <option value="Luxury Ocean Cruise">Ocean Cruise Ship</option>
            <option value="RIVER_CRUISE">River Cruise</option>
            <option value="BOAT">Private Boat</option>
            <option value="PARTY_BOAT">Party Boat</option>
            <option value="FERRY">Passenger Ferry</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white text-slate-700 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active Only</option>
            <option value="INACTIVE">Inactive Only</option>
            <option value="APPROVED">Approved Only</option>
            <option value="PENDING">Pending Review</option>
          </select>

          <button
            onClick={() => {
              setSearchQuery('');
              setCategoryFilter('');
              setStatusFilter('');
              setLocationFilter('');
              fetchShips();
            }}
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            title="Reset Filters"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleOpenAddShipModal}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Vessel</span>
          </button>
        </div>
      </div>

      {/* 3. SHIPS FLEET TABLE */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Ship & Vessel</th>
                <th className="py-3 px-4">Operator / Owner</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Home Port</th>
                <th className="py-3 px-4">Capacity</th>
                <th className="py-3 px-4">Charter Rate (₹)</th>
                <th className="py-3 px-4">Approval</th>
                <th className="py-3 px-4">Active</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-sky-600" />
                    Loading fleet records...
                  </td>
                </tr>
              ) : ships.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No ships found matching your filters.
                  </td>
                </tr>
              ) : (
                ships.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={s.image_url}
                          alt={s.name}
                          className="w-12 h-10 object-cover rounded-xl border border-slate-200 shrink-0 shadow-xs"
                          onError={(e: any) => {
                            e.target.src = 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=400&q=80';
                          }}
                        />
                        <div>
                          <div className="font-bold text-slate-900 text-sm font-serif line-clamp-1">{s.name}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{s.duration_display}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800 text-xs">{s.operator_name || s.owner_name}</div>
                      {s.owner_email && (
                        <div className="text-[10px] text-slate-400">{s.owner_email}</div>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-50 text-sky-800 border border-sky-200">
                        {s.category}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1 text-slate-700 font-medium">
                        <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                        <span>{s.location}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4 font-semibold text-slate-800">
                      {s.display_capacity_text || `${s.capacity} Guests`}
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-black text-slate-900 font-mono-numbers">
                        {s.is_quote_based ? 'On Request' : formatINR(s.price)}
                      </div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase">{s.price_unit}</div>
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          s.is_approved
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {s.is_approved ? 'Approved' : 'Pending'}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          s.is_active
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {s.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                      {/* Edit Specs */}
                      <button
                        onClick={() => setEditingShip({ ...s })}
                        className="px-2.5 py-1 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 font-bold text-[11px] cursor-pointer transition border border-sky-200"
                        title="Edit Vessel Specifications"
                      >
                        <Edit3 className="w-3 h-3 inline mr-1" />
                        Edit
                      </button>

                      {/* Approve / Revoke */}
                      {!s.is_approved ? (
                        <button
                          onClick={() => handleRevokeOrApprove(s)}
                          className="px-2 py-1 rounded-lg font-bold text-[11px] cursor-pointer transition border bg-emerald-500 text-white hover:bg-emerald-600"
                          title="Approve Vessel"
                        >
                          Approve
                        </button>
                      ) : (
                        <button
                          onClick={() => handleRevokeOrApprove(s)}
                          className={`px-2 py-1 rounded-lg font-bold text-[11px] cursor-pointer transition border ${
                            s.is_active
                              ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                              : 'bg-slate-100 text-slate-500 border-slate-300 hover:bg-slate-200'
                          }`}
                          title={s.is_active ? 'Revoke Vessel (Set Inactive)' : 'Vessel Revoked (Inactive) - Click to Reactivate'}
                        >
                          {s.is_active ? 'Revoke' : 'Revoked'}
                        </button>
                      )}

                      {/* Activate / Deactivate */}
                      <button
                        onClick={() => handleToggleActive(s)}
                        className={`px-2 py-1 rounded-lg font-bold text-[11px] cursor-pointer transition border ${
                          s.is_active
                            ? 'border-slate-300 text-slate-700 hover:bg-slate-100'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-300'
                        }`}
                      >
                        {s.is_active ? 'Pause' : 'Activate'}
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => handleDeleteShip(s.id, s.name)}
                        className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-700 cursor-pointer transition"
                        title="Delete Vessel"
                      >
                        <Trash2 className="w-3.5 h-3.5 inline" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. EDIT SHIP MODAL */}
      {editingShip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                <Ship className="w-5 h-5 text-sky-600" />
                <span>Edit Vessel Specifications</span>
              </h3>
              <button onClick={() => setEditingShip(null)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditShip} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">Vessel Name</label>
                <input
                  type="text"
                  required
                  value={editingShip.name}
                  onChange={(e) => setEditingShip({ ...editingShip, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white font-serif"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">Category</label>
                  <select
                    value={editingShip.category}
                    onChange={(e) => setEditingShip({ ...editingShip, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                  >
                    <option value="YACHT">Private Yacht</option>
                    <option value="Luxury Ocean Cruise">Luxury Ocean Cruise</option>
                    <option value="RIVER_CRUISE">River Cruise</option>
                    <option value="BOAT">Private Boat</option>
                    <option value="PARTY_BOAT">Party Boat</option>
                    <option value="FERRY">Passenger Ferry</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">Base Port Location</label>
                  <input
                    type="text"
                    required
                    value={editingShip.location}
                    onChange={(e) => setEditingShip({ ...editingShip, location: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">Starting Rate (₹)</label>
                  <input
                    type="number"
                    required
                    value={editingShip.price}
                    onChange={(e) => setEditingShip({ ...editingShip, price: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">Price Unit</label>
                  <select
                    value={editingShip.price_unit}
                    onChange={(e) => setEditingShip({ ...editingShip, price_unit: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                  >
                    <option value="PER_HOUR">Per Hour</option>
                    <option value="PER_DAY">Per Day</option>
                    <option value="PER_BOAT">Per Boat / Hire</option>
                    <option value="PER_PERSON">Per Person</option>
                    <option value="PER_CABIN">Per Cabin</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">Max Capacity</label>
                  <input
                    type="number"
                    required
                    value={editingShip.capacity}
                    onChange={(e) => setEditingShip({ ...editingShip, capacity: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">Duration Tag</label>
                <input
                  type="text"
                  value={editingShip.duration_display}
                  onChange={(e) => setEditingShip({ ...editingShip, duration_display: e.target.value })}
                  placeholder="e.g. 2 Hours, Full Day, 3 Nights"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">Image URL</label>
                <input
                  type="url"
                  value={editingShip.image_url}
                  onChange={(e) => setEditingShip({ ...editingShip, image_url: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">Overview & Features</label>
                <textarea
                  rows={3}
                  value={editingShip.description}
                  onChange={(e) => setEditingShip({ ...editingShip, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                />
              </div>

              <div className="flex items-center gap-6 pt-1">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingShip.is_active}
                    onChange={(e) => setEditingShip({ ...editingShip, is_active: e.target.checked })}
                    className="w-4 h-4 rounded text-sky-600"
                  />
                  <span>Active & Bookable</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingShip.is_approved}
                    onChange={(e) => setEditingShip({ ...editingShip, is_approved: e.target.checked })}
                    className="w-4 h-4 rounded text-emerald-600"
                  />
                  <span>Approved for Public Exhibition</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingShip(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 cursor-pointer shadow-sm"
                >
                  Save Vessel Specs
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. ADD NEW SHIP MODAL */}
      {showAddShipModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-sky-600" />
                <span>Register New Fleet Vessel</span>
              </h3>
              <button onClick={() => setShowAddShipModal(false)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateShip} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">Vessel / Ship Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cordelia Empress or Sea Pearl Yacht"
                  value={newShipForm.name}
                  onChange={(e) => setNewShipForm({ ...newShipForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white font-serif"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">Category</label>
                  <select
                    value={newShipForm.category}
                    onChange={(e) => setNewShipForm({ ...newShipForm, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                  >
                    <option value="YACHT">Private Yacht</option>
                    <option value="Luxury Ocean Cruise">Luxury Ocean Cruise</option>
                    <option value="RIVER_CRUISE">River Cruise</option>
                    <option value="BOAT">Private Boat</option>
                    <option value="PARTY_BOAT">Party Boat</option>
                    <option value="FERRY">Passenger Ferry</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">Base Port Location</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Goa, Mumbai, Kochi, Andaman"
                    value={newShipForm.location}
                    onChange={(e) => setNewShipForm({ ...newShipForm, location: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">Starting Rate (₹)</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 25000"
                    value={newShipForm.price ?? ''}
                    onChange={(e) => setNewShipForm({ ...newShipForm, price: e.target.value === '' ? ('' as any) : Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">Price Unit</label>
                  <select
                    value={newShipForm.price_unit}
                    onChange={(e) => setNewShipForm({ ...newShipForm, price_unit: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                  >
                    <option value="PER_HOUR">Per Hour</option>
                    <option value="PER_DAY">Per Day</option>
                    <option value="PER_BOAT">Per Boat / Whole Vessel</option>
                    <option value="PER_PERSON">Per Person</option>
                    <option value="PER_CABIN">Per Cabin</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">Max Capacity</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 12"
                    value={newShipForm.capacity ?? ''}
                    onChange={(e) => setNewShipForm({ ...newShipForm, capacity: e.target.value === '' ? ('' as any) : Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">Duration Tag</label>
                <input
                  type="text"
                  placeholder="e.g. 2 Hours, Full Day, 3 Nights"
                  value={newShipForm.duration_display}
                  onChange={(e) => setNewShipForm({ ...newShipForm, duration_display: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">High-Res Image URL</label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/photo-xxx..."
                  value={newShipForm.image_url}
                  onChange={(e) => setNewShipForm({ ...newShipForm, image_url: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">Description & Amenities</label>
                <textarea
                  rows={3}
                  placeholder="Vessel specifications, onboard amenities, and highlights..."
                  value={newShipForm.description}
                  onChange={(e) => setNewShipForm({ ...newShipForm, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddShipModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 cursor-pointer shadow-sm"
                >
                  Register Ship to Fleet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
