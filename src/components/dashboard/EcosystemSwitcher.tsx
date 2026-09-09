'use client';

import { useState } from 'react';

const FEDERATED_APPS = [
  {
    id: 'vertice',
    name: 'VÉRTICE',
    description: 'Gestión social y comunitaria basada en evidencia',
    action: 'Abrir dashboard',
  },
  {
    id: 'pisao',
    name: 'PISÁO Gastrobar',
    description: 'Pedidos, reservas e historial con tu identidad CTG One',
    action: 'Abrir mi cuenta',
  },
] as const;

export function EcosystemSwitcher() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-5 right-5 z-[70] flex flex-col items-end gap-2">
      {open ? (
        <div className="w-[min(22rem,calc(100vw-2rem))] rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-950/10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-slate-400">CTG One Ecosystem</p>
              <h2 className="mt-1 text-base font-extrabold text-slate-900">Tus plataformas</h2>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full px-2 py-1 text-sm font-bold text-slate-500 hover:bg-slate-100"
              aria-label="Cerrar selector del ecosistema"
            >
              ×
            </button>
          </div>

          <div className="mt-4 space-y-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-extrabold text-slate-900">CTG One</p>
                  <p className="mt-0.5 text-xs text-slate-500">Cuenta central del ecosistema</p>
                </div>
                <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide text-emerald-700">Aquí</span>
              </div>
            </div>

            {FEDERATED_APPS.map((app) => (
              <a
                key={app.id}
                href={`/api/ecosystem/launch?app=${app.id}`}
                className="block rounded-2xl border border-slate-200 bg-white p-3 transition hover:border-slate-300 hover:bg-slate-50"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-extrabold text-slate-900">{app.name}</p>
                    <p className="mt-0.5 text-xs leading-5 text-slate-500">{app.description}</p>
                  </div>
                  <span className="text-lg font-black text-slate-400" aria-hidden="true">→</span>
                </div>
                <p className="mt-2 text-[10px] font-extrabold uppercase tracking-[.12em] text-blue-700">{app.action}</p>
              </a>
            ))}
          </div>

          <p className="mt-3 text-[10px] leading-4 text-slate-400">
            Cada plataforma conserva su propio dashboard y sesión. CTG One coordina identidad y acceso seguro sin compartir KYC, Wallet ni permisos administrativos.
          </p>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="rounded-full border border-slate-200 bg-slate-950 px-4 py-3 text-xs font-extrabold uppercase tracking-[.12em] text-white shadow-xl shadow-slate-950/20 transition hover:-translate-y-0.5"
        aria-expanded={open}
        aria-label="Abrir selector del ecosistema CTG One"
      >
        Ecosistema
      </button>
    </div>
  );
}
