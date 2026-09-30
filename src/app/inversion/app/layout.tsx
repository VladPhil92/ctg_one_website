import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { SuperadminUserModeBanner } from '@/components/admin/SuperadminUserModeBanner';
import {
  SUPERADMIN_VIEW_COOKIE,
  isSuperadminUserViewCookie,
} from '@/lib/admin/superadmin-view';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Mi panel de inversión',
  robots: { index: false, follow: false, nocache: true },
};

export default async function InvestmentAppLayout({ children }: { children: ReactNode }) {
  let superadminUserView = false;

  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      throw new Error(`No se pudo validar la sesión de inversión: ${authError.message}`);
    }

    if (user) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) {
        throw new Error(`No se pudo validar el rol global de inversión: ${profileError.message}`);
      }

      if (profile?.role === 'admin') {
        const { data: investmentProfile, error: investmentRoleError } = await supabase
          .from('investment_participant_profiles')
          .select('investment_role')
          .eq('user_id', user.id)
          .maybeSingle();

        if (investmentRoleError) {
          throw new Error(`No se pudo validar el rol operativo de inversión: ${investmentRoleError.message}`);
        }

        const cookieStore = await cookies();
        const requestedView = cookieStore.get(SUPERADMIN_VIEW_COOKIE)?.value;
        const isSuperAdmin = investmentProfile?.investment_role === 'SUPER_ADMIN';

        if (
          !isSuperAdmin
          || !isSuperadminUserViewCookie(requestedView, user.id, user.last_sign_in_at)
        ) {
          redirect('/admin');
        }
        superadminUserView = true;
      }
    }
  }

  return (
    <>
      {superadminUserView ? <SuperadminUserModeBanner /> : null}
      {children}
    </>
  );
}
