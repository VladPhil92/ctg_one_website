'use client';

import type { MouseEvent, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/contexts/AuthContext';

export default function DashboardNotificationBoundary({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const router = useRouter();

  function handleClickCapture(event: MouseEvent<HTMLDivElement>) {
    if (profile?.kyc_status === 'verified') return;

    const target = event.target;
    if (!(target instanceof Element)) return;

    const notificationLink = target.closest<HTMLAnchorElement>('a[href="#actividad"]');
    if (!notificationLink) return;

    event.preventDefault();
    event.stopPropagation();
    router.push('/dashboard/kyc');
  }

  return <div onClickCapture={handleClickCapture}>{children}</div>;
}
