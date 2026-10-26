import { apiRequest } from './client';
import {
  Booking, Cruise, PublicTour, Offer, OperatorSummary, WhatsAppLog, WhatsAppConfig, WhatsAppQueueItem,
  WhatsAppCredentialsPayload, WhatsAppConnectionTestResult
} from './types';

export interface OperatorDashboardData {
  stats: {
    total_ships: number;
    active_ships?: number;
    available_ships?: number;
    booked_ships?: number;
    on_tour_ships?: number;
    maintenance_ships?: number;
    total_activities?: number;
    active_activities?: number;
    upcoming_bookings?: number;
    pending_requests?: number;
    available_vessels?: number;
    occupancy_rate?: number;
    customer_rating?: number;
    cancellation_rate?: number;
    gross_booking_value?: number;
    refunds?: number;
    net_payout?: number;
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
    activity_revenue?: number;
    reviews_count?: number;
    complaints_count?: number;
    admin_warnings_count?: number;
  };
  earnings?: number;
  gross_booking_value?: number;
  refunds?: number;
  net_payout?: number;
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
    total_activities?: number;
    active_activities?: number;
    total_bookings: number;
    private_bookings?: number;
    tour_bookings?: number;
    activity_bookings?: number;
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
  action: 'confirm' | 'approve' | 'in_progress' | 'complete' | 'reject' | 'cancel' | 'board' | 'depart' | 'arrive'
): Promise<{ success: boolean; message: string; booking?: Booking }> {
  return apiRequest(`/api/operator/bookings/${bookingId}/${action}`, {
    method: 'POST',
  });
}

