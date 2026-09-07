'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, BookOpen, GraduationCap, Lightbulb, Mic2, Sparkles } from 'lucide-react';

type Axis = 'talks' | 'ideas' | 'books' | 'projects';

type Offering = {
  id: string;
  slug: string;
  title: string;
  offering_type: string;
  summary: string;
  price_amount: number | null;
  currency: string;
  access_path: string | null;
  action_path?: string | null;
  destination_path?: string | null;
  commerce_mode?: 'paid' | 'free' | 'inquiry';
  metadata?: Record<string, unknown> | null;
};

type CatalogResponse = { ok?: boolean; offerings?: Offering[] };

const axisFallbackTypes: Record<Axis, string[]> = {
  talks: ['conference'],
  ideas: ['course', 'resource'],
  books: ['book'],
  projects: [],
};

const axisLabels: Record<Axis, { eyebrow: string; empty: string }> = {
  talks: { eyebrow: 'Entradas, grabaciones y experiencias', empty: 'No hay nuevas ofertas de Talks publicadas en este momento.' },
  ideas: { eyebrow: 'Cursos y recursos para profundizar', empty: 'El archivo editorial permanece abierto; las extensiones educativas aparecerán aquí cuando estén publicadas.' },
  books: { eyebrow: 'Ediciones y publicaciones', empty: 'No hay libros a la venta todavía. Esta sección no publica títulos hasta que exista una edición verificable.' },
  projects: { eyebrow: 'Programas y colaboraciones', empty: 'Los proyectos a medida se contratan por alcance; no se publican como productos cerrados sin una propuesta definida.' },
};

function formatPrice(amount: number | null, currency: string) {
  if (amount === null) return 'Cotización';
  if (amount === 0) return 'Sin costo';
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
}

function iconFor(type: string) {
  if (type === 'conference') return Mic2;
  if (type === 'book') return BookOpen;
  if (type === 'course' || type === 'class') return GraduationCap;
  if (type === 'resource') return Lightbulb;
  return Sparkles;
}

function offeringAxis(offering: Offering): Axis | null {
  const explicitAxis = typeof offering.metadata?.axis === 'string' ? offering.metadata.axis : null;
  if (explicitAxis === 'talks' || explicitAxis === 'ideas' || explicitAxis === 'books' || explicitAxis === 'projects') return explicitAxis;
  if (offering.offering_type === 'conference') return 'talks';
  if (offering.offering_type === 'book') return 'books';
  if (offering.offering_type === 'course' || offering.offering_type === 'resource') return 'ideas';
  return null;
}

function actionLabel(offering: Offering) {
  if (offering.commerce_mode === 'paid' || (offering.price_amount ?? 0) > 0) return 'Comprar acceso';
  if (offering.commerce_mode === 'free' || offering.price_amount === 0) return offering.offering_type === 'course' ? 'Activar curso' : 'Abrir recurso';
  return 'Solicitar información';
}

export function EducationAxisCatalog({ axis, title, intro }: { axis: Axis; title: string; intro: string }) {
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [offerings, setOfferings] = useState<Offering[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch('/api/education/catalog', { cache: 'no-store' });
        const payload = (await response.json().catch(() => ({}))) as CatalogResponse;
        if (cancelled) return;
        if (!response.ok || !payload.ok) {
          setState('error');
          return;
        }
        setOfferings(payload.offerings ?? []);
        setState('ready');
      } catch {
        if (!cancelled) setState('error');
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => offerings.filter((offering) => {
    const explicit = offeringAxis(offering);
    if (explicit === axis) return true;
    return axisFallbackTypes[axis].includes(offering.offering_type);
  }), [axis, offerings]);

  const inquiryHref = axis === 'projects'
    ? '/jpvalderrama/campus#instituciones'
    : '/jpvalderrama/campus#catalogo';

  return (
    <section id="oferta" className="border-y border-[#6f0d12]/12 bg-[#fbf7f1] px-5 py-16 sm:px-8 lg:px-12 lg:py-24">
      <div className="mx-auto max-w-[1180px]">
        <div className="grid gap-7 lg:grid-cols-[.72fr_1.28fr] lg:items-end">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#6f0d12]">{axisLabels[axis].eyebrow}</p>
            <h2 className="mt-3 font-serif text-4xl leading-tight tracking-[-.025em] text-[#17110e] sm:text-5xl">{title}</h2>
          </div>
          <p className="max-w-2xl font-serif text-[17px] leading-8 text-[#665950] lg:justify-self-end">{intro}</p>
        </div>

        {state === 'loading' ? (
          <div className="mt-10 border border-[#6f0d12]/12 bg-[#fffaf2] p-8 font-serif text-[#665950]">Consultando la oferta educativa publicada…</div>
        ) : filtered.length > 0 ? (
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {filtered.map((offering) => {
              const Icon = iconFor(offering.offering_type);
              const href = offering.action_path ?? offering.access_path ?? inquiryHref;
              return (
                <article key={offering.id} className="flex min-h-[280px] flex-col border border-[#6f0d12]/14 bg-[#fffaf2] p-7 sm:p-8">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[#6f0d12]/18 text-[#6f0d12]"><Icon className="h-5 w-5" aria-hidden="true" /></div>
                    <span className="text-[10px] font-bold uppercase tracking-[.16em] text-[#6f0d12]">{formatPrice(offering.price_amount, offering.currency)}</span>
                  </div>
                  <p className="mt-6 text-[10px] font-bold uppercase tracking-[.18em] text-[#8a7568]">{offering.offering_type}</p>
                  <h3 className="mt-2 font-serif text-2xl leading-tight text-[#17110e]">{offering.title}</h3>
                  <p className="mt-4 flex-1 text-sm leading-7 text-[#665950]">{offering.summary}</p>
                  <a href={href} className="mt-6 inline-flex min-h-11 items-center gap-2 text-[10px] font-bold uppercase tracking-[.14em] text-[#6f0d12]">
                    {actionLabel(offering)} <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </a>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="mt-10 border border-[#6f0d12]/12 bg-[#fffaf2] p-8 sm:p-10">
            <p className="max-w-3xl font-serif text-xl leading-8 text-[#3b312b]">{state === 'error' ? 'El catálogo no está disponible temporalmente.' : axisLabels[axis].empty}</p>
            <a href={inquiryHref} className="mt-5 inline-flex min-h-11 items-center gap-2 text-[10px] font-bold uppercase tracking-[.14em] text-[#6f0d12]">
              {axis === 'projects' ? 'Plantear una colaboración' : 'Explorar el Campus'} <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
