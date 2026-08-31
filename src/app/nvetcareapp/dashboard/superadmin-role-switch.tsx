'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, UserRound } from 'lucide-react';
import type { NvetRootRoleMode } from '@/lib/nvetcareapp/session';

export function SuperadminRoleSwitch({ currentMode }: { currentMode: NvetRootRoleMode }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const targetMode: NvetRootRoleMode = currentMode === 'CLIENT' ? 'SUPERADMIN' : 'CLIENT';

  async function switchMode() {
    if (pending) return;
    setPending(true);
    setError(null);

    try {
      const response = await fetch('/api/nvetcareapp/auth/role-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: targetMode }),
      });
      const body = (await response.json().catch(() => null)) as { message?: string } | null;
      if (!response.ok) {
        setError(body?.message || 'No se pudo cambiar el modo de acceso.');
        return;
      }

      router.push('/nvetcareapp/dashboard');
      router.refresh();
    } catch {
      setError('No se pudo contactar el servicio de acceso.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <button
        type="button"
        onClick={switchMode}
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-[#8BE0B5] disabled:cursor-wait disabled:opacity-60"
      >
        {targetMode === 'CLIENT' ? (
          <UserRound className="h-4 w-4" aria-hidden="true" />
        ) : (
          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
        )}
        {pending
          ? 'Cambiando…'
          : targetMode === 'CLIENT'
            ? 'Cambiar a usuario'
            : 'Volver a SUPERADMIN'}
      </button>
      {error && <p className="max-w-64 text-right text-[11px] text-red-200">{error}</p>}
    </div>
  );
}
