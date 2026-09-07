'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, CreditCard, ShieldCheck } from 'lucide-react';

type Offering = {
  slug: string;
  title: string;
  summary: string;
  offering_type: string;
  price_amount: number | null;
  currency: string;
  action_path?: string | null;
  commerce_mode?: 'paid' | 'free' | 'inquiry';
  metadata?: Record<string, unknown> | null;
};

type CatalogResponse = { ok?: boolean; offerings?: Offering[] };

function price(amount: number, currency: string) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function duration(offering: Offering) {
  const value = offering.metadata?.duration_hours;
  return typeof value === 'number' ? value : Number.MAX_SAFE_INTEGER;
}

export function EducationInstantPurchaseOffers() {
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [offerings, setOfferings] = useState<Offering[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch('/api/education/catalog', { cache: 'no-store' });
        const payload = (await response.json().catch(() => ({}))) as CatalogResponse;
        if (cancelled) return;
        if (!response.ok || !payload.ok) return setState('error');
        setOfferings((payload.offerings ?? []).filter((offering) =>
          offering.offering_type === 'class'
          && offering.commerce_mode === 'paid'
          && offering.metadata?.axis === 'learningcenter'
          && offering.metadata?.commerce_mode === 'instant'
          && typeof offering.price_amount === 'number'
          && offering.price_amount > 0,
        ));
        setState('ready');
      } catch {
        if (!cancelled) setState('error');
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  const ordered = useMemo(() => [...offerings].sort((a, b) => duration(a) - duration(b)), [offerings]);

  if (state === 'loading') {
    return <div className="border border-[#6f0d12]/14 bg-[#fbf7f1] p-7 text-sm text-[#665950]">Cargando servicios disponibles…</div>;
  }

  if (state === 'error' || ordered.length === 0) {
    return <div className="border border-[#6f0d12]/14 bg-[#fbf7f1] p-7 text-sm leading-7 text-[#665950]">El catálogo de compra inmediata no está disponible en este momento. Ningún precio se calculará en el navegador.</div>;
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {ordered.map((offering) => (
        <article key={offering.slug} className="flex flex-col border border-[#6f0d12]/16 bg-[#fbf7f1] p-7 sm:p-8">
          <div className="flex items-center justify-between gap-4">
            <span className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.18em] text-[#6f0d12]"><CreditCard className="h-4 w-4" aria-hidden="true" /> Compra inmediata</span>
            <span className="text-[9px] font-bold uppercase tracking-[.14em] text-[#7b6a5f]">Precio publicado</span>
          </div>
          <h3 className="mt-5 font-serif text-3xl text-[#17110e]">{offering.title}</h3>
          <p className="mt-4 flex-1 font-serif text-[16px] leading-7 text-[#665950]">{offering.summary}</p>
          <div className="mt-7 border-y border-[#6f0d12]/12 py-5">
            <p className="font-serif text-4xl text-[#6f0d12]">{price(offering.price_amount as number, offering.currency)}</p>
            <p className="mt-2 flex items-center gap-2 text-xs leading-5 text-[#665950]"><ShieldCheck className="h-4 w-4 text-[#6f0d12]" aria-hidden="true" /> El servidor fija el precio; no hay cotización ni aprobación comercial previa.</p>
          </div>
          <a href={offering.action_path ?? `/jpvalderrama/campus/checkout/${encodeURIComponent(offering.slug)}`} className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 bg-[#6f0d12] px-6 text-xs font-bold uppercase tracking-[.13em] text-[#fffaf2]">Comprar y pagar ahora <ArrowRight className="h-4 w-4" aria-hidden="true" /></a>
        </article>
      ))}
    </div>
  );
}
