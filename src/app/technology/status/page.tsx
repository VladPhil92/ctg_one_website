'use client';

import React from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Container } from '@/components/ui';
import { Badge } from '@/components/ui/Badge';
import { FadeInSection } from '@/components/ui/FadeInSection';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  PUBLIC_PROOF_STATUSES,
  TECHNOLOGY_PROOF,
  getPublicProofStatus,
  type PublicProofStatus,
} from '@/data/technology-proof';
import { Activity, ArrowUpRight, CheckCircle2, CircleDot, Clock3, ShieldCheck } from 'lucide-react';

const statusClass: Record<PublicProofStatus, string> = {
  LIVE: 'border-accent/30 text-accent bg-accent/[0.035]',
  BETA: 'border-violet-300/20 text-violet-200/85 bg-violet-300/[0.025]',
  PARTIAL: 'border-amber-300/20 text-amber-200/80 bg-amber-200/[0.025]',
  'IN DEVELOPMENT': 'border-sky-300/20 text-sky-200/80 bg-sky-200/[0.025]',
  ROADMAP: 'border-white/[0.08] text-text-dim bg-white/[0.015]',
};

export default function TechnologyStatusPage() {
  const { locale } = useLanguage();
  const es = locale === 'es';

  const counts = TECHNOLOGY_PROOF.reduce<Record<PublicProofStatus, number>>(
    (acc, item) => {
      const status = getPublicProofStatus(item);
      return { ...acc, [status]: acc[status] + 1 };
    },
    { LIVE: 0, BETA: 0, PARTIAL: 0, 'IN DEVELOPMENT': 0, ROADMAP: 0 },
  );

  return (
    <main className="min-h-screen bg-bg-primary">
      <Navbar />
      <section className="relative overflow-hidden pt-32 sm:pt-36 md:pt-40 pb-20 sm:pb-28">
        <div className="absolute inset-0 pointer-events-none opacity-[0.14]" aria-hidden="true" style={{ backgroundImage: 'linear-gradient(rgba(212,162,89,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(212,162,89,0.05) 1px, transparent 1px)', backgroundSize: '72px 72px' }} />
        <Container className="relative z-10">
          <FadeInSection>
            <Badge variant="accent" className="mb-7">{es ? 'Technology Proof · Estado público' : 'Technology Proof · Public status'}</Badge>
            <div className="max-w-5xl">
              <div className="flex items-center gap-3 mb-5"><span className="w-8 h-px bg-accent/60" /><span className="text-[9px] uppercase tracking-[0.24em] text-text-dim">{es ? 'Evidencia antes que promesas' : 'Evidence before promises'}</span></div>
              <h1 className="font-outfit font-semibold text-4xl sm:text-5xl md:text-6xl xl:text-[4.7rem] leading-[1.02] tracking-[-0.045em] mb-7 text-white">
                {es ? 'Lo que CTG One puede demostrar' : 'What CTG One can demonstrate'} <span className="text-accent">{es ? 'hoy.' : 'today.'}</span>
              </h1>
              <p className="text-sm sm:text-base text-text-muted leading-relaxed max-w-3xl">
                {es
                  ? 'Este registro separa capacidades productivas, betas controladas, implementaciones parciales, desarrollo activo y roadmap. No funciona como un SLA ni como una página de uptime: es una superficie pública de madurez técnica y evidencia.'
                  : 'This registry separates production capabilities, controlled betas, partial implementations, active development, and roadmap. It is not an SLA or uptime page; it is a public surface for technical maturity and evidence.'}
              </p>
            </div>
          </FadeInSection>

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mt-12">
            {PUBLIC_PROOF_STATUSES.map((status, index) => (
              <FadeInSection key={status} delay={0.03 + index * 0.03}>
                <div className="rounded-xl border border-white/[0.055] bg-black/20 p-5">
                  <div className="flex items-center justify-between mb-4"><span className={`text-[8px] uppercase tracking-[0.14em] px-2 py-1 rounded-full border ${statusClass[status]}`}>{status}</span><Activity size={14} className="text-text-dim" /></div>
                  <div className="text-3xl font-outfit font-semibold text-white">{counts[status]}</div>
                </div>
              </FadeInSection>
            ))}
          </div>
        </Container>
      </section>

      <section className="py-20 sm:py-28 bg-bg-secondary border-y border-white/[0.035]">
        <Container>
          <div className="grid lg:grid-cols-2 gap-4">
            {TECHNOLOGY_PROOF.map((item, index) => {
              const publicStatus = getPublicProofStatus(item);
              return (
                <FadeInSection key={item.id} delay={0.02 + index * 0.02}>
                  <article className="h-full rounded-xl border border-white/[0.055] bg-black/20 p-6 sm:p-7">
                    <div className="flex items-start justify-between gap-4 mb-6">
                      <div><div className="text-[8px] uppercase tracking-[0.18em] text-text-dim mb-2">{item.area}</div><h2 className="text-lg sm:text-xl font-outfit text-white leading-snug">{item.capability}</h2></div>
                      <span className={`shrink-0 text-[7px] uppercase tracking-[0.12em] px-2 py-1 rounded-full border ${statusClass[publicStatus]}`}>{publicStatus}</span>
                    </div>
                    <div className="space-y-2.5 mb-6">
                      {item.evidence.map((evidence) => <div key={evidence} className="flex gap-3 text-xs text-text-muted"><CheckCircle2 size={13} className="text-accent mt-0.5 shrink-0" /><span>{evidence}</span></div>)}
                    </div>
                    {item.publicPath && <Link href={item.publicPath} className="inline-flex items-center gap-2 text-[9px] uppercase tracking-[0.16em] text-accent">{es ? 'Ver evidencia relacionada' : 'View related evidence'} <ArrowUpRight size={12} /></Link>}
                  </article>
                </FadeInSection>
              );
            })}
          </div>
        </Container>
      </section>

      <section className="py-20 sm:py-24 bg-bg-primary">
        <Container>
          <FadeInSection>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="rounded-xl border border-accent/15 p-6 bg-accent/[0.02]"><ShieldCheck size={18} className="text-accent mb-4" /><h3 className="text-white font-outfit mb-2">{es ? 'Criterio de promoción' : 'Promotion criterion'}</h3><p className="text-xs text-text-dim leading-relaxed">{es ? 'Una capacidad solo pasa a LIVE con código, acceso controlado, pruebas y evidencia operativa suficiente. Una beta funcional no equivale a producción abierta.' : 'A capability moves to LIVE only with code, controlled access, tests, and sufficient operating evidence. A functional beta is not equivalent to open production.'}</p></div>
              <div className="rounded-xl border border-white/[0.055] p-6 bg-black/20"><CircleDot size={18} className="text-text-secondary mb-4" /><h3 className="text-white font-outfit mb-2">{es ? 'Sin métricas inventadas' : 'No invented metrics'}</h3><p className="text-xs text-text-dim leading-relaxed">{es ? 'No publicamos adopción, uptime, usuarios, holders o rendimiento sin una fuente verificable.' : 'We do not publish adoption, uptime, users, holders, or performance without a verifiable source.'}</p></div>
              <div className="rounded-xl border border-white/[0.055] p-6 bg-black/20"><Clock3 size={18} className="text-text-secondary mb-4" /><h3 className="text-white font-outfit mb-2">{es ? 'Madurez evolutiva' : 'Evolving maturity'}</h3><p className="text-xs text-text-dim leading-relaxed">{es ? 'El registro cambia cuando cambia el sistema, no cuando cambia el discurso comercial.' : 'The registry changes when the system changes, not when marketing language changes.'}</p></div>
            </div>
          </FadeInSection>
        </Container>
      </section>
      <Footer />
    </main>
  );
}
