'use client';

import React from 'react';
import Link from 'next/link';
import { Container } from '@/components/ui';
import { FadeInSection } from '@/components/ui/FadeInSection';
import { Badge } from '@/components/ui/Badge';
import { Cpu, Users, Palette, Wallet, Beer, ArrowUpRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const iconMap = [Cpu, Users, Palette, Wallet];

export const ServicesSection: React.FC = () => {
  const { locale } = useLanguage();
  const es = locale === 'es';

  const copy = es
    ? {
        badge: 'Tecnología · Estado verificable',
        title: 'Software e',
        highlight: 'infraestructura digital',
        description: 'Separamos capacidades productivas, capacidades parciales y roadmap. Una tecnología solo se presenta como activa cuando existe implementación verificable en el repositorio y en la arquitectura de producción.',
        services: [
          {
            title: 'Ingeniería de software',
            description: 'Aplicaciones web, plataformas internas, dashboards, autenticación, APIs y productos digitales desarrollados para las unidades del ecosistema.',
            status: 'LIVE',
          },
          {
            title: 'IA y automatización',
            description: 'La arquitectura para agentes, RAG, asistencia contextual y workflows inteligentes está en desarrollo. No se presenta todavía como una capa productiva general del ecosistema.',
            status: 'IN DEVELOPMENT',
          },
          {
            title: 'Plataformas, datos e infraestructura',
            description: 'PostgreSQL, Supabase Auth, Row Level Security, almacenamiento, datos transaccionales, CI/CD y despliegue en Render forman parte de la capa productiva actual.',
            status: 'LIVE',
          },
          {
            title: 'Producto integrado al negocio',
            description: 'CTG Craft Beer Inversión demuestra el modelo: software diseñado alrededor de una operación física real, con autenticación, lotes, inventario, ledger y paneles especializados.',
            status: 'LIVE',
          },
        ],
        platform: 'CTG Craft Beer Inversión',
        platformBadge: 'Caso verificable',
        platformDescription: 'Plataforma propia desarrollada por CTG One para gestionar participación por lotes de producción de CTG Craft Beer, con trazabilidad operativa, seguimiento y panel del participante.',
        open: 'Abrir plataforma',
      }
    : {
        badge: 'Technology · Verifiable status',
        title: 'Software &',
        highlight: 'digital infrastructure',
        description: 'We separate production capabilities, partial capabilities, and roadmap. Technology is presented as live only when implementation can be verified in the repository and production architecture.',
        services: [
          {
            title: 'Software engineering',
            description: 'Web applications, internal platforms, dashboards, authentication, APIs, and digital products built for ecosystem business units.',
            status: 'LIVE',
          },
          {
            title: 'AI & automation',
            description: 'The architecture for agents, RAG, contextual assistance, and intelligent workflows is in development. It is not yet presented as a general production layer across the ecosystem.',
            status: 'IN DEVELOPMENT',
          },
          {
            title: 'Platforms, data & infrastructure',
            description: 'PostgreSQL, Supabase Auth, Row Level Security, storage, transactional data, CI/CD, and Render deployment are part of the current production layer.',
            status: 'LIVE',
          },
          {
            title: 'Business-embedded product development',
            description: 'CTG Craft Beer Investment demonstrates the model: software designed around a real physical operation, with authentication, batches, inventory, ledger, and specialized dashboards.',
            status: 'LIVE',
          },
        ],
        platform: 'CTG Craft Beer Investment',
        platformBadge: 'Verifiable case',
        platformDescription: 'A proprietary platform built by CTG One to manage participation in CTG Craft Beer production batches, with operational traceability, tracking, and a participant dashboard.',
        open: 'Open platform',
      };

  return (
    <section id="services" className="relative py-20 sm:py-28 md:py-32 lg:py-40 overflow-hidden bg-bg-primary">
      <Container className="relative z-10">
        <FadeInSection>
          <div className="max-w-2xl mb-12 sm:mb-16 md:mb-20">
            <Badge variant="accent" className="mb-6 sm:mb-8">{copy.badge}</Badge>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-outfit font-semibold mb-5 tracking-[-0.035em]">
              <span className="text-white">{copy.title}</span>{' '}
              <span className="text-accent">{copy.highlight}</span>
            </h2>
            <p className="text-sm sm:text-base text-text-muted leading-relaxed">{copy.description}</p>
          </div>
        </FadeInSection>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-white/[0.03] rounded-xl overflow-hidden border border-white/[0.04]">
          {copy.services.map((service, index) => {
            const Icon = iconMap[index];
            const live = service.status === 'LIVE';
            return (
              <FadeInSection key={service.title} delay={0.05 + index * 0.05}>
                <div className="relative p-7 sm:p-9 md:p-11 bg-bg-primary hover:bg-white/[0.012] transition-colors duration-500 h-full min-h-[250px]">
                  <div className="flex items-start justify-between gap-4 mb-7">
                    <span className="w-11 h-11 rounded-full border border-accent/20 bg-accent/[0.03] flex items-center justify-center text-accent">
                      <Icon size={20} strokeWidth={1.4} />
                    </span>
                    <span className={`text-[8px] uppercase tracking-[0.18em] px-2.5 py-1.5 rounded-full border ${live ? 'border-accent/25 text-accent' : 'border-white/[0.08] text-text-dim'}`}>
                      {service.status}
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-outfit font-medium text-white mb-3">{service.title}</h3>
                  <p className="text-xs sm:text-sm text-text-muted leading-relaxed">{service.description}</p>
                </div>
              </FadeInSection>
            );
          })}
        </div>

        <FadeInSection delay={0.3}>
          <Link href="/inversion" className="group mt-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6 p-7 sm:p-9 md:p-10 rounded-xl border border-accent/20 bg-accent/[0.035] hover:bg-accent/[0.06] transition-colors duration-500">
            <div className="flex items-start gap-5">
              <span className="w-11 h-11 rounded-full border border-accent/25 flex items-center justify-center text-accent shrink-0">
                <Beer size={20} strokeWidth={1.5} />
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <h3 className="text-sm md:text-base font-outfit font-medium text-white">{copy.platform}</h3>
                  <span className="text-[9px] uppercase tracking-[0.18em] text-accent border border-accent/25 rounded-full px-2.5 py-1">{copy.platformBadge}</span>
                </div>
                <p className="max-w-2xl text-xs sm:text-sm text-text-muted leading-relaxed">{copy.platformDescription}</p>
              </div>
            </div>
            <span className="shrink-0 inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-accent group-hover:gap-3 transition-all">
              {copy.open}
              <ArrowUpRight size={15} strokeWidth={1.5} />
            </span>
          </Link>
        </FadeInSection>
      </Container>
    </section>
  );
};
