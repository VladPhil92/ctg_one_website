'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardServiceHub } from '@/components/dashboard/DashboardServiceHub';
import { DASHBOARD_SERVICE_ROUTES } from '@/config/dashboard-services';
import { trackFunnelEvent } from '@/lib/analytics/client';
import type { FunnelServiceKey } from '@/lib/analytics/funnel';

function serviceForHref(href: string): FunnelServiceKey | null {
  const match = DASHBOARD_SERVICE_ROUTES.find(
    ({ prefix }) => href === prefix || href.startsWith(`${prefix}?`) || href.startsWith(`${prefix}/`),
  );
  return match?.serviceKey ?? null;
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated && pathname === '/dashboard') {
      void trackFunnelEvent('dashboard_viewed', { sourcePath: '/dashboard' });
    }
  }, [isAuthenticated, isLoading, pathname]);

  useEffect(() => {
    if (isLoading || !isAuthenticated || pathname !== '/dashboard') return;

    const handleClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest('a[href]');
      if (!(anchor instanceof HTMLAnchorElement)) return;

      const rawHref = anchor.getAttribute('href');
      if (!rawHref) return;
      const serviceKey = serviceForHref(rawHref);
      if (!serviceKey) return;

      void trackFunnelEvent('first_service_used', {
        sourcePath: '/dashboard',
        serviceKey,
      });
    };

    document.addEventListener('click', handleClick, { capture: true });
    return () => document.removeEventListener('click', handleClick, { capture: true });
  }, [isAuthenticated, isLoading, pathname]);

  return (
    <>
      {children}
      {pathname === '/dashboard' ? <DashboardServiceHub /> : null}
    </>
  );
}
