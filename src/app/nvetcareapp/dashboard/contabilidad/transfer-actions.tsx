'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function TransferActions({ transactionId }: { transactionId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<'confirm' | 'reject' | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setLoading('confirm');
    setError(null);
    try {
      const res = await fetch(`/api/nvetcareapp/admin/transactions/${transactionId}/confirm-transfer`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.message ?? 'No se pudo confirmar la transferencia.');
        return;
      }
      router.refresh();
    } catch {
      setError('No se pudo contactar el servicio.');
    } finally {
      setLoading(null);
    }
  }

  async function handleReject() {
    if (reason.trim().length < 10) {
      setError('El motivo debe tener al menos 10 caracteres.');
      return;
    }
    setLoading('reject');
    setError(null);
    try {
      const res = await fetch(`/api/nvetcareapp/admin/transactions/${transactionId}/reject-transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.message ?? 'No se pudo rechazar la transferencia.');
        return;
      }
      setReason('');
      setRejecting(false);
      router.refresh();
    } catch {
      setError('No se pudo contactar el servicio.');
    } finally {
      setLoading(null);
    }
  }

  if (rejecting) {
    return (
      <div className="flex w-56 flex-col items-end gap-2">
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Motivo del rechazo (mín. 10 caracteres)"
          maxLength={500}
          rows={2}
          className="w-full rounded-lg border border-[#0D1B2A]/10 bg-white px-2 py-1 text-xs text-[#0D1B2A] placeholder:text-[#5B6670]"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => { setRejecting(false); setError(null); }}
            className="rounded-full border border-[#0D1B2A]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5B6670] transition hover:bg-[#0D1B2A]/[0.03]"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleReject}
            disabled={loading !== null}
            className="rounded-full border border-[#FF8A3D]/25 bg-[#FF8A3D]/[0.06] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#FF8A3D] transition hover:bg-[#FF8A3D]/[0.12] disabled:opacity-60"
          >
            {loading === 'reject' ? 'Rechazando...' : 'Confirmar rechazo'}
          </button>
        </div>
        {error && <span className="text-[11px] text-[#B91C1C]">{error}</span>}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setRejecting(true)}
          disabled={loading !== null}
          className="rounded-full border border-[#0D1B2A]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5B6670] transition hover:bg-[#0D1B2A]/[0.03] disabled:opacity-60"
        >
          Rechazar
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={loading !== null}
          className="rounded-full border border-[#34B27A]/25 bg-[#34B27A]/[0.06] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#34B27A] transition hover:bg-[#34B27A]/[0.12] disabled:opacity-60"
        >
          {loading === 'confirm' ? 'Confirmando...' : 'Confirmar'}
        </button>
      </div>
      {error && <span className="text-[11px] text-[#B91C1C]">{error}</span>}
    </div>
  );
}
