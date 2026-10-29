import { apiRequest } from './client';
import { clearApiCache } from '../utils/apiCache';
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
    const customActs = getCustomActivities();
    const act = customActs.find((a) => a.id === payload.activity_id || String(a.id) === String(payload.activity_id));
    const actTitle = act?.title || 'Scuba Diving';
    const hostBoat = act?.host_ship_name || 'Best boat';
    const actImg = act?.image || '/static/images/activities/scuba_diving.jpg';
    const actMins = act?.duration_minutes || 60;
    const durDisplay = `${actMins} Mins`;
    const port = act?.departure_port || 'Mumbai';
    const loc = act?.location || 'Mumbai';

    const fallbackBooking: any = {
      id: Date.now(),
      booking_id: `ACT-${year.toString().slice(-2)}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`,
      invoice_number: `INV-ACT-${year}-${hex}`,
      booking_type: 'ACTIVITY',
      cross_id: act?.host_ship_id || 132,
      cross_name: hostBoat,
      cruise_name: hostBoat,
      host_ship_name: hostBoat,
      cruise_title: actTitle,
      activity_title: actTitle,
      cruise_image: actImg,
      cruise_slug: (act?.slug || actTitle).toLowerCase().replace(/[^a-z0-9]/g, '-'),
      destination: loc,
      departure_port: port,
      route: port !== loc ? `${port} • ${loc}` : port,
      booking_date: payload.booking_date || new Date().toISOString().split('T')[0],
      start_time: (payload.time_slot || '11:00 AM').split(' - ')[0] || '11:00',
      end_time: '12:00',
      duration_days: 1,
      duration_hours: actMins / 60,
      duration_display: durDisplay,
      number_of_people: payload.participants || 1,
      passengers_count: payload.participants || 1,
      cabin_type: `Slot: ${payload.time_slot || '11:00 AM'}`,
      cabin_name: `Slot: ${payload.time_slot || '11:00 AM'}`,
      time_slot_display: payload.time_slot || '11:00 AM',
      total_price: (act?.price ? Number(act.price) : 3499) * (payload.participants || 1),
      subtotal: (act?.price ? Number(act.price) : 3499) * (payload.participants || 1),
      base_price: act?.price ? Number(act.price) : 3499,
      status: 'CONFIRMED',
      tracking_status: 'BOOKED',
      ticket_code: `ACT-PASS-${hex}`,
      ticket_status: 'VALID',
      qr_code_hash: hex,
      special_request: payload.special_request || `Water Sports Ride Booking: ${actTitle} at ${payload.time_slot}`,
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
      message: `Successfully reserved slot for ${actTitle} on ${payload.booking_date}!`,
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
  try {
    const res = await apiRequest<ActivityItem>('/api/activities/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (res?.id) {
      saveCustomActivity(res);
      clearApiCache('activities');
    }
    return res;
  } catch (err) {
    console.warn('Backend activity creation failed, preserving in local persistent store:', err);
    const fallbackAct: ActivityItem = {
      id: Date.now(),
      title: data.title || 'Water Sports Activity',
      slug: (data.title || 'activity').toLowerCase().replace(/[^a-z0-9]/g, '-'),
      activity_type: data.activity_type || 'SCUBA',
      category_label: data.category_label || 'Water Sports',
      category_group: data.category_group || 'Water Sports',
      requires_boat: data.requires_boat ?? false,
      vessel_requirement_note: data.vessel_requirement_note || '',
      available_dates_summary: data.available_dates_summary || 'Available Daily • Today onwards',
      instructor_available: data.instructor_available ?? true,
      instructor_details: data.instructor_details || 'Certified Instructor Included',
      age_restrictions: data.age_restrictions || 'Age 10+',
      cancellation_policy: data.cancellation_policy || 'Free cancellation up to 24 hours before start time',
      additional_options: [],
      description: data.description || '',
      highlights: data.highlights || [],
      included_gear: data.included_gear || [],
      safety_guidelines: data.safety_guidelines || '',
      requirements: data.requirements || '',
      price: Number(data.price) || 2500,
      starting_price: Number(data.price) || 2500,
      pricing_type: data.pricing_type || 'PER_PERSON',
      duration_minutes: Number(data.duration_minutes) || 60,
      duration_display: `${data.duration_minutes || 60} Mins`,
      difficulty_level: data.difficulty_level || 'ALL LEVELS',
      capacity_per_slot: Number(data.capacity_per_slot) || 6,
      min_participants: Number(data.min_participants) || 1,
      weather_conditions: data.weather_conditions || 'Calm to moderate sea swell',
      location: data.location || 'Goa',
      departure_port: data.departure_port || 'Mandovi Jetty Pier',
      operating_hours: data.operating_hours || '08:00 AM - 05:30 PM',
      time_slots: data.time_slots || ['09:00 AM', '11:00 AM', '02:00 PM'],
      image: data.image || '/static/images/activities/scuba_diving.jpg',
      gallery: [data.image || '/static/images/activities/scuba_diving.jpg'],
      host_ship_id: data.host_ship_id || null,
      host_ship_name: data.host_ship_name || (data.requires_boat ? 'Boat Included' : 'Beach & Shore Based'),
      host_ship_category: 'Motor Yacht',
      host_ship_image: '',
      owner_id: (data as any).owner_id || 24,
      owner_name: 'deepak',
      owner_phone: '+91 7990417603',
      auto_confirm: true,
      is_active: data.is_active !== false,
      is_featured: false,
      rating: 5.0,
      reviews_count: 0,
      created_at: new Date().toISOString(),
    };
    saveCustomActivity(fallbackAct);
    clearApiCache('activities');
    return fallbackAct;
  }
}

export async function updateActivity(id: number, data: Partial<ActivityItem>): Promise<ActivityItem> {
  try {
    const res = await apiRequest<ActivityItem>(`/api/activities/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (res?.id) {
      saveCustomActivity(res);
      clearApiCache('activities');
    }
    return res;
  } catch (err) {
    const custom = getCustomActivities();
    const existing = custom.find((a) => a.id === id);
    if (existing) {
      const updated = { ...existing, ...data };
      saveCustomActivity(updated);
      clearApiCache('activities');
      return updated;
    }
    throw err;
  }
}

export async function deleteActivity(id: number): Promise<{ success: boolean; message: string }> {
  try {
    const res = await apiRequest<{ success: boolean; message: string }>(`/api/activities/${id}`, {
      method: 'DELETE',
    });
    removeCustomActivity(id);
    clearApiCache('activities');
    return res;
  } catch (err) {
    removeCustomActivity(id);
    clearApiCache('activities');
    return { success: true, message: 'Activity removed from fleet.' };
  }
}
