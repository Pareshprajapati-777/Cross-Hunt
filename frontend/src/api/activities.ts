import { apiRequest } from './client';
import { ActivityItem, ActivityCategory, ActivityBookingPayload, Booking } from './types';

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
  return apiRequest<ActivityListResponse>(url);
}

export async function getActivity(slugOrId: string | number): Promise<ActivityItem> {
  return apiRequest<ActivityItem>(`/api/activities/${slugOrId}`);
}

export async function bookActivity(payload: ActivityBookingPayload): Promise<ActivityBookingResponse> {
  return apiRequest<ActivityBookingResponse>('/api/activities/book', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getOperatorActivities(): Promise<{ activities: ActivityItem[]; total: number }> {
  return apiRequest<{ activities: ActivityItem[]; total: number }>('/api/activities/operator/my-activities');
}

export async function createActivity(data: Partial<ActivityItem>): Promise<ActivityItem> {
  return apiRequest<ActivityItem>('/api/activities/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateActivity(id: number, data: Partial<ActivityItem>): Promise<ActivityItem> {
  return apiRequest<ActivityItem>(`/api/activities/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteActivity(id: number): Promise<{ success: boolean; message: string }> {
  return apiRequest<{ success: boolean; message: string }>(`/api/activities/${id}`, {
    method: 'DELETE',
  });
}
