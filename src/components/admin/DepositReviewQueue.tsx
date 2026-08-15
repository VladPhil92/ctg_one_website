'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { formatCents } from '@/lib/format';

const METHOD_LABELS: Record<string, string> = {
  bank_transfer: 'Transferencia bancaria',
  pse: 'PSE',
  bre_b_qr: 'QR / Llave Bre-B',
  crypto: 'Cripto',
};

interface DepositRow {
  id: string;
  user_id: string;
  method: string;
  amount_cents: number;
  proof_storage_path: string | null;
  proofSignedUrl: string | null;
  external_reference: string | null;
  crypto_network: string | null;
  crypto_asset: string | null;
  crypto_tx_hash: string | null;
  created_at: string;
  profiles: { email: string; full_name: string | null } | null;
}

export const DepositReviewQueue: React.FC<{ transactions: DepositRow[] }> = ({ transactions }) => {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const approve = async (id: string) => {
    setError(null);
    setPendingId(id);
    try {
      const res = await fetch(`/api/admin/deposits/${id}/approve`, { method: 'POST', body: '{}' });
      if (!res.ok) throw new Error((await res.json()).error ?? 'No se pudo aprobar');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo aprobar');
    } finally {
      setPendingId(null);
    }
  };

  const reject = async (id: string) => {
    const reason = window.prompt('Motivo del rechazo (visible para el usuario):');
    if (!reason) return;
    setError(null);
    setPendingId(id);
    try {
      const res = await fetch(`/api/admin/deposits/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'No se pudo rechazar');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo rechazar');
    } finally {
      setPendingId(null);
    }
  };

  if (transactions.length === 0) {
    return <p style={{ color: 'var(--text-muted)' }}>No hay depósitos pendientes.</p>;
  }

  return (
    <div className="space-y-4">
      {error && <p className="text-sm" style={{ color: 'var(--error)' }}>{error}</p>}
      {transactions.map((tx) => (
        <div key={tx.id} className="p-6 rounded-lg border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
            <div>
              <p className="text-white font-medium">{tx.profiles?.full_name ?? '—'}</p>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{tx.profiles?.email}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-dim)' }}>
                {new Date(tx.created_at).toLocaleString('es-CO')} · {METHOD_LABELS[tx.method] ?? tx.method}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-outfit font-semibold text-white">{formatCents(tx.amount_cents)}</p>
            </div>
          </div>

          <div className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
            {tx.method === 'crypto' ? (
              <>
                <p>Red/activo: {tx.crypto_network} / {tx.crypto_asset}</p>
                <p className="font-mono break-all">Hash: {tx.crypto_tx_hash}</p>
              </>
            ) : (
              <>
                {tx.external_reference && <p>Referencia: {tx.external_reference}</p>}
                {tx.proofSignedUrl && (
                  <a href={tx.proofSignedUrl} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                    Ver comprobante
                  </a>
                )}
              </>
            )}
          </div>

          <div className="flex gap-2">
            <Button onClick={() => approve(tx.id)} disabled={pendingId === tx.id} variant="primary" size="sm">
              Aprobar
            </Button>
            <Button onClick={() => reject(tx.id)} disabled={pendingId === tx.id} variant="secondary" size="sm">
              Rechazar
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};
