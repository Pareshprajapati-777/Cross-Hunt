import { API_BASE_URL } from '../api/client';

const BACKEND_URL = API_BASE_URL;

/**
 * Image URL helper with cache-busting for updated cruise assets and production CDN/backend support
 */
export function getTourImageUrl(url?: string | null): string {
  if (!url || typeof url !== 'string') {
    return '/static/images/placeholder.png';
  }
  const cleanUrl = url.trim();
  let finalUrl = cleanUrl;
  if (cleanUrl.startsWith('/static/images/tours/') && !cleanUrl.includes('?v=')) {
    finalUrl = `${cleanUrl}?v=20261020_v2`;
  }
  if (BACKEND_URL && finalUrl.startsWith('/')) {
    return `${BACKEND_URL}${finalUrl}`;
  }
  return finalUrl;
}
