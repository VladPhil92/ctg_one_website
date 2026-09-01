'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Stethoscope, UserRound } from 'lucide-react';
import type { NvetRootRoleMode } from '@/lib/nvetcareapp/session';

const MODES: Array<{
  mode: NvetRootRoleMode;
  label: string;
  actionLabel: string;
  icon: typeof ShieldCheck;
}> = [
  { mode: 'SUPERADMIN', label: 'SUPERADMIN', actionLabel: 'Volver a SUPERADMIN', icon: ShieldCheck },
  { mode: 'CLIENT', label: 'Usuario', actionLabel: 'Cambiar a usuario', icon: UserRound },
  { mode: 'VET_TESTER', label: 'Vet Tester', actionLabel: 'Cambiar a Vet Tester', icon: Stethoscope },
];

export function SuperadminRoleSwitch({ currentMode }: { currentMode: NvetRootRoleMode }) {
  const router = useRouter();
  const [pendingMode, setPendingMode] = useState<NvetRootRoleMode | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function switchMode(targetMode: NvetRootRoleMode) {
    if (pendingMode || targetMode === currentMode) return;
    setPendingMode(targetMode);
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

      const landingPath = targetMode === 'CLIENT'
        ? '/nvetcareapp/dashboard/citas'
        : targetMode === 'VET_TESTER'
          ? '/nvetcareapp/dashboard'
          : '/nvetcareapp/dashboard/gobernanza';
      router.replace(landingPath);
      router.refresh();
    } catch {
      setError('No se pudo contactar el servicio de acceso.');
    } finally {
      setPendingMode(null);
    }
  }

  return (
    <div className="flex max-w-full flex-col items-end gap-1.5">
      <div className="flex max-w-full flex-wrap justify-end gap-2">
        {MODES.map(({ mode, label, actionLabel, icon: Icon }) => {
          const active = mode === currentMode;
          const pending = pendingMode === mode;
          return (
            <button
              key={mode}
              type="button"
              onClick={() => void switchMode(mode)}
              disabled={Boolean(pendingMode) || active}
              aria-pressed={active}
              aria-label={actionLabel}
              title={actionLabel}
              className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#8BE0B5] disabled:cursor-default ${
                active
                  ? 'border-[#34B27A]/60 bg-[#34B27A]/20 text-[#8BE0B5]'
                  : 'border-white/20 bg-white/10 text-white hover:bg-white/15 disabled:opacity-55'
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {pending ? 'Cambiando…' : label}
            </button>
          );
        })}
      </div>
      {error && <p className="max-w-80 text-right text-[11px] text-red-200">{error}</p>}
    </div>
  );
}
