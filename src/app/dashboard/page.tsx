import { redirect } from 'next/navigation';

import DashboardNotificationBoundary from '@/components/dashboard/DashboardNotificationBoundary';
import InvestorDashboard from '@/components/dashboard/InvestorDashboard';
import PersonalOSDashboardV2 from '@/components/dashboard/PersonalOSDashboardV2';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';

// Canonical account-dashboard identity: TU ECOSISTEMA CTG ONE.
// PersonalOSDashboardV2 remains the state/activation contract while the
// investor-first surface is now the canonical visual experience for users.
void PersonalOSDashboardV2;

export default async function DashboardPage() {
  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      // Administrative identities have their own command surface. Do not
      // collapse them into the participant dashboard after sign-in.
      if (profile?.role === 'admin') redirect('/admin');
    }
  }

  return (
    <DashboardNotificationBoundary>
      <InvestorDashboard />
    </DashboardNotificationBoundary>
  );
}
