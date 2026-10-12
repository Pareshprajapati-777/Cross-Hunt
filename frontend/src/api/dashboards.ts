import { apiRequest } from './client';
import { Booking, Cruise, PublicTour, Offer, OperatorSummary, WhatsAppLog, WhatsAppConfig, WhatsAppQueueItem } from './types';

export interface OperatorDashboardData {
  stats: {
    total_ships: number;
    active_ships?: number;
    available_ships?: number;
    booked_ships?: number;
    on_tour_ships?: number;
    maintenance_ships?: number;
    active_bookings: number;
    pending_bookings?: number;
    confirmed_bookings?: number;
    completed_trips: number;
    total_revenue: number;
    gross_revenue?: number;
    owner_payout?: number;
    platform_commission?: number;
    payout_rate?: number;
    commission_rate?: number;
    private_revenue?: number;
    tour_revenue?: number;
  };
  earnings?: number;
  owner_payout?: number;
  platform_commission?: number;
  my_ships: Cruise[];
  vessels?: Cruise[];
  my_tours?: PublicTour[];
  recent_bookings: Booking[];
  analytics?: {
    monthly_trend: Array<{
      month: string;
      revenue: number;
      payout: number;
      bookings_count: number;
    }>;
    category_split: {
      private_count: number;
      private_revenue: number;
      private_percent: number;
      tour_count: number;
      tour_revenue: number;
      tour_percent: number;
    };
    status_breakdown: {
      confirmed: number;
      completed: number;
      pending: number;
      cancelled: number;
      total: number;
    };
    ship_performance: Array<{
      ship_id: number;
      ship_name: string;
      location: string;
      image?: string;
      category?: string;
      bookings_count: number;
      revenue: number;
      payout: number;
      guests: number;
    }>;
    top_destinations: Array<{
      destination: string;
      count: number;
      revenue: number;
    }>;
  };
}

export interface AdminDashboardData {
  stats: {
    total_users: number;
    total_owners?: number;
    total_operators: number;
    total_ships: number;
    active_ships?: number;
    external_operators?: number;
    external_operators_count?: number;
    total_tours?: number;
    active_tours?: number;
    total_bookings: number;
    private_bookings?: number;
    tour_bookings?: number;
    tickets_count?: number;
    total_tickets?: number;
    pending_bookings?: number;
    pending_requests?: number;
    confirmed_bookings?: number;
    cancelled_bookings?: number;
    total_revenue: number;
    gross_revenue?: number;
    owner_payout?: number;
    platform_commission?: number;
    platform_profit?: number;
    net_profit?: number;
    occupancy_rate?: number;
    cancellation_rate?: number;
  };
  analytics?: {
    monthly_revenue: Array<{
      month: string;
      month_number: number;
      revenue: number;
      profit: number;
      bookings_count: number;
    }>;
    top_ships: Array<{
      name: string;
      location: string;
      bookings_count: number;
      revenue: number;
    }>;
    top_destinations: Array<{
      destination: string;
      count: number;
    }>;
    private_vs_public: {
      private_count: number;
      private_revenue: number;
      tour_count: number;
      tour_revenue: number;
    };
    occupancy_rate: number;
    cancellation_rate: number;
  };
  recent_bookings: Booking[];
  all_ships?: Cruise[];
}

export async function getOperatorDashboard(): Promise<OperatorDashboardData> {
  return apiRequest<OperatorDashboardData>('/api/operator/dashboard/');
}

export async function operatorBookingAction(
  bookingId: string,
  action: 'confirm' | 'cancel' | 'complete' | 'board' | 'depart' | 'arrive'
): Promise<{ success: boolean; message: string; booking?: Booking }> {
  return apiRequest(`/api/operator/bookings/${bookingId}/${action}/`, {
    method: 'POST',
  });
}

