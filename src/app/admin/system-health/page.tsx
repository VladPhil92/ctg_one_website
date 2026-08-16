import { redirect } from 'next/navigation';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { SystemHealthPanel } from '@/components/admin/SystemHealthPanel';

export const dynamic = 'force-dynamic';

export default async function SystemHealthPage() {
  if (!isSupabaseConfigured) redirect('/');

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/iniciar-sesion');

  const [{ data: profile }, { data: investmentProfile }] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', user.id).maybeSingle(),
    supabase.from('investment_participant_profiles').select('investment_role').eq('user_id', user.id).maybeSingle(),
  ]);

  if (profile?.role !== 'admin') redirect('/dashboard');
  if (investmentProfile?.investment_role !== 'SUPER_ADMIN') redirect('/admin');

  return <SystemHealthPanel />;
}
