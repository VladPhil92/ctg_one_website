'use client';

// Shared client-side fetch helper for writes against /api/nvetcareapp/**.
//
// proxy.ts's silent refresh-on-expiry (handleNvetSession) only runs on
// navigations under /nvetcareapp/dashboard/** — it never sees same-page
// fetch calls to /api/nvetcareapp/**. So a dashboard tab left open past
// the access token's 15-minute lifetime gets a 401 on its next write even
// though the refresh-token cookie is still valid. This retries once
// through POST /api/nvetcareapp/auth/refresh (the same rotation endpoint
// the middleware itself uses) before giving up, and sends the visitor to
// sign-in only if the refresh token itself is gone or expired.
export async function nvetFetchWithRefresh(input: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(input, init);
  if (res.status !== 401) {
    return res;
  }

  const refreshRes = await fetch('/api/nvetcareapp/auth/refresh', { method: 'POST' });
  if (!refreshRes.ok) {
    window.location.href = '/nvetcareapp/iniciar-sesion';
    return res;
  }

  return fetch(input, init);
}