export async function createOperatorShip(payload: Partial<Cruise>): Promise<{ success: boolean; ship: Cruise }> {
  return apiRequest('/api/operator/ships/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function createOperatorTour(payload: any): Promise<{ success: boolean; tour: PublicTour }> {
  return apiRequest('/api/operator/tours/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getAdminDashboard(): Promise<AdminDashboardData> {
  return apiRequest<AdminDashboardData>('/api/admin/dashboard/');
}

export async function getAdminOffers(): Promise<{ offers: Offer[] }> {
  return apiRequest('/api/admin/offers/');
}

export async function createAdminOffer(payload: Partial<Offer>): Promise<{ success: boolean; offer: Offer }> {
  return apiRequest('/api/admin/offers/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getOperatorExtras(shipId?: number): Promise<{ extras: any[] }> {
  return apiRequest(`/api/operator/extras/${shipId ? `?ship_id=${shipId}` : ''}`);
}

export async function createOperatorExtra(payload: any): Promise<{ success: boolean; extra: any }> {
  return apiRequest('/api/operator/extras/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateOperatorExtra(payload: any): Promise<{ success: boolean; extra: any }> {
  return apiRequest('/api/operator/extras/', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteOperatorExtra(id: number): Promise<{ success: boolean }> {
  return apiRequest(`/api/operator/extras/?id=${id}`, {
    method: 'DELETE',
  });
}

export async function getOperatorAvailability(shipId: number): Promise<{ ship_id: number; ship_name: string; timeline: Array<{ date: string; day_name: string; status: string; details?: any }> }> {
  return apiRequest(`/api/operator/ships/${shipId}/availability/`);
}

export async function getTourPassengers(tourId: number): Promise<{
  tour_id: number;
  tour_title: string;
  ship_name: string;
  departure_date: string;
  total_capacity: number;
  booked_capacity: number;
  remaining_capacity: number;
  passengers: Array<{
    booking_id: string;
    passenger_name: string;
    email: string;
    phone: string;
    adults_count: number;
    children_count: number;
    passengers_count: number;
    cabin_type: string;
    status: string;
    tracking_status: string;
    total_price: number;
    booking_date: string;
  }>;
}> {
  return apiRequest(`/api/operator/tours/${tourId}/passengers/`);
}

export async function getOperatorRevenue(): Promise<{
  total_revenue: number;
  private_revenue: number;
  tour_revenue: number;
  by_ship: Array<{ ship_id: number; ship_name: string; revenue: number; bookings_count: number }>;
}> {
  return apiRequest('/api/operator/revenue/');
}

export async function getAdminUsers(params?: { q?: string; role?: string }): Promise<{ users: any[] }> {
  const query = new URLSearchParams();
  if (params?.q && params.q.trim()) query.append('q', params.q.trim());
  if (params?.role && params.role.trim()) query.append('role', params.role.trim());
  const qStr = query.toString();
  return apiRequest(`/api/admin/users/${qStr ? `?${qStr}` : ''}`);
}

export async function toggleAdminUserActive(userId: number): Promise<{ success: boolean; is_active: boolean; message: string }> {
  return apiRequest('/api/admin/users/', {
    method: 'POST',
    body: JSON.stringify({ user_id: userId }),
  });
}

export async function getAdminOwners(): Promise<{ owners: any[] }> {
  return apiRequest('/api/admin/owners/');
}

export async function adminOwnerAction(ownerId: number, action: 'approve' | 'reject' | 'toggle_active'): Promise<{ success: boolean; message: string }> {
  return apiRequest('/api/admin/owners/', {
    method: 'POST',
    body: JSON.stringify({ owner_id: ownerId, action }),
  });
}

export async function getAdminShips(): Promise<{ ships: any[] }> {
  return apiRequest('/api/admin/ships/');
}

export async function adminShipAction(shipId: number, action: 'approve' | 'toggle_active' | 'delete'): Promise<{ success: boolean; message: string }> {
  return apiRequest('/api/admin/ships/', {
    method: 'POST',
    body: JSON.stringify({ ship_id: shipId, action }),
  });
}

export async function getAdminBookings(params?: { type?: string; status?: string }): Promise<{ bookings: Booking[] }> {
  const query = new URLSearchParams();
  if (params?.type && params.type.trim()) query.append('type', params.type.trim());
  if (params?.status && params.status.trim()) query.append('status', params.status.trim());
  const qStr = query.toString();
  return apiRequest(`/api/admin/bookings/${qStr ? `?${qStr}` : ''}`);
}

export async function adminBookingAction(bookingId: string, status: string): Promise<{ success: boolean; booking: Booking }> {
  return apiRequest('/api/admin/bookings/', {
    method: 'POST',
    body: JSON.stringify({ booking_id: bookingId, status }),
  });
}

export async function getAdminTours(): Promise<{ tours: PublicTour[] }> {
  return apiRequest('/api/admin/tours/');
}

export async function adminTourAction(tourId: number, action: 'toggle_publish' | 'cancel'): Promise<{ success: boolean; tour: PublicTour }> {
  return apiRequest('/api/admin/tours/', {
    method: 'POST',
    body: JSON.stringify({ tour_id: tourId, action }),
  });
}

export async function getAdminReviews(): Promise<{ reviews: any[] }> {
  return apiRequest('/api/admin/reviews/');
}

export async function adminDeleteReview(reviewId: number): Promise<{ success: boolean; message: string }> {
  return apiRequest(`/api/admin/reviews/?id=${reviewId}`, {
    method: 'DELETE',
  });
}

export async function getAdminReports(): Promise<{
  popular_ships: Array<{ name: string; bookings_count: number; location: string }>;
  popular_destinations: Array<{ destination: string; count: number }>;
  total_revenue: number;
  cancellation_rate: number;
}> {
  return apiRequest('/api/admin/reports/');
}

export async function getAdminOperators(): Promise<{ operators: OperatorSummary[]; total: number }> {
  return apiRequest('/api/admin/operators/');
}

export async function getAdminOperatorDetail(operatorId: number): Promise<{ operator: OperatorSummary }> {
  return apiRequest(`/api/admin/operators/${operatorId}/`);
}

export async function updateAdminOperator(operatorId: number, payload: Partial<OperatorSummary>): Promise<{ success: boolean; message: string; operator: OperatorSummary }> {
  return apiRequest(`/api/admin/operators/${operatorId}/`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateAdminOperatorVessel(operatorId: number, vesselId: number, payload: any): Promise<{ success: boolean; message: string; vessel: any }> {
  return apiRequest(`/api/admin/operators/${operatorId}/vessels/${vesselId}/`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function resyncAdminSeedData(): Promise<{ success: boolean; message: string; output?: string }> {
  return apiRequest('/api/admin/operators/resync-seed/', {
    method: 'POST',
  });
}

export interface AdminAnalyticsKPIs {
  total_users: number;
  total_owners: number;
  total_ships: number;
  active_ships: number;
  external_operators: number;
  private_bookings: number;
  public_tours: number;
  public_tickets: number;
  gross_revenue: number;
  owner_payout: number;
  discount_amount: number;
  platform_profit: number;
  cancellations: number;
  cancellation_rate: number;
  period_gross_revenue: number;
  period_owner_payout: number;
  period_discount: number;
  period_platform_profit: number;
  period_bookings_count: number;
  period_private_count: number;
  period_tour_count: number;
  period_tickets: number;
  period_cancellations: number;
}

export interface AdminAnalyticsCharts {
  revenue_trend: Array<{
    date: string;
    label: string;
    gross_revenue: number;
    owner_payout: number;
    discount_amount: number;
    platform_profit: number;
    bookings_count: number;
  }>;
  platform_profit_trend: Array<{
    month: string;
    month_label: string;
    gross_revenue: number;
    owner_payout: number;
    discount_amount: number;
    platform_profit: number;
    margin_percentage: number;
    bookings_count: number;
  }>;
  bookings_private_vs_public: {
    private: {
      count: number;
      revenue: number;
      tickets: number;
      percentage: number;
      revenue_percentage: number;
    };
    public: {
      count: number;
      revenue: number;
      tickets: number;
      percentage: number;
      revenue_percentage: number;
    };
  };
  ship_performance: Array<{
    ship_id: number;
    ship_name: string;
    location: string;
    category: string;
    bookings_count: number;
    revenue: number;
    owner_payout: number;
    platform_profit: number;
    image_url: string;
  }>;
  destination_analysis: Array<{
    destination: string;
    bookings_count: number;
    revenue: number;
    share_percentage: number;
  }>;
  public_tour_occupancy: {
    total_capacity: number;
    booked_capacity: number;
    remaining_capacity: number;
    average_occupancy_rate: number;
    tours: Array<{
      tour_id: number;
      tour_title: string;
      ship_name: string;
      departure_date: string;
      total_capacity: number;
      booked_capacity: number;
      remaining_capacity: number;
      occupancy_percentage: number;
      revenue: number;
      status: string;
    }>;
  };
  booking_status_breakdown: Array<{
    status: string;
    label: string;
    count: number;
    revenue: number;
    share_percentage: number;
    color: string;
  }>;
  revenue_by_ship: Array<{
    ship_id: number;
    ship_name: string;
    category: string;
    revenue: number;
    bookings_count: number;
    share_percentage: number;
  }>;
  revenue_by_destination: Array<{
    destination: string;
    revenue: number;
    bookings_count: number;
    share_percentage: number;
  }>;
  monthly_growth: Array<{
    month: string;
    month_label: string;
    revenue: number;
    revenue_growth_percentage: number;
    bookings_count: number;
    bookings_growth_percentage: number;
    profit: number;
  }>;
}

export interface AdminAnalyticsResponse {
  kpis: AdminAnalyticsKPIs;
  date_range: {
    selected_range: string;
    start_date: string;
    end_date: string;
    granularity: string;
  };
  charts: AdminAnalyticsCharts;
}

export async function getAdminAnalytics(params?: {
  range?: string;
  start_date?: string;
  end_date?: string;
  granularity?: string;
}): Promise<AdminAnalyticsResponse> {
  const query = new URLSearchParams();
  if (params?.range) query.set('range', params.range);
  if (params?.start_date) query.set('start_date', params.start_date);
  if (params?.end_date) query.set('end_date', params.end_date);
  if (params?.granularity) query.set('granularity', params.granularity);
  const qStr = query.toString();
  return apiRequest<AdminAnalyticsResponse>(`/api/admin/analytics/${qStr ? `?${qStr}` : ''}`);
}

export async function getAdminWhatsAppConfig(): Promise<{
  config: WhatsAppConfig;
  upcoming_queue: WhatsAppQueueItem[];
  recent_logs: WhatsAppLog[];
}> {
  return apiRequest('/api/admin/whatsapp/config/');
}

export async function updateAdminWhatsAppConfig(
  hours: number
): Promise<{ success: boolean; message: string; configured_hours: number }> {
  return apiRequest('/api/admin/whatsapp/config/', {
    method: 'POST',
    body: JSON.stringify({ hours }),
  });
}

export async function triggerAdminWhatsAppDispatch(
  hours?: number,
  dryRun?: boolean
): Promise<{ success: boolean; summary: any; message: string }> {
  return apiRequest('/api/admin/whatsapp/dispatch/', {
    method: 'POST',
    body: JSON.stringify({ hours, dry_run: !!dryRun }),
  });
}

export async function getAdminWhatsAppLogs(): Promise<{ logs: WhatsAppLog[] }> {
  return apiRequest('/api/admin/whatsapp/logs/');
}


