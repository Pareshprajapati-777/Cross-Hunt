import React, { useState, useEffect } from 'react';
import {
  Waves,
  Search,
  Ticket,
  Calendar,
  Clock,
  MapPin,
  Users,
  Anchor,
  CheckCircle2,
  XCircle,
  Eye,
  RefreshCw,
  ExternalLink,
  Sparkles,
  AlertTriangle,
  X,
  Compass,
  ArrowRight
} from 'lucide-react';
import { getAdminTours, adminTourAction, AdminTourFilterParams } from '../../api/dashboards';
import { PublicTour } from '../../api/types';
import { formatINR } from '../../utils/currency';
import { getTourImageUrl } from '../../utils/images';

export const AdminToursManagementView: React.FC = () => {
  const [tours, setTours] = useState<PublicTour[]>([]);
  const [stats, setStats] = useState({
    total_tours: 22,
    published_tours: 22,
    total_capacity: 0,
    remaining_capacity: 0,
    avg_ticket_price: 0,
  });
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [portFilter, setPortFilter] = useState('');
  const [destinationFilter, setDestinationFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Tour Detail Modal
  const [selectedTour, setSelectedTour] = useState<PublicTour | null>(null);

  const fetchTours = async () => {
    setLoading(true);
    try {
      const params: AdminTourFilterParams = {
        q: searchQuery || undefined,
        departure_port: portFilter || undefined,
        destination: destinationFilter || undefined,
        status: statusFilter || undefined,
      };
      const res = await getAdminTours(params);
      const sortedTours = [...(res.tours || [])].sort((a: any, b: any) => {
        const aTime = (a as any).created_at ? new Date((a as any).created_at).getTime() : 0;
        const bTime = (b as any).created_at ? new Date((b as any).created_at).getTime() : 0;
        if (bTime !== aTime) return bTime - aTime;
        return (Number(b.id) || 0) - (Number(a.id) || 0);
      });
      setTours(sortedTours);
      if (res.stats) {
        setStats(res.stats);
      } else {
        const publishedCount = (res.tours || []).filter((t) => t.is_published).length;
        const totalCap = (res.tours || []).reduce((acc, t) => acc + (t.total_capacity || 0), 0);
        const remCap = (res.tours || []).reduce((acc, t) => acc + (t.remaining_capacity || 0), 0);
        const avgPrice = res.tours && res.tours.length > 0
          ? res.tours.reduce((acc, t) => acc + (t.adult_price || 0), 0) / res.tours.length
          : 0;
        setStats({
          total_tours: res.tours?.length || 0,
          published_tours: publishedCount,
          total_capacity: totalCap,
          remaining_capacity: remCap,
          avg_ticket_price: Math.round(avgPrice),
        });
      }
    } catch (err) {
      console.error('Failed to load public tours:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTours();
  }, [searchQuery, portFilter, destinationFilter, statusFilter]);

  const handleTogglePublish = async (tourId: number) => {
    try {
      const res = await adminTourAction(tourId, 'toggle_publish');
      if (res.success) {
        setTours((prev) =>
          prev.map((t) => (t.id === tourId ? { ...t, is_published: res.tour.is_published } : t))
        );
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update tour publishing state');
    }
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setPortFilter('');
    setDestinationFilter('');
    setStatusFilter('');
    fetchTours();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. SECTION TITLE & EXPLICIT BANNER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 text-[#0284c7] text-xs font-bold uppercase tracking-wider mb-1.5 border border-[#0284c7]/25">
            <Waves className="w-3.5 h-3.5 text-[#0284c7]" />
            Scheduled Public Departures Only
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-[#051833] font-serif tracking-tight">
            Public Tours & Shared Ticket Schedules
          </h2>
          <p className="text-xs text-slate-600 mt-1 font-medium max-w-2xl">
            This tab displays exclusively scheduled public departures with per-person passenger ticket fares and seat inventories. Whole-boat private charters are governed separately under Ship Management.
          </p>
        </div>

        <button
          onClick={fetchTours}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer shadow-sm self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-[#0284c7] ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Tours</span>
        </button>
      </div>

      {/* 2. KPI METRICS CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <div className="p-4 rounded-2xl bg-white border border-[#0284c7]/20 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">Scheduled Tours</span>
            <Waves className="w-4 h-4 text-[#0284c7]" />
          </div>
          <div className="text-2xl font-black text-[#051833] font-mono-numbers">{stats.total_tours}</div>
          <p className="text-[10px] text-slate-500">Active public itineraries</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-emerald-100 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-emerald-700">
            <span className="text-[10px] font-bold uppercase tracking-wider">Published</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600 font-mono-numbers">{stats.published_tours}</div>
          <p className="text-[10px] text-emerald-600/80 font-medium">Bookable by travelers</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-sky-100 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-sky-700">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Seats</span>
            <Users className="w-4 h-4 text-[#0284c7]" />
          </div>
          <div className="text-2xl font-black text-[#0284c7] font-mono-numbers">{stats.total_capacity}</div>
          <p className="text-[10px] text-slate-500">Guest berths across sailings</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-amber-100 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-amber-700">
            <span className="text-[10px] font-bold uppercase tracking-wider">Seats Left</span>
            <Ticket className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-600 font-mono-numbers">{stats.remaining_capacity}</div>
          <p className="text-[10px] text-amber-700 font-medium">Unbooked ticket inventory</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">Avg Ticket Fare</span>
            <Sparkles className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-indigo-700 font-mono-numbers">{formatINR(stats.avg_ticket_price)}</div>
          <p className="text-[10px] text-slate-500">Per person / pass rate</p>
        </div>
      </div>

      {/* 3. SEARCH & ADVANCED FILTER TOOLBAR */}
      <div className="p-4 rounded-2xl bg-white border border-[#0284c7]/20 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by tour name, destination, departure port, or ship..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-300 text-xs bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0284c7]/20"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Departure Port Filter */}
          <select
            value={portFilter}
            onChange={(e) => setPortFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white text-slate-700 focus:outline-none"
          >
            <option value="">All Departure Ports</option>
            <option value="Mumbai">Mumbai</option>
            <option value="Panaji">Panaji / Goa</option>
            <option value="Kochi">Kochi</option>
            <option value="Port Blair">Port Blair</option>
            <option value="Swaraj Dweep">Swaraj Dweep</option>
          </select>

          {/* Destination Filter */}
          <select
            value={destinationFilter}
            onChange={(e) => setDestinationFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white text-slate-700 focus:outline-none"
          >
            <option value="">All Destinations</option>
            <option value="Goa">Goa</option>
            <option value="Lakshadweep">Lakshadweep</option>
            <option value="Mandovi River">Mandovi River</option>
            <option value="Cochin Harbour">Cochin Harbour</option>
            <option value="Swaraj Dweep">Swaraj Dweep / Havelock</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white text-slate-700 focus:outline-none"
          >
            <option value="">All Publishing States</option>
            <option value="PUBLISHED">Published Only</option>
            <option value="UNPUBLISHED">Unpublished (Draft)</option>
            <option value="SCHEDULED">Scheduled Status</option>
          </select>

          <button
            onClick={handleResetFilters}
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            title="Reset Filters"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 4. PUBLIC TOURS TABLE */}
      <div className="bg-white rounded-3xl border border-[#0284c7]/20 shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#f8f9fa] border-b border-slate-200 text-[#051833] font-black uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-5">Public Tour Itinerary</th>
                <th className="py-3.5 px-4">Route</th>
                <th className="py-3.5 px-4">Departure Schedule</th>
                <th className="py-3.5 px-4">Duration</th>
                <th className="py-3.5 px-4">Ticket Fare (₹)</th>
                <th className="py-3.5 px-4">Seat Inventory</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="w-8 h-8 mx-auto border-3 border-[#0284c7] border-t-transparent rounded-full animate-spin mb-2" />
                    <span>Loading public tours schedule...</span>
                  </td>
                </tr>
              ) : tours.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <Compass className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-bold">No public tour departures match the selected filter</p>
                    <button
                      onClick={handleResetFilters}
                      className="mt-2 text-xs text-[#0284c7] font-bold hover:underline"
                    >
                      Reset all filters
                    </button>
                  </td>
                </tr>
              ) : (
                tours.map((t) => {
                  const capacityPercent = t.total_capacity > 0
                    ? Math.round(((t.total_capacity - t.remaining_capacity) / t.total_capacity) * 100)
                    : 0;

                  return (
                    <tr key={t.id} className="hover:bg-sky-50/40 transition-colors">
                      {/* Tour Title & Operating Ship Badge */}
                      <td className="py-4 px-5 max-w-xs">
                        <div className="flex items-center gap-3">
                          <img
                            src={getTourImageUrl(t.tour_image || t.ship_image)}
                            alt={t.tour_title}
                            className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = '/static/images/placeholder.png';
                            }}
                          />
                          <div className="min-w-0">
                            <span className="font-bold text-[#051833] text-xs font-serif line-clamp-1 group-hover:text-[#0284c7] transition-colors block">
                              {t.tour_title}
                            </span>
                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-semibold border border-slate-200">
                                <Anchor className="w-2.5 h-2.5 text-slate-500" />
                                <span className="truncate max-w-[140px]">{t.ship_name}</span>
                              </span>
                              {t.is_live_pricing && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-indigo-50 text-indigo-700 border border-indigo-200">
                                  Cabin Tiers
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Route */}
                      <td className="py-4 px-4 font-semibold text-slate-700">
                        <div className="flex items-center gap-1 text-xs">
                          <MapPin className="w-3.5 h-3.5 text-[#0284c7] shrink-0" />
                          <span>{t.departure_port}</span>
                          <span className="text-slate-400">→</span>
                          <span className="text-[#051833] font-bold">{t.destination}</span>
                        </div>
                      </td>

                      {/* Departure Date & Time */}
                      <td className="py-4 px-4 text-xs font-medium text-slate-700">
                        <div className="flex items-center gap-1 font-bold text-[#051833]">
                          <Calendar className="w-3.5 h-3.5 text-[#0284c7] shrink-0" />
                          <span>{t.departure_date}</span>
                        </div>
                        {t.departure_time && (
                          <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                            <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{t.departure_time}</span>
                          </div>
                        )}
                      </td>

                      {/* Duration */}
                      <td className="py-4 px-4 text-xs text-slate-700 font-semibold">
                        <span className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-800 border border-slate-200 text-[11px] font-bold">
                          {t.duration_display || `${t.duration_days} Days`}
                        </span>
                      </td>

                      {/* Ticket Fare (₹ / person) */}
                      <td className="py-4 px-4">
                        <div className="text-sm font-black text-[#051833] font-mono-numbers">
                          {formatINR(t.adult_price)}
                        </div>
                        <span className="text-[10px] text-slate-500 font-medium block">
                          / person ticket
                        </span>
                      </td>

                      {/* Seat Inventory & Capacity */}
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-between text-[11px] font-bold mb-1">
                          <span className={`${t.remaining_capacity <= 10 ? 'text-rose-600' : 'text-emerald-700'}`}>
                            {t.remaining_capacity} left
                          </span>
                          <span className="text-slate-400">{t.total_capacity} total</span>
                        </div>
                        <div className="w-24 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              capacityPercent > 80 ? 'bg-rose-500' : capacityPercent > 50 ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(100, capacityPercent)}%` }}
                          />
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                            t.is_published
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {t.is_published ? 'Published' : 'Unpublished'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-5 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => setSelectedTour(t)}
                          className="px-3 py-1 rounded-full bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 text-[11px] font-bold cursor-pointer transition shadow-sm inline-flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3 text-[#0284c7]" />
                          <span>Inspect</span>
                        </button>

                        <button
                          onClick={() => handleTogglePublish(t.id)}
                          className={`px-3 py-1 rounded-full text-[11px] font-bold cursor-pointer transition shadow-sm border ${
                            t.is_published
                              ? 'border-slate-300 text-slate-600 hover:bg-slate-100'
                              : 'bg-[#0284c7] hover:bg-[#0369a1] text-white border-[#0284c7]'
                          }`}
                        >
                          {t.is_published ? 'Unpublish' : 'Publish'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. TOUR INSPECTION / DETAILS MODAL */}
      {selectedTour && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl border border-slate-200 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-sky-50 text-[#0284c7] flex items-center justify-center font-bold">
                  <Ticket className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 font-serif leading-tight">
                    {selectedTour.tour_title}
                  </h3>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Public Tour Departure Details & Cabin Inventory
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedTour(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tour Hero Image & Operating Vessel Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-2xl overflow-hidden aspect-video bg-slate-100 border border-slate-200">
                <img
                  src={getTourImageUrl(selectedTour.tour_image || selectedTour.ship_image)}
                  alt={selectedTour.tour_title}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="space-y-3 bg-[#f8f9fa] p-4 rounded-2xl border border-slate-200 text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">
                    Assigned Cruise Vessel
                  </span>
                  <span className="text-sm font-black text-[#051833]">{selectedTour.ship_name}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Route</span>
                    <span className="font-bold text-[#051833]">
                      {selectedTour.departure_port} → {selectedTour.destination}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Departure</span>
                    <span className="font-bold text-[#051833]">{selectedTour.departure_date}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Adult Rate</span>
                    <span className="text-sm font-black text-[#0284c7]">
                      {formatINR(selectedTour.adult_price)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Seats Available</span>
                    <span className="font-bold text-emerald-700">
                      {selectedTour.remaining_capacity} / {selectedTour.total_capacity}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Itinerary Description */}
            {selectedTour.itinerary && (
              <div className="space-y-1.5 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 block">
                  Itinerary & Highlights
                </span>
                <p className="text-xs text-slate-700 leading-relaxed font-medium">
                  {selectedTour.itinerary}
                </p>
                {selectedTour.meals_included && (
                  <div className="pt-2 flex items-center gap-1.5 text-[11px] text-[#0284c7] font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Inclusions: {selectedTour.meals_included}</span>
                  </div>
                )}
              </div>
            )}

            {/* Cabins Breakdown if available */}
            {selectedTour.cabins && selectedTour.cabins.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  Available Cabin Tiers & Classes
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {selectedTour.cabins.map((c) => (
                    <div
                      key={c.id}
                      className="p-3 rounded-xl border border-slate-200 bg-white shadow-sm flex items-center justify-between"
                    >
                      <div>
                        <div className="font-bold text-slate-900">{c.name}</div>
                        <div className="text-[10px] text-slate-500">{c.remaining_capacity} berths left</div>
                      </div>
                      <div className="text-right">
                        <div className="font-black text-[#0284c7]">{formatINR(c.price_per_person)}</div>
                        <div className="text-[9px] text-slate-400">per person</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions & Public Link */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 text-xs">
              <a
                href={`/book-tour/${selectedTour.slug || selectedTour.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[#0284c7] font-bold hover:underline"
              >
                <span>Preview Public Passenger Ticket Page</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedTour(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleTogglePublish(selectedTour.id);
                    setSelectedTour((prev) =>
                      prev ? { ...prev, is_published: !prev.is_published } : null
                    );
                  }}
                  className={`px-4 py-2 rounded-xl font-bold text-white transition cursor-pointer shadow-sm ${
                    selectedTour.is_published
                      ? 'bg-slate-700 hover:bg-slate-800'
                      : 'bg-[#0284c7] hover:bg-[#0369a1]'
                  }`}
                >
                  {selectedTour.is_published ? 'Unpublish Tour' : 'Publish Tour'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
