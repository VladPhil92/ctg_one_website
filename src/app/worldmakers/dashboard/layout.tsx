import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { worldMakersSignInUrl } from '@/lib/worldmakers/routes';
import { DashboardShell } from './DashboardShell';

export const metadata: Metadata = {
  title: 'Player Dashboard | World Makers',
  description: 'Centro personal de aventuras, progreso y cuenta de World Makers.',
  robots: { index: false, follow: false },
};

export default async function WorldMakersDashboardLayout({ children }: { children: ReactNode }) {
  if (!isSupabaseConfigured) redirect(worldMakersSignInUrl());

  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect(worldMakersSignInUrl());

  const displayName =
    typeof user.user_metadata?.full_name === 'string' && user.user_metadata.full_name.trim()
      ? user.user_metadata.full_name.trim()
      : 'Maker';

  return (
    <DashboardShell
      displayName={displayName}
      email={user.email ?? null}
      emailVerified={Boolean(user.email_confirmed_at)}
    >
      {children}
    </DashboardShell>
  );
}
