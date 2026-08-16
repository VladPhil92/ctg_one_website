'use client';

import React from 'react';
import Link from 'next/link';
import { Container } from '@/components/ui';
import { Badge } from '@/components/ui/Badge';
import { FadeInSection } from '@/components/ui/FadeInSection';
import { useLanguage } from '@/contexts/LanguageContext';
import { Activity, ArrowUpRight, FlaskConical, GitBranch, ShieldCheck } from 'lucide-react';

export const TechnologyProofSection: React.FC = () => {
  const { locale } = useLanguage();
  const es = locale === 'es';

  const surfaces = [
    {
      icon: Activity,
      title: 'Technology Status',
      label: es ? 'Estado público' : 'Public status',
      text: es ? 'Registro de capacidades LIVE, PARTIAL, IN DEVELOPMENT y ROADMAP con evidencia asociada.' : 'Registry of LIVE, PARTIAL, IN DEVELOPMENT, and ROADMAP capabilities with associated evidence.',
      href: '/technology/status',
    },
    {
      icon: FlaskConical,
      title: 'CTG One Labs',
      label: es ? 'Marco experimental' : 'Experiment framework',
      text: es ? 'Espacio para experimentos reproducibles que separa hipótesis, prototipo, piloto y producción.' : 'Space for reproducible experiments that separates hypothesis, prototype, pilot, and production.',
      href: '/labs',
    },
    {
      icon: GitBranch,
      title: 'Technical Changelog',
      label: es ? 'Trazabilidad' : 'Traceability',
      text: es ? 'Hitos de arquitectura, seguridad y capacidad que dejan una historia pública de evolución técnica.' : 'Architecture, security, and capability milestones that create a public trail of technical evolution.',
      href: '/changelog',
    },
  ];

  return (
    <section className="relative py-20 sm:py-28 md:py-32 bg-bg-primary border-t border-white/[0.035] overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-[0.12]" aria-hidden="true" style={{ backgroundImage: 'linear-gradient(rgba(212,162,89,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(212,162,89,0.05) 1px, transparent 1px)', backgroundSize: '72px 72px' }} />
      <Container className="relative z-10">
        <FadeInSection>
          <div className="grid lg:grid-cols-[0.85fr_1.15fr] gap-8 lg:gap-14 items-end mb-12 sm:mb-16">
            <div><Badge variant="accent" className="mb-6">{es ? 'Proof Layer · Diferenciación avanzada' : 'Proof Layer · Advanced differentiation'}</Badge><h2 className="font-outfit font-semibold text-3xl sm:text-4xl md:text-5xl tracking-[-0.035em] text-white">{es ? 'La tecnología debe poder' : 'Technology should be'} <span className="text-accent">{es ? 'inspeccionarse.' : 'inspectable.'}</span></h2></div>
            <p className="text-sm sm:text-base text-text-muted leading-relaxed max-w-2xl">{es ? 'CTG One añade una capa pública de evidencia para distinguir arquitectura, experimentación y evolución real. El objetivo es reducir la distancia entre lo que la empresa afirma y lo que un tercero técnico puede verificar.' : 'CTG One adds a public evidence layer to distinguish architecture, experimentation, and real evolution. The goal is to reduce the distance between what the company claims and what a technical third party can verify.'}</p>
          </div>
        </FadeInSection>

        <div className="grid md:grid-cols-3 gap-4">
          {surfaces.map(({ icon: Icon, title, label, text, href }, index) => (
            <FadeInSection key={title} delay={0.03 + index * 0.03}>
              <Link href={href} className="group block h-full rounded-xl border border-white/[0.055] bg-black/20 p-6 sm:p-7 hover:border-accent/25 transition-colors duration-300">
                <div className="flex items-start justify-between mb-7"><div className="w-11 h-11 rounded-full border border-accent/20 flex items-center justify-center"><Icon size={18} className="text-accent" /></div><ArrowUpRight size={15} className="text-text-dim group-hover:text-accent transition-colors" /></div>
                <div className="text-[8px] uppercase tracking-[0.18em] text-text-dim mb-2">{label}</div><h3 className="text-xl font-outfit text-white mb-3">{title}</h3><p className="text-xs sm:text-sm text-text-dim leading-relaxed">{text}</p>
              </Link>
            </FadeInSection>
          ))}
        </div>

        <FadeInSection delay={0.1}>
          <div className="mt-8 flex items-start gap-4 rounded-xl border border-accent/15 bg-accent/[0.02] p-5 sm:p-6"><ShieldCheck size={17} className="text-accent shrink-0 mt-0.5" /><p className="text-xs sm:text-sm text-text-muted leading-relaxed">{es ? 'Regla: ni Labs, ni el changelog, ni una afirmación de roadmap promueven automáticamente una capacidad a LIVE. Technology Status es la fuente pública de madurez y exige evidencia técnica suficiente.' : 'Rule: neither Labs, the changelog, nor a roadmap statement automatically promotes a capability to LIVE. Technology Status is the public source of maturity and requires sufficient technical evidence.'}</p></div>
        </FadeInSection>
      </Container>
    </section>
  );
};
