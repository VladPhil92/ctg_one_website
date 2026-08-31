'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { NvetAppointmentStatus } from '@/lib/nvetcareapp/appointments';
import { nvetFetchWithRefresh } from './nvet-fetch';

// Payment confirmation is intentionally not a VET action in the web shell.
// PENDING stays locked until the payment/admin flow confirms the appointment.
// Completion is performed in /dashboard/servicios after clinical notes are
// persisted. The agenda keeps only the paid CONFIRMED -> IN_PROGRESS shortcut.
const NEXT_ACTION: Partial<Record<NvetAppointmentStatus, { next: NvetAppointmentStatus; label: string }>> = {
  CONFIRMED: { next: 'IN_PROGRESS', label: 'Iniciar' },
};

export function AdvanceStatusButton({ appointmentId, status }: { appointmentId: string; status: NvetAppointmentStatus }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const action = NEXT_ACTION[status];

  if (!action) return null;

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const res = await nvetFetchWithRefresh(`/api/nvetcareapp/appointments/${appointmentId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: action!.next }),
      });
      if (!res.ok) {
        const message = await res.json().then((data) => data?.message).catch(() => undefined);
        setError(message || 'No se pudo actualizar la cita.');
        return;
      }
      router.refresh();
    } catch {
      setError('No se pudo contactar el servicio.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="rounded-full border border-[#34B27A]/25 bg-[#34B27A]/[0.06] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#34B27A] transition hover:bg-[#34B27A]/[0.12] disabled:opacity-60"
      >
        {loading ? 'Actualizando...' : action.label}
      </button>
      {error && <span className="text-[11px] text-[#B91C1C]">{error}</span>}
    </div>
  );
}
