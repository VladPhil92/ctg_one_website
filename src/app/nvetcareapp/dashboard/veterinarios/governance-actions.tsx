'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { NvetVerificationStatus } from '@/lib/nvetcareapp/vets';

export function VetGovernanceActions({
  vetId,
  verificationStatus,
  active,
}: {
  vetId: string;
  verificationStatus: NvetVerificationStatus;
  active: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function requestReason(label: string) {
    const reason = window.prompt(`${label}. Motivo (mínimo 10 caracteres):`);
    return reason && reason.trim().length >= 10 ? reason.trim() : null;
  }

  async function verification(decision: 'APPROVE' | 'REJECT' | 'IN_REVIEW') {
    const reason = await requestReason(
      decision === 'APPROVE' ? 'Aprobar verificación profesional' : decision === 'REJECT' ? 'Rechazar verificación profesional' : 'Mover expediente a revisión',
    );
    if (!reason) return;
    setPending(decision);
    setError(null);
    try {
      const response = await fetch(`/api/nvetcareapp/admin/governance/veterinarians/${vetId}/verification`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, reason }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.message ?? 'No se pudo registrar la decisión.');
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar la decisión.');
    } finally {
      setPending(null);
    }
  }

  async function toggleStatus() {
    const reason = await requestReason(active ? 'Suspender veterinario' : 'Reactivar veterinario');
    if (!reason) return;
    setPending('STATUS');
    setError(null);
    try {
      const response = await fetch(`/api/nvetcareapp/admin/governance/veterinarians/${vetId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !active, reason }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.message ?? 'No se pudo actualizar el estado profesional.');
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar el estado profesional.');
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="mt-3 border-t border-[#0D1B2A]/7 pt-3">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.1em] text-[#7C8791]">Decisiones SUPERADMIN</p>
      <div className="flex flex-wrap gap-2">
        {verificationStatus !== 'APPROVED' && (
          <button disabled={Boolean(pending)} onClick={() => verification('APPROVE')} className="rounded-lg border border-[#34B27A]/30 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.06em] text-[#289463] hover:bg-[#34B27A]/[0.06] disabled:opacity-40">Aprobar</button>
        )}
        {verificationStatus !== 'IN_REVIEW' && (
          <button disabled={Boolean(pending)} onClick={() => verification('IN_REVIEW')} className="rounded-lg border border-[#0D1B2A]/15 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.06em] text-[#5B6670] hover:bg-[#0D1B2A]/[0.03] disabled:opacity-40">Revisar</button>
        )}
        {verificationStatus !== 'REJECTED' && (
          <button disabled={Boolean(pending)} onClick={() => verification('REJECT')} className="rounded-lg border border-[#FF8A3D]/30 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.06em] text-[#B75B1C] hover:bg-[#FF8A3D]/[0.06] disabled:opacity-40">Rechazar</button>
        )}
        <button disabled={Boolean(pending)} onClick={toggleStatus} className={`rounded-lg border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.06em] disabled:opacity-40 ${active ? 'border-red-200 text-red-700 hover:bg-red-50' : 'border-[#34B27A]/30 text-[#289463] hover:bg-[#34B27A]/[0.06]'}`}>{active ? 'Suspender' : 'Reactivar'}</button>
      </div>
      {pending && <p className="mt-2 text-[10px] text-[#7C8791]">Aplicando decisión…</p>}
      {error && <p className="mt-2 text-[10px] text-[#B75B1C]">{error}</p>}
    </div>
  );
}
