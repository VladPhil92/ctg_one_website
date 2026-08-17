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
    <div className="relative min-h-screen overflow-x-hidden" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="pointer-events-none fixed inset-0 z-0 opacity-[.34]" style={{backgroundImage:'linear-gradient(rgba(255,255,255,.018) 1px, transparent 1px),linear-gradient(90deg,rgba(255,255,255,.018) 1px, transparent 1px)',backgroundSize:'72px 72px'}} />
      <div className="pointer-events-none fixed -right-40 -top-44 z-0 h-[520px] w-[520px] rounded-full" style={{background:'radial-gradient(circle,rgba(201,169,98,.075),rgba(201,169,98,0) 68%)'}} />
      <div className="pointer-events-none fixed -left-48 bottom-[-220px] z-0 h-[520px] w-[520px] rounded-full" style={{background:'radial-gradient(circle,rgba(255,255,255,.025),rgba(255,255,255,0) 70%)'}} />
      <AdminNav investmentRole={investmentRole} />
      <main className="relative z-10 px-4 pb-16 pt-24 sm:px-8 lg:pt-28">
        <div className="mx-auto max-w-[1440px]">{children}</div>
      </main>
    </div>
  );
}
