import { apiRequest } from './client';
import { Booking, Cruise, PublicTour, Offer } from './types';

export interface OperatorDashboardData {
  stats: {
    total_ships: number;
    active_ships?: number;
    active_bookings: number;
    pending_bookings?: number;
    confirmed_bookings?: number;
    completed_trips: number;
    total_revenue: number;
    private_revenue?: number;
    tour_revenue?: number;
  };
  my_ships: Cruise[];
  my_tours?: PublicTour[];
  recent_bookings: Booking[];
}

export interface AdminDashboardData {
  stats: {
    total_users: number;
    total_operators: number;
    total_ships: number;
    active_ships?: number;
    total_tours?: number;
    active_tours?: number;
    total_bookings: number;
    private_bookings?: number;
    tour_bookings?: number;
    pending_bookings?: number;
    confirmed_bookings?: number;
    total_revenue: number;
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
  const query = new URLSearchParams(params as any).toString();
  return apiRequest(`/api/admin/users/${query ? `?${query}` : ''}`);
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
  const query = new URLSearchParams(params as any).toString();
  return apiRequest(`/api/admin/bookings/${query ? `?${query}` : ''}`);
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
