import { apiRequest } from './client';
import { Booking, InvoiceData } from './types';

export interface CreateBookingPayload {
  cruise_id?: number;
  cruise_slug?: string;
  public_tour_id?: number;
  public_tour_slug?: string;
  booking_type: 'TOUR' | 'EVENT' | 'CRUISE_TOUR' | 'PRIVATE_EVENT';
  booking_date?: string;
  start_time?: string;
  end_time?: string;
  passengers_count?: number;
  adults_count?: number;
  children_count?: number;
  number_of_people?: number;
  cabin_type?: string;
  event_type?: string;
  event_package?: string;
  selected_extras?: Array<{ name: string; price?: number } | string>;
  promo_code?: string;
  special_requests?: string;
  special_request?: string;
}

export async function createBooking(payload: CreateBookingPayload): Promise<{ success: boolean; message?: string; booking: Booking }> {
  return apiRequest('/api/bookings/create/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getMyBookings(): Promise<{ total: number; bookings: Booking[] }> {
  return apiRequest('/api/bookings/my-bookings/');
}

export async function getBookingDetail(bookingId: string): Promise<{ booking: Booking }> {
  return apiRequest(`/api/bookings/${bookingId}/`);
}

export async function getBookingInvoice(bookingId: string): Promise<{ invoice: InvoiceData }> {
  return apiRequest(`/api/bookings/${bookingId}/invoice/`);
}

export async function cancelBooking(bookingId: string, reason?: string): Promise<{ success: boolean; message: string; booking?: Booking }> {
  return apiRequest(`/api/bookings/${bookingId}/cancel/`, {
    method: 'POST',
    body: JSON.stringify({ reason: reason || 'Cancelled by customer' }),
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
