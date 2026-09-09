'use client';

import React from 'react';
import {
  ArrowUpRight,
  Beer,
  BookOpen,
  BrainCircuit,
  Coins,
  Landmark,
  PawPrint,
  School,
  UtensilsCrossed,
  WalletCards,
  type LucideIcon,
} from 'lucide-react';

import { Container } from '@/components/ui';
import { FadeInSection } from '@/components/ui/FadeInSection';
import { PUBLIC_ECOSYSTEM_SERVICES, type DashboardService, type DashboardServiceStatus } from '@/config/dashboard-services';
import { useLanguage } from '@/contexts/LanguageContext';

const SERVICE_ICONS: Record<string, LucideIcon> = {
  wallet: WalletCards,
  investment: Beer,
  'craft-beer': Beer,
  pisao: UtensilsCrossed,
  nvet: PawPrint,
  vertice: Landmark,
  token: Coins,
  knowledge: BrainCircuit,
  'education-jp': BookOpen,
  'learning-center': School,
};

const STATUS_LABELS_ES: Record<DashboardServiceStatus, string> = {
  LIVE: 'Disponible',
  ACCOUNT: 'Disponible con cuenta',
  BETA: 'Beta pública',
  PARTIAL: 'Implementación parcial',
  'IN DEVELOPMENT': 'En desarrollo',
  PILOT: 'Piloto',
  DEVELOPMENT: 'En desarrollo',
  CONSOLIDATION: 'En consolidación',
  ROADMAP: 'Hoja de ruta',
};

const STATUS_LABELS_EN: Record<DashboardServiceStatus, string> = {
  LIVE: 'Available',
  ACCOUNT: 'Available with account',
  BETA: 'Public beta',
  PARTIAL: 'Partial implementation',
  'IN DEVELOPMENT': 'In development',
  PILOT: 'Pilot',
  DEVELOPMENT: 'In development',
  CONSOLIDATION: 'Under consolidation',
  ROADMAP: 'Roadmap',
};

const AVAILABLE_STATUSES = new Set<DashboardServiceStatus>(['LIVE', 'ACCOUNT', 'BETA', 'PILOT']);

type EcosystemDirectoryMode = 'home' | 'full';

const ServiceCard = ({ service, label }: { service: DashboardService; label: string }) => {
  const Icon = SERVICE_ICONS[service.id] ?? BrainCircuit;
  const href = service.publicHref ?? service.href;
  const cta = service.publicCta ?? service.cta;
  const isExternal = href.startsWith('http://') || href.startsWith('https://');

  return (
    <article className="group flex h-full min-h-[220px] flex-col rounded-[22px] border border-white/[0.07] bg-white/[0.02] p-6 transition duration-300 hover:-translate-y-1 hover:border-[#d6ae56]/25 hover:bg-white/[0.03]">
      <div className="flex items-start justify-between gap-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[#d6ae56]/20 bg-[#d6ae56]/[0.05] text-[#f1c75b]">
          <Icon size={18} aria-hidden="true" />
        </span>
        <span className="rounded-full border border-white/[0.08] bg-white/[0.025] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-white/55">
          {label}
        </span>
      </div>
      <h3 className="mt-5 font-outfit text-xl font-semibold tracking-[-0.025em] text-white">{service.title}</h3>
      <p className="mt-2 flex-1 text-sm leading-6 text-white/50">{service.description}</p>
      <a
        href={href}
        data-service-key={service.serviceKey}
        target={isExternal ? '_blank' : undefined}
        rel={isExternal ? 'noopener noreferrer' : undefined}
        className="mt-5 inline-flex min-h-11 items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#f1c75b] transition-colors hover:text-white"
      >
        {cta}
        <ArrowUpRight size={13} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
      </a>
    </article>
  );
};

