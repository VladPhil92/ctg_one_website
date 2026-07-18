import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { UsersTable } from '@/components/admin/UsersTable';

export default async function AdminUsersPage() {
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
