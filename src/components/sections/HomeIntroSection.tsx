'use client';

import React from 'react';
import { Container } from '@/components/ui';
import { FadeInSection } from '@/components/ui/FadeInSection';
import { Code2, Building2, RefreshCw } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export const HomeIntroSection: React.FC = () => {
  const { locale } = useLanguage();
  const es = locale === 'es';
  const items = es
    ? [
        { icon: Code2, title: 'Creamos', text: 'Software y productos digitales pensados para necesidades concretas.' },
        { icon: Building2, title: 'Aplicamos', text: 'Tecnología dentro de negocios y operaciones reales.' },
        { icon: RefreshCw, title: 'Mejoramos', text: 'Aprendemos de usuarios y operaciones para evolucionar lo que construimos.' },
      ]
    : [
        { icon: Code2, title: 'We build', text: 'Software and digital products designed around concrete needs.' },
        { icon: Building2, title: 'We apply', text: 'Technology inside real businesses and operations.' },
        { icon: RefreshCw, title: 'We improve', text: 'We learn from users and operations to keep evolving what we build.' },
      ];

  return (
    <section className="relative overflow-hidden border-y border-white/[0.05] bg-[#070b10] py-20 sm:py-24 md:py-28">
      <Container size="large">
        <FadeInSection>
          <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
            <div>
              <span className="mb-5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-[#d6ae56]">{es ? 'Qué es CTG One' : 'What CTG One is'}</span>
              <h2 className="max-w-xl font-outfit text-3xl font-semibold leading-[1.05] tracking-[-0.04em] text-white sm:text-4xl md:text-5xl">
                {es ? 'Una empresa tecnológica construida alrededor de operaciones reales.' : 'A technology company built around real operations.'}
              </h2>
            </div>
            <p className="max-w-2xl self-end text-sm leading-relaxed text-text-muted sm:text-base">
              {es
                ? 'CTG One desarrolla tecnología propia y la aplica en empresas de diferentes sectores. Cada negocio nos permite detectar problemas reales, construir soluciones, probarlas y mejorarlas continuamente.'
                : 'CTG One develops its own technology and applies it across businesses in different sectors. Each operation gives us a real environment to identify problems, build solutions, test them and improve them continuously.'}
            </p>
          </div>
        </FadeInSection>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {items.map(({ icon: Icon, title, text }, index) => (
            <FadeInSection key={title} delay={0.04 + index * 0.04}>
              <div className="h-full rounded-2xl border border-white/[0.07] bg-white/[0.018] p-6 sm:p-7">
                <span className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl border border-[#d6ae56]/20 bg-[#d6ae56]/[0.035] text-[#f1c75b]"><Icon size={18} strokeWidth={1.5} /></span>
                <h3 className="mb-2 font-outfit text-lg font-semibold text-white">{title}</h3>
                <p className="text-sm leading-relaxed text-text-muted">{text}</p>
              </div>
            </FadeInSection>
          ))}
        </div>
      </Container>
    </section>
  );
};
