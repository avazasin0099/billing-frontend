const getBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_URL;

  if (typeof window !== 'undefined') {
    if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
      return envUrl;
    }
    const host = window.location.hostname;
    return `http://${host}:5000/api/v1`;
  }
  return envUrl || 'http://localhost:5000/api/v1';
};

class ApiClient {
  private getHeaders(): HeadersInit {
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
    }

    return headers;
  }

  private async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const baseUrl = getBaseUrl();
    const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

    const config: RequestInit = {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...(options.headers || {}),
      },
    };

    try {
      const response = await fetch(url, config);

      if (response.status === 401 && typeof window !== 'undefined') {
        // Try refresh token
        const refreshToken = localStorage.getItem('billpro_refresh_token');
        if (refreshToken && endpoint !== '/auth/refresh' && endpoint !== '/auth/login') {
          try {
            const refreshRes = await fetch(`${baseUrl}/auth/refresh`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ refreshToken }),
            });
            const refreshData = await refreshRes.json();
            if (refreshData.success && refreshData.data?.accessToken) {
              localStorage.setItem('billpro_token', refreshData.data.accessToken);
              localStorage.setItem('billpro_refresh_token', refreshData.data.refreshToken);
              // Retry original request
              return this.request<T>(endpoint, options);
            }
          } catch {
            localStorage.removeItem('billpro_token');
            localStorage.removeItem('billpro_refresh_token');
          }
        }
      }

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || `Request failed with status ${response.status}`);
      }

      return data.data !== undefined ? data.data : data;
    } catch (err: any) {
      throw new Error(err.message || 'Network request failed');
    }
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
