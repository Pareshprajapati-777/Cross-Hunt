// Helper to extract CSRF token from browser cookies
function getCookie(name: string): string | null {
  let cookieValue: string | null = null;
  if (typeof document !== 'undefined' && document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

export class ApiError extends Error {
  status: number;
  statusText: string;
  data: any;
  endpoint: string;
  isNetworkError: boolean;

  constructor(
    message: string,
    status: number = 0,
    statusText: string = '',
    data: any = null,
    endpoint: string = ''
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.statusText = statusText;
    this.data = data;
    this.endpoint = endpoint;
    this.isNetworkError = status === 0;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

export const AUTH_TOKEN_KEY = 'cruisehunt_auth_token';

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY) || localStorage.getItem('crosshunt_auth_token');
  } catch {
    return null;
  }
}

export function setAuthToken(token: string | null): void {
  try {
    if (token && typeof token === 'string' && token.trim()) {
      localStorage.setItem(AUTH_TOKEN_KEY, token.trim());
    } else {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem('crosshunt_auth_token');
    }
  } catch {
    // Ignore storage errors in restricted browser contexts
  }
}

// Active live backend service on Render
export const DEFAULT_PROD_API_URL = 'https://cross-hunt.onrender.com';

function resolveApiBaseUrl(): string {
  let envUrl =
    (typeof import.meta !== 'undefined' &&
      import.meta.env &&
      (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL)) ||
    '';

  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    let clean = envUrl.trim().replace(/\/+$/, '');
    // Automatically sanitize non-existent or misconfigured Render URL to the live active service
    if (clean.includes('cruise-hunt.onrender.com')) {
      clean = clean.replace('cruise-hunt.onrender.com', 'cross-hunt.onrender.com');
    }
    return clean;
  }

  // If running in browser and NOT on local machine (e.g. deployed on Vercel, Netlify, custom domain),
  // automatically default to the live Render backend
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const isLocal =
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname.endsWith('.local');
    if (!isLocal) {
      return DEFAULT_PROD_API_URL;
    }
  }

  // If in a production build, default to the live Render backend
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.PROD) {
    return DEFAULT_PROD_API_URL;
  }

  return '';
}

export const API_BASE_URL = resolveApiBaseUrl();

export function getFullApiUrl(endpoint: string): string {
  if (!endpoint) return '';
  let cleanEndpoint = endpoint;
  if (cleanEndpoint.startsWith('http://') || cleanEndpoint.startsWith('https://')) {
    if (cleanEndpoint.includes('cruise-hunt.onrender.com')) {
      cleanEndpoint = cleanEndpoint.replace('cruise-hunt.onrender.com', 'cross-hunt.onrender.com');
    }
    return cleanEndpoint;
  }
  if (!API_BASE_URL) {
    return cleanEndpoint;
  }
  const prefix = cleanEndpoint.startsWith('/') ? cleanEndpoint : `/${cleanEndpoint}`;
  let base = API_BASE_URL;
  if (base.includes('cruise-hunt.onrender.com')) {
    base = base.replace('cruise-hunt.onrender.com', 'cross-hunt.onrender.com');
  }
  return `${base}${prefix}`;
}

import { apiCache, clearApiCache } from '../utils/apiCache';
import { CATALOG_FALLBACK } from '../data/catalogFallback';
import {
  getCustomShips,
  getCustomActivities,
  getCustomBookings,
  mergeWithCustomShips,
  mergeWithCustomCharterShips,
} from '../utils/persistentFleetStore';
export { clearApiCache };

export interface ApiRequestOptions extends RequestInit {
  cacheTtlMs?: number;
  bypassCache?: boolean;
}

// Background wake-up monitor for Render free tier
let isWakingUpProbeActive = false;
function triggerBackgroundBackendProbe(): void {
  if (isWakingUpProbeActive || typeof window === 'undefined') return;
  isWakingUpProbeActive = true;
  let attempts = 0;
  const probeInterval = setInterval(async () => {
    attempts++;
    try {
      const probeUrl = `${DEFAULT_PROD_API_URL}/api/health`;
      const res = await fetch(probeUrl, { method: 'GET', mode: 'cors' });
      if (res.ok) {
        clearInterval(probeInterval);
        isWakingUpProbeActive = false;
        clearApiCache();
        window.dispatchEvent(new CustomEvent('cruisehunt:backend-ready'));
      }
    } catch {
      // Continue probing
    }
    if (attempts >= 15) {
      clearInterval(probeInterval);
      isWakingUpProbeActive = false;
    }
  }, 4000);
}

