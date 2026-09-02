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
  WalletCards,
  type LucideIcon,
} from 'lucide-react';

import { Container } from '@/components/ui';
import { FadeInSection } from '@/components/ui/FadeInSection';
import { PUBLIC_ECOSYSTEM_SERVICES, type DashboardServiceStatus } from '@/config/dashboard-services';
import { useLanguage } from '@/contexts/LanguageContext';

const SERVICE_ICONS: Record<string, LucideIcon> = {
  wallet: WalletCards,
  investment: Beer,
  'craft-beer': Beer,
  nvet: PawPrint,
  vertice: Landmark,
  token: Coins,
  knowledge: BrainCircuit,
  'education-jp': BookOpen,
  'learning-center': School,
};

const STATUS_LABELS_ES: Record<DashboardServiceStatus, string> = {
  LIVE: 'Activo',
  ACCOUNT: 'Cuenta',
  BETA: 'Beta',
  PILOT: 'Piloto',
  DEVELOPMENT: 'En desarrollo',
  CONSOLIDATION: 'En consolidación',
  ROADMAP: 'Roadmap',
};

const STATUS_LABELS_EN: Record<DashboardServiceStatus, string> = {
  LIVE: 'Live',
  ACCOUNT: 'Account',
  BETA: 'Beta',
  PILOT: 'Pilot',
  DEVELOPMENT: 'In development',
  CONSOLIDATION: 'Under consolidation',
  ROADMAP: 'Roadmap',
};

export const EcosystemDirectorySection: React.FC = () => {
  const { locale } = useLanguage();
  const es = locale === 'es';
  const labels = es ? STATUS_LABELS_ES : STATUS_LABELS_EN;

  return (
    <section className="relative overflow-hidden border-y border-white/[0.05] bg-[#050709] py-20 sm:py-24" aria-labelledby="ecosystem-directory-title">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(214,174,86,.08),transparent_32%),radial-gradient(circle_at_85%_80%,rgba(36,140,255,.05),transparent_34%)]" aria-hidden="true" />
      <Container size="large" className="relative z-10">
        <FadeInSection>
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="max-w-3xl">
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#d6ae56]">
                CTG One / Ecosystem Directory
              </span>
              <h2 id="ecosystem-directory-title" className="mt-4 font-outfit text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl md:text-5xl">
                {es ? 'Un ecosistema que crece, conectado desde un solo lugar.' : 'A growing ecosystem, connected from one place.'}
              </h2>
              <p className="mt-5 max-w-2xl text-sm leading-7 text-text-muted sm:text-base">
                {es
                  ? 'Accede a las aplicaciones, productos, conocimiento y servicios que ya forman parte de CTG One. El estado de cada superficie se muestra de forma explícita para distinguir lo activo, lo que está en beta y lo que continúa en desarrollo.'
                  : 'Access the applications, products, knowledge and services already connected to CTG One. Each surface shows its current status so live, beta and in-development capabilities remain clearly distinguished.'}
              </p>
            </div>
            <a href="/dashboard" className="inline-flex min-h-11 items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#f1c75b] transition hover:text-white">
              {es ? 'Ir a mi dashboard' : 'Open my dashboard'} <ArrowUpRight size={14} aria-hidden="true" />
            </a>
          </div>
        </FadeInSection>

        <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {PUBLIC_ECOSYSTEM_SERVICES.map((service, index) => {
            const Icon = SERVICE_ICONS[service.id] ?? BrainCircuit;
            const href = service.publicHref ?? service.href;
            const cta = service.publicCta ?? service.cta;

            return (
              <FadeInSection key={service.id} delay={Math.min(index * 0.035, 0.2)}>
                <article className="group flex h-full min-h-[230px] flex-col rounded-[22px] border border-white/[0.07] bg-white/[0.02] p-6 transition duration-300 hover:-translate-y-1 hover:border-[#d6ae56]/25 hover:bg-white/[0.03]">
                  <div className="flex items-start justify-between gap-4">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[#d6ae56]/20 bg-[#d6ae56]/[0.05] text-[#f1c75b]">
                      <Icon size={18} aria-hidden="true" />
                    </span>
                    <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-[#d6ae56]">
                      {service.code} · {labels[service.status]}
                    </span>
                  </div>
                  <h3 className="mt-5 font-outfit text-xl font-semibold tracking-[-0.025em] text-white">{service.title}</h3>
                  <p className="mt-2 flex-1 text-sm leading-6 text-white/45">{service.description}</p>
                  <a
                    href={href}
                    data-service-key={service.serviceKey}
                    className="mt-5 inline-flex min-h-11 items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#f1c75b] transition-colors hover:text-white"
                  >
                    {cta}
                    <ArrowUpRight size={13} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
                  </a>
                </article>
              </FadeInSection>
            );
          })}
        </div>
      </Container>
    </section>
  );
};
