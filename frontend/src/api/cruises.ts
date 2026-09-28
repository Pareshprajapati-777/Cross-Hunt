import { apiRequest } from './client';
import { Cruise } from './types';

export interface CruiseFilterParams {
  q?: string;
  destination?: string;
  category?: string;
  duration?: string | number;
  cabin?: string;
  min_price?: number;
  max_price?: number;
  ordering?: string;
}

export interface CruiseListResponse {
  cruises: Cruise[];
  total: number;
  filters: {
    destinations: string[];
    categories: string[];
    durations: number[];
  };
}

export async function getCruises(params: CruiseFilterParams = {}): Promise<CruiseListResponse> {
  const query = new URLSearchParams();
  if (params.q) query.set('q', params.q);
  if (params.destination) query.set('destination', params.destination);
  if (params.category) query.set('category', params.category);
  if (params.duration) query.set('duration', params.duration.toString());
  if (params.cabin) query.set('cabin', params.cabin);
  if (params.min_price) query.set('min_price', params.min_price.toString());
  if (params.max_price) query.set('max_price', params.max_price.toString());
  if (params.ordering) query.set('ordering', params.ordering);

  const qs = query.toString();
  const url = qs ? `/api/cruises/?${qs}` : '/api/cruises/';
  return apiRequest<CruiseListResponse>(url);
}

export async function getCruiseDetail(slug: string): Promise<Cruise> {
  const res = await apiRequest<{ cruise: Cruise }>(`/api/cruises/${slug}/`);
  return res.cruise;
}
