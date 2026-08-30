'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { formatCents } from '@/lib/format';

const RAIL_LABELS: Record<string, string> = {
  bank_transfer: 'Transferencia bancaria',
  bre_b_qr: 'QR / Bre-B',
};

export interface WalletTopupReviewRow {
  id: string;
  user_id: string;
  transaction_id: string;
  rail: string;
  amount_cents: number;
  external_reference: string;
  normalized_reference: string;
  state: 'submitted' | 'verified';
  proofSignedUrl: string | null;
  proof_original_name: string | null;
  proof_mime: string;
  verification_notes: string | null;
  verified_by: string | null;
  verified_at: string | null;
  created_at: string;
  profile: { email: string; full_name: string | null } | null;
}

export function WalletTopupReviewQueue({
  claims,
  currentAdminId,
}: {
  claims: WalletTopupReviewRow[];
  currentAdminId: string;
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const postAction = async (
    claimId: string,
    action: 'verify' | 'reconcile' | 'reject',
    body: Record<string, string>,
  ) => {
    setError(null);
    setPendingId(claimId);
    try {
      const response = await fetch(`/api/admin/wallet-topups/${claimId}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error ?? 'No se pudo actualizar la recarga');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar la recarga');
    } finally {
      setPendingId(null);
    }
  };

  const verify = async (claim: WalletTopupReviewRow) => {
    const notes = window.prompt(
      `Confirma que Bancolombia/Bre-B muestra un ingreso real por ${formatCents(claim.amount_cents)} con referencia ${claim.external_reference}.\n\nNotas de verificación (opcional):`,
      '',
    );
    if (notes === null) return;
    await postAction(claim.id, 'verify', notes.trim() ? { notes: notes.trim() } : {});
  };

  const reconcile = async (claim: WalletTopupReviewRow) => {
    if (claim.verified_by === currentAdminId) {
      setError('La persona que verificó el pago no puede conciliar la misma recarga. Se requiere un segundo administrador.');
      return;
    }

    const confirmed = window.confirm(
      `Esta acción acreditará ${formatCents(claim.amount_cents)} al Saldo CTG del usuario. ¿Confirmas la conciliación?`,
    );
    if (!confirmed) return;

    await postAction(claim.id, 'reconcile', {});
  };

  const reject = async (claim: WalletTopupReviewRow) => {
    const reason = window.prompt('Motivo del rechazo (mínimo 3 caracteres):');
    if (!reason?.trim()) return;
    await postAction(claim.id, 'reject', { reason: reason.trim() });
  };

  if (claims.length === 0) {
    return <p style={{ color: 'var(--text-muted)' }}>No hay recargas pendientes de validación o conciliación.</p>;
  }

  return (
    <div className="space-y-4">
      {error && <p className="text-sm" style={{ color: 'var(--error)' }} role="alert">{error}</p>}

      {claims.map((claim) => {
        const waitingForSecondAdmin = claim.state === 'verified' && claim.verified_by === currentAdminId;

        return (
          <div
            key={claim.id}
            className="p-6 rounded-lg border"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}
          >
            <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
              <div>
                <p className="text-white font-medium">{claim.profile?.full_name ?? 'Usuario CTG One'}</p>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{claim.profile?.email ?? claim.user_id}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-dim)' }}>
                  {new Date(claim.created_at).toLocaleString('es-CO')} · {RAIL_LABELS[claim.rail] ?? claim.rail}
                </p>
              </div>

              <div className="text-right">
                <p className="text-2xl font-outfit font-semibold text-white">{formatCents(claim.amount_cents)}</p>
                <p className="text-xs uppercase tracking-wide" style={{ color: claim.state === 'verified' ? 'var(--success)' : 'var(--text-muted)' }}>
                  {claim.state === 'verified' ? 'Pago verificado · falta conciliación' : 'Comprobante recibido · falta verificación'}
                </p>
              </div>
            </div>

            <div className="text-sm mb-4 space-y-1" style={{ color: 'var(--text-muted)' }}>
              <p>Referencia declarada: <span className="font-mono">{claim.external_reference}</span></p>
              <p>Referencia normalizada: <span className="font-mono">{claim.normalized_reference}</span></p>
              <p>Transaction ID: <span className="font-mono break-all">{claim.transaction_id}</span></p>
              {claim.proof_original_name && <p>Archivo: {claim.proof_original_name} ({claim.proof_mime})</p>}
              {claim.proofSignedUrl && (
                <p>
                  <a href={claim.proofSignedUrl} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                    Ver comprobante
                  </a>
                </p>
              )}
              {claim.verified_at && (
                <p>Verificado: {new Date(claim.verified_at).toLocaleString('es-CO')}</p>
              )}
              {claim.verification_notes && <p>Notas: {claim.verification_notes}</p>}
            </div>

            {waitingForSecondAdmin && (
              <p className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>
                El pago ya fue verificado por tu usuario administrador. La acreditación requiere que un segundo administrador concilie la recarga.
              </p>
            )}

            <div className="flex gap-2 flex-wrap">
              {claim.state === 'submitted' ? (
                <>
                  <Button
                    onClick={() => { void verify(claim); }}
                    disabled={pendingId === claim.id}
                    variant="primary"
                    size="sm"
                  >
                    Verificar pago en banco
                  </Button>
                  <Button
                    onClick={() => { void reject(claim); }}
                    disabled={pendingId === claim.id}
                    variant="secondary"
                    size="sm"
                  >
                    Rechazar
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    onClick={() => { void reconcile(claim); }}
                    disabled={pendingId === claim.id || waitingForSecondAdmin}
                    variant="primary"
                    size="sm"
                  >
                    Conciliar y acreditar Saldo CTG
                  </Button>
                  <Button
                    onClick={() => { void reject(claim); }}
                    disabled={pendingId === claim.id}
                    variant="secondary"
                    size="sm"
                  >
                    Rechazar
                  </Button>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
