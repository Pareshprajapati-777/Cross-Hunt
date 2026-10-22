/**
 * Image URL helper with cache-busting for updated cruise assets
 */
export function getTourImageUrl(url?: string | null): string {
  if (!url || typeof url !== 'string') {
    return '/static/images/placeholder.png';
  }
  const cleanUrl = url.trim();
  if (cleanUrl.startsWith('/static/images/tours/') && !cleanUrl.includes('?v=')) {
    return `${cleanUrl}?v=20261020_v2`;
  }
  return cleanUrl;
}
