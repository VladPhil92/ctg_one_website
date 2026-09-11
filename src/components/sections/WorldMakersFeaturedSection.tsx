'use client';

import React from 'react';
import { ArrowUpRight, Atom, Blocks, Gamepad2, Sparkles } from 'lucide-react';
import { Container } from '@/components/ui';
import { FadeInSection } from '@/components/ui/FadeInSection';
import { useLanguage } from '@/contexts/LanguageContext';

const WORLD_MAKERS_URL = 'https://worldmakers.ctgone.com';
const WORLD_MAKERS_IMAGE =
  'https://raw.githubusercontent.com/VladPhil92/World-Makers-Game/main/docs/visual-reference/world-makers-v2/gameplay-build.png';

export const WorldMakersFeaturedSection: React.FC = () => {
  const { locale } = useLanguage();
  const es = locale === 'es';

  return (
    <section
      className="relative overflow-hidden border-b border-white/[0.06] bg-[#05080d] py-16 sm:py-20 md:py-24"
      aria-labelledby="world-makers-feature-title"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        aria-hidden="true"
        style={{
          background:
            'radial-gradient(circle at 78% 22%, rgba(214,174,86,0.12), transparent 34%), radial-gradient(circle at 14% 84%, rgba(41,108,94,0.12), transparent 30%)',
        }}
      />

      <Container size="large">
        <FadeInSection>
          <div className="relative overflow-hidden rounded-[28px] border border-white/[0.08] bg-white/[0.025] shadow-[0_24px_90px_rgba(0,0,0,0.34)]">
            <div className="grid lg:grid-cols-[0.86fr_1.14fr]">
              <div className="relative z-10 flex flex-col justify-center p-7 sm:p-10 lg:p-12 xl:p-14">
                <div className="mb-7 flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-2 rounded-full border border-[#d6ae56]/25 bg-[#d6ae56]/[0.07] px-3.5 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#f1c75b]">
                    <Sparkles size={13} strokeWidth={1.6} aria-hidden="true" />
                    {es ? 'Nuevo · Creación destacada' : 'New · Featured creation'}
                  </span>
                  <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-white/45">
                    CTG One Technology
                  </span>
                </div>

                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#d6ae56]">
                  {es ? 'Nuestra creación más innovadora' : 'Our most innovative creation'}
                </p>
                <h2
                  id="world-makers-feature-title"
                  className="font-outfit text-4xl font-semibold leading-[0.96] tracking-[-0.045em] text-white sm:text-5xl md:text-6xl"
                >
                  World Makers
                </h2>
                <p className="mt-6 max-w-xl text-base leading-relaxed text-white/72 sm:text-lg">
                  {es
                    ? 'Un videojuego de aventura ecofuturista que integra exploración, construcción, ciencia y aprendizaje en un mundo diseñado para descubrir, experimentar y crear.'
                    : 'An eco-futurist adventure game combining exploration, building, science and learning in a world designed to discover, experiment and create.'}
                </p>

                <div className="mt-7 flex flex-wrap gap-2" aria-label={es ? 'Características de World Makers' : 'World Makers features'}>
                  {[
                    { icon: Gamepad2, label: es ? 'Exploración' : 'Exploration' },
                    { icon: Blocks, label: es ? 'Construcción' : 'Building' },
                    { icon: Atom, label: es ? 'Ciencia y aprendizaje' : 'Science & learning' },
                  ].map(({ icon: Icon, label }) => (
                    <span
                      key={label}
                      className="inline-flex items-center gap-2 rounded-lg border border-white/[0.07] bg-black/20 px-3 py-2 text-xs text-white/64"
                    >
                      <Icon size={14} strokeWidth={1.5} aria-hidden="true" />
                      {label}
                    </span>
                  ))}
                </div>

                <div className="mt-9">
                  <a
                    href={WORLD_MAKERS_URL}
                    className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#d6ae56] px-5 py-3 text-sm font-semibold text-[#080b10] transition duration-300 hover:-translate-y-0.5 hover:bg-[#f1c75b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f1c75b]"
                  >
                    {es ? 'Explorar World Makers' : 'Explore World Makers'}
                    <ArrowUpRight size={16} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
                  </a>
                </div>
              </div>

              <a
                href={WORLD_MAKERS_URL}
                className="group relative min-h-[320px] overflow-hidden border-t border-white/[0.06] bg-[#0b1117] sm:min-h-[420px] lg:min-h-[560px] lg:border-l lg:border-t-0"
                aria-label={es ? 'Abrir World Makers' : 'Open World Makers'}
              >
                <img
                  src={WORLD_MAKERS_IMAGE}
                  alt={
                    es
                      ? 'Captura de gameplay de World Makers: construcción en primera persona de un módulo eco-científico'
                      : 'World Makers gameplay screenshot: first-person building of an eco-research module'
                  }
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.025]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#05080d]/85 via-transparent to-black/10 lg:bg-gradient-to-r lg:from-[#05080d]/35 lg:via-transparent lg:to-transparent" aria-hidden="true" />
                <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between gap-4 sm:bottom-7 sm:left-7 sm:right-7">
                  <div className="rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 backdrop-blur-md">
                    <span className="block text-[9px] font-semibold uppercase tracking-[0.16em] text-[#f1c75b]">
                      {es ? 'Visual oficial del proyecto' : 'Official project visual'}
                    </span>
                    <span className="mt-1 block text-xs text-white/70">World Makers · Gameplay de construcción</span>
                  </div>
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/15 bg-black/45 text-white backdrop-blur-md transition group-hover:border-[#d6ae56]/50 group-hover:text-[#f1c75b]">
                    <ArrowUpRight size={17} aria-hidden="true" />
                  </span>
                </div>
              </a>
            </div>
          </div>
        </FadeInSection>
      </Container>
    </section>
  );
};
