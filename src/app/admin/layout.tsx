import React from 'react';
import { redirect } from 'next/navigation';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { AdminNav } from '@/components/admin/AdminNav';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!isSupabaseConfigured) redirect('/');

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/iniciar-sesion');

  const [{ data: profile }, { data: investmentProfile }] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', user.id).single(),
    supabase.from('investment_participant_profiles').select('investment_role').eq('user_id', user.id).maybeSingle(),
  ]);

  if (profile?.role !== 'admin') redirect('/dashboard');

  const investmentRole = (investmentProfile?.investment_role ?? null) as
    | 'SUPER_ADMIN'
    | 'FINANCE_ADMIN'
    | 'PRODUCTION_MANAGER'
    | 'INVENTORY_MANAGER'
    | 'SALES_MANAGER'
    | 'AUDITOR'
    | 'PARTICIPANT'
    | null;

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <AdminNav investmentRole={investmentRole} />
      <div className="pt-20 pb-16 px-4 sm:px-8">
        <div className="max-w-6xl mx-auto">{children}</div>
      </div>
    </div>
  );
}
