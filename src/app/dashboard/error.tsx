'use client';

import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function DashboardError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="min-h-screen bg-[#030303] px-4 py-24 text-white">
      <div className="mx-auto max-w-xl rounded-[24px] border border-white/[.09] bg-white/[.025] p-7 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-amber-300/25 bg-amber-300/[.06] text-amber-200">
          <AlertTriangle size={20} aria-hidden="true" />
        </span>
        <p className="mt-5 text-[9px] font-semibold uppercase tracking-[.2em] text-white/35">CTG ONE / PERSONAL OS</p>
        <h2 className="mt-2 font-outfit text-2xl font-semibold tracking-[-.03em]">No fue posible cargar el dashboard</h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-white/45">
          La sesión permanece protegida. Puedes reintentar la carga sin repetir la navegación ni abandonar tu cuenta.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-accent/30 bg-accent/[.07] px-5 text-xs font-semibold text-accent transition hover:bg-accent/[.11]"
        >
          <RefreshCw size={14} aria-hidden="true" /> Reintentar
        </button>
      </div>
    </div>
  );
}
