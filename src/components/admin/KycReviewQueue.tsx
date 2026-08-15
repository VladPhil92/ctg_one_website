'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';

interface KycDocumentRow {
  id: string;
  document_type: string;
  storage_path: string;
  signedUrl: string | null;
}

interface KycSubmissionRow {
  id: string;
  user_id: string;
  status: string;
  created_at: string;
  profiles: { email: string; full_name: string | null } | null;
  kyc_documents: KycDocumentRow[];
}

export const KycReviewQueue: React.FC<{ submissions: KycSubmissionRow[] }> = ({ submissions }) => {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const approve = async (id: string) => {
    setError(null);
    setPendingId(id);
    try {
      const res = await fetch(`/api/admin/kyc/${id}/approve`, { method: 'POST', body: '{}' });
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
      const res = await fetch(`/api/admin/kyc/${id}/reject`, {
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

  if (submissions.length === 0) {
    return <p style={{ color: 'var(--text-muted)' }}>No hay verificaciones pendientes.</p>;
  }

  return (
    <div className="space-y-4">
      {error && <p className="text-sm" style={{ color: 'var(--error)' }}>{error}</p>}
      {submissions.map((s) => (
        <div key={s.id} className="p-6 rounded-lg border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-white font-medium">{s.profiles?.full_name ?? '—'}</p>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{s.profiles?.email}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-dim)' }}>
                Enviado: {new Date(s.created_at).toLocaleString('es-CO')}
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => approve(s.id)} disabled={pendingId === s.id} variant="primary" size="sm">
                Aprobar
              </Button>
              <Button onClick={() => reject(s.id)} disabled={pendingId === s.id} variant="secondary" size="sm">
                Rechazar
              </Button>
            </div>
          </div>
          <div className="flex gap-3 flex-wrap">
            {s.kyc_documents.map((doc) => (
              <a
                key={doc.id}
                href={doc.signedUrl ?? '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-accent hover:underline px-3 py-2 rounded border"
                style={{ borderColor: 'var(--border)' }}
              >
                Ver {doc.document_type}
              </a>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
