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
