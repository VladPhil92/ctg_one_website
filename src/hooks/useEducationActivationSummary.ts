'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { EducationActivationSummary } from '@/lib/account/activation';

type EducationLibraryPayload = {
  ok?: boolean;
  entitlements?: Array<{ status?: string }>;
  orders?: Array<{ status?: string }>;
  learning?: Array<{
    status?: string;
    progressPercent?: number;
    lastActivityAt?: string;
    continuePath?: string;
    course?: { title?: string };
  }>;
};

const EMPTY_SUMMARY: EducationActivationSummary = {
  state: 'loading',
  activeEntitlements: 0,
  activeLearning: 0,
  pendingOrders: 0,
  topLearning: null,
};

export function useEducationActivationSummary() {
  const { isAuthenticated } = useAuth();
  const [summary, setSummary] = useState<EducationActivationSummary>(EMPTY_SUMMARY);

  const load = useCallback(async () => {
    if (!isAuthenticated) {
      setSummary({ ...EMPTY_SUMMARY, state: 'ready' });
      return;
    }

    setSummary((current) => ({ ...current, state: 'loading' }));
    try {
      const response = await fetch('/api/education/library', {
        cache: 'no-store',
        credentials: 'same-origin',
      });
      const payload = (await response.json().catch(() => ({}))) as EducationLibraryPayload;
      if (!response.ok || !payload.ok) {
        setSummary((current) => ({ ...current, state: 'error' }));
        return;
      }

      const activeEntitlements = (payload.entitlements ?? []).filter((item) => item.status === 'active').length;
      const pendingOrders = (payload.orders ?? []).filter((item) => item.status === 'initiated' || item.status === 'pending').length;
      const activeLearningItems = (payload.learning ?? [])
        .filter((item) => item.status === 'active' && (item.progressPercent ?? 0) < 100)
        .sort((a, b) => Date.parse(b.lastActivityAt ?? '') - Date.parse(a.lastActivityAt ?? ''));
      const resumableLearningItems = activeLearningItems.filter((item) => (item.progressPercent ?? 0) > 0);
      const top = resumableLearningItems[0];

      setSummary({
        state: 'ready',
        activeEntitlements,
        activeLearning: activeLearningItems.length,
        pendingOrders,
        topLearning: top?.continuePath && top.course?.title
          ? {
              title: top.course.title,
              progressPercent: Math.max(1, Math.min(99, Math.round(top.progressPercent ?? 0))),
              continuePath: top.continuePath,
            }
          : null,
      });
    } catch {
      setSummary((current) => ({ ...current, state: 'error' }));
    }
  }, [isAuthenticated]);

  useEffect(() => {
    void load();
  }, [load]);

  return { summary, refresh: load };
}
