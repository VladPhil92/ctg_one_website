'use client';

import React from 'react';
import Image from 'next/image';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight, Beer, PawPrint, TrendingUp } from 'lucide-react';

import { Container } from '@/components/ui';
import { useLanguage } from '@/contexts/LanguageContext';
import nvetHomeBannerSrc from '@/data/nvet-home-banner';

const LinkButton = ({
  href,
  children,
  accent = 'gold',
  external = false,
}: {
  href: string;
  children: React.ReactNode;
  accent?: 'gold' | 'green' | 'outline';
  external?: boolean;
}) => {
  const classes = accent === 'green'
    ? 'bg-[#34B27A] text-white hover:bg-[#289463]'
    : accent === 'outline'
      ? 'border border-white/[0.14] bg-white/[0.03] text-white hover:border-[#d6ae56]/40 hover:bg-white/[0.06]'
      : 'bg-[#d6ae56] text-black hover:bg-[#f1c75b]';

  return (
    <a
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 text-xs font-semibold uppercase tracking-[0.1em] transition-all hover:-translate-y-0.5 ${classes}`}
    >
      {children}
      <ArrowUpRight size={14} aria-hidden="true" />
    </a>
  );
};

export const HomeProductShowcases: React.FC = () => {
  const { locale } = useLanguage();
  const es = locale === 'es';
  const nvetStatusLabel = es ? 'Nvet Care · En desarrollo' : 'Nvet Care · In development';
  const reduceMotion = useReducedMotion();
  const reveal = reduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 34 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, amount: 0.16 },
        transition: { duration: 0.62, ease: [0.22, 1, 0.36, 1] as const },
      };

  return (
    <section className="relative overflow-hidden bg-[#030507] py-20 sm:py-24 md:py-28" aria-labelledby="featured-products-title">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_12%,rgba(214,174,86,.09),transparent_28%),radial-gradient(circle_at_88%_64%,rgba(74,144,226,.08),transparent_30%)]" aria-hidden="true" />
      <Container size="large" className="relative z-10">
        <motion.div {...reveal} className="mb-10 flex flex-col gap-4 sm:mb-12 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl">
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#d6ae56]">
              {es ? 'Creaciones destacadas' : 'Featured creations'}
            </span>
            <h2 id="featured-products-title" className="mt-4 font-outfit text-3xl font-semibold leading-[1.02] tracking-[-0.04em] text-white sm:text-4xl md:text-5xl">
              {es ? 'Productos reales. Experiencias distintas.' : 'Real products. Distinct experiences.'}
            </h2>
          </div>
          <p className="max-w-lg text-sm leading-6 text-white/52 sm:text-base">
            {es
              ? 'Cerveza artesanal, tecnología cívica y salud veterinaria conectadas por un mismo ecosistema digital.'
              : 'Craft beer, civic technology and veterinary care connected by one digital ecosystem.'}
          </p>
        </motion.div>

        <div className="grid gap-5 lg:grid-cols-12">
          <motion.article
            {...reveal}
            whileHover={reduceMotion ? undefined : { y: -5 }}
            className="group relative overflow-hidden rounded-[30px] border border-[#d6ae56]/20 bg-[#08111f] lg:col-span-12"
          >
            <div className="grid min-h-[560px] lg:grid-cols-[0.88fr_1.12fr]">
              <div className="relative z-10 flex flex-col justify-center p-7 sm:p-10 md:p-12 lg:p-14">
                <Image
                  src="/images/vertice/logo.svg"
                  alt="VÉRTICE Sistema Operativo Cívico"
                  width={240}
                  height={96}
                  unoptimized
                  className="mb-7 h-auto w-[210px] sm:w-[240px]"
                />
                <h3 className="max-w-xl font-outfit text-4xl font-semibold leading-[1.01] tracking-[-0.045em] text-white sm:text-5xl">
                  {es ? 'La ciudad también puede tener un sistema operativo.' : 'A city can have an operating system too.'}
                </h3>
                <p className="mt-5 max-w-xl text-sm leading-7 text-white/58 sm:text-base">
                  {es
                    ? 'VÉRTICE convierte reportes, propuestas, deliberación y seguimiento ciudadano en evidencia pública y trazable.'
                    : 'VÉRTICE turns reports, proposals, deliberation and civic follow-up into public, traceable evidence.'}
                </p>
                <div className="mt-8">
                  <LinkButton href="https://vertice.ctgone.com" external>
                    {es ? 'Explorar VÉRTICE' : 'Explore VÉRTICE'}
                  </LinkButton>
                </div>
              </div>

              <div className="relative min-h-[360px] overflow-hidden lg:min-h-full">
                <div className="absolute inset-0 z-10 bg-gradient-to-r from-[#08111f] via-[#08111f]/25 to-transparent lg:block" aria-hidden="true" />
                <motion.div
                  className="absolute inset-0"
                  whileHover={reduceMotion ? undefined : { scale: 1.025 }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                >
                  <Image
                    src="/images/vertice/cartagena-civic-panorama.svg"
                    alt={es ? 'Visual oficial de VÉRTICE sobre participación ciudadana en Cartagena' : 'Official VÉRTICE civic participation visual for Cartagena'}
                    fill
                    unoptimized
                    sizes="(min-width: 1024px) 56vw, 100vw"
                    className="object-cover object-center"
                  />
                </motion.div>
              </div>
            </div>
          </motion.article>

          <motion.article
            {...reveal}
            whileHover={reduceMotion ? undefined : { y: -5 }}
            className="group overflow-hidden rounded-[30px] border border-[#d6ae56]/18 bg-[#090805] lg:col-span-6"
          >
            <div className="relative aspect-[16/10] overflow-hidden border-b border-white/[0.06] bg-[#050403]">
              <motion.div
                className="absolute inset-0 grid grid-cols-2 gap-3 p-5 sm:p-7"
                whileHover={reduceMotion ? undefined : { scale: 1.02 }}
                transition={{ duration: 0.55, ease: 'easeOut' }}
              >
                <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-black/20">
                  <Image src="/images/inversion/ctg-craft-beer-irish-red-ale.webp" alt="CTG Craft Beer Irish Red Ale" fill unoptimized sizes="(min-width: 1024px) 25vw, 45vw" className="object-contain p-3" />
                </div>
                <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-black/20">
                  <Image src="/images/inversion/ctg-craft-beer-porter.webp" alt="CTG Craft Beer Porter" fill unoptimized sizes="(min-width: 1024px) 25vw, 45vw" className="object-contain p-3" />
                </div>
              </motion.div>
            </div>
            <div className="p-7 sm:p-9">
              <div className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#f1c75b]">
                <Beer size={14} aria-hidden="true" /> CTG Craft Beer
              </div>
              <h3 className="mt-4 font-outfit text-3xl font-semibold tracking-[-0.035em] text-white sm:text-4xl">
                {es ? 'Cartagena hecha cerveza.' : 'Cartagena, brewed.'}
              </h3>
              <p className="mt-4 text-sm leading-6 text-white/52">
                {es ? 'Portafolio artesanal nacido en Cartagena y conectado a la infraestructura digital de CTG One.' : 'A Cartagena-born craft portfolio connected to CTG One’s digital infrastructure.'}
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <LinkButton href="/craft-beer" accent="outline">{es ? 'Conocer la cervecería' : 'Explore the brewery'}</LinkButton>
                <LinkButton href="/inversion" accent="outline"><TrendingUp size={14} aria-hidden="true" />{es ? 'Ver inversión' : 'View investment'}</LinkButton>
              </div>
            </div>
          </motion.article>

          <motion.article
            {...reveal}
            whileHover={reduceMotion ? undefined : { y: -5 }}
            className="group overflow-hidden rounded-[30px] border border-[#34B27A]/18 bg-white text-[#0D1B2A] lg:col-span-6"
          >
            <div className="relative aspect-[16/10] overflow-hidden bg-[#061a2a]">
              <motion.div
                className="absolute inset-0"
                whileHover={reduceMotion ? undefined : { scale: 1.025 }}
                transition={{ duration: 0.55, ease: 'easeOut' }}
              >
                <Image
                  src={nvetHomeBannerSrc}
                  alt={es ? 'Visual oficial de Nvet Care' : 'Official Nvet Care visual'}
                  fill
                  unoptimized
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  className="object-contain object-center p-3 sm:p-5"
                />
              </motion.div>
            </div>
            <div className="p-7 sm:p-9">
              <div className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#23885e]">
                <PawPrint size={14} aria-hidden="true" /> {nvetStatusLabel}
              </div>
              <h3 className="mt-4 font-outfit text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
                {es ? 'Cuidado veterinario, más cerca.' : 'Veterinary care, closer.'}
              </h3>
              <p className="mt-4 text-sm leading-6 text-[#4A5A68]">
                {es ? 'Mascotas, citas, seguimiento y atención veterinaria dentro de una sola experiencia digital.' : 'Pets, appointments, follow-up and veterinary care in one digital experience.'}
              </p>
              <div className="mt-7">
                <LinkButton href="/nvetcareapp" accent="green">{es ? 'Explorar Nvet Care' : 'Explore Nvet Care'}</LinkButton>
              </div>
            </div>
          </motion.article>
        </div>
      </Container>
    </section>
  );
};
