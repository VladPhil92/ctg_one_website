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

export async function trackFunnelEvent(
  eventName: Exclude<FunnelEventName, 'email_verified'>,
  options: TrackFunnelOptions = {},
): Promise<void> {
  if (typeof window === 'undefined') return;

  const payload = {
    eventName,
    anonymousId: getAnalyticsAnonymousId(),
    sourcePath: options.sourcePath ?? window.location.pathname,
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
