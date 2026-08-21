'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowUpRight, Network, Workflow } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Container } from '@/components/ui';
import { FadeInSection } from '@/components/ui/FadeInSection';
import { useLanguage } from '@/contexts/LanguageContext';
import { ECOSYSTEM_TECHNOLOGY_UNITS } from '@/data/ecosystem-technology';
import type { EcosystemProcess } from '@/data/ecosystem-processes';

const statusClasses: Record<string, string> = {
  LIVE: 'border-emerald-300/20 bg-emerald-300/[0.035] text-emerald-200',
  PARTIAL: 'border-amber-200/20 bg-amber-200/[0.03] text-amber-100/80',
  'IN DEVELOPMENT': 'border-sky-300/20 bg-sky-300/[0.03] text-sky-200/80',
  ROADMAP: 'border-white/[0.08] bg-white/[0.015] text-text-dim',
};

export const EcosystemProcessDetail: React.FC<{ process: EcosystemProcess }> = ({ process }) => {
  const { locale } = useLanguage();
  const es = locale === 'es';
  const steps = es ? process.stepsEs : process.stepsEn;
  const units = process.businessUnitIds
    .map((id) => ECOSYSTEM_TECHNOLOGY_UNITS.find((unit) => unit.id === id))
    .filter((unit): unit is NonNullable<typeof unit> => Boolean(unit));

  return (
    <section className="relative min-h-screen overflow-hidden bg-bg-primary py-20 sm:py-24 md:py-28">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -right-48 top-0 h-[720px] w-[720px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(214,174,86,.075), transparent 68%)' }} />
        <div className="absolute -left-52 top-[38%] h-[660px] w-[660px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(36,140,255,.055), transparent 70%)' }} />
        <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: 'linear-gradient(rgba(36,140,255,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(214,174,86,.05) 1px, transparent 1px)', backgroundSize: '72px 72px' }} />
      </div>

      <Container size="large" className="relative z-10">
        <FadeInSection>
          <Link href="/ecosystem" className="mb-8 inline-flex min-h-11 items-center gap-2 text-xs uppercase tracking-[0.12em] text-text-muted transition-colors hover:text-white">
            <ArrowLeft size={14} aria-hidden="true" />
            {es ? 'Volver al ecosistema' : 'Back to ecosystem'}
          </Link>

          <div className="max-w-5xl">
            <Badge variant="accent" className="mb-6">{es ? 'Ecosistema · Mapa de proceso' : 'Ecosystem · Process map'}</Badge>
            <div className="mb-5 flex items-center gap-3">
              <span className="h-px w-10 bg-accent/70" aria-hidden="true" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">{es ? process.labelEs : process.labelEn}</span>
            </div>
            <h1 className="max-w-5xl font-outfit text-4xl font-semibold leading-[1.02] tracking-[-0.045em] text-white sm:text-5xl md:text-6xl xl:text-[4.6rem]">
              {es ? process.titleEs : process.titleEn}
            </h1>
            <p className="mt-7 max-w-3xl text-sm leading-relaxed text-text-muted sm:text-base">
              {es ? process.descriptionEs : process.descriptionEn}
            </p>

            {process.primaryHref && (
              <Link href={process.primaryHref} className="mt-8 inline-flex min-h-11 items-center gap-2 rounded-xl border border-accent/25 bg-accent px-5 py-3 text-xs font-semibold uppercase tracking-[0.1em] text-black transition-transform hover:-translate-y-px">
                {es ? process.primaryLabelEs : process.primaryLabelEn}
                <ArrowUpRight size={14} aria-hidden="true" />
              </Link>
            )}
          </div>
        </FadeInSection>

        <FadeInSection delay={0.08}>
          <div className="mt-14 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, index) => (
              <div key={step} className="relative overflow-hidden rounded-2xl border border-white/[0.065] bg-black/25 p-5 sm:p-6">
                <span className="absolute right-4 top-3 font-mono text-[10px] tracking-[0.18em] text-accent/35">0{index + 1}</span>
                <Workflow size={18} className="mb-5 text-accent" strokeWidth={1.5} aria-hidden="true" />
                <div className="text-sm font-medium leading-snug text-white">{step}</div>
              </div>
            ))}
          </div>
        </FadeInSection>

        <FadeInSection delay={0.12}>
          <div className="mt-20 border-t border-white/[0.055] pt-12 sm:mt-24 sm:pt-16">
            <div className="mb-9 max-w-3xl">
              <div className="mb-4 flex items-center gap-3">
                <Network size={16} className="text-accent" aria-hidden="true" />
                <span className="text-[11px] uppercase tracking-[0.16em] text-text-dim">{es ? 'Unidades relacionadas' : 'Related business units'}</span>
              </div>
              <h2 className="font-outfit text-3xl font-semibold tracking-[-0.035em] text-white sm:text-4xl">
                {units.length > 0
                  ? (es ? 'Dónde se aplica este proceso.' : 'Where this process is applied.')
                  : (es ? 'Proceso transversal de la capa tecnológica.' : 'Cross-cutting technology-layer process.')}
              </h2>
            </div>

            {units.length > 0 ? (
              <div className="grid gap-4 lg:grid-cols-2">
                {units.map((unit) => (
                  <article key={unit.id} className="rounded-2xl border border-white/[0.06] bg-black/25 p-6 sm:p-7">
                    <div className="mb-5 flex items-start justify-between gap-4">
                      <div>
                        <div className="mb-1 text-[11px] uppercase tracking-[0.1em] text-text-dim">{es ? unit.businessEs : unit.businessEn}</div>
                        <h3 className="font-outfit text-xl font-medium text-white">{unit.name}</h3>
                      </div>
                      <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.08em] ${statusClasses[unit.status]}`}>{unit.status}</span>
                    </div>
                    <p className="text-sm leading-relaxed text-text-muted">{es ? unit.currentStateEs : unit.currentStateEn}</p>
                    {unit.href && (
                      <Link href={unit.href} className="mt-6 inline-flex min-h-11 items-center gap-2 text-xs uppercase tracking-[0.1em] text-accent transition-colors hover:text-white">
                        {es ? 'Abrir producto o unidad' : 'Open product or unit'}
                        <ArrowUpRight size={13} aria-hidden="true" />
                      </Link>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-white/[0.06] bg-black/25 p-6 sm:p-8">
                <p className="max-w-3xl text-sm leading-relaxed text-text-muted">
                  {es
                    ? 'Este nodo representa una capacidad transversal de CTG One Technology. Su estado y evidencia se documentan en la página específica del producto o capacidad, sin atribuir automáticamente la misma madurez a todas las unidades de negocio.'
                    : 'This node represents a cross-cutting CTG One Technology capability. Its status and evidence are documented on the specific product or capability page without automatically assigning the same maturity to every business unit.'}
                </p>
              </div>
            )}
          </div>
        </FadeInSection>
      </Container>
    </section>
  );
};
