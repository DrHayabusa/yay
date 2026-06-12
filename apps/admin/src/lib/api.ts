'use client';

/**
 * Minimal typed API client for the admin dashboard.
 * Access token lives in memory; refresh token in sessionStorage (dev MVP —
 * production should move refresh to an httpOnly cookie set by a BFF route).
 */
let accessToken: string | null = null;

export function setTokens(access: string, refresh: string): void {
  accessToken = access;
  sessionStorage.setItem('sanad_refresh', refresh);
}

export function clearTokens(): void {
  accessToken = null;
  sessionStorage.removeItem('sanad_refresh');
}

async function refresh(): Promise<boolean> {
  const rt = sessionStorage.getItem('sanad_refresh');
  if (!rt) return false;
  const res = await fetch('/api/v1/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: rt }),
  });
  if (!res.ok) {
    clearTokens();
    return false;
  }
  const body = await res.json();
  setTokens(body.accessToken, body.refreshToken);
  return true;
}

export async function api<T>(path: string, init: RequestInit = {}, retried = false): Promise<T> {
  const res = await fetch(`/api/v1${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...init.headers,
    },
  });
  if (res.status === 401 && !retried && (await refresh())) {
    return api<T>(path, init, true);
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.message ?? `Request failed (${res.status})`);
  }
  return body as T;
}

export function isLoggedIn(): boolean {
  return accessToken !== null || sessionStorage.getItem('sanad_refresh') !== null;
}
