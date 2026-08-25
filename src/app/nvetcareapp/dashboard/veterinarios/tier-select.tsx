'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { NvetVetTier } from '@/lib/nvetcareapp/vets';

const TIER_OPTIONS: NvetVetTier[] = ['FREE', 'PRO', 'ELITE'];
const TIER_LABELS: Record<NvetVetTier, string> = { FREE: 'Free', PRO: 'Pro', ELITE: 'Elite' };

export function TierSelect({ vetId, currentTier }: { vetId: string; currentTier: NvetVetTier }) {
  const router = useRouter();
  const [tier, setTier] = useState<NvetVetTier>(currentTier);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = tier !== currentTier;

  async function handleSave() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/nvetcareapp/admin/veterinarians/${vetId}/tier`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier, reason: reason || undefined }),
      });
      if (!res.ok) {
        setError('No se pudo actualizar el nivel.');
        return;
      }
      setReason('');
      router.refresh();
    } catch {
      setError('No se pudo contactar el servicio.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex items-center gap-2">
        <select
          value={tier}
          onChange={(e) => setTier(e.target.value as NvetVetTier)}
          className="rounded-lg border border-[#0D1B2A]/10 bg-white px-2 py-1 text-xs text-[#0D1B2A]"
        >
          {TIER_OPTIONS.map((option) => (
            <option key={option} value={option}>{TIER_LABELS[option]}</option>
          ))}
        </select>
        {dirty && (
          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="rounded-full border border-[#34B27A]/25 bg-[#34B27A]/[0.06] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#34B27A] transition hover:bg-[#34B27A]/[0.12] disabled:opacity-60"
          >
            {loading ? 'Guardando...' : 'Guardar'}
          </button>
        )}
      </div>
      {dirty && (
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Motivo del cambio (opcional)"
          maxLength={500}
          className="w-56 rounded-lg border border-[#0D1B2A]/10 bg-white px-2 py-1 text-xs text-[#0D1B2A] placeholder:text-[#5B6670]"
        />
      )}
      {error && <span className="text-[11px] text-[#B91C1C]">{error}</span>}
    </div>
  );
}
