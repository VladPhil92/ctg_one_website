import { cookies } from 'next/headers';
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
        const cookieStore = await cookies();
        const requestedView = cookieStore.get(SUPERADMIN_VIEW_COOKIE)?.value;

        // Authorization is enforced in the pathname-aware proxy. The shared
        // layout only decides whether to render the effective-user indicator,
        // so nested admin consoles under /dashboard are not accidentally gated
        // by investment roles.
        if (requestedView) {
          const { data: investmentProfile } = await supabase
            .from('investment_participant_profiles')
            .select('investment_role')
            .eq('user_id', user.id)
            .maybeSingle();

          superadminUserView =
            investmentProfile?.investment_role === 'SUPER_ADMIN'
            && isSuperadminUserViewCookie(requestedView, user.id, user.last_sign_in_at);
        }
      }
    }
  }

  return (
    <DashboardClientShell superadminUserView={superadminUserView}>
      {children}
    </DashboardClientShell>
  );
}
