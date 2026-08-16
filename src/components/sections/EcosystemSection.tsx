'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Container } from '@/components/ui';
import { FadeInSection } from '@/components/ui/FadeInSection';
import { Badge } from '@/components/ui/Badge';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  ArrowUpRight,
  Building2,
  Cpu,
  Database,
  Home,
  Layers3,
  Network,
  Palette,
  Scale,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import {
  CTG_ONE_OS_MODULES,
  ECOSYSTEM_TECHNOLOGY_UNITS,
  type TechnologyStatus,
} from '@/data/ecosystem-technology';

const iconMap: Record<string, React.ReactNode> = {
  hotel: <Building2 size={24} strokeWidth={1.5} />,
  building: <Home size={24} strokeWidth={1.5} />,
  cpu: <Cpu size={24} strokeWidth={1.5} />,
  nvetcare: <Image src="/images/logo/nvet-care-icon.png" alt="Nvet Care" width={46} height={36} className="object-contain" />,
  valderrama: <Image src="/images/logo/valderrama-icon.png" alt="Valderrama International School" width={31} height={36} className="object-contain" />,
  bechara: <Image src="/images/logo/bechara-icon.png" alt="Bechara Real Estate" width={26} height={36} className="object-contain" />,
  ctgone: <Image src="/images/logo/ctg-one-coin-icon.png" alt="CTG One Technology" width={36} height={36} className="object-contain" />,
  pisao: <Image src="/images/logo/pisao-gastrobar-icon.png" alt="PISÁO Gastrobar" width={46} height={36} className="object-contain" />,
  craftbeer: <Image src="/images/logo/ctg-craft-beer-icon.png" alt="CTG Craft Beer" width={34} height={36} className="object-contain" />,
  guestlogistics: <Image src="/images/logo/guest-logistics-icon.png" alt="Guest Logistics Concierge" width={35} height={36} className="object-contain" />,
  oralgreen: <Image src="/images/logo/oralgreen-icon.png" alt="Oralgreen" width={50} height={30} className="object-contain" />,
  scale: <Scale size={24} strokeWidth={1.5} />,
  palette: <Palette size={24} strokeWidth={1.5} />,
  wallet: <Wallet size={24} strokeWidth={1.5} />,
};

const statusStyle: Record<TechnologyStatus, string> = {
  LIVE: 'border-accent/30 text-accent bg-accent/[0.035]',
  PARTIAL: 'border-amber-200/15 text-amber-100/70 bg-amber-100/[0.02]',
  'IN DEVELOPMENT': 'border-sky-300/20 text-sky-200/75 bg-sky-200/[0.025]',
  ROADMAP: 'border-white/[0.07] text-text-dim bg-white/[0.015]',
};

const statusDot: Record<TechnologyStatus, string> = {
  LIVE: 'bg-accent shadow-[0_0_10px_rgba(212,162,89,0.45)]',
  PARTIAL: 'bg-amber-200/60',
  'IN DEVELOPMENT': 'bg-sky-200/60',
  ROADMAP: 'bg-white/20',
};

