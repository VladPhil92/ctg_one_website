import React from 'react';
import { redirect } from 'next/navigation';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { UsersTable } from '@/components/admin/UsersTable';

export default async function AdminUsersPage() {
  // See admin/page.tsx — each admin page re-checks this independently
  // since layout/page rendering can race.
  if (!isSupabaseConfigured) {
    redirect('/');
  }

  const supabase = await createClient();

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, kyc_status, created_at, wallets(balance_cents, currency)')
    .order('created_at', { ascending: false });

  return (
    <div>
      <h1 className="text-3xl font-outfit font-bold text-white mb-8">Usuarios</h1>
      <UsersTable users={profiles ?? []} />
    </div>
  );
}
