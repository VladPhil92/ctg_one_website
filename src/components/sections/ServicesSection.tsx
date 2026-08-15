'use client';

import React from 'react';
import Link from 'next/link';
import { Container } from '@/components/ui';
import { FadeInSection } from '@/components/ui/FadeInSection';
import { Badge } from '@/components/ui/Badge';
import { SERVICES } from '@/data/content';
import { Cpu, Users, Palette, Wallet, Beer, ArrowUpRight } from 'lucide-react';

const iconMap: Record<string, React.ReactNode> = {
  cpu: <Cpu size={22} strokeWidth={1.5} />,
  users: <Users size={22} strokeWidth={1.5} />,
  palette: <Palette size={22} strokeWidth={1.5} />,
  wallet: <Wallet size={22} strokeWidth={1.5} />,
};

export const ServicesSection: React.FC = () => {
  return (
    <section
      id="services"
      className="relative py-20 sm:py-28 md:py-32 lg:py-40 overflow-hidden"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      <Container className="relative z-10">
        <FadeInSection>
          <div className="max-w-xl mb-12 sm:mb-16 md:mb-20">
            <Badge variant="accent" className="mb-6 sm:mb-8">
              {SERVICES.badge}
            </Badge>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-outfit font-semibold mb-4 sm:mb-5 tracking-tight">
              {SERVICES.title}{' '}
              <span className="text-accent">{SERVICES.titleHighlight}</span>
            </h2>
            <p className="text-[13px] sm:text-sm md:text-base text-text-muted leading-relaxed">
              {SERVICES.description}
            </p>
          </div>
        </FadeInSection>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-white/[0.02] rounded-lg overflow-hidden">
          {SERVICES.items.map((service, index) => (
            <FadeInSection
              key={service.title}
              delay={0.05 + index * 0.05}
            >
              <div
                className="p-6 sm:p-8 md:p-10 lg:p-12 bg-bg-primary hover:bg-white/[0.01] transition-colors duration-500"
              >
                <span className="text-accent mb-4 sm:mb-5 md:mb-6 block">
                  {iconMap[service.icon]}
                </span>
                <h3 className="text-[13px] sm:text-sm md:text-base font-outfit font-medium text-white mb-2 sm:mb-3">
                  {service.title}
                </h3>
                <p className="text-[12px] sm:text-[13px] md:text-sm text-text-muted leading-relaxed">
                  {service.description}
                </p>
              </div>
            </FadeInSection>
          ))}
        </div>

        <FadeInSection delay={0.3}>
          <Link
            href="/inversion"
            className="group mt-px flex flex-col md:flex-row md:items-center md:justify-between gap-6 p-6 sm:p-8 md:p-10 lg:p-12 rounded-b-lg border border-accent/20 bg-accent/[0.035] hover:bg-accent/[0.06] transition-colors duration-500"
          >
            <div className="flex items-start gap-5">
              <span className="text-accent mt-0.5">
                <Beer size={24} strokeWidth={1.5} />
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <h3 className="text-sm md:text-base font-outfit font-medium text-white">
                    CTG Craft Beer Inversión
                  </h3>
                  <span className="text-[9px] uppercase tracking-[0.18em] text-accent border border-accent/25 rounded-full px-2.5 py-1">
                    Plataforma propia
                  </span>
                </div>
                <p className="max-w-2xl text-[12px] sm:text-[13px] md:text-sm text-text-muted leading-relaxed">
                  Infraestructura digital desarrollada por CTG One para administrar inversión por lotes de producción de CTG Craft Beer, con trazabilidad operativa, seguimiento y panel del participante.
                </p>
              </div>
            </div>
            <span className="shrink-0 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-accent group-hover:gap-3 transition-all">
              Abrir plataforma
              <ArrowUpRight size={15} strokeWidth={1.5} />
            </span>
          </Link>
        </FadeInSection>
      </Container>
    </section>
  );
};
