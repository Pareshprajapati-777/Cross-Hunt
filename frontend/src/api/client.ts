// Helper to extract CSRF token from browser cookies
function getCookie(name: string): string | null {
  let cookieValue: string | null = null;
  if (document.cookie && document.cookie !== '') {
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

export const AUTH_TOKEN_KEY = 'crosshunt_auth_token';

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY);
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
    }
  } catch {
    // Ignore storage errors in restricted browser contexts
  }
}

const DEFAULT_PROD_API_URL = 'https://cross-hunt.onrender.com';

function resolveApiBaseUrl(): string {
  const envUrl =
    (typeof import.meta !== 'undefined' &&
      import.meta.env &&
      (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL)) ||
    '';

  if (envUrl && envUrl.trim()) {
    return envUrl.trim().replace(/\/+$/, '');
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
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    return endpoint;
  }
  if (!API_BASE_URL) {
    return endpoint;
  }
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${API_BASE_URL}${cleanEndpoint}`;
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = new Headers(options.headers || {});
  
  // Set default Content-Type for JSON if body is provided and not FormData
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  // Attach stored JWT Bearer token if available
  const authToken = getAuthToken();
  if (authToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${authToken}`);
  }

  // Include Django/FastAPI CSRF token for mutating requests
  const csrfToken = getCookie('csrftoken');
  if (csrfToken && !headers.has('X-CSRFToken')) {
    headers.set('X-CSRFToken', csrfToken);
  }

  const targetUrl = getFullApiUrl(endpoint);
  let response: Response;
  try {
    response = await fetch(targetUrl, {
      ...options,
      headers,
      credentials: 'include', // vital for session cookies
    });
  } catch (networkErr: any) {
    throw new ApiError(
      networkErr?.message || 'Network error: Failed to reach the server. Please check your connection.',
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

  return data as T;
}
