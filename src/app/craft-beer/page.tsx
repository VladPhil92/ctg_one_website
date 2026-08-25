'use client';

import React from 'react';
import Image from 'next/image';
import { ArrowUpRight, ShoppingBag, TrendingUp } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Container } from '@/components/ui';
import { FadeInSection } from '@/components/ui/FadeInSection';
import { useLanguage } from '@/contexts/LanguageContext';

const beers = [
  { src: '/images/inversion/ctg-craft-beer-golden-pale-ale.webp', name: 'Golden Pale Ale' },
  { src: '/images/inversion/ctg-craft-beer-hefeweizen.webp', name: 'Hefeweizen' },
  { src: '/images/inversion/ctg-craft-beer-irish-red-ale.webp', name: 'Irish Red Ale' },
  { src: '/images/inversion/ctg-craft-beer-porter.webp', name: 'Porter' },
];

export default function CraftBeerPage() {
  const { locale } = useLanguage();
  const es = locale === 'es';

  return (
    <>
      <Navbar />
      <main id="main-content" tabIndex={-1} className="min-h-screen bg-[#050403] text-white">
        <section className="relative overflow-hidden pb-20 pt-32 sm:pt-36 md:pb-28 md:pt-40">
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_20%_20%,rgba(214,174,86,.13),transparent_32%),radial-gradient(circle_at_78%_35%,rgba(130,74,21,.12),transparent_28%)]" />
          <Container size="large" className="relative z-10">
            <div className="grid items-center gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
              <FadeInSection>
                <span className="mb-6 block text-[11px] font-semibold uppercase tracking-[0.18em] text-[#f1c75b]">CTG Craft Beer · Cartagena</span>
                <h1 className="max-w-2xl font-outfit text-5xl font-semibold leading-[0.98] tracking-[-0.05em] sm:text-6xl md:text-7xl">
                  {es ? 'Cerveza artesanal hecha en Cartagena.' : 'Craft beer made in Cartagena.'}
                </h1>
                <p className="mt-7 max-w-xl text-sm leading-relaxed text-white/65 sm:text-base">
                  {es ? 'CTG Craft Beer es una marca de cerveza artesanal producida en Cartagena. Conoce nuestros estilos y, de forma independiente, explora cómo funciona la participación en lotes reales de producción.' : 'CTG Craft Beer is a craft beer brand produced in Cartagena. Explore our styles and, separately, learn how participation in real production batches works.'}
                </p>
                <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                  <a href="#cervezas" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#d6ae56] px-5 text-xs font-semibold uppercase tracking-[0.1em] text-black hover:bg-[#f1c75b]">
                    <ShoppingBag size={14} /> {es ? 'Conocer nuestras cervezas' : 'Explore our beer'} <ArrowUpRight size={14} />
                  </a>
                  <a href="/inversion" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/[0.14] bg-white/[0.03] px-5 text-xs font-semibold uppercase tracking-[0.1em] text-white hover:border-[#d6ae56]/40">
                    <TrendingUp size={14} /> {es ? 'Invertir en producción' : 'Invest in production'} <ArrowUpRight size={14} />
                  </a>
                </div>
              </FadeInSection>

              <FadeInSection direction="right" delay={0.08}>
                <div className="grid grid-cols-2 gap-3">
                  {beers.map((beer, index) => (
                    <div key={beer.name} className={`relative min-h-[360px] overflow-hidden rounded-3xl border border-white/[0.08] bg-black/30 ${index % 2 ? 'translate-y-6' : ''}`}>
                      <Image src={beer.src} alt={`CTG Craft Beer ${beer.name}`} fill unoptimized sizes="(min-width: 1024px) 25vw, 45vw" className="object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                      <span className="absolute bottom-5 left-5 text-xs font-semibold uppercase tracking-[0.12em] text-white">{beer.name}</span>
                    </div>
                  ))}
                </div>
              </FadeInSection>
            </div>
          </Container>
        </section>

        <section id="cervezas" className="border-y border-white/[0.06] bg-[#090705] py-20 sm:py-24">
          <Container size="large">
            <FadeInSection>
              <span className="mb-5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-[#d6ae56]">{es ? 'Dos experiencias distintas' : 'Two distinct experiences'}</span>
              <h2 className="max-w-3xl font-outfit text-3xl font-semibold tracking-[-0.04em] sm:text-4xl md:text-5xl">{es ? 'Compra cerveza e inversión deben seguir caminos separados.' : 'Buying beer and investing should remain separate journeys.'}</h2>
            </FadeInSection>
            <div className="mt-10 grid gap-5 md:grid-cols-2">
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-7 sm:p-8">
                <ShoppingBag className="mb-5 text-[#f1c75b]" size={22} />
                <h3 className="font-outfit text-2xl font-semibold">{es ? 'Comprar cerveza' : 'Shop beer'}</h3>
                <p className="mt-3 text-sm leading-relaxed text-white/60">{es ? 'Estamos preparando la experiencia de tienda dentro de este hub. Hasta que el checkout esté realmente operativo, no mostraremos una compra como disponible.' : 'We are preparing the store experience inside this hub. Until checkout is truly operational, we will not present purchasing as available.'}</p>
              </div>
              <a href="/inversion" className="group rounded-2xl border border-[#d6ae56]/20 bg-[#d6ae56]/[0.04] p-7 transition-colors hover:bg-[#d6ae56]/[0.07] sm:p-8">
                <TrendingUp className="mb-5 text-[#f1c75b]" size={22} />
                <h3 className="font-outfit text-2xl font-semibold">CTG Craft Beer {es ? 'Inversión' : 'Investment'}</h3>
                <p className="mt-3 text-sm leading-relaxed text-white/60">{es ? 'Participa en lotes específicos de producción y consulta su avance según las condiciones publicadas para cada lote.' : 'Participate in specific production batches and follow their progress under the published terms for each batch.'}</p>
                <span className="mt-6 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-[#f1c75b]">{es ? 'Conocer inversión' : 'Explore investment'} <ArrowUpRight size={14} className="transition-transform group-hover:translate-x-0.5" /></span>
              </a>
            </div>
          </Container>
        </section>
      </main>
      <Footer />
    </>
  );
}
