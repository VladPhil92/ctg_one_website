'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardServiceHub } from '@/components/dashboard/DashboardServiceHub';
import { trackFunnelEvent } from '@/lib/analytics/client';
import type { FunnelServiceKey } from '@/lib/analytics/funnel';

const SERVICE_ROUTES: ReadonlyArray<{ prefix: string; serviceKey: FunnelServiceKey }> = [
  { prefix: '/dashboard/inversion', serviceKey: 'investment' },
  { prefix: '/inversion/app', serviceKey: 'investment' },
  { prefix: '/dashboard/depositos', serviceKey: 'wallet' },
  { prefix: '/dashboard/wallet', serviceKey: 'wallet' },
  { prefix: '/dashboard/kyc', serviceKey: 'identity' },
  { prefix: '/knowledge', serviceKey: 'knowledge' },
  { prefix: '/nvetcareapp', serviceKey: 'nvet' },
  { prefix: '/ctgotoken', serviceKey: 'token' },
  { prefix: '/dashboard/educacion', serviceKey: 'education_library' },
  { prefix: '/jpvalderrama/learningcenter', serviceKey: 'education_learning_center' },
  { prefix: '/jpvalderrama', serviceKey: 'education_jp' },
];

function serviceForHref(href: string): FunnelServiceKey | null {
  if (!href.startsWith('/')) return null;
  const match = SERVICE_ROUTES.find(({ prefix }) => href === prefix || href.startsWith(`${prefix}?`) || href.startsWith(`${prefix}/`));
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
