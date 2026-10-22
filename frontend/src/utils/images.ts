const BACKEND_URL = (
  (typeof import.meta !== 'undefined' && import.meta.env && (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL)) ||
  ''
).trim().replace(/\/+$/, '');

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
