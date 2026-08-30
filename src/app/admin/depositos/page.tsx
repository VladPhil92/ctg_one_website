import React from 'react';
import { redirect } from 'next/navigation';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import {
  WalletTopupReviewQueue,
  type WalletTopupReviewRow,
} from '@/components/admin/WalletTopupReviewQueue';

export default async function AdminDepositsPage() {
  if (!isSupabaseConfigured) redirect('/');

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/');

  const { data: claims, error: claimsError } = await supabase
    .from('wallet_topup_claims')
    .select(
      'id,user_id,transaction_id,rail,amount_cents,external_reference,normalized_reference,state,proof_storage_path,proof_original_name,proof_mime,verification_notes,verified_by,verified_at,created_at'
    )
    .in('state', ['submitted', 'verified'])
    .order('created_at', { ascending: true });

  if (claimsError) {
    return (
      <div>
        <h1 className="text-3xl font-outfit font-bold text-white mb-8">Recargas de Saldo CTG</h1>
        <p style={{ color: 'var(--error)' }}>No se pudo cargar la cola de recargas: {claimsError.message}</p>
      </div>
    );
  }

  const userIds = [...new Set((claims ?? []).map((claim) => claim.user_id))];
  const { data: profiles } = userIds.length > 0
    ? await supabase.from('profiles').select('id,email,full_name').in('id', userIds)
    : { data: [] as Array<{ id: string; email: string; full_name: string | null }> };

  const profilesById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));

  const reviewRows = await Promise.all(
    (claims ?? []).map(async (claim) => {
      const { data: signed } = await supabase.storage
        .from('payment-proofs')
        .createSignedUrl(claim.proof_storage_path, 300);

      return {
        ...claim,
        proofSignedUrl: signed?.signedUrl ?? null,
        profile: profilesById.get(claim.user_id) ?? null,
      } as WalletTopupReviewRow;
    })
  );

  const submittedCount = reviewRows.filter((claim) => claim.state === 'submitted').length;
  const verifiedCount = reviewRows.filter((claim) => claim.state === 'verified').length;

  return (
    <div>
      <h1 className="text-3xl font-outfit font-bold text-white mb-3">Recargas de Saldo CTG</h1>
      <p className="mb-6" style={{ color: 'var(--text-muted)' }}>
        Verifica que cada comprobante corresponda a un ingreso real en Bancolombia/Bre-B. La verificación no acredita saldo: una segunda cuenta administradora debe conciliar el claim.
      </p>
      <div className="flex gap-3 flex-wrap mb-6 text-sm" style={{ color: 'var(--text-muted)' }}>
        <span>Por verificar: <strong className="text-white">{submittedCount}</strong></span>
        <span>Por conciliar: <strong className="text-white">{verifiedCount}</strong></span>
      </div>
      <WalletTopupReviewQueue claims={reviewRows} currentAdminId={user.id} />
    </div>
  );
}
