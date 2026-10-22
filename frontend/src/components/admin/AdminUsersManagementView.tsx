import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  CheckCircle2,
  XCircle,
  Shield,
  ShieldAlert,
  AlertTriangle,
  UserCheck,
  UserX,
  Edit3,
  Eye,
  Mail,
  Phone,
  Calendar,
  IndianRupee,
  BadgeCheck,
  Send,
  X,
  RefreshCw,
  Clock,
  Filter
} from 'lucide-react';
import {
  getAdminUsers,
  toggleAdminUserActive,
  adminVerifyUser,
  updateAdminUser,
  getAdminUserDetails
} from '../../api/dashboards';
import { formatINR } from '../../utils/currency';

interface AdminUsersManagementViewProps {
  onDirectNotifyUser?: (userId: number, userName: string) => void;
  onTotalUsersCountChange?: (count: number) => void;
}

export const AdminUsersManagementView: React.FC<AdminUsersManagementViewProps> = ({
  onDirectNotifyUser,
  onTotalUsersCountChange
}) => {
  const [users, setUsers] = useState<any[]>([]);
  const [stats, setStats] = useState({
    total_users: 0,
    verified_users: 0,
    active_users: 0,
    blocked_users: 0,
    total_customers: 0,
    total_owners: 0,
  });
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [verifiedFilter, setVerifiedFilter] = useState('');

  // Selected User Modal
  const [selectedUserModal, setSelectedUserModal] = useState<any | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    whatsapp_number: '',
    role: 'USER',
  });

  // Block Modal
  const [blockUserTarget, setBlockUserTarget] = useState<any | null>(null);
  const [blockReason, setBlockReason] = useState('');

  // View Mode & Rows per Page (defaults to 500 = All)
  const [rowsPerPage, setRowsPerPage] = useState<number>(500);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await getAdminUsers({
        q: searchQuery,
        role: roleFilter,
        status: statusFilter,
        verified: verifiedFilter,
        page_size: 500,
      });
      const sortedUsers = [...(res.users || [])].sort((a, b) => {
        const aIso = a.date_joined_iso || a.date_joined;
        const bIso = b.date_joined_iso || b.date_joined;
        const aDate = aIso ? new Date(aIso).getTime() : 0;
        const bDate = bIso ? new Date(bIso).getTime() : 0;
        if (bDate !== aDate) return bDate - aDate;
        return (Number(b.id) || 0) - (Number(a.id) || 0);
      });
      setUsers(sortedUsers);
      setCurrentPage(1);
      if (res.stats) {
        setStats(res.stats);
        if (onTotalUsersCountChange && typeof res.stats.total_users === 'number') {
          onTotalUsersCountChange(res.stats.total_users);
        }
      }
    } catch (err) {
      console.error('Failed to load admin users:', err);
    } finally {
      setLoading(false);
    }
  };

  const isAllRows = rowsPerPage >= users.length || rowsPerPage === 500;
  const totalPages = isAllRows ? 1 : Math.max(1, Math.ceil(users.length / rowsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = isAllRows ? 0 : (safePage - 1) * rowsPerPage;
  const endIndex = isAllRows ? users.length : Math.min(startIndex + rowsPerPage, users.length);
  const visibleUsers = users.slice(startIndex, endIndex);

  useEffect(() => {
    fetchUsers();
  }, [searchQuery, roleFilter, statusFilter, verifiedFilter]);

  const handleToggleVerify = async (user: any) => {
    try {
      const res = await adminVerifyUser(user.id);
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, is_verified: res.is_verified } : u))
      );
      if (selectedUserModal?.id === user.id) {
        setSelectedUserModal((prev: any) => ({ ...prev, is_verified: res.is_verified }));
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update verification status');
    }
  };

  const handleOpenBlockModal = (user: any) => {
    if (user.is_active) {
      setBlockUserTarget(user);
      setBlockReason('');
    } else {
      // Unblock directly
      handleUnblockUser(user.id);
    }
  };

  const handleConfirmBlock = async () => {
    if (!blockUserTarget) return;
    try {
      const res = await toggleAdminUserActive(
        blockUserTarget.id,
        'block',
        blockReason || 'Account suspended by platform admin'
      );
      setUsers((prev) =>
        prev.map((u) =>
          u.id === blockUserTarget.id
            ? { ...u, is_active: false, block_reason: res.block_reason || blockReason }
            : u
        )
      );
      if (selectedUserModal?.id === blockUserTarget.id) {
        setSelectedUserModal((prev: any) => ({
          ...prev,
          is_active: false,
          block_reason: res.block_reason || blockReason,
        }));
      }
      setBlockUserTarget(null);
    } catch (err: any) {
      alert(err.message || 'Failed to block user');
    }
  };

  const handleUnblockUser = async (userId: number) => {
    try {
      const res = await toggleAdminUserActive(userId, 'unblock');
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, is_active: true, block_reason: '' } : u))
      );
      if (selectedUserModal?.id === userId) {
        setSelectedUserModal((prev: any) => ({ ...prev, is_active: true, block_reason: '' }));
      }
    } catch (err: any) {
      alert(err.message || 'Failed to unblock user');
    }
  };

  const handleInspectUser = async (user: any) => {
    setModalLoading(true);
    setIsEditing(false);
    setSelectedUserModal(user);
    try {
      const res = await getAdminUserDetails(user.id);
      if (res.user) {
        setSelectedUserModal(res.user);
        setEditForm({
          full_name: res.user.full_name || '',
          email: res.user.email || '',
          phone: res.user.phone || '',
          whatsapp_number: res.user.whatsapp_number || '',
          role: res.user.role || 'USER',
        });
      }
    } catch (err) {
      console.error('Failed to load user full details:', err);
    } finally {
      setModalLoading(false);
    }
  };

  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserModal) return;
    try {
      const res = await updateAdminUser(selectedUserModal.id, editForm);
      if (res.success) {
        setUsers((prev) =>
          prev.map((u) => (u.id === selectedUserModal.id ? { ...u, ...res.user } : u))
        );
        setSelectedUserModal((prev: any) => ({ ...prev, ...res.user }));
        setIsEditing(false);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update user profile');
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. USER METRICS & KPI CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="spatial-card p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Users</span>
            <Users className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono-numbers">{stats.total_users}</div>
          <p className="text-[10px] text-slate-400">All registered accounts</p>
        </div>

        <div className="spatial-card p-4 rounded-2xl bg-white border border-emerald-100 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-emerald-700">
            <span className="text-[11px] font-bold uppercase tracking-wider">KYC Verified</span>
            <BadgeCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600 font-mono-numbers">{stats.verified_users}</div>
          <p className="text-[10px] text-emerald-600/80 font-medium">Verified passengers & hosts</p>
        </div>

        <div className="spatial-card p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-sky-700">
            <span className="text-[11px] font-bold uppercase tracking-wider">Active</span>
            <UserCheck className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-black text-sky-700 font-mono-numbers">{stats.active_users}</div>
          <p className="text-[10px] text-slate-400">Can log in & book trips</p>
        </div>

        <div className="spatial-card p-4 rounded-2xl bg-white border border-rose-100 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-rose-700">
            <span className="text-[11px] font-bold uppercase tracking-wider">Blocked</span>
            <UserX className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-600 font-mono-numbers">{stats.blocked_users}</div>
          <p className="text-[10px] text-rose-500 font-medium">Suspended access</p>
        </div>

        <div className="spatial-card p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Passengers</span>
            <Users className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-indigo-700 font-mono-numbers">{stats.total_customers}</div>
          <p className="text-[10px] text-slate-400">Regular booking guests</p>
        </div>

        <div className="spatial-card p-4 rounded-2xl bg-white border border-indigo-100 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-indigo-700">
            <span className="text-[11px] font-bold uppercase tracking-wider">KYC Verified</span>
            <Shield className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-indigo-700 font-mono-numbers">{stats.verified_users || 0}</div>
          <p className="text-[10px] text-indigo-600/80 font-medium">Verified passenger profiles</p>
        </div>
      </div>

      {/* 2. HEADER & SEARCH / FILTER TOOLBAR */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by name, email, phone, or @username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-300 text-xs bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white text-slate-700 focus:outline-none"
          >
            <option value="">All Passenger Roles</option>
            <option value="USER">Standard Passenger</option>
            <option value="CUSTOMER">Customer Account</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white text-slate-700 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active Accounts</option>
            <option value="BLOCKED">Blocked / Suspended</option>
          </select>

          <select
            value={verifiedFilter}
            onChange={(e) => setVerifiedFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white text-slate-700 focus:outline-none"
          >
            <option value="">All Verification</option>
            <option value="VERIFIED">KYC Verified Only</option>
            <option value="UNVERIFIED">Unverified Only</option>
          </select>

          {/* Rows per page selector */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-[11px] font-bold text-slate-700">
            <span className="text-[10px] text-slate-500 pl-1.5 uppercase font-black">Rows:</span>
            {[
              { label: 'All', value: 500 },
              { label: '25', value: 25 },
              { label: '50', value: 50 },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setRowsPerPage(opt.value);
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer font-bold ${
                  rowsPerPage === opt.value
                    ? 'bg-[#0284c7] text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                {opt.label === 'All' ? `All (${users.length || stats.total_users})` : opt.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              setSearchQuery('');
              setRoleFilter('');
              setStatusFilter('');
              setVerifiedFilter('');
              setRowsPerPage(500);
              setCurrentPage(1);
              fetchUsers();
            }}
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            title="Reset Filters"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* DIRECTORY STATUS & REAL-TIME COUNTER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-[#102B46]">
            Total Users: <strong className="text-[#0284c7] font-black">{stats.total_users || users.length}</strong>
          </span>
          <span className="text-slate-300">•</span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {isAllRows
              ? `All ${users.length} Registered Users Visible Together (Full List Loaded)`
              : `Showing ${startIndex + 1}–${endIndex} of ${users.length} Users`}
          </span>
        </div>

        {!isAllRows && totalPages > 1 && (
          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-700 disabled:opacity-40 font-bold hover:bg-slate-50 cursor-pointer text-xs"
            >
              Previous
            </button>
            <span className="text-xs font-semibold text-slate-600 px-1">
              Page {safePage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-700 disabled:opacity-40 font-bold hover:bg-slate-50 cursor-pointer text-xs"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* 3. USERS DIRECTORY TABLE */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px] sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="py-3 px-3 w-12 text-slate-400 text-center whitespace-nowrap">#</th>
                <th className="py-3 px-4 whitespace-nowrap">User Account</th>
                <th className="py-3 px-4 whitespace-nowrap">Contact Info</th>
                <th className="py-3 px-4 whitespace-nowrap">Role</th>
                <th className="py-3 px-4 whitespace-nowrap">KYC Verification</th>
                <th className="py-3 px-4 whitespace-nowrap">Account Status</th>
                <th className="py-3 px-4 whitespace-nowrap">Bookings & Spend</th>
                <th className="py-3 px-4 whitespace-nowrap">Joined Date</th>
                <th className="py-3 px-4 text-right whitespace-nowrap min-w-[280px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-sky-600" />
                    Loading user records...
                  </td>
                </tr>
              ) : visibleUsers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No users match the search criteria.
                  </td>
                </tr>
              ) : (
                visibleUsers.map((u, idx) => {
                  const rowNum = startIndex + idx + 1;
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`font-mono text-[11px] font-bold px-1.5 py-0.5 rounded ${
                            rowNum === 1
                              ? 'bg-sky-100 text-sky-800 border border-sky-300 shadow-xs'
                              : 'text-slate-400'
                          }`}
                        >
                          #{rowNum}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-sm">
                          {(u.full_name || u.username)[0]?.toUpperCase() || 'U'}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                            <span>{u.full_name}</span>
                            {u.is_verified && (
                              <span title="KYC Verified">
                                <BadgeCheck className="w-3.5 h-3.5 text-emerald-500 fill-emerald-50 shrink-0" />
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">@{u.username}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="space-y-0.5">
                        <div className="text-slate-700 flex items-center gap-1">
                          <Mail className="w-3 h-3 text-slate-400" />
                          <span>{u.email}</span>
                        </div>
                        {u.phone && (
                          <div className="text-[11px] text-slate-500 flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{u.phone}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          u.role === 'ADMIN'
                            ? 'bg-rose-100 text-rose-800'
                            : u.role === 'OWNER'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-800'
                        }`}
                      >
                        {u.role === 'USER' ? 'Passenger' : u.role}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      {u.is_verified ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-[10px] font-medium">
                          <Clock className="w-3 h-3 text-slate-400" />
                          Unverified
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      {u.is_active ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Active
                        </span>
                      ) : (
                        <div>
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold">
                            <XCircle className="w-3 h-3 text-rose-600" />
                            Blocked
                          </span>
                          {u.block_reason && (
                            <p className="text-[10px] text-rose-600 mt-0.5 max-w-[140px] truncate" title={u.block_reason}>
                              {u.block_reason}
                            </p>
                          )}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{u.bookings_count} Bookings</div>
                      <div className="text-[11px] font-mono font-bold text-emerald-700">
                        {formatINR(u.total_spent || 0)}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px] whitespace-nowrap">{u.date_joined}</td>

                    <td className="py-3 px-4 text-right whitespace-nowrap min-w-[280px]">
                      <div className="inline-flex items-center justify-end gap-1.5 whitespace-nowrap">
                        {/* Manage / Inspect */}
                        <button
                          onClick={() => handleInspectUser(u)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 font-bold text-[11px] cursor-pointer transition border border-sky-200 shadow-xs shrink-0"
                          title="View Full Profile & Bookings"
                        >
                          <Eye className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                          <span>Manage</span>
                        </button>

                        {/* Verify / Revoke */}
                        <button
                          onClick={() => handleToggleVerify(u)}
                          className={`inline-flex items-center justify-center px-3 py-1.5 rounded-lg font-bold text-[11px] cursor-pointer transition border shadow-xs shrink-0 ${
                            u.is_verified
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                              : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100 hover:text-slate-900'
                          }`}
                          title={u.is_verified ? 'Revoke KYC Verification' : 'Verify KYC Status'}
                        >
                          <span>{u.is_verified ? 'Revoke' : 'Verify'}</span>
                        </button>

                        {/* Block / Unblock */}
                        {!u.is_superuser && (
                          <button
                            onClick={() => handleOpenBlockModal(u)}
                            className={`inline-flex items-center justify-center px-3 py-1.5 rounded-lg font-bold text-[11px] cursor-pointer transition border shadow-xs shrink-0 ${
                              u.is_active
                                ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                                : 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700'
                            }`}
                            title={u.is_active ? 'Block & Suspend Account' : 'Unblock Account'}
                          >
                            <span>{u.is_active ? 'Block' : 'Unblock'}</span>
                          </button>
                        )}

                        {/* Send Direct Notification */}
                        {onDirectNotifyUser && (
                          <button
                            onClick={() => onDirectNotifyUser(u.id, u.full_name || u.username)}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-indigo-600 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 hover:text-indigo-800 cursor-pointer transition shadow-xs shrink-0"
                            title="Send Direct Notification / Offer to this User"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
            </tbody>
          </table>
        </div>

        {/* Table Footer with all users count & status */}
        <div className="px-6 py-4 bg-[#F8FCFF] border-t border-[#082F5B]/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[#102B46]/70 font-medium">
              Showing <strong className="text-[#082F5B] font-black">{visibleUsers.length}</strong> of{' '}
              <strong className="text-[#082F5B] font-black">{stats.total_users || users.length}</strong> registered user accounts
            </span>
            {!isAllRows && (
              <button
                type="button"
                onClick={() => {
                  setRowsPerPage(500);
                  setCurrentPage(1);
                }}
                className="text-xs text-[#0284c7] font-bold hover:underline cursor-pointer ml-1"
              >
                (Show All {users.length})
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {isAllRows ? 'All Users Visible on 1 Page' : `Page ${safePage} of ${totalPages}`}
            </span>
            {!isAllRows && totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-700 disabled:opacity-40 font-bold hover:bg-slate-50 cursor-pointer text-xs"
                >
                  Prev
                </button>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-700 disabled:opacity-40 font-bold hover:bg-slate-50 cursor-pointer text-xs"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. USER DETAILS & MANAGE MODAL */}
      {selectedUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-600 text-white font-black text-base flex items-center justify-center shadow-md">
                  {(selectedUserModal.full_name || selectedUserModal.username)[0]?.toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-900 flex items-center gap-1.5">
                    <span>{selectedUserModal.full_name}</span>
                    {selectedUserModal.is_verified && (
                      <BadgeCheck className="w-4 h-4 text-emerald-500 fill-emerald-50" />
                    )}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">@{selectedUserModal.username}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 flex items-center gap-1 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  {isEditing ? 'Cancel Edit' : 'Edit Profile'}
                </button>
                <button
                  onClick={() => setSelectedUserModal(null)}
                  className="p-1 rounded-xl text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Quick Status Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Role</span>
                <span className="font-bold text-slate-800 uppercase">{selectedUserModal.role}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Verification</span>
                <span className={`font-bold ${selectedUserModal.is_verified ? 'text-emerald-600' : 'text-slate-600'}`}>
                  {selectedUserModal.is_verified ? 'Verified (KYC)' : 'Unverified'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Account Access</span>
                <span className={`font-bold ${selectedUserModal.is_active ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {selectedUserModal.is_active ? 'Active' : 'Blocked'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Spent</span>
                <span className="font-bold font-mono text-emerald-700">
                  {formatINR(selectedUserModal.total_spent || 0)}
                </span>
              </div>
            </div>

            {/* EDIT USER FORM */}
            {isEditing ? (
              <form onSubmit={handleSaveEditUser} className="space-y-4 p-4 rounded-2xl border border-sky-100 bg-sky-50/30">
                <h4 className="font-bold text-xs uppercase tracking-wider text-sky-900">Edit User Details</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Full Name</label>
                    <input
                      type="text"
                      value={editForm.full_name}
                      onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Email</label>
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Phone Number</label>
                    <input
                      type="text"
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Platform Role</label>
                    <select
                      value={editForm.role}
                      onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                    >
                      <option value="USER">Customer (Passenger)</option>
                      <option value="OWNER">Ship Owner / Operator</option>
                      <option value="ADMIN">Platform Administrator</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 cursor-pointer shadow-sm"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            ) : null}

            {/* RECENT BOOKINGS BY THIS USER */}
            <div className="space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500">
                Booking History ({selectedUserModal.bookings?.length || 0})
              </h4>
              {modalLoading ? (
                <div className="py-6 text-center text-slate-400 text-xs">
                  <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-1 text-sky-600" />
                  Loading bookings...
                </div>
              ) : selectedUserModal.bookings && selectedUserModal.bookings.length > 0 ? (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {selectedUserModal.bookings.map((b: any) => (
                    <div
                      key={b.id}
                      className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs hover:bg-white transition"
                    >
                      <div>
                        <div className="font-bold text-slate-900 flex items-center gap-2">
                          <span className="font-mono text-sky-700">#{b.booking_id}</span>
                          <span>•</span>
                          <span>{b.cruise_name || b.cruise_title}</span>
                        </div>
                        <div className="text-slate-500 text-[11px] mt-0.5">
                          Date: {b.booking_date} | {b.booking_type === 'EVENT' ? 'Private Charter' : 'Public Tour'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-black text-slate-900 font-mono-numbers">{formatINR(b.total_price)}</div>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            b.status === 'CONFIRMED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : b.status === 'COMPLETED'
                              ? 'bg-sky-100 text-sky-800'
                              : b.status === 'CANCELLED'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {b.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No bookings recorded for this user.</p>
              )}
            </div>

            {/* ACTION BUTTONS FOOTER */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggleVerify(selectedUserModal)}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs border cursor-pointer ${
                    selectedUserModal.is_verified
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                      : 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  {selectedUserModal.is_verified ? 'Revoke KYC Verification' : 'Mark as KYC Verified'}
                </button>

                {!selectedUserModal.is_superuser && (
                  <button
                    onClick={() => handleOpenBlockModal(selectedUserModal)}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs border cursor-pointer ${
                      selectedUserModal.is_active
                        ? 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100'
                        : 'bg-emerald-500 text-white hover:bg-emerald-600'
                    }`}
                  >
                    {selectedUserModal.is_active ? 'Block Account' : 'Unblock Account'}
                  </button>
                )}
              </div>

              {onDirectNotifyUser && (
                <button
                  onClick={() => {
                    const u = selectedUserModal;
                    setSelectedUserModal(null);
                    onDirectNotifyUser(u.id, u.full_name || u.username);
                  }}
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Send className="w-3.5 h-3.5" />
                  Send Notification Directly
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 5. BLOCK REASON CONFIRMATION MODAL */}
      {blockUserTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">Block User Account</h3>
                <p className="text-xs text-slate-500">Suspend access for @{blockUserTarget.username}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              When blocked, this user cannot place cruise charter requests, book tour tickets, or sign in to their account.
            </p>

            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">
                Reason for Suspension
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Chargeback dispute, multiple payment failures, violation of passenger safety rules..."
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setBlockUserTarget(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmBlock}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer shadow-sm shadow-rose-600/30"
              >
                Confirm Block
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
