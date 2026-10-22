import { apiRequest } from './client';
import { Cruise } from './types';

export interface FavoriteItem {
  id: number;
  cruise_id: number;
  created_at: string;
  cruise: Cruise;
}

export interface FavoritesResponse {
  success: boolean;
  count: number;
  ship_ids: number[];
  favorites: FavoriteItem[];
}

export interface ToggleFavoriteResponse {
  success: boolean;
  favorited: boolean;
  ship_id: number;
  message: string;
}

export async function getMyFavorites(): Promise<FavoritesResponse> {
  return apiRequest<FavoritesResponse>('/api/favorites/');
}

export async function toggleFavoriteShip(shipId: number): Promise<ToggleFavoriteResponse> {
  return apiRequest<ToggleFavoriteResponse>(`/api/favorites/toggle/${shipId}/`, {
    method: 'POST',
  });
}