export async function operatorUpdateSchedule(
  bookingId: string,
  payload: {
    booking_date: string;
    start_time: string;
    end_time?: string;
    reason?: string;
    notify_customer?: boolean;
  }
): Promise<{ success: boolean; message: string; booking?: Booking }> {
  return apiRequest(`/api/operator/bookings/${bookingId}/update-schedule`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function operatorWeatherReschedule(
  bookingId: string,
  payload: {
    new_date: string;
    new_time_slot: string;
    weather_condition: string;
    customer_note?: string;
    notify_customer?: boolean;
  }
): Promise<{ success: boolean; message: string; booking?: Booking }> {
  return apiRequest(`/api/operator/bookings/${bookingId}/weather-reschedule`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function operatorUpdateParticipants(
  bookingId: string,
  payload: {
    number_of_people: number;
    adults_count?: number;
    children_count?: number;
    notes?: string;
    recalculate_price?: boolean;
  }
): Promise<{ success: boolean; message: string; booking?: Booking }> {
  return apiRequest(`/api/operator/bookings/${bookingId}/update-participants`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function operatorProcessRefund(
  bookingId: string,
  payload: {
    refund_amount: number;
    refund_reason: string;
    cancel_booking?: boolean;
    customer_notes?: string;
  }
): Promise<{ success: boolean; message: string; booking?: Booking }> {
  return apiRequest(`/api/operator/bookings/${bookingId}/process-refund`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function operatorSendCustomerMessage(
  bookingId: string,
  payload: {
    message: string;
    template_type?: string;
    channel?: string;
  }
): Promise<{ success: boolean; message: string; whatsapp_url?: string }> {
  return apiRequest(`/api/operator/bookings/${bookingId}/send-message`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function createOperatorShip(payload: Partial<Cruise>): Promise<{ success: boolean; ship: Cruise }> {
  return apiRequest('/api/operator/ships/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateOperatorShip(shipId: number, payload: Partial<Cruise>): Promise<{ success: boolean; ship: Cruise }> {
  return apiRequest(`/api/operator/ships/${shipId}/`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteOperatorShip(shipId: number): Promise<{ success: boolean; message?: string }> {
  return apiRequest(`/api/operator/ships/${shipId}/`, {
    method: 'DELETE',
  });
}

export async function uploadOperatorImage(file: File): Promise<{ success: boolean; url: string; filename: string }> {
  const formData = new FormData();
  formData.append('file', file);
  return apiRequest('/api/operator/upload-image/', {
    method: 'POST',
    body: formData,
  });
}

export async function createOperatorTour(payload: any): Promise<{ success: boolean; tour: PublicTour }> {
  return apiRequest('/api/operator/tours/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export interface OperatorReview {
  id: number;
  ship_id: number;
  ship_name: string;
  ship_image?: string;
  ship_category?: string;
  ship_location?: string;
  author: string;
  user: string;
  rating: number;
  comment: string;
  has_complaint: boolean;
  complaint_category?: string;
  complaint_text?: string;
  complaint_status?: 'NONE' | 'PENDING' | 'WARNING_SENT' | 'RESOLVED';
  warning_message?: string;
  warning_sent_at?: string;
  owner_response?: string;
  owner_response_at?: string;
  booking_id?: string;
  booking_type?: string;
  travel_date?: string;
  created_at?: string;
  date?: string;
}

export interface OperatorReviewsResponse {
  success: boolean;
  reviews: OperatorReview[];
  complaints: OperatorReview[];
  admin_warnings: OperatorReview[];
  total_count: number;
  complaints_count: number;
  admin_warnings_count: number;
  avg_rating: number;
}

export async function getOperatorReviews(): Promise<OperatorReviewsResponse> {
  return apiRequest<OperatorReviewsResponse>('/api/operator/reviews/');
}

export async function resolveOperatorComplaint(reviewId: number): Promise<{ success: boolean; message: string }> {
  return apiRequest<{ success: boolean; message: string }>(`/api/operator/reviews/${reviewId}/resolve/`, {
    method: 'POST',
  });
}

export async function operatorRespondToComplaint(
  reviewId: number,
  message: string
): Promise<{ success: boolean; message: string; owner_response: string; owner_response_at: string }> {
  return apiRequest(`/api/operator/reviews/${reviewId}/respond-customer/`, {
    method: 'POST',
    body: JSON.stringify({ message }),
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

export async function toggleAdminOfferActive(offerId: number): Promise<{ success: boolean; offer: Offer; message?: string }> {
  return apiRequest(`/api/admin/offers/${offerId}/toggle-active/`, {
    method: 'POST',
  });
}

export async function deleteAdminOffer(offerId: number): Promise<{ success: boolean; message?: string }> {
  return apiRequest(`/api/admin/offers/${offerId}/`, {
    method: 'DELETE',
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

export interface TimelineItem {
  date: string;
  day_name: string;
  day_number?: string;
  month_name?: string;
  year?: string;
  formatted_date?: string;
  full_date_label?: string;
  status: string;
  status_type?: string;
  is_whole_day?: boolean;
  is_available?: boolean;
  booked_time?: string | null;
  break_time?: string | null;
  break_hours?: number;
  ready_time?: string;
  details?: any;
}

export async function getOperatorAvailability(shipId: number): Promise<{
  ship_id: number;
  ship_name: string;
  timeline: TimelineItem[];
}> {
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

export interface PaginationMetadata {
  page: number;
  page_size: number;
  total_records: number;
  total_pages: number;
  has_next?: boolean;
  has_previous?: boolean;
}

/**
 * Robustly serializes an object of parameters into a clean URL query string.
 * Trims values, removes null/undefined/empty string/default-all tokens,
 * and encodes special characters safely.
 */
export function buildQueryParams(params?: Record<string, any>): string {
  if (!params || typeof params !== 'object') return '';
  const searchParams = new URLSearchParams();

  for (const [key, rawVal] of Object.entries(params)) {
    if (rawVal === null || rawVal === undefined) continue;

    let val: string;
    if (typeof rawVal === 'string') {
      val = rawVal.trim();
    } else if (typeof rawVal === 'number' || typeof rawVal === 'boolean') {
      val = String(rawVal);
    } else {
      continue;
    }

    if (!val) continue;

    const lower = val.toLowerCase();
    if (lower === 'all' || lower === 'undefined' || lower === 'null' || lower === 'none') {
      continue;
    }

    searchParams.append(key, val);
  }

  const str = searchParams.toString();
  return str ? `?${str}` : '';
}

export async function getAdminUsers(params?: {
  q?: string;
  role?: string;
  status?: string;
  verified?: string;
  page?: number;
  page_size?: number;
}): Promise<{
  users: any[];
  stats?: {
    total_users: number;
    verified_users: number;
    active_users: number;
    blocked_users: number;
    total_customers: number;
    total_owners: number;
  };
  pagination?: PaginationMetadata;
}> {
  return apiRequest(`/api/admin/users/${buildQueryParams(params)}`);
}

export async function toggleAdminUserActive(userId: number, action?: 'block' | 'unblock' | 'toggle_active', reason?: string): Promise<{ success: boolean; is_active: boolean; block_reason?: string; message: string }> {
  return apiRequest('/api/admin/users/', {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, action: action || 'toggle_active', reason }),
  });
}

export async function adminVerifyUser(userId: number, action?: 'verify' | 'unverify' | 'toggle_verify'): Promise<{ success: boolean; is_verified: boolean; message: string }> {
  return apiRequest('/api/admin/users/', {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, action: action || 'toggle_verify' }),
  });
}

export async function updateAdminUser(userId: number, payload: { full_name?: string; email?: string; phone?: string; whatsapp_number?: string; role?: string }): Promise<{ success: boolean; message: string; user?: any }> {
  return apiRequest('/api/admin/users/', {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, action: 'update_user', ...payload }),
  });
}

export async function getAdminUserDetails(userId: number): Promise<{ success: boolean; user: any }> {
  return apiRequest('/api/admin/users/', {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, action: 'user_details' }),
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

export async function getAdminShips(params?: {
  q?: string;
  category?: string;
  status?: string;
  location?: string;
  page?: number;
  page_size?: number;
}): Promise<{
  ships: any[];
  stats?: {
    total_ships: number;
    active_ships: number;
    approved_ships: number;
    pending_ships: number;
    total_fleet_capacity: number;
  };
  pagination?: PaginationMetadata;
}> {
  return apiRequest(`/api/admin/ships/${buildQueryParams(params)}`);
}

export async function adminShipAction(
  shipId: number,
  action: 'approve' | 'revoke_approval' | 'revoke' | 'toggle_active' | 'delete'
): Promise<{ success: boolean; message: string; is_active?: boolean; is_approved?: boolean }> {
  return apiRequest('/api/admin/ships/', {
    method: 'POST',
    body: JSON.stringify({ ship_id: shipId, action }),
  });
}

export async function updateAdminShip(shipId: number, payload: any): Promise<{ success: boolean; message: string }> {
  return apiRequest('/api/admin/ships/', {
    method: 'POST',
    body: JSON.stringify({ ship_id: shipId, action: 'update_ship', ...payload }),
  });
}

export async function createAdminShip(payload: any): Promise<{ success: boolean; message: string; ship?: any }> {
  return apiRequest('/api/admin/ships/', {
    method: 'POST',
    body: JSON.stringify({ action: 'create_ship', ...payload }),
  });
}

export interface AdminTransaction {
  id: number;
  booking_id: string;
  invoice_number: string;
  transaction_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  ship_name: string;
  booking_type: string;
  booking_date: string;
  gross_amount: number;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  owner_payout_amount: number;
  platform_commission_amount: number;
  net_platform_profit: number;
  commission_rate: number;
  payout_rate: number;
  payment_method: string;
  payment_gateway_ref: string;
  payment_status: 'PAID' | 'PENDING' | 'REFUNDED' | 'FAILED';
  payout_status: 'PENDING' | 'SETTLED' | 'ON_HOLD';
  refund_amount: number;
  refund_reason: string;
  refund_date: string | null;
  failure_reason: string;
  created_at: string;
}

export async function getAdminTransactions(params?: {
  q?: string;
  status?: string;
  payout_status?: string;
  page?: number;
  page_size?: number;
}): Promise<{
  transactions: AdminTransaction[];
  stats: {
    gross_volume: number;
    total_commission: number;
    total_payouts: number;
    total_refunds: number;
    failed_count: number;
    pending_settlements: number;
    settled_payouts: number;
  };
  pagination?: PaginationMetadata;
}> {
  return apiRequest(`/api/admin/transactions/${buildQueryParams(params)}`);
}

export async function adminProcessRefund(bookingId: string, refundAmount: number, refundReason: string): Promise<{ success: boolean; message: string }> {
  return apiRequest('/api/admin/transactions/', {
    method: 'POST',
    body: JSON.stringify({ action: 'process_refund', booking_id: bookingId, refund_amount: refundAmount, refund_reason: refundReason }),
  });
}

export async function adminSettlePayout(bookingId: string): Promise<{ success: boolean; message: string }> {
  return apiRequest('/api/admin/transactions/', {
    method: 'POST',
    body: JSON.stringify({ action: 'settle_payout', booking_id: bookingId }),
  });
}

export async function adminHoldPayout(bookingId: string): Promise<{ success: boolean; message: string }> {
  return apiRequest('/api/admin/transactions/', {
    method: 'POST',
    body: JSON.stringify({ action: 'hold_payout', booking_id: bookingId }),
  });
}

export async function adminRetryPayment(bookingId: string): Promise<{ success: boolean; message: string }> {
  return apiRequest('/api/admin/transactions/', {
    method: 'POST',
    body: JSON.stringify({ action: 'retry_payment', booking_id: bookingId }),
  });
}

export interface PlatformNotificationItem {
  id: number;
  title: string;
  message: string;
  notification_type: 'IMPORTANT_UPDATE' | 'OFFER' | 'ANNOUNCEMENT';
  target_audience: 'ALL_USERS' | 'ALL_OWNERS' | 'SPECIFIC_USER';
  target_user_id?: number | null;
  target_user_name?: string;
  action_link?: string;
  sender_name: string;
  is_read: boolean;
  recipients_count: number;
  created_at: string;
  promo_code?: string | null;
  offer_active?: boolean;
}

export async function getAdminNotifications(): Promise<{
  notifications: PlatformNotificationItem[];
  stats: {
    total_sent: number;
    updates_count: number;
    offers_count: number;
    announcements_count: number;
    total_reach: number;
  };
}> {
  return apiRequest('/api/admin/notifications/');
}

export async function createAdminNotification(payload: {
  title: string;
  message: string;
  notification_type: 'IMPORTANT_UPDATE' | 'OFFER' | 'ANNOUNCEMENT';
  target_audience: 'ALL_USERS' | 'ALL_OWNERS' | 'SPECIFIC_USER';
  target_user_id?: number;
  action_link?: string;
  sender_name?: string;
  promo_code?: string;
  discount_type?: 'PERCENTAGE' | 'FLAT';
  discount_value?: number;
  min_booking_amount?: number;
  valid_days?: number;
  auto_create_offer?: boolean;
}): Promise<{ success: boolean; message: string; notification?: any; offer?: any }> {
  return apiRequest('/api/admin/notifications/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getUserNotifications(): Promise<{
  notifications: Array<{
    id: number;
    title: string;
    message: string;
    notification_type: string;
    action_link: string;
    sender_name: string;
    is_read: boolean;
    promo_code?: string | null;
    created_at: string;
  }>;
  unread_count: number;
}> {
  return apiRequest('/api/notifications/my-notifications/', { bypassCache: true });
}

export async function markNotificationRead(notificationId: number): Promise<{ success: boolean }> {
  return apiRequest(`/api/notifications/${notificationId}/read/`, {
    method: 'POST',
  });
}

export async function markAllNotificationsRead(): Promise<{ success: boolean; count: number }> {
  return apiRequest('/api/notifications/mark-all-read/', {
    method: 'POST',
  });
}

export interface GeneratedReportResult {
  report_type: string;
  title: string;
  range_label: string;
  generated_at: string;
  summary: Record<string, any>;
  columns: string[];
  rows: any[];
}

export async function generateAdminReport(params: {
  report_type: 'financial_ledger' | 'bookings_manifest' | 'fleet_performance' | 'customer_growth';
  preset?: string;
  date_from?: string;
  date_to?: string;
}): Promise<GeneratedReportResult> {
  const query = new URLSearchParams();
  query.append('report_type', params.report_type);
  if (params.preset) query.append('preset', params.preset);
  if (params.date_from) query.append('date_from', params.date_from);
  if (params.date_to) query.append('date_to', params.date_to);
  return apiRequest(`/api/admin/reports/generate/?${query.toString()}`);
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

export interface AdminTourFilterParams {
  q?: string;
  destination?: string;
  departure_port?: string;
  status?: string;
}

export async function getAdminTours(params: AdminTourFilterParams = {}): Promise<{
  tours: PublicTour[];
  total?: number;
  stats?: {
    total_tours: number;
    published_tours: number;
    total_capacity: number;
    remaining_capacity: number;
    avg_ticket_price: number;
  };
}> {
  const query = new URLSearchParams();
  if (params.q) query.set('q', params.q);
  if (params.destination) query.set('destination', params.destination);
  if (params.departure_port) query.set('departure_port', params.departure_port);
  if (params.status) query.set('status', params.status);
  const qs = query.toString();
  return apiRequest(qs ? `/api/admin/tours/?${qs}` : '/api/admin/tours/');
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

export async function adminWarnShipOwner(
  reviewId: number,
  warningMessage?: string
): Promise<{ success: boolean; message: string; owner_name?: string; warning_sent_at?: string }> {
  return apiRequest('/api/admin/reviews/warn-owner/', {
    method: 'POST',
    body: JSON.stringify({ review_id: reviewId, warning_message: warningMessage }),
  });
}

export async function adminResolveReview(reviewId: number): Promise<{ success: boolean; message: string }> {
  return apiRequest(`/api/admin/reviews/${reviewId}/resolve/`, {
    method: 'POST',
  });
}

export async function adminReopenReview(reviewId: number): Promise<{ success: boolean; message: string }> {
  return apiRequest(`/api/admin/reviews/${reviewId}/reopen/`, {
    method: 'POST',
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

export async function getAdminWhatsAppCredentials(): Promise<{
  is_live: boolean;
  provider: string;
  has_token: boolean;
  masked_token: string;
  phone_number_id: string;
  business_account_id: string;
}> {
  return apiRequest('/api/admin/whatsapp/credentials/');
}

export async function updateAdminWhatsAppCredentials(
  payload: WhatsAppCredentialsPayload
): Promise<{ success: boolean; message: string; is_live: boolean; provider: string }> {
  return apiRequest('/api/admin/whatsapp/credentials/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function testAdminWhatsAppConnection(): Promise<WhatsAppConnectionTestResult> {
  return apiRequest('/api/admin/whatsapp/test-connection/', {
    method: 'POST',
  });
}