export const EcosystemSection: React.FC = () => {
  const { locale } = useLanguage();
  const es = locale === 'es';

  const liveCount = ECOSYSTEM_TECHNOLOGY_UNITS.filter((unit) => unit.status === 'LIVE').length;
  const activeCount = ECOSYSTEM_TECHNOLOGY_UNITS.filter((unit) => unit.status === 'IN DEVELOPMENT').length;
  const partialCount = ECOSYSTEM_TECHNOLOGY_UNITS.filter((unit) => unit.status === 'PARTIAL').length;

  return (
    <section id="ecosystem" className="relative overflow-hidden bg-bg-primary">
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute -top-40 right-[-14%] w-[900px] h-[900px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(212,162,89,0.07), transparent 68%)' }} />
        <div className="absolute inset-0 opacity-[0.12]" style={{ backgroundImage: 'linear-gradient(rgba(212,162,89,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(212,162,89,0.05) 1px, transparent 1px)', backgroundSize: '72px 72px' }} />
      </div>

      <div className="relative py-20 sm:py-28 md:py-36">
        <Container>
          <FadeInSection>
            <div className="max-w-5xl">
              <Badge variant="accent" className="mb-7">{es ? 'Ecosistema · Technology Mapping' : 'Ecosystem · Technology Mapping'}</Badge>
              <div className="flex items-center gap-3 mb-5">
                <span className="w-8 h-px bg-accent/60" />
                <span className="text-[9px] uppercase tracking-[0.24em] text-text-dim">{es ? 'Tecnología aplicada a operaciones reales' : 'Technology applied to real operations'}</span>
              </div>
              <h1 className="font-outfit font-semibold text-4xl sm:text-5xl md:text-6xl xl:text-[4.6rem] leading-[1.02] tracking-[-0.045em] mb-7">
                <span className="text-white">{es ? 'Doce negocios.' : 'Twelve businesses.'}</span>{' '}
                <span className="text-accent">{es ? 'Una capa tecnológica compartida.' : 'One shared technology layer.'}</span>
              </h1>
              <p className="text-sm sm:text-base text-text-muted leading-relaxed max-w-3xl">
                {es
                  ? 'CTG One no presenta todas sus unidades como productos tecnológicos terminados. Este mapa muestra dónde existe software real, dónde hay componentes parciales, qué productos están en construcción y qué capacidades permanecen en roadmap.'
                  : 'CTG One does not present every business unit as a finished technology product. This map shows where real software exists, where capabilities are partial, what is actively being built, and what remains on the roadmap.'}
              </p>
            </div>
          </FadeInSection>

          <FadeInSection delay={0.08}>
            <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl">
              {[
                [String(ECOSYSTEM_TECHNOLOGY_UNITS.length), es ? 'Unidades operativas' : 'Operating units'],
                [String(liveCount), 'LIVE'],
                [String(activeCount), es ? 'En desarrollo' : 'In development'],
                [String(partialCount), es ? 'Implementación parcial' : 'Partial implementation'],
              ].map(([value, label]) => (
                <div key={label} className="rounded-xl border border-white/[0.055] bg-black/20 p-4 sm:p-5">
                  <div className="text-xl sm:text-2xl font-outfit text-white mb-1">{value}</div>
                  <div className="text-[8px] sm:text-[9px] uppercase tracking-[0.14em] text-text-dim">{label}</div>
                </div>
              ))}
            </div>
          </FadeInSection>
        </Container>
      </div>

      <div className="relative py-20 sm:py-28 bg-bg-secondary border-y border-white/[0.035]">
        <Container>
          <FadeInSection>
            <div className="grid lg:grid-cols-[0.78fr_1.22fr] gap-10 lg:gap-14 items-start">
              <div className="lg:sticky lg:top-28">
                <Badge variant="accent" className="mb-6">CTG One OS</Badge>
                <h2 className="font-outfit font-semibold text-3xl sm:text-4xl text-white tracking-[-0.035em] mb-5">
                  {es ? 'Módulos comunes, aplicaciones distintas.' : 'Shared modules, different applications.'}
                </h2>
                <p className="text-sm text-text-muted leading-relaxed mb-7">
                  {es
                    ? 'El mapa no significa que todos los módulos estén implementados en todas las empresas. Expresa qué capacidades de CTG One OS son relevantes para cada contexto y permite distinguir arquitectura objetivo de implementación real.'
                    : 'The map does not mean every module is implemented in every company. It shows which CTG One OS capabilities are relevant to each context and separates target architecture from actual implementation.'}
                </p>
                <Link href="/services" className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-accent hover:text-white transition-colors">
                  {es ? 'Explorar CTG One OS' : 'Explore CTG One OS'} <ArrowUpRight size={13} />
                </Link>
              </div>

              <div className="rounded-2xl border border-white/[0.055] bg-black/20 p-5 sm:p-7 overflow-hidden">
                <div className="flex items-center gap-3 mb-6">
                  <Layers3 size={17} className="text-accent" />
                  <span className="text-[9px] uppercase tracking-[0.18em] text-text-dim">{es ? 'Capability map' : 'Capability map'}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {CTG_ONE_OS_MODULES.map((module) => {
                    const count = ECOSYSTEM_TECHNOLOGY_UNITS.filter((unit) => unit.osModules.includes(module)).length;
                    return (
                      <div key={module} className="min-w-[135px] flex-1 rounded-lg border border-white/[0.05] bg-white/[0.01] p-3.5">
                        <div className="flex items-center justify-between gap-3 mb-2">
                          <span className="text-[10px] text-white">{module}</span>
                          <span className="font-mono text-[9px] text-accent/65">{String(count).padStart(2, '0')}</span>
                        </div>
                        <div className="h-px bg-white/[0.04] overflow-hidden">
                          <div className="h-full bg-accent/45" style={{ width: `${Math.max(8, (count / ECOSYSTEM_TECHNOLOGY_UNITS.length) * 100)}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </FadeInSection>
        </Container>
      </div>

      <div className="relative py-20 sm:py-28 md:py-32 bg-bg-primary">
        <Container>
          <FadeInSection>
            <div className="max-w-3xl mb-12 sm:mb-16">
              <Badge variant="accent" className="mb-6">{es ? 'Technology Application Map' : 'Technology Application Map'}</Badge>
              <h2 className="font-outfit font-semibold text-3xl sm:text-4xl md:text-5xl text-white tracking-[-0.035em] mb-5">
                {es ? 'Cada negocio plantea un problema tecnológico diferente.' : 'Each business creates a different technology problem.'}
              </h2>
              <p className="text-sm sm:text-base text-text-muted leading-relaxed">
                {es
                  ? 'Las tarjetas describen el problema operativo, el estado actual y las capacidades asociadas. Los estados son deliberadamente conservadores para que la web nunca confunda visión con producto terminado.'
                  : 'Each card describes the operating problem, current state, and associated capabilities. Statuses are deliberately conservative so the website never confuses vision with finished product.'}
              </p>
            </div>
          </FadeInSection>

          <div className="grid xl:grid-cols-2 gap-4 sm:gap-5">
            {ECOSYSTEM_TECHNOLOGY_UNITS.map((unit, index) => (
              <FadeInSection key={unit.id} delay={0.02 + index * 0.02}>
                <article className="group relative h-full rounded-2xl border border-white/[0.055] bg-black/20 p-6 sm:p-7 hover:border-accent/20 transition-colors duration-500">
                  <div className="flex items-start justify-between gap-4 mb-6">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-12 h-12 rounded-xl border border-white/[0.06] bg-white/[0.015] flex items-center justify-center text-accent shrink-0">
                        {iconMap[unit.icon]}
                      </div>
                      <div className="min-w-0">
                        <div className="text-[8px] uppercase tracking-[0.14em] text-text-dim mb-1">{es ? unit.businessEs : unit.businessEn}</div>
                        <h3 className="font-outfit text-base sm:text-lg text-white truncate">{unit.name}</h3>
                      </div>
                    </div>
                    <span className={`shrink-0 text-[7px] uppercase tracking-[0.14em] px-2 py-1 rounded-full border ${statusStyle[unit.status]}`}>{unit.status}</span>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4 mb-6">
                    <div className="rounded-lg border border-white/[0.045] bg-white/[0.01] p-4">
                      <div className="flex items-center gap-2 mb-2"><Network size={13} className="text-accent/70" /><span className="text-[8px] uppercase tracking-[0.14em] text-text-dim">{es ? 'Problema operativo' : 'Operating problem'}</span></div>
                      <p className="text-[11px] text-text-muted leading-relaxed">{es ? unit.operatingProblemEs : unit.operatingProblemEn}</p>
                    </div>
                    <div className="rounded-lg border border-white/[0.045] bg-white/[0.01] p-4">
                      <div className="flex items-center gap-2 mb-2"><ShieldCheck size={13} className="text-accent/70" /><span className="text-[8px] uppercase tracking-[0.14em] text-text-dim">{es ? 'Estado verificable' : 'Verified state'}</span></div>
                      <p className="text-[11px] text-text-muted leading-relaxed">{es ? unit.currentStateEs : unit.currentStateEn}</p>
                    </div>
                  </div>

                  <div className="mb-6">
                    <div className="text-[8px] uppercase tracking-[0.14em] text-text-dim mb-3">{es ? 'Capacidades' : 'Capabilities'}</div>
                    <div className="space-y-2">
                      {unit.capabilities.map((capability) => (
                        <div key={`${unit.id}-${capability.nameEn}`} className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.04] px-3 py-2.5">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusDot[capability.status]}`} />
                            <span className="text-[10px] text-text-secondary truncate">{es ? capability.nameEs : capability.nameEn}</span>
                          </div>
                          <span className="text-[7px] uppercase tracking-[0.12em] text-text-dim shrink-0">{capability.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pr-10">
                    {unit.osModules.map((module) => (
                      <span key={`${unit.id}-${module}`} className="rounded-full border border-white/[0.055] px-2.5 py-1 text-[7px] uppercase tracking-[0.1em] text-text-dim">{module}</span>
                    ))}
                  </div>

                  {unit.href && (
                    <Link href={unit.href} aria-label={`${es ? 'Abrir' : 'Open'} ${unit.name}`} className="absolute bottom-6 right-6 w-8 h-8 rounded-full border border-white/[0.07] flex items-center justify-center group-hover:border-accent/30 transition-colors">
                      <ArrowUpRight size={13} className="text-text-dim group-hover:text-accent" />
                    </Link>
                  )}
                </article>
              </FadeInSection>
            ))}
          </div>
        </Container>
      </div>

      <div className="relative py-20 sm:py-24 bg-bg-secondary border-t border-white/[0.035]">
        <Container>
          <FadeInSection>
            <div className="rounded-2xl border border-accent/15 bg-accent/[0.025] p-6 sm:p-8 md:p-10 grid md:grid-cols-[1fr_auto] gap-8 items-center">
              <div>
                <div className="flex items-center gap-3 mb-4"><Database size={16} className="text-accent" /><span className="text-[9px] uppercase tracking-[0.18em] text-accent/80">{es ? 'Regla de evidencia' : 'Evidence rule'}</span></div>
                <h2 className="font-outfit text-2xl sm:text-3xl text-white mb-3">{es ? 'La madurez se gana con sistemas funcionando.' : 'Maturity is earned through working systems.'}</h2>
                <p className="text-sm text-text-muted leading-relaxed max-w-3xl">
                  {es
                    ? 'Una unidad solo avanza a LIVE cuando existe implementación verificable, control de acceso, datos reales, pruebas y operación suficiente para demostrar la capacidad. El mapa debe actualizarse junto con el código, no antes.'
                    : 'A unit only moves to LIVE when verifiable implementation, access control, real data, tests, and sufficient operating evidence exist. The map must evolve with the code, not ahead of it.'}
                </p>
              </div>
              <Link href="/products" className="inline-flex items-center justify-center gap-2 rounded-full border border-accent/25 px-5 py-3 text-[9px] uppercase tracking-[0.16em] text-accent hover:bg-accent/5 transition-colors whitespace-nowrap">
                {es ? 'Ver casos tecnológicos' : 'View technology cases'} <ArrowUpRight size={13} />
              </Link>
            </div>
          </FadeInSection>
        </Container>
      </div>
    </section>
  );
};
