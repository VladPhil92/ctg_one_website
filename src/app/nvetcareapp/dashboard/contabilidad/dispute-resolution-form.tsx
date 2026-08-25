'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { NvetDisputeResolution } from '@/lib/nvetcareapp/transactions';
import { nvetFetchWithRefresh } from '../nvet-fetch';

const RESOLUTION_LABELS: Record<NvetDisputeResolution, string> = {
  CONFIRM: 'Confirmar cobro (completar cita)',
  REFUND: 'Reembolsar (cancelar cita)',
  CANCEL: 'Cancelar transacción',
};

export function DisputeResolutionForm({ transactionId }: { transactionId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [resolution, setResolution] = useState<NvetDisputeResolution>('CONFIRM');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (notes.trim().length < 10) {
      setError('Las notas deben tener al menos 10 caracteres.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await nvetFetchWithRefresh(`/api/nvetcareapp/admin/transactions/${transactionId}/resolve-dispute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolution, notes }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.message ?? 'No se pudo resolver la disputa.');
        return;
      }
      setNotes('');
      setOpen(false);
      router.refresh();
    } catch {
      setError('No se pudo contactar el servicio.');
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full border border-[#FF8A3D]/25 bg-[#FF8A3D]/[0.06] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#FF8A3D] transition hover:bg-[#FF8A3D]/[0.12]"
      >
        Resolver disputa
      </button>
    );
  }

  return (
    <div className="flex w-64 flex-col gap-2 rounded-lg border border-[#0D1B2A]/10 bg-[#F2F4F7] p-3">
      <select
        value={resolution}
        onChange={(e) => setResolution(e.target.value as NvetDisputeResolution)}
        className="rounded-lg border border-[#0D1B2A]/10 bg-white px-2 py-1 text-xs text-[#0D1B2A]"
      >
        {(Object.keys(RESOLUTION_LABELS) as NvetDisputeResolution[]).map((option) => (
          <option key={option} value={option}>{RESOLUTION_LABELS[option]}</option>
        ))}
      </select>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notas de la resolución (mín. 10 caracteres)"
        maxLength={1000}
        rows={3}
        className="rounded-lg border border-[#0D1B2A]/10 bg-white px-2 py-1 text-xs text-[#0D1B2A] placeholder:text-[#5B6670]"
      />
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => { setOpen(false); setError(null); }}
          className="rounded-full border border-[#0D1B2A]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5B6670] transition hover:bg-white"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          className="rounded-full border border-[#34B27A]/25 bg-[#34B27A]/[0.06] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#34B27A] transition hover:bg-[#34B27A]/[0.12] disabled:opacity-60"
        >
          {loading ? 'Enviando...' : 'Enviar'}
        </button>
      </div>
      {error && <span className="text-[11px] text-[#B91C1C]">{error}</span>}
    </div>
  );
}
