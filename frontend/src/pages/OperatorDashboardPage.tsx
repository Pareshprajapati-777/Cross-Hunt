import React, { useState, useEffect } from 'react';
import {
  getOperatorDashboard,
  operatorBookingAction,
  createOperatorShip,
  createOperatorTour,
  OperatorDashboardData
} from '../api/dashboards';
import {
  Ship,
  CheckCircle2,
  Anchor,
  Calendar,
  Clock,
  Plus,
  X,
  FileText
} from 'lucide-react';
import { InvoiceModal } from '../components/ticket/InvoiceModal';
import { formatINR } from '../utils/currency';

export const OperatorDashboardPage: React.FC = () => {
  const [data, setData] = useState<OperatorDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Modals
  const [showAddShipModal, setShowAddShipModal] = useState(false);
  const [showAddTourModal, setShowAddTourModal] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);

  // Add Ship Form State
  const [shipForm, setShipForm] = useState({
    name: '',
    category: 'Luxury Ocean Cruise',
    location: 'Mumbai',
    departure_port: 'Mumbai Cruise Terminal',
    destination: 'Goa & Arabian Sea',
    route: 'Mumbai - Goa - Mumbai',
    price: 75000,
    capacity: 150,
    duration_days: 3,
    description: '',
    image_url: '',
    facilities: 'Wi-Fi, Swimming Pool, Fine Dining, DJ Audio Rigs, Sun Deck',
    supports_private_charter: true,
    supports_public_tours: true,
    supports_weddings: true,
    supports_birthdays: true,
    supports_corporate: true,
    supports_parties: true,
  });

  // Add Tour Form State
  const [tourForm, setTourForm] = useState({
    ship_id: '',
    tour_title: '',
    departure_port: 'Mumbai Cruise Terminal',
    destination: 'Goa (Mormugao)',
    departure_date: '',
    departure_time: '16:00',
    return_date: '',
    return_time: '11:00',
    duration_days: 3,
    total_capacity: 100,
    adult_price: 14999,
    child_price: 7999,
    itinerary: '',
    meals_included: 'All Gourmet Buffet Meals Included',
  });

  const fetchDashboard = () => {
    setLoading(true);
    getOperatorDashboard()
      .then((res) => {
        setData(res);
        if (res.my_ships && res.my_ships.length > 0 && !tourForm.ship_id) {
          setTourForm((prev) => ({ ...prev, ship_id: res.my_ships[0].id.toString() }));
        }
      })
      .catch((err) => console.error('Failed to load operator dashboard:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleAction = async (bookingId: string, action: 'confirm' | 'cancel' | 'complete' | 'board' | 'depart' | 'arrive') => {
    setActionLoading(`${bookingId}-${action}`);
    try {
      await operatorBookingAction(bookingId, action);
      fetchDashboard();
    } catch (err: any) {
      alert(err.message || 'Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAddShipSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createOperatorShip(shipForm as any);
      setShowAddShipModal(false);
      fetchDashboard();
    } catch (err: any) {
      alert(err.message || 'Failed to register ship');
    }
  };

  const handleAddTourSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createOperatorTour(tourForm);
      setShowAddTourModal(false);
      fetchDashboard();
    } catch (err: any) {
      alert(err.message || 'Failed to schedule tour');
    }
  };

  if (loading || !data) {
    return (
      <div className="min-h-screen pt-32 flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-sky-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-28 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 bg-slate-50/70">
      {/* Top Banner & Quick Actions */}
      <div className="mb-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-100 border border-sky-200 text-sky-800 text-xs font-bold uppercase tracking-wider mb-2">
            <Anchor className="w-3.5 h-3.5 text-sky-600" />
            Cruise Operator Fleet Command
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-black text-slate-900 tracking-tight font-serif">
            Fleet Operations & Voyage Bookings
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            Manage owned vessels, schedule public cruise departures, and authorize private charter requests.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddTourModal(true)}
            className="px-4 py-2.5 rounded-2xl bg-white border border-slate-300 text-slate-800 text-xs font-bold hover:bg-slate-50 transition cursor-pointer shadow-sm flex items-center gap-1.5"
          >
            <Calendar className="w-4 h-4 text-sky-600" />
            <span>Schedule Public Tour</span>
          </button>
          <button
            onClick={() => setShowAddShipModal(true)}
            className="px-5 py-2.5 rounded-2xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold transition cursor-pointer shadow-md shadow-sky-500/20 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Ship</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
        <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-sm">
          <span className="text-xs uppercase tracking-wider text-slate-400 font-bold">Total Vessels in Fleet</span>
          <p className="text-3xl font-display font-black text-slate-900 mt-2 flex items-center gap-2">
            <Ship className="w-6 h-6 text-sky-500" />
            {data.stats.total_ships}
          </p>
        </div>

        <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-sm">
          <span className="text-xs uppercase tracking-wider text-slate-400 font-bold">Pending Requests</span>
          <p className="text-3xl font-display font-black text-amber-600 mt-2 flex items-center gap-2">
            <Clock className="w-6 h-6 text-amber-500" />
            {data.stats.pending_bookings ?? data.stats.active_bookings}
          </p>
        </div>

        <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-sm">
          <span className="text-xs uppercase tracking-wider text-slate-400 font-bold">Confirmed / Trips</span>
          <p className="text-3xl font-display font-black text-emerald-600 mt-2 flex items-center gap-2">
            <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            {data.stats.confirmed_bookings ?? data.stats.completed_trips}
          </p>
        </div>

        <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-sm">
          <span className="text-xs uppercase tracking-wider text-slate-400 font-bold">Total Fleet GMV (INR)</span>
          <p className="text-2xl sm:text-3xl font-display font-black text-sky-700 mt-2 font-serif">
            {formatINR(data.stats.total_revenue)}
          </p>
        </div>
      </div>

      {/* SECTION: MY FLEET */}
      <section className="mb-14 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold font-serif text-slate-900">Registered Vessels ({data.my_ships.length})</h2>
          <span className="text-xs text-slate-500">All ships registered under your operator account</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.my_ships.map((ship) => (
            <div
              key={ship.id}
              className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-sm flex flex-col justify-between"
            >
              <div className="relative h-44 overflow-hidden bg-slate-100">
                <img
                  src={ship.image || 'https://images.unsplash.com/photo-1548574505-5e239809ee19?auto=format&fit=crop&w=600&q=80'}
                  alt={ship.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-md px-2.5 py-1 rounded-full text-white text-[10px] font-bold uppercase tracking-wider">
                  {ship.category}
                </div>
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <h3 className="font-bold text-lg text-slate-900 font-serif">{ship.title}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Port: {ship.location} • {ship.destination}</p>
                </div>

                <div className="grid grid-cols-3 gap-2 py-2 px-3 rounded-xl bg-slate-50 text-center text-xs">
                  <div>
                    <span className="text-[10px] uppercase text-slate-400 font-bold block">Capacity</span>
                    <span className="font-bold text-slate-800">{ship.capacity}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-slate-400 font-bold block">Decks</span>
                    <span className="font-bold text-slate-800">{ship.decks_count || 8}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-slate-400 font-bold block">Duration</span>
                    <span className="font-bold text-slate-800">{ship.duration_days}d</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Base Rate</span>
                  <span className="font-black text-sky-700 text-base">{formatINR(ship.price)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION: PASSENGER BOOKING MANAGEMENT */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold font-serif text-slate-900">
          Booking Inquiries & Reservations ({data.recent_bookings.length})
        </h2>

        {data.recent_bookings.length === 0 ? (
          <div className="p-8 rounded-3xl bg-white border border-slate-200/80 text-center text-slate-400 text-xs">
            No booking reservations recorded yet.
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                  <tr>
                    <th className="p-4">Ref / Guest</th>
                    <th className="p-4">Vessel & Schedule</th>
                    <th className="p-4">Type</th>
                    <th className="p-4 text-right">Amount (₹)</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.recent_bookings.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/50">
                      <td className="p-4">
                        <div className="font-mono font-bold text-slate-900">{b.booking_id}</div>
                        <div className="text-slate-500 mt-0.5">{b.customer_name || 'Guest'}</div>
                        <div className="text-[10px] text-slate-400">{b.customer_phone}</div>
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-slate-900">{b.cruise_title}</div>
                        <div className="text-slate-500">{b.booking_date} ({b.start_time} - {b.end_time})</div>
                        <div className="text-[11px] text-slate-400">{b.passengers_count} Passengers</div>
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold text-[10px] uppercase">
                          {b.booking_type === 'EVENT' ? 'Charter' : 'Public Tour'}
                        </span>
                      </td>
                      <td className="p-4 text-right font-black text-slate-900 text-sm font-serif">
                        {formatINR(b.total_price)}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                          b.status === 'CONFIRMED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : b.status === 'COMPLETED'
                            ? 'bg-slate-100 text-slate-700'
                            : b.status === 'PENDING'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {b.status}
                        </span>
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <button
                          onClick={() => setSelectedInvoiceId(b.booking_id)}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold"
                          title="View Tax Invoice"
                        >
                          <FileText className="w-3.5 h-3.5 inline" />
                        </button>

                        {b.status === 'PENDING' && (
                          <button
                            onClick={() => handleAction(b.booking_id, 'confirm')}
                            disabled={actionLoading === `${b.booking_id}-confirm`}
                            className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-bold cursor-pointer"
                          >
                            Approve
                          </button>
                        )}

                        {b.status === 'CONFIRMED' && (
                          <button
                            onClick={() => handleAction(b.booking_id, 'complete')}
                            disabled={actionLoading === `${b.booking_id}-complete`}
                            className="px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-600 text-white font-bold cursor-pointer"
                          >
                            Complete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* Invoice Modal */}
      {selectedInvoiceId && (
        <InvoiceModal
          bookingId={selectedInvoiceId}
          onClose={() => setSelectedInvoiceId(null)}
        />
      )}

      {/* Add Ship Modal */}
      {showAddShipModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full my-8 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-xl font-bold font-serif text-slate-900">Register Vessel into Fleet</h2>
              <button onClick={() => setShowAddShipModal(false)} className="p-1 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddShipSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Ship Name</label>
                  <input
                    type="text"
                    required
                    value={shipForm.name}
                    onChange={(e) => setShipForm({ ...shipForm, name: e.target.value })}
                    placeholder="e.g. MV Arabian Pearl"
                    className="w-full p-2.5 rounded-xl border border-slate-200"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Category</label>
                  <select
                    value={shipForm.category}
                    onChange={(e) => setShipForm({ ...shipForm, category: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200"
                  >
                    <option value="Luxury Ocean Cruise">Luxury Ocean Cruise</option>
                    <option value="Mega Cruise Liner">Mega Cruise Liner</option>
                    <option value="Expedition Cruise Vessel">Expedition Cruise Vessel</option>
                    <option value="Scenic Coastal Cruise">Scenic Coastal Cruise</option>
                    <option value="Private Charter Yacht">Private Charter Yacht</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Base Home Port</label>
                  <input
                    type="text"
                    required
                    value={shipForm.location}
                    onChange={(e) => setShipForm({ ...shipForm, location: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Departure Port Terminal</label>
                  <input
                    type="text"
                    required
                    value={shipForm.departure_port}
                    onChange={(e) => setShipForm({ ...shipForm, departure_port: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Starting Rate (₹)</label>
                  <input
                    type="number"
                    required
                    value={shipForm.price}
                    onChange={(e) => setShipForm({ ...shipForm, price: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl border border-slate-200"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Capacity (Guests)</label>
                  <input
                    type="number"
                    required
                    value={shipForm.capacity}
                    onChange={(e) => setShipForm({ ...shipForm, capacity: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl border border-slate-200"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Duration (Days)</label>
                  <input
                    type="number"
                    value={shipForm.duration_days}
                    onChange={(e) => setShipForm({ ...shipForm, duration_days: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Ship Image URL</label>
                <input
                  type="url"
                  value={shipForm.image_url}
                  onChange={(e) => setShipForm({ ...shipForm, image_url: e.target.value })}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full p-2.5 rounded-xl border border-slate-200"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Description</label>
                <textarea
                  rows={3}
                  value={shipForm.description}
                  onChange={(e) => setShipForm({ ...shipForm, description: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-2xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs shadow-md"
              >
                Register Ship Into Fleet
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add Tour Modal */}
      {showAddTourModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-xl w-full my-8 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-xl font-bold font-serif text-slate-900">Schedule Public Cruise Tour</h2>
              <button onClick={() => setShowAddTourModal(false)} className="p-1 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddTourSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Assign Fleet Vessel</label>
                <select
                  required
                  value={tourForm.ship_id}
                  onChange={(e) => setTourForm({ ...tourForm, ship_id: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200"
                >
                  {data.my_ships.map((s) => (
                    <option key={s.id} value={s.id}>{s.title} ({s.location})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Tour Title</label>
                <input
                  type="text"
                  required
                  value={tourForm.tour_title}
                  onChange={(e) => setTourForm({ ...tourForm, tour_title: e.target.value })}
                  placeholder="e.g. Mumbai to Goa Coastal Carnival"
                  className="w-full p-2.5 rounded-xl border border-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Departure Date</label>
                  <input
                    type="date"
                    required
                    value={tourForm.departure_date}
                    onChange={(e) => setTourForm({ ...tourForm, departure_date: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Return Date</label>
                  <input
                    type="date"
                    required
                    value={tourForm.return_date}
                    onChange={(e) => setTourForm({ ...tourForm, return_date: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Adult Fare (₹)</label>
                  <input
                    type="number"
                    required
                    value={tourForm.adult_price}
                    onChange={(e) => setTourForm({ ...tourForm, adult_price: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl border border-slate-200"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Child Fare (₹)</label>
                  <input
                    type="number"
                    required
                    value={tourForm.child_price}
                    onChange={(e) => setTourForm({ ...tourForm, child_price: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-2xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs shadow-md"
              >
                Publish Public Cruise Tour
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
