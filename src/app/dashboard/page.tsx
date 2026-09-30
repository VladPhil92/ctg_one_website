import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { SuperadminUserModeBanner } from '@/components/admin/SuperadminUserModeBanner';
import DashboardNotificationBoundary from '@/components/dashboard/DashboardNotificationBoundary';
import InvestorDashboard from '@/components/dashboard/InvestorDashboard';
import PersonalOSDashboardV2 from '@/components/dashboard/PersonalOSDashboardV2';
import { SUPERADMIN_VIEW_COOKIE } from '@/lib/admin/superadmin-view';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';

// Canonical account-dashboard identity: TU ECOSISTEMA CTG ONE.
// PersonalOSDashboardV2 remains the state/activation contract while the
// investor-first surface is now the canonical visual experience for users.
void PersonalOSDashboardV2;

export default async function DashboardPage() {
  let superadminUserView = false;

  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const [{ data: profile }, { data: investmentProfile }] = await Promise.all([
        supabase.from('profiles').select('role').eq('id', user.id).maybeSingle(),
        supabase
          .from('investment_participant_profiles')
          .select('investment_role')
          .eq('user_id', user.id)
          .maybeSingle(),
      ]);

      if (profile?.role === 'admin') {
        const cookieStore = await cookies();
        const requestedView = cookieStore.get(SUPERADMIN_VIEW_COOKIE)?.value;
        const isSuperAdmin = investmentProfile?.investment_role === 'SUPER_ADMIN';

        // Global admins continue to use /admin by default. Only a verified
        // SUPER_ADMIN may deliberately enter the participant experience, and
        // the authority check is repeated server-side on every dashboard load.
        if (!isSuperAdmin || requestedView !== 'user') redirect('/admin');
        superadminUserView = true;
      }
    }
  }

  return (
    <>
      {superadminUserView ? <SuperadminUserModeBanner /> : null}
      <DashboardNotificationBoundary>
        <InvestorDashboard />
      </DashboardNotificationBoundary>
    </>
  );
}
