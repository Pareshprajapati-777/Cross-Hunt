import { apiRequest } from './client';
import { Booking } from './types';

export interface CreateBookingPayload {
  cruise_id: number;
  booking_type: 'CRUISE_TOUR' | 'PRIVATE_EVENT';
  booking_date: string;
  start_time: string;
  end_time: string;
  passengers_count: number;
  cabin_type?: string;
  event_type?: string;
  event_package?: string;
  special_requests?: string;
}

export async function createBooking(payload: CreateBookingPayload): Promise<{ success: boolean; booking: Booking }> {
  return apiRequest('/api/bookings/create/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getMyBookings(): Promise<{ bookings: Booking[] }> {
  return apiRequest('/api/bookings/my-bookings/');
}

export async function getBookingDetail(bookingId: string): Promise<{ booking: Booking }> {
  return apiRequest(`/api/bookings/${bookingId}/`);
}

export async function cancelBooking(bookingId: string): Promise<{ success: boolean; message: string }> {
  return apiRequest(`/api/bookings/${bookingId}/cancel/`, {
    method: 'POST',
  });
}

export async function submitReview(
  bookingId: string,
  rating: number,
  comment: string
): Promise<{ success: boolean; message: string }> {
  return apiRequest(`/api/bookings/${bookingId}/review/`, {
    method: 'POST',
    body: JSON.stringify({ rating, comment }),
  });
}
