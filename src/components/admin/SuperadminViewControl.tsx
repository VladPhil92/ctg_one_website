'use client';

import { Eye, Loader2, ShieldCheck } from 'lucide-react';
import { useState } from 'react';

import type { SuperadminViewMode } from '@/lib/admin/superadmin-view';

type Props = {
  currentMode: SuperadminViewMode;
  compact?: boolean;
};

export function SuperadminViewControl({ currentMode, compact = false }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const targetMode: SuperadminViewMode = currentMode === 'superadmin' ? 'user' : 'superadmin';
  const targetHref = targetMode === 'user' ? '/dashboard' : '/admin';
  const label = targetMode === 'user' ? 'Vista usuario' : 'Volver a Superadmin';

  const switchView = async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/view-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: targetMode }),
      });
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error ?? 'No se pudo cambiar la vista.');
      window.location.assign(targetHref);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo cambiar la vista.');
      setBusy(false);
    }
  };

  return (
    <div className={compact ? 'flex items-center gap-2' : 'flex flex-col items-end gap-1.5'}>
      <button
        type="button"
        onClick={() => void switchView()}
        disabled={busy}
        className={compact
          ? 'inline-flex h-9 items-center gap-2 rounded-lg border border-accent/25 bg-accent/[.06] px-3 text-[8px] font-semibold uppercase tracking-[.12em] text-accent transition hover:bg-accent/[.11] disabled:opacity-50'
          : 'inline-flex h-10 items-center gap-2 rounded-xl border border-accent/30 bg-accent/[.08] px-4 text-xs font-semibold text-accent transition hover:bg-accent/[.14] disabled:opacity-50'}
        aria-label={label}
      >
        {busy ? <Loader2 size={compact ? 13 : 15} className="animate-spin" /> : targetMode === 'user' ? <Eye size={compact ? 13 : 15} /> : <ShieldCheck size={compact ? 13 : 15} />}
        <span className={compact ? 'hidden sm:inline' : undefined}>{busy ? 'Cambiando…' : label}</span>
      </button>
      {error ? <span className="max-w-[260px] text-right text-[9px] text-red-300" role="alert">{error}</span> : null}
    </div>
  );
}
