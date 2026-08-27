'use client';

import React from 'react';
import Image from 'next/image';
import { ArrowUpRight, Beer, Coins, PawPrint, TrendingUp } from 'lucide-react';
import { Container } from '@/components/ui';
import { FadeInSection } from '@/components/ui/FadeInSection';
import { useLanguage } from '@/contexts/LanguageContext';
import nvetHomeBannerSrc from '@/data/nvet-home-banner';

const LinkButton = ({ href, children, accent = 'gold' }: { href: string; children: React.ReactNode; accent?: 'gold' | 'green' | 'outline' }) => {
  const classes = accent === 'green'
    ? 'bg-[#34B27A] text-white hover:bg-[#289463]'
    : accent === 'outline'
      ? 'border border-white/[0.12] bg-white/[0.02] text-white hover:border-[#d6ae56]/35 hover:bg-white/[0.04]'
      : 'bg-[#d6ae56] text-black hover:bg-[#f1c75b]';

  return (
    <a href={href} className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 text-xs font-semibold uppercase tracking-[0.1em] transition-all hover:-translate-y-0.5 ${classes}`}>
      {children}<ArrowUpRight size={14} aria-hidden="true" />
    </a>
  );
};

export const HomeProductShowcases: React.FC = () => {
  const { locale } = useLanguage();
  const es = locale === 'es';

  return (
    <section className="relative overflow-hidden bg-[#030507] py-20 sm:py-28 md:py-32">
      <Container size="large">
        <FadeInSection>
          <div className="mb-12 max-w-3xl sm:mb-16">
            <span className="mb-5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-[#d6ae56]">{es ? 'Productos CTG One' : 'CTG One products'}</span>
            <h2 className="font-outfit text-3xl font-semibold leading-[1.03] tracking-[-0.04em] text-white sm:text-4xl md:text-5xl">
              {es ? 'Tecnología que puedes ver en acción.' : 'Technology you can see in action.'}
            </h2>
            <p className="mt-5 max-w-2xl text-sm leading-relaxed text-text-muted sm:text-base">
              {es ? 'Conoce algunos de los productos y plataformas que estamos desarrollando dentro del ecosistema CTG One.' : 'Explore some of the products and platforms we are building across the CTG One ecosystem.'}
            </p>
          </div>
        </FadeInSection>

        <FadeInSection>
          <article className="relative mb-6 overflow-hidden rounded-[30px] border border-[#d6ae56]/20 bg-[#090805]">
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_20%_20%,rgba(214,174,86,.11),transparent_36%),radial-gradient(circle_at_80%_60%,rgba(36,140,255,.05),transparent_34%)]" aria-hidden="true" />
            <div className="relative grid min-h-[600px] lg:grid-cols-[0.92fr_1.08fr]">
              <div className="flex flex-col justify-center p-7 sm:p-10 md:p-12 lg:p-14">
                <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-[#d6ae56]/20 bg-[#d6ae56]/[0.04] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#f1c75b]">
                  <Beer size={14} /> CTG Craft Beer · Cartagena
                </div>
                <h3 className="max-w-xl font-outfit text-4xl font-semibold leading-[1.02] tracking-[-0.04em] text-white sm:text-5xl">
                  {es ? 'Cerveza artesanal. Producción real.' : 'Craft beer. Real production.'}
                </h3>
                <p className="mt-6 max-w-xl text-sm leading-relaxed text-text-muted sm:text-base">
                  {es ? 'CTG Craft Beer combina producción artesanal, identidad de marca y herramientas digitales desarrolladas por CTG One. Puedes conocer nuestras cervezas o explorar una modalidad separada para participar en lotes de producción.' : 'CTG Craft Beer combines craft production, brand identity and digital tools built by CTG One. Explore our beer or, separately, learn how participation in production batches works.'}
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <LinkButton href="/craft-beer">{es ? 'Conocer CTG Craft Beer' : 'Explore CTG Craft Beer'}</LinkButton>
                  <LinkButton href="/inversion" accent="outline"><TrendingUp size={14} />{es ? 'Invertir en producción' : 'Invest in production'}</LinkButton>
                </div>
              </div>
              <div className="relative min-h-[430px] lg:min-h-full">
                <div className="absolute inset-0 bg-gradient-to-r from-[#090805] via-transparent to-transparent z-10 hidden lg:block" />
                <div className="absolute inset-0 grid grid-cols-2 gap-2 p-6 sm:p-8">
                  <div className="relative overflow-hidden rounded-2xl border border-white/[0.06]">
                    <Image src="/images/inversion/ctg-craft-beer-irish-red-ale.webp" alt={es ? 'Botella Irish Red Ale de CTG Craft Beer' : 'CTG Craft Beer Irish Red Ale bottle'} fill unoptimized sizes="(min-width: 1024px) 25vw, 45vw" className="object-cover" />
                  </div>
                  <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] translate-y-8">
                    <Image src="/images/inversion/ctg-craft-beer-porter.webp" alt={es ? 'Botella Porter de CTG Craft Beer' : 'CTG Craft Beer Porter bottle'} fill unoptimized sizes="(min-width: 1024px) 25vw, 45vw" className="object-cover" />
                  </div>
                </div>
              </div>
            </div>
          </article>
        </FadeInSection>

        <FadeInSection delay={0.08}>
          <article className="overflow-hidden rounded-[30px] border border-[#0D1B2A]/10 bg-white text-[#0D1B2A]">
            <div className="grid min-h-[590px] lg:grid-cols-[1.02fr_0.98fr]">
              <div className="relative order-2 aspect-[3/2] overflow-hidden bg-[#061a2a] lg:order-1 lg:aspect-auto lg:min-h-full">
                <Image
                  src={nvetHomeBannerSrc}
                  alt={es ? 'Campaña de Nvet Care: cuidamos hoy para un mañana mejor juntos' : 'Nvet Care campaign: caring today for a better tomorrow together'}
                  fill
                  unoptimized
                  sizes="(min-width: 1024px) 51vw, 100vw"
                  className="object-contain"
                />
              </div>
              <div className="order-1 flex flex-col justify-center p-7 sm:p-10 md:p-12 lg:order-2 lg:p-14">
                <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-[#34B27A]/20 bg-[#34B27A]/[0.06] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#34B27A]">
                  <PawPrint size={14} /> {es ? 'Nvet Care · En desarrollo' : 'Nvet Care · In development'}
                </div>
                <h3 className="max-w-xl font-outfit text-4xl font-semibold leading-[1.02] tracking-[-0.04em] text-[#0D1B2A] sm:text-5xl">
                  {es ? 'Tu veterinario de confianza, a un toque de distancia.' : 'Your trusted veterinarian, one tap away.'}
                </h3>
                <p className="mt-6 max-w-xl text-sm leading-relaxed text-[#4A5A68] sm:text-base">
                  {es ? 'Estamos desarrollando una aplicación para conectar dueños de mascotas con veterinarios verificados y facilitar la atención a domicilio en Cartagena.' : 'We are building an app that connects pet owners with verified veterinarians and makes at-home veterinary care easier in Cartagena.'}
                </p>
                <div className="mt-8">
                  <LinkButton href="/nvetcareapp" accent="green">{es ? 'Conocer Nvet Care' : 'Explore Nvet Care'}</LinkButton>
                </div>
              </div>
            </div>
          </article>
        </FadeInSection>

        <FadeInSection delay={0.14}>
          <article className="relative mt-6 overflow-hidden rounded-[30px] border border-[#d6ae56]/20 bg-[#090805]">
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_80%_20%,rgba(214,174,86,.09),transparent_38%)]" aria-hidden="true" />
            <div className="relative grid min-h-[520px] lg:grid-cols-[0.92fr_1.08fr]">
              <div className="flex flex-col justify-center p-7 sm:p-10 md:p-12 lg:p-14">
                <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-[#d6ae56]/20 bg-[#d6ae56]/[0.04] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#f1c75b]">
                  <Coins size={14} /> {es ? 'CTGO · En consolidación' : 'CTGO · Under consolidation'}
                </div>
                <h3 className="max-w-xl font-outfit text-4xl font-semibold leading-[1.02] tracking-[-0.04em] text-white sm:text-5xl">
                  {es ? 'Un token real, en proceso de consolidación.' : 'A real token, under consolidation.'}
                </h3>
                <p className="mt-6 max-w-xl text-sm leading-relaxed text-text-muted sm:text-base">
                  {es ? 'CTGO ya fue desplegado en Polygon. Antes de cualquier apertura pública, estamos fortaleciendo su liquidez y completando su verificación y auditoría de seguridad.' : 'CTGO has already been deployed on Polygon. Before any public rollout, we are strengthening its liquidity and completing verification and a security audit.'}
                </p>
                <div className="mt-8">
                  <LinkButton href="/ctgotoken" accent="outline">{es ? 'Conocer CTGO' : 'Explore CTGO'}</LinkButton>
                </div>
              </div>
              <div className="relative min-h-[360px] lg:min-h-full">
                <div className="absolute inset-0 bg-gradient-to-r from-[#090805] via-transparent to-transparent z-10 hidden lg:block" />
                <div className="absolute inset-0 grid grid-cols-2 gap-2 p-6 sm:p-8">
                  <div className="relative overflow-hidden rounded-2xl border border-white/[0.06]">
                    <Image src="/images/token/file_000000009950720ea0fa3d0139de0cdb.png" alt={es ? 'Concepto visual de CTGO' : 'CTGO concept visual'} fill unoptimized sizes="(min-width: 1024px) 25vw, 45vw" className="object-cover" />
                  </div>
                  <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] translate-y-8">
                    <Image src="/images/token/file_00000000818471f58dcdf9a124fb690f.png" alt={es ? 'Concepto visual de CTGO' : 'CTGO concept visual'} fill unoptimized sizes="(min-width: 1024px) 25vw, 45vw" className="object-cover" />
                  </div>
                </div>
              </div>
            </div>
          </article>
        </FadeInSection>
      </Container>
    </section>
  );
};
