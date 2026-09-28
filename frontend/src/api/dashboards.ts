import { apiRequest } from './client';
import { Booking, Cruise } from './types';

export interface OperatorDashboardData {
  stats: {
    total_ships: number;
    active_bookings: number;
    completed_trips: number;
    total_revenue: number;
  };
  my_ships: Cruise[];
  recent_bookings: Booking[];
}

export interface AdminDashboardData {
  stats: {
    total_users: number;
    total_operators: number;
    total_ships: number;
    total_bookings: number;
    total_revenue: number;
  };
  recent_bookings: Booking[];
  all_ships: Cruise[];
}

export async function getOperatorDashboard(): Promise<OperatorDashboardData> {
  return apiRequest<OperatorDashboardData>('/api/operator/dashboard/');
}

export async function operatorBookingAction(
  bookingId: string,
  action: 'confirm' | 'cancel'
): Promise<{ success: boolean; message: string }> {
  return apiRequest(`/api/operator/bookings/${bookingId}/${action}/`, {
    method: 'POST',
  });
}

export async function getAdminDashboard(): Promise<AdminDashboardData> {
  return apiRequest<AdminDashboardData>('/api/admin/dashboard/');
}
