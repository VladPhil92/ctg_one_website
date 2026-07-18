import React from 'react';
import { redirect } from 'next/navigation';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { formatCents } from '@/lib/format';
import { StatCard } from '@/components/admin/StatCard';

export default async function AdminOverviewPage() {
  // Next.js can render a layout and its child page concurrently, so this
  // page's own data fetching can start before admin/layout.tsx's redirect
  // takes effect — each admin page re-checks independently rather than
  // relying solely on the parent layout.
  if (!isSupabaseConfigured) {
    redirect('/');
  }

  const supabase = await createClient();

  const [{ count: totalUsers }, { count: pendingKyc }, { count: pendingDeposits }, { data: wallets }] =
    await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('kyc_submissions').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')
        .eq('type', 'deposit'),
      supabase.from('wallets').select('balance_cents'),
    ]);

  const totalFundsCents = (wallets ?? []).reduce((sum, w) => sum + (w.balance_cents ?? 0), 0);

  return (
    <div>
      <h1 className="text-3xl font-outfit font-bold text-white mb-8">Resumen</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Usuarios totales" value={String(totalUsers ?? 0)} />
        <StatCard label="Fondos totales" value={formatCents(totalFundsCents)} />
        <StatCard
          label="KYC pendientes"
          value={String(pendingKyc ?? 0)}
          href="/admin/kyc"
          highlight={!!pendingKyc}
        />
        <StatCard
          label="Depósitos pendientes"
          value={String(pendingDeposits ?? 0)}
          href="/admin/depositos"
          highlight={!!pendingDeposits}
        />
      </div>
    </div>
  );
}
