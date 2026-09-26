'use client';

import {
  ANALYTICS_STORAGE_KEY,
  type FunnelEventName,
  type FunnelServiceKey,
  isAnalyticsAnonymousId,
} from './funnel';

export type TrackFunnelOptions = {
  sourcePath?: string;
  serviceKey?: FunnelServiceKey;
};

export function getAnalyticsAnonymousId(): string {
  if (typeof window === 'undefined') return crypto.randomUUID();

  try {
    const existing = window.localStorage.getItem(ANALYTICS_STORAGE_KEY);
    if (isAnalyticsAnonymousId(existing)) return existing;

    const created = crypto.randomUUID();
    window.localStorage.setItem(ANALYTICS_STORAGE_KEY, created);
    return created;
  } catch {
    return crypto.randomUUID();
  }
}

function nvetAnalyticsAllowed(sourcePath: string): boolean {
  if (!sourcePath.startsWith('/nvetcareapp')) return true;
  try {
    const raw = window.localStorage.getItem('nvet_cookie_consent');
    if (!raw) return false;
    const consent = JSON.parse(raw) as { version?: string; analytics?: boolean };
    return consent.version === 'nvet-cookie-policy-v1-2026-09-25' && consent.analytics === true;
  } catch {
    return false;
  }
}

export async function trackFunnelEvent(
  eventName: Exclude<FunnelEventName, 'email_verified'>,
  options: TrackFunnelOptions = {},
): Promise<void> {
  if (typeof window === 'undefined') return;

  const sourcePath = options.sourcePath ?? window.location.pathname;
  if (!nvetAnalyticsAllowed(sourcePath)) return;

  const payload = {
    eventName,
    anonymousId: getAnalyticsAnonymousId(),
    sourcePath,
    serviceKey: options.serviceKey,
  };

  try {
    await fetch('/api/analytics/event', {
      method: 'POST',
      credentials: 'same-origin',
      keepalive: true,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    // Analytics must never interrupt acquisition, authentication or navigation.
  }
}
