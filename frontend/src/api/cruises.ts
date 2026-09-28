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
  budget?: number;
  guests?: number;
  purpose?: string;
  date?: string;
  sort_by?: string;
  ordering?: string;
}

export interface CruiseListResponse {
  cruises: Cruise[];
  total: number;
  destinations?: string[];
  categories?: string[];
  filters?: {
    destinations: string[];
    categories: string[];
    durations: number[];
  };
}

export interface MatchEngineParams {
  purpose: string;
  guests: number;
  date?: string;
  budget?: number;
  location?: string;
  duration?: number;
}

export interface MatchEngineResponse {
  total_exact: number;
  total_alternatives: number;
  exact_matches: Array<Cruise & { match_reasons?: string[]; is_exact_match?: boolean }>;
  close_alternatives: Array<Cruise & { match_reasons?: string[]; alternative_notes?: string[]; is_exact_match?: boolean }>;
  results: Array<Cruise & { match_reasons?: string[]; alternative_notes?: string[]; is_exact_match?: boolean }>;
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
  if (params.budget) query.set('budget', params.budget.toString());
  if (params.guests) query.set('guests', params.guests.toString());
  if (params.purpose) query.set('purpose', params.purpose);
  if (params.date) query.set('date', params.date);
  if (params.sort_by) query.set('sort_by', params.sort_by);
  else if (params.ordering) query.set('sort_by', params.ordering);

  const qs = query.toString();
  const url = qs ? `/api/cruises/?${qs}` : '/api/cruises/';
  return apiRequest<CruiseListResponse>(url);
}

export async function getCruiseDetail(slug: string): Promise<Cruise> {
  const res = await apiRequest<any>(`/api/cruises/${slug}/`);
  return res.cruise || res;
}

export async function matchShips(params: MatchEngineParams): Promise<MatchEngineResponse> {
  return apiRequest<MatchEngineResponse>('/api/cruises/match/', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}
