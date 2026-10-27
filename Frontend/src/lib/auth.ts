export type AuthUser = {
  id: string;
  agent_code: string;
  name: string;
  email: string;
  phone: string;
  branch: string;
  yearly_target: number;
  avatar?: string | null;
  created_at: string;
};

export type AuthResponse = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: AuthUser;
};

const ACCESS_TOKEN_KEY = "perfect_agent_access_token";
const REFRESH_TOKEN_KEY = "perfect_agent_refresh_token";
const USER_KEY = "perfect_agent_user";

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function getStoredUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setAuth(data: AuthResponse): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, data.access_token);
  localStorage.setItem(REFRESH_TOKEN_KEY, data.refresh_token);
  localStorage.setItem(USER_KEY, JSON.stringify(data.user));
}

export function clearAuth(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function isAuthenticated(): boolean {
  return !!getAccessToken();
}

export async function loginApi(agent_code: string, password: string): Promise<AuthResponse> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ agent_code, password }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Invalid Agent Code or Password");
  }

  const data: AuthResponse = await res.json();
  setAuth(data);
  return data;
}

export async function registerApi(payload: {
  name: string;
  agent_code: string;
  branch: string;
  phone: string;
  email: string;
  password: string;
  confirm_password: string;
  yearly_target: number;
}): Promise<AuthResponse> {
  const res = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Registration failed. Please check your details.");
  }

  const data: AuthResponse = await res.json();
  return data;
}

export async function logoutApi(): Promise<void> {
  const refresh_token = getRefreshToken();
  if (refresh_token) {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token }),
      });
    } catch {}
  }
  clearAuth();
}

export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  let token = getAccessToken();
  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let res = await fetch(url, { ...options, headers });

  // If unauthorized, attempt silent refresh
  if (res.status === 401) {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      try {
        const refreshRes = await fetch("/api/auth/refresh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });

        if (refreshRes.ok) {
          const data: AuthResponse = await refreshRes.json();
          setAuth(data);
          token = data.access_token;
          headers.set("Authorization", `Bearer ${token}`);
          res = await fetch(url, { ...options, headers });
        } else {
          clearAuth();
          window.location.href = "/login";
        }
      } catch {
        clearAuth();
        window.location.href = "/login";
      }
    } else {
      clearAuth();
      window.location.href = "/login";
    }
  }

  return res;
}
