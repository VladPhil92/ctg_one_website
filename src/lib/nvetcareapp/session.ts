import type { NextResponse } from 'next/server';

// Shared by both the BFF route handlers (Node runtime) and the middleware
// branch (Edge runtime) that protects /nvetcareapp/dashboard/** — see
// docs/nvetcareapp/adr/ADR-002-authentication-strategy.md. Keep this file
// runtime-agnostic (no `Buffer`, no Node-only APIs).

export const NVET_ACCESS_COOKIE = 'nvet_access_token';
export const NVET_REFRESH_COOKIE = 'nvet_refresh_token';

// Public Railway origin of the canonical Nvet Care backend. This is not a
// credential: it is the server address already used by production. Keeping a
// production fallback here prevents a missing Render environment declaration
// from turning every Nvet auth request into a 502. An explicit env value still
// wins, so staging/alternate backends remain configurable.
export const NVET_CANONICAL_PRODUCTION_API_URL = 'https://backend-production-a476.up.railway.app';

export interface NvetTokens {
  accessToken: string;
  refreshToken: string;
}

export function getNvetApiUrl(): string {
  const configuredUrl = process.env.CTG_NVETCARE_API_URL?.trim();
  const url =
    configuredUrl ||
    (process.env.NODE_ENV === 'production' ? NVET_CANONICAL_PRODUCTION_API_URL : '');

  if (!url) {
    throw new Error(
      'CTG_NVETCARE_API_URL is not set — the Nvet Care backend base URL is required outside production.'
    );
  }

  if (process.env.NODE_ENV === 'production' && !url.startsWith('https://')) {
    throw new Error('CTG_NVETCARE_API_URL must use HTTPS in production.');
  }

  return url.replace(/\/+$/, '');
}

/**
 * Decodes a JWT's payload without verifying its signature — the actual
 * signature check happens server-side in NestJS's JwtAuthGuard on every
 * BFF-to-backend call, which is the real authorization boundary. This is
 * only used for cookie `maxAge`/UX-level expiry gating in middleware, so
 * skipping verification here can't grant access to anything.
 */
export function decodeJwtExpiryMs(token: string): number | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const json = atob(padded);
    const payload = JSON.parse(json) as { exp?: number };
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

export function isExpiredOrUnreadable(token: string | undefined, skewMs = 5_000): boolean {
  if (!token) return true;
  const expiryMs = decodeJwtExpiryMs(token);
  if (expiryMs === null) return true;
  return expiryMs - skewMs <= Date.now();
}

function cookieMaxAgeSeconds(token: string, fallbackSeconds: number): number {
  const expiryMs = decodeJwtExpiryMs(token);
  if (expiryMs === null) return fallbackSeconds;
  const seconds = Math.floor((expiryMs - Date.now()) / 1000);
  return seconds > 0 ? seconds : fallbackSeconds;
}

export function setNvetSessionCookies(response: NextResponse, tokens: NvetTokens): void {
  const isProd = process.env.NODE_ENV === 'production';
  response.cookies.set(NVET_ACCESS_COOKIE, tokens.accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: cookieMaxAgeSeconds(tokens.accessToken, 15 * 60),
  });
  response.cookies.set(NVET_REFRESH_COOKIE, tokens.refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: cookieMaxAgeSeconds(tokens.refreshToken, 7 * 24 * 60 * 60),
  });
}

export function clearNvetSessionCookies(response: NextResponse): void {
  response.cookies.delete(NVET_ACCESS_COOKIE);
  response.cookies.delete(NVET_REFRESH_COOKIE);
}

/**
 * Calls the NestJS refresh endpoint directly (server-to-server) — used by
 * both POST /api/nvetcareapp/auth/refresh and the middleware's silent
 * refresh-on-expiry branch, so the two never drift apart.
 */
export async function refreshNvetSession(refreshToken: string): Promise<NvetTokens | null> {
  try {
    const res = await fetch(`${getNvetApiUrl()}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Partial<NvetTokens>;
    if (!data.accessToken || !data.refreshToken) return null;
    return { accessToken: data.accessToken, refreshToken: data.refreshToken };
  } catch {
    return null;
  }
}