export const EcosystemDirectorySection: React.FC<{ mode?: EcosystemDirectoryMode }> = ({ mode = 'home' }) => {
  const { locale } = useLanguage();
  const es = locale === 'es';
  const labels = es ? STATUS_LABELS_ES : STATUS_LABELS_EN;
  const isFullDirectory = mode === 'full';
  const visibleServices = isFullDirectory
    ? PUBLIC_ECOSYSTEM_SERVICES
    : PUBLIC_ECOSYSTEM_SERVICES.filter((service) => service.status !== 'ROADMAP');
  const availableServices = visibleServices.filter((service) => AVAILABLE_STATUSES.has(service.status));
  const evolvingServices = visibleServices.filter((service) => !AVAILABLE_STATUSES.has(service.status));

  return (
    <section className="relative overflow-hidden border-y border-white/[0.05] bg-[#050709] py-20 sm:py-24" aria-labelledby="ecosystem-directory-title">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(214,174,86,.08),transparent_32%),radial-gradient(circle_at_85%_80%,rgba(36,140,255,.05),transparent_34%)]" aria-hidden="true" />
      <Container size="large" className="relative z-10">
        <FadeInSection>
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="max-w-3xl">
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#d6ae56]">
                {es ? 'Servicios y plataformas' : 'Services and platforms'}
              </span>
              <h2 id="ecosystem-directory-title" className="mt-4 font-outfit text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl md:text-5xl">
                {isFullDirectory
                  ? (es ? 'Todo el ecosistema, con su estado real.' : 'The full ecosystem, with its real status.')
                  : (es ? 'Entra a lo que ya puedes usar.' : 'Enter what you can use today.')}
              </h2>
              <p className="mt-5 max-w-2xl text-sm leading-7 text-text-muted sm:text-base">
                {isFullDirectory
                  ? (es
                      ? 'Este directorio reúne las experiencias públicas del ecosistema, incluidas las que están en desarrollo o en hoja de ruta, para que su nivel de madurez sea explícito.'
                      : 'This directory brings together the ecosystem’s public experiences, including those in development or on the roadmap, so their maturity is explicit.')
                  : (es
                      ? 'Priorizamos aquí las experiencias accesibles hoy. Los productos que todavía están madurando aparecen en una sección separada para no mezclar disponibilidad real con nuestra hoja de ruta.'
                      : 'This view prioritizes experiences you can access today. Products that are still maturing appear separately so current availability is not mixed with the roadmap.')}
              </p>
            </div>
            {!isFullDirectory && (
              <a href="/ecosystem" className="inline-flex min-h-11 items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#f1c75b] transition hover:text-white">
                {es ? 'Ver ecosistema completo' : 'View full ecosystem'} <ArrowUpRight size={14} aria-hidden="true" />
              </a>
            )}
          </div>
        </FadeInSection>

        <div className="mt-10">
          <div className="mb-5 flex items-center gap-3">
            <span className="h-2 w-2 rounded-full bg-emerald-400" aria-hidden="true" />
            <h3 className="font-outfit text-xl font-semibold text-white">{es ? 'Disponible ahora' : 'Available now'}</h3>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {availableServices.map((service, index) => (
              <FadeInSection key={service.id} delay={Math.min(index * 0.035, 0.18)}>
                <ServiceCard service={service} label={labels[service.status]} />
              </FadeInSection>
            ))}
          </div>
        </div>

        {evolvingServices.length > 0 && (
          <div className="mt-14 border-t border-white/[0.06] pt-10">
            <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h3 className="font-outfit text-xl font-semibold text-white">{es ? 'En evolución' : 'In evolution'}</h3>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-text-muted">
                  {es
                    ? 'Puedes conocer estos productos, pero su estado indica que todavía no deben entenderse como una experiencia completamente disponible.'
                    : 'You can explore these products, but their status indicates they should not yet be treated as fully available experiences.'}
                </p>
              </div>
              <a href="/technology/status" className="inline-flex min-h-11 items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/55 transition hover:text-[#f1c75b]">
                {es ? 'Consultar estado técnico' : 'View technical status'} <ArrowUpRight size={13} aria-hidden="true" />
              </a>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {evolvingServices.map((service, index) => (
                <FadeInSection key={service.id} delay={Math.min(index * 0.035, 0.14)}>
                  <ServiceCard service={service} label={labels[service.status]} />
                </FadeInSection>
              ))}
            </div>
          </div>
        )}
      </Container>
    </section>
  );
};
