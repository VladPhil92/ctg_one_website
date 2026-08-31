'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function UserStatusButton({
  userId,
  active,
  disabled = false,
}: {
  userId: string;
  active: boolean;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    if (disabled || pending) return;
    const nextActive = !active;
    const reason = window.prompt(
      nextActive
        ? 'Motivo de reactivación (mínimo 10 caracteres):'
        : 'Motivo de desactivación (mínimo 10 caracteres):',
    );
    if (!reason || reason.trim().length < 10) return;

    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/nvetcareapp/admin/governance/users/${userId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: nextActive, reason: reason.trim() }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.message ?? 'No se pudo actualizar la cuenta.');
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar la cuenta.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={toggle}
        disabled={disabled || pending}
        className={`rounded-lg border px-3 py-2 text-[11px] font-bold uppercase tracking-[0.08em] disabled:cursor-not-allowed disabled:opacity-40 ${
          active
            ? 'border-[#FF8A3D]/30 text-[#B75B1C] hover:bg-[#FF8A3D]/[0.06]'
            : 'border-[#34B27A]/30 text-[#289463] hover:bg-[#34B27A]/[0.06]'
        }`}
      >
        {pending ? 'Procesando…' : active ? 'Desactivar' : 'Reactivar'}
      </button>
      {disabled && <span className="text-[10px] text-[#7C8791]">Identidad raíz protegida</span>}
      {error && <span className="max-w-56 text-right text-[10px] text-[#B75B1C]">{error}</span>}
    </div>
  );
}
