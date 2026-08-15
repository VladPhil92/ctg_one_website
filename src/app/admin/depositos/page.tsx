import React from 'react';
import { redirect } from 'next/navigation';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { DepositReviewQueue } from '@/components/admin/DepositReviewQueue';

export default async function AdminDepositsPage() {
  // See admin/page.tsx — each admin page re-checks this independently
  // since layout/page rendering can race.
  if (!isSupabaseConfigured) {
    redirect('/');
  }

  const supabase = await createClient();

  const { data: transactions } = await supabase
    .from('transactions')
    .select(
      'id, user_id, method, amount_cents, proof_storage_path, external_reference, crypto_network, crypto_asset, crypto_tx_hash, created_at, profiles(email, full_name)'
    )
    .eq('status', 'pending')
    .eq('type', 'deposit')
    .order('created_at', { ascending: true });

  const withSignedUrls = await Promise.all(
    (transactions ?? []).map(async (tx) => {
      if (!tx.proof_storage_path) return { ...tx, proofSignedUrl: null };
      const { data: signed } = await supabase.storage
        .from('payment-proofs')
        .createSignedUrl(tx.proof_storage_path, 300);
      return { ...tx, proofSignedUrl: signed?.signedUrl ?? null };
    })
  );

  return (
    <div>
      <h1 className="text-3xl font-outfit font-bold text-white mb-8">Revisión de Depósitos</h1>
      <DepositReviewQueue
        transactions={withSignedUrls as unknown as React.ComponentProps<typeof DepositReviewQueue>['transactions']}
      />
    </div>
  );
}
