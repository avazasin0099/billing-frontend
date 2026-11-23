const getBaseUrl = (): string => {
  let envUrl = import.meta.env.VITE_API_URL?.trim();

  if (envUrl) {
    // If protocol is missing, ensure https:// is prepended so browsers don't treat it as a relative path
    if (!envUrl.startsWith('http://') && !envUrl.startsWith('https://')) {
      envUrl = `https://${envUrl}`;
    }
    // Strip trailing slashes
    envUrl = envUrl.replace(/\/+$/, '');
    // Ensure /api/v1 prefix is appended
    if (!envUrl.endsWith('/api/v1')) {
      envUrl = `${envUrl}/api/v1`;
    }
    return envUrl;
  }

  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    return `http://${host}:5000/api/v1`;
  }
  return 'http://localhost:5000/api/v1';
};

/** Error thrown by the API client. `isNetworkError` = the request never got a usable answer. */
export class ApiError extends Error {
  status?: number;
  isNetworkError: boolean;
  constructor(message: string, opts: { status?: number; isNetworkError?: boolean } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = opts.status;
    this.isNetworkError = !!opts.isNetworkError;
  }
}

// Gateway / proxy failures mean the request may not have reached the app — treat like offline.
const NETWORK_LIKE_STATUSES = new Set([502, 503, 504]);

/** Stable per-browser device id (UUID), sent as X-Device-Id for offline-sync auditing. */
export const getDeviceId = (): string => {
  const KEY = 'billpro_device_id';
  try {
    let id = localStorage.getItem(KEY);
    if (!id) {
      id =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return 'unknown-device';
  }
};

const clearSession = () => {
  localStorage.removeItem('billpro_token');
  localStorage.removeItem('billpro_refresh_token');
  localStorage.removeItem('billpro_user');
};

class ApiClient {
  /**
   * Single in-flight refresh shared by every request that hits a 401 at the same moment.
   * Refresh tokens are rotated (single-use), so parallel refreshes would revoke each other
   * and log the user out (the dashboard fires 4 requests at once).
   */
  private refreshPromise: Promise<boolean> | null = null;

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('billpro_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const shopId = localStorage.getItem('billpro_shop_id');
      if (shopId) {
        headers['X-Shop-Id'] = shopId;
      }
      headers['X-Device-Id'] = getDeviceId();
    }

    return headers;
  }

  private refreshSession(baseUrl: string): Promise<boolean> {
    if (this.refreshPromise) return this.refreshPromise;

    this.refreshPromise = (async () => {
      const refreshToken = localStorage.getItem('billpro_refresh_token');
      if (!refreshToken) return false;
      try {
        const refreshRes = await fetch(`${baseUrl}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        const refreshData = await refreshRes.json().catch(() => ({}));
        if (refreshRes.ok && refreshData.success && refreshData.data?.accessToken) {
          localStorage.setItem('billpro_token', refreshData.data.accessToken);
          localStorage.setItem('billpro_refresh_token', refreshData.data.refreshToken);
          return true;
        }
        // The server rejected the refresh token: the session is over.
        clearSession();
        return false;
      } catch {
        // Network failure while refreshing — keep the tokens so the user can retry when back online.
        return false;
      }
    })().finally(() => {
      this.refreshPromise = null;
    });

    return this.refreshPromise;
  }

  private async request<T = any>(endpoint: string, options: RequestInit = {}, retried = false): Promise<T> {
    const baseUrl = getBaseUrl();
    const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

    const config: RequestInit = {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...((options.headers as Record<string, string>) || {}),
      },
    };

    let response: Response;
    try {
      response = await fetch(url, config);
    } catch (err: any) {
      // fetch only rejects when no HTTP response arrived (offline, DNS, CORS, server down).
      throw new ApiError('Cannot reach the server. Check your internet connection.', { isNetworkError: true });
    }

    if (response.status === 401 && typeof window !== 'undefined' && !retried) {
      const isAuthEndpoint = endpoint.startsWith('/auth/');
      if (!isAuthEndpoint && (await this.refreshSession(baseUrl))) {
        // Retry the original request exactly once with the new token.
        return this.request<T>(endpoint, options, true);
      }
      if (!isAuthEndpoint && !localStorage.getItem('billpro_token') && window.location.pathname !== '/login') {
        window.location.assign('/login');
      }
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new ApiError(data.message || `Request failed with status ${response.status}`, {
        status: response.status,
        isNetworkError: NETWORK_LIKE_STATUSES.has(response.status),
      });
    }

    return data.data !== undefined ? data.data : data;
  }

  public get<T = any>(endpoint: string, query?: Record<string, any>): Promise<T> {
    let url = endpoint;
    if (query) {
      const params = new URLSearchParams();
      Object.entries(query).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          params.append(key, String(val));
        }
      });
      const queryString = params.toString();
      if (queryString) {
        url += (url.includes('?') ? '&' : '?') + queryString;
      }
    }
    return this.request<T>(url, { method: 'GET' });
  }

  public post<T = any>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public put<T = any>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public patch<T = any>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public delete<T = any>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const api = new ApiClient();

/**
 * Normalise a list response. List endpoints return the array directly as `data`
 * (pagination goes in `meta`); some older callers expected `{ [key]: [...] }`. Accept both.
 */
export function asList<T = any>(data: any, key?: string): T[] {
  if (Array.isArray(data)) return data;
  if (key && Array.isArray(data?.[key])) return data[key];
  return [];
}
