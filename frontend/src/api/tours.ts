import { apiRequest } from './client';
import { PublicTour } from './types';

export interface TourFilterParams {
  destination?: string;
  departure_port?: string;
  date?: string;
}

export interface TourListResponse {
  tours: PublicTour[];
  total: number;
}

export async function getTours(params: TourFilterParams = {}): Promise<TourListResponse> {
  const query = new URLSearchParams();
  if (params.destination) query.set('destination', params.destination);
  if (params.departure_port) query.set('departure_port', params.departure_port);
  if (params.date) query.set('date', params.date);

  const qs = query.toString();
  const url = qs ? `/api/tours/?${qs}` : '/api/tours/';
  return apiRequest<TourListResponse>(url);
}

export async function getTourDetail(slug: string): Promise<PublicTour> {
  const res = await apiRequest<{ tour: PublicTour } | PublicTour>(`/api/tours/${slug}/`);
  return 'tour' in res ? res.tour : res;
}