/**
 * Fallback data provider if live backend is temporarily unreachable or spinning up from sleep
 */
function tryGetFallbackData(endpoint: string): any | null {
  try {
    const [pathPart, queryPart] = endpoint.split('?');
    const cleanPath = pathPart.replace(/\/+$/, '');
    const query = new URLSearchParams(queryPart || '');

    // 1. Cruises list (/api/cruises or /api/cruises/)
    if (cleanPath === '/api/cruises') {
      const baseCruises = CATALOG_FALLBACK.cruises?.cruises || [];
      let cruises = mergeWithCustomShips([...baseCruises]);
      const q = query.get('q')?.toLowerCase();
      const city = query.get('city') || query.get('destination');
      const cat = query.get('category') || query.get('vessel_category');
      const maxPrice = Number(query.get('max_price'));

      if (q) {
        cruises = cruises.filter(
          (c: any) =>
            (c.name || '').toLowerCase().includes(q) ||
            (c.destination || '').toLowerCase().includes(q) ||
            (c.location || '').toLowerCase().includes(q)
        );
      }
      if (city) {
        cruises = cruises.filter(
          (c: any) =>
            (c.destination || '').toLowerCase().includes(city.toLowerCase()) ||
            (c.location || '').toLowerCase().includes(city.toLowerCase())
        );
      }
      if (cat) {
        cruises = cruises.filter((c: any) => c.category === cat || c.vessel_category === cat);
      }
      if (maxPrice && !isNaN(maxPrice) && maxPrice > 0) {
        cruises = cruises.filter((c: any) => Number(c.price) <= maxPrice);
      }

      return {
        cruises,
        total: cruises.length,
        destinations: CATALOG_FALLBACK.cruises?.destinations || ['Goa', 'Andaman', 'Kochi', 'Mumbai', 'Lakshadweep'],
        categories: CATALOG_FALLBACK.cruises?.categories || [],
        filters: CATALOG_FALLBACK.cruises?.filters || { destinations: [], categories: [], durations: [] },
      };
    }

    // 2. Cruise detail (/api/cruises/:idOrSlug)
    const cruiseDetailMatch = cleanPath.match(/^\/api\/cruises\/([^/]+)$/);
    if (cruiseDetailMatch && cruiseDetailMatch[1] !== 'match') {
      const slugOrId = decodeURIComponent(cruiseDetailMatch[1]);
      const allCruises = mergeWithCustomShips([...(CATALOG_FALLBACK.cruises?.cruises || [])]);
      const found = allCruises.find(
        (c: any) => String(c.id) === slugOrId || c.slug === slugOrId
      );
      if (found) {
        return { cruise: found, ...found };
      }
    }

    // 3. Match Engine fallback (/api/cruises/match)
    if (cleanPath === '/api/cruises/match') {
      const all = CATALOG_FALLBACK.cruises?.cruises || [];
      return {
        total_exact: Math.min(3, all.length),
        total_alternatives: Math.min(6, all.length),
        exact_matches: all.slice(0, 3),
        close_alternatives: all.slice(3, 9),
        results: all.slice(0, 9),
      };
    }

    // 4. Public Tours list (/api/tours or /api/tours/)
    if (cleanPath === '/api/tours') {
      let tours = [...(CATALOG_FALLBACK.tours?.tours || [])];
      const q = query.get('q')?.toLowerCase();
      const dest = query.get('destination')?.toLowerCase();
      const port = query.get('departure_port')?.toLowerCase();
      if (q) {
        tours = tours.filter(
          (t: any) =>
            (t.tour_title || t.title || '').toLowerCase().includes(q) ||
            (t.destination || '').toLowerCase().includes(q)
        );
      }
      if (dest) {
        tours = tours.filter((t: any) => (t.destination || '').toLowerCase().includes(dest));
      }
      if (port) {
        tours = tours.filter((t: any) => (t.departure_port || '').toLowerCase().includes(port));
      }
      return { tours, total: tours.length };
    }

    // 5. Tour detail (/api/tours/:id)
    const tourDetailMatch = cleanPath.match(/^\/api\/tours\/([^/]+)$/);
    if (tourDetailMatch) {
      const tourId = tourDetailMatch[1];
      const found = (CATALOG_FALLBACK.tours?.tours || []).find(
        (t: any) => String(t.id) === tourId || t.slug === tourId
      );
      if (found) {
        return { tour: found, ...found };
      }
    }

    // 6. Water sports activities (/api/activities)
    if (cleanPath === '/api/activities') {
      const fallback = CATALOG_FALLBACK.activities || { activities: [], total: 0, categories: [] };
      const custom = getCustomActivities();
      const merged = [...custom, ...(fallback.activities || []).filter((fa: any) => !custom.some((ca) => ca.id === fa.id || ca.title === fa.title))];
      return { ...fallback, activities: merged, total: merged.length };
    }

    // 6b. Operator own activities (/api/activities/operator/my-activities)
    if (cleanPath === '/api/activities/operator/my-activities') {
      const custom = getCustomActivities();
      return { activities: custom, total: custom.length };
    }

    // 7. Activity detail (/api/activities/:slug)
    const actDetailMatch = cleanPath.match(/^\/api\/activities\/([^/]+)$/);
    if (actDetailMatch) {
      const slug = actDetailMatch[1];
      const found = (CATALOG_FALLBACK.activities?.activities || []).find(
        (a: any) => String(a.id) === slug || a.slug === slug
      );
      if (found) return found;
    }

    // 8. Public verified operators (/api/operators)
    if (cleanPath === '/api/operators') {
      return CATALOG_FALLBACK.operators || { operators: [] };
    }

    // 9. Event packages (/api/events/packages)
    if (cleanPath === '/api/events/packages') {
      const fallback = CATALOG_FALLBACK.events || { event_types: [], packages: [], charter_ships: [] };
      return {
        ...fallback,
        charter_ships: mergeWithCustomCharterShips(fallback.charter_ships || []),
      };
    }

    // 9b. User bookings fallback (/api/bookings/my-bookings or /api/bookings/my-bookings/)
    if (cleanPath === '/api/bookings/my-bookings') {
      const custom = getCustomBookings();
      return { total: custom.length, bookings: custom };
    }

    // 10. Offers (/api/offers)
    if (cleanPath === '/api/offers') {
      return CATALOG_FALLBACK.offers || { offers: [] };
    }

    // 11. Health check
    if (cleanPath === '/api/health' || cleanPath === '/health') {
      return { status: 'ok', framework: 'FastAPI', version: '1.0.0', fallback: true };
    }

    // 12. Operator Dashboard & Ships fallback
    if (cleanPath === '/api/operator/dashboard' || cleanPath === '/api/operator/ships') {
      if (typeof window !== 'undefined' && window.localStorage) {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('cruisehunt_operator_dashboard_')) {
            const raw = localStorage.getItem(key);
            if (raw) {
              try {
                const parsed = JSON.parse(raw);
                if (cleanPath === '/api/operator/ships') {
                  return { ships: parsed.my_ships || parsed.vessels || [] };
                }
                return parsed;
              } catch {}
            }
          }
        }
      }
      const rawDeepakShips = (CATALOG_FALLBACK.cruises?.cruises || []).filter(
        (c: any) => c.operator_id === 24 || c.owner_id === 24 || c.operator_name === 'deepak' || c.management_name === 'deepak'
      );
      const customShips = getCustomShips();
      const deepakShips = [
        ...customShips,
        ...rawDeepakShips.filter((ds: any) => !customShips.some((cs) => cs.id === ds.id || cs.name.trim().toLowerCase() === ds.name.trim().toLowerCase()))
      ];
      if (cleanPath === '/api/operator/ships') {
        return { ships: deepakShips };
      }
      return {
        stats: {
          total_ships: deepakShips.length,
          available_ships: deepakShips.filter((s: any) => s.operational_status === 'AVAILABLE').length,
          total_revenue: 0,
          gross_revenue: 0,
          owner_payout: 0,
          platform_commission: 0,
          active_bookings: 0,
          completed_trips: 0,
        },
        my_ships: deepakShips,
        vessels: deepakShips,
        my_tours: [],
        recent_bookings: [],
        analytics: {
          monthly_trend: [],
          category_split: { private_count: 0, private_revenue: 0, private_percent: 0, tour_count: 0, tour_revenue: 0, tour_percent: 0 },
          status_breakdown: { confirmed: 0, completed: 0, pending: 0, cancelled: 0, total: 0 },
          ship_performance: [],
          top_destinations: [],
        }
      };
    }

    return null;
  } catch {
    return null;
  }
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const method = (options.method || 'GET').toUpperCase();
  const isGet = method === 'GET';
  const authToken = getAuthToken();

  // Cache key includes endpoint and auth token to maintain session security
  const cacheKey = `API:${method}:${endpoint}:${authToken ? authToken.slice(-10) : 'guest'}`;

  // Check cache for GET requests
  if (isGet && !options.bypassCache) {
    const cached = apiCache.get<T>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    // Deduplicate in-flight parallel requests
    const inFlight = apiCache.getInFlight<T>(cacheKey);
    if (inFlight !== null) {
      return inFlight;
    }
  }

  const execute = async (): Promise<T> => {
    const headers = new Headers(options.headers || {});

    // Set default Content-Type for JSON if body is provided and not FormData
    if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    // Attach stored JWT Bearer token if available
    if (authToken && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${authToken}`);
    }

    // Include Django/FastAPI CSRF token for mutating requests
    const csrfToken = getCookie('csrftoken');
    if (csrfToken && !headers.has('X-CSRFToken')) {
      headers.set('X-CSRFToken', csrfToken);
    }

    let targetUrl = getFullApiUrl(endpoint);
    let response: Response | null = null;
    let networkErrorMessage = '';

    try {
      response = await fetch(targetUrl, {
        ...options,
        headers,
        credentials: 'include', // vital for session cookies
      });
    } catch (networkErr: any) {
      networkErrorMessage = networkErr?.message || 'Network error';

      // If network call failed and URL had cruise-hunt, try once directly with cross-hunt
      if (targetUrl.includes('cruise-hunt.onrender.com')) {
        try {
          const directUrl = targetUrl.replace('cruise-hunt.onrender.com', 'cross-hunt.onrender.com');
          response = await fetch(directUrl, {
            ...options,
            headers,
            credentials: 'include',
          });
        } catch {
          // Keep response as null
        }
      }
    }

    // If server returned 404 (Render no-server) or 502/503/504 (cold start), or network failed:
    if (!response || !response.ok) {
      const status = response ? response.status : 0;
      if (status === 0 || status === 404 || status === 502 || status === 503 || status === 504) {
        const fallback = tryGetFallbackData(endpoint);
        if (fallback !== null) {
          triggerBackgroundBackendProbe();
          if (isGet && !options.bypassCache) {
            // Cache fallback briefly (30s) so it re-attempts live backend soon
            apiCache.set(cacheKey, fallback, 30000);
          }
          return fallback as T;
        }
      }
    }

    if (!response) {
      triggerBackgroundBackendProbe();
      throw new ApiError(
        networkErrorMessage || 'Network error: Failed to reach the server. Please check your connection.',
        0,
        'NetworkError',
        null,
        endpoint
      );
    }

    let data: any = null;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      try {
        data = await response.json();
      } catch {
        data = null;
      }
    } else {
      try {
        const text = await response.text();
        data = { text };
      } catch {
        data = null;
      }
    }

    if (!response.ok) {
      // Check fallback once more for 404 on GET
      if (response.status === 404 && isGet) {
        const fallback = tryGetFallbackData(endpoint);
        if (fallback !== null) {
          return fallback as T;
        }
      }

      const errorMsg =
        data?.error ||
        data?.detail ||
        data?.message ||
        (typeof data?.text === 'string' && data.text.length < 200 ? data.text : null) ||
        `API request failed with status ${response.status} (${response.statusText || 'Error'})`;

      throw new ApiError(
        errorMsg,
        response.status,
        response.statusText,
        data,
        endpoint
      );
    }

    // Cache successful GET responses
    if (isGet && !options.bypassCache) {
      apiCache.set(cacheKey, data, options.cacheTtlMs);
    } else if (!isGet) {
      // Invalidate relevant cache on mutations
      if (endpoint.includes('/favorites/')) {
        apiCache.invalidate('favorites');
      } else if (endpoint.includes('/bookings/')) {
        apiCache.invalidate('bookings');
        apiCache.invalidate('cruises');
        apiCache.invalidate('tours');
      } else {
        apiCache.clear();
      }
    }

    return data as T;
  };

  if (isGet && !options.bypassCache) {
    const promise = execute();
    apiCache.setInFlight(cacheKey, promise);
    return await promise;
  }

  return await execute();
}
