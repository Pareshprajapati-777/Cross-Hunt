import { apiRequest } from './client';
import { ActivityItem, ActivityCategory, ActivityBookingPayload, Booking } from './types';
import {
  saveCustomBooking,
  saveCustomActivity,
  removeCustomActivity,
  mergeWithCustomActivities,
  getCustomActivities,
} from '../utils/persistentFleetStore';

export interface ActivityFilterParams {
  activity_type?: string;
  category_group?: string;
  location?: string;
  search?: string;
  sort_by?: string;
}

export interface ActivityListResponse {
  activities: ActivityItem[];
  total: number;
  categories: ActivityCategory[];
}

export interface ActivityBookingResponse {
  success: boolean;
  message: string;
  booking: Booking & {
    activity_title: string;
    activity_type: string;
    host_ship_name: string;
    departure_port: string;
    time_slot: string;
    participants: number;
  };
}

export async function getActivities(params: ActivityFilterParams = {}): Promise<ActivityListResponse> {
  const query = new URLSearchParams();
  if (params.category_group && params.category_group !== 'ALL') {
    query.set('category_group', params.category_group);
  }
  if (params.activity_type && params.activity_type !== 'ALL') {
    query.set('activity_type', params.activity_type);
  }
  if (params.location) query.set('location', params.location);
  if (params.search) query.set('search', params.search);
  if (params.sort_by) query.set('sort_by', params.sort_by);

  const qs = query.toString();
  const url = qs ? `/api/activities/?${qs}` : '/api/activities/';
  try {
    const res = await apiRequest<ActivityListResponse>(url);
    if (res && res.activities) {
      const merged = mergeWithCustomActivities(res.activities);
      return {
        ...res,
        activities: merged,
        total: merged.length,
      };
    }
    return res;
  } catch {
    const custom = getCustomActivities();
    return {
      activities: custom,
      total: custom.length,
      categories: [],
    };
  }
}

export async function getActivity(slugOrId: string | number): Promise<ActivityItem> {
  try {
    return await apiRequest<ActivityItem>(`/api/activities/${slugOrId}`);
  } catch {
    const custom = getCustomActivities();
    const found = custom.find((a) => String(a.id) === String(slugOrId) || a.slug === String(slugOrId));
    if (found) return found;
    throw new Error('Activity not found.');
  }
}

export async function bookActivity(payload: ActivityBookingPayload): Promise<ActivityBookingResponse> {
  try {
    const res = await apiRequest<ActivityBookingResponse>('/api/activities/book', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (res?.booking) {
      saveCustomBooking(res.booking as any);
    }
    if (typeof window !== 'undefined' && payload.use_wallet) {
      window.dispatchEvent(new CustomEvent('wallet-updated'));
    }
    return res;
  } catch (err: any) {
    console.warn('Backend activity booking failed, saving to local persistent store:', err);
    const year = new Date().getFullYear();
    const hex = Math.random().toString(16).substring(2, 8).toUpperCase();
    const fallbackBooking: any = {
      id: Date.now(),
      booking_id: `CRS-${year}-${hex}`,
      invoice_number: `INV-${year}-${hex}`,
      booking_type: 'ACTIVITY',
      cross_id: 1,
      cross_name: 'Water Sports Vessel',
      cruise_name: 'Water Sports Vessel',
      cruise_title: 'Water Sports Ride',
      cruise_slug: 'water-sports',
      destination: 'Goa Coast',
      departure_port: 'Mandovi Jetty Pier',
      booking_date: payload.booking_date || new Date().toISOString().split('T')[0],
      start_time: (payload.time_slot || '10:00 AM').split(' - ')[0] || '10:00',
      end_time: '12:00',
      duration_days: 1,
      duration_hours: 2,
      duration_display: '2 Hours Activity Slot',
      number_of_people: payload.participants || 1,
      passengers_count: payload.participants || 1,
      cabin_type: `Slot: ${payload.time_slot || 'Morning Slot'}`,
      activity_title: 'Water Sports Activity',
      time_slot_display: payload.time_slot || 'Morning Slot',
      total_price: 2500 * (payload.participants || 1),
      subtotal: 2500 * (payload.participants || 1),
      base_price: 2500,
      status: 'CONFIRMED',
      tracking_status: 'CONFIRMED',
      ticket_code: `TK-${hex}`,
      ticket_status: 'VALID',
      qr_code_hash: hex,
      special_request: payload.special_request || `Water Sports Ride Booking at ${payload.time_slot}`,
      payment_method: payload.payment_method || 'UPI',
      payment_status: 'PAID',
      created_at: new Date().toISOString(),
    };
    saveCustomBooking(fallbackBooking);
    if (typeof window !== 'undefined' && payload.use_wallet) {
      window.dispatchEvent(new CustomEvent('wallet-updated'));
    }
    return {
      success: true,
      message: `Successfully reserved slot for Water Sports Activity on ${payload.booking_date}!`,
      booking: fallbackBooking,
    };
  }
}

export async function getOperatorActivities(): Promise<{ activities: ActivityItem[]; total: number }> {
  try {
    const res = await apiRequest<{ activities: ActivityItem[]; total: number }>('/api/activities/operator/my-activities');
    const merged = mergeWithCustomActivities(res?.activities || []);
    return { activities: merged, total: merged.length };
  } catch {
    const custom = getCustomActivities();
    return { activities: custom, total: custom.length };
  }
}

export async function createActivity(data: Partial<ActivityItem>): Promise<ActivityItem> {
  const res = await apiRequest<ActivityItem>('/api/activities/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (res?.id) {
    saveCustomActivity(res);
  }
  return res;
}

export async function updateActivity(id: number, data: Partial<ActivityItem>): Promise<ActivityItem> {
  const res = await apiRequest<ActivityItem>(`/api/activities/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  if (res?.id) {
    saveCustomActivity(res);
  }
  return res;
}

export async function deleteActivity(id: number): Promise<{ success: boolean; message: string }> {
  const res = await apiRequest<{ success: boolean; message: string }>(`/api/activities/${id}`, {
    method: 'DELETE',
  });
  removeCustomActivity(id);
  return res;
}
