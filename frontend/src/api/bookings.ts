import { apiRequest } from './client';
import { Booking, InvoiceData } from './types';

export interface CreateBookingPayload {
  cruise_id?: number;
  cruise_slug?: string;
  rate_id?: number;
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
  customer_whatsapp?: string;
  whatsapp_reminder_opt_in?: boolean;
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

export async function verifyTicket(code: string): Promise<any> {
  return apiRequest(`/api/tickets/verify/${encodeURIComponent(code)}/`);
}

export async function markTicketUsed(code: string): Promise<{ success: boolean; message: string; ticket_status?: string }> {
  return apiRequest(`/api/tickets/verify/${encodeURIComponent(code)}/mark-used/`, {
    method: 'POST',
  });
}

export async function updateBookingWhatsAppOpt(
  bookingId: string,
  optIn: boolean,
  whatsappNumber?: string
): Promise<{ success: boolean; message: string; booking: Booking }> {
  return apiRequest(`/api/bookings/${bookingId}/whatsapp-opt/`, {
    method: 'POST',
    body: JSON.stringify({ opt_in: optIn, whatsapp_number: whatsappNumber }),
  });
}

export async function sendTestWhatsAppReminder(
  bookingId: string
): Promise<{ success: boolean; message: string; result?: any; booking?: Booking; wa_link?: string; is_live_api?: boolean; provider?: string }> {
  return apiRequest(`/api/bookings/${bookingId}/whatsapp-test/`, {
    method: 'POST',
  });
}

export async function getBookingWhatsAppLink(
  bookingId: string
): Promise<{ success: boolean; booking_id: string; recipient: string; recipient_masked?: string; wa_link: string; message_text: string }> {
  return apiRequest(`/api/bookings/${bookingId}/whatsapp-link/`);
}

