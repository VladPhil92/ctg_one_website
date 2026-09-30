'use client';

import { ShieldCheck } from 'lucide-react';

import { SuperadminViewControl } from '@/components/admin/SuperadminViewControl';

export function SuperadminUserModeBanner() {
  return (
    <div className="fixed inset-x-3 bottom-3 z-[90] mx-auto flex max-w-3xl flex-col gap-3 rounded-2xl border border-accent/30 bg-[#0b0d0f]/95 px-4 py-3 shadow-2xl backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-accent/20 bg-accent/[.07] text-accent">
          <ShieldCheck size={16} />
        </span>
        <div className="min-w-0">
          <p className="text-[9px] font-semibold uppercase tracking-[.18em] text-accent">SUPER_ADMIN · vista efectiva</p>
          <p className="mt-1 text-xs font-medium text-white">Está navegando CTG One como usuario.</p>
          <p className="mt-1 text-[10px] leading-4 text-white/45">La autoridad real de la cuenta no cambia. Use el control para regresar al Command Center sin cerrar sesión.</p>
        </div>
      </div>
      <SuperadminViewControl currentMode="user" />
    </div>
  );
}
