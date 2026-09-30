import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import DashboardClientShell from '@/components/dashboard/DashboardClientShell';
import {
  SUPERADMIN_VIEW_COOKIE,
  isSuperadminUserViewCookie,
} from '@/lib/admin/superadmin-view';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  let superadminUserView = false;

  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      throw new Error(`No se pudo validar la sesión del dashboard: ${authError.message}`);
    }

    if (user) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) {
        throw new Error(`No se pudo validar el rol global del dashboard: ${profileError.message}`);
      }

      if (profile?.role === 'admin') {
        const { data: investmentProfile, error: investmentRoleError } = await supabase
          .from('investment_participant_profiles')
          .select('investment_role')
          .eq('user_id', user.id)
          .maybeSingle();

        if (investmentRoleError) {
          throw new Error(`No se pudo validar el rol operativo del dashboard: ${investmentRoleError.message}`);
        }

        const cookieStore = await cookies();
        const requestedView = cookieStore.get(SUPERADMIN_VIEW_COOKIE)?.value;
        const isSuperAdmin = investmentProfile?.investment_role === 'SUPER_ADMIN';

        // Every participant route uses this shared gate. Global admins remain
        // on the administrative surface unless a verified SUPER_ADMIN has
        // explicitly selected a user view bound to the current sign-in session.
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
    <DashboardClientShell superadminUserView={superadminUserView}>
      {children}
    </DashboardClientShell>
  );
}
