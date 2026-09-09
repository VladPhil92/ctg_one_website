'use client';

import React from 'react';
import { ArrowUpRight, GraduationCap, Landmark, PawPrint, WalletCards } from 'lucide-react';
import { Container } from '@/components/ui';
import { FadeInSection } from '@/components/ui/FadeInSection';
import { useLanguage } from '@/contexts/LanguageContext';

export const HomeIntroSection: React.FC = () => {
  const { locale } = useLanguage();
  const es = locale === 'es';

  const items = es
    ? [
        {
          icon: WalletCards,
          title: 'Dinero y cuenta',
          text: 'Consulta tu Wallet y accede a experiencias financieras habilitadas con la misma identidad CTG One.',
          href: '/wallet',
          cta: 'Explorar Wallet',
        },
        {
          icon: PawPrint,
          title: 'Servicios',
          text: 'Descubre productos y servicios del ecosistema sin tener que entender cómo está construida la tecnología detrás.',
          href: '/ecosystem',
          cta: 'Ver servicios',
        },
        {
          icon: Landmark,
          title: 'Ciudad y comunidad',
          text: 'Conecta con plataformas de participación y gestión comunitaria como VÉRTICE OS desde el ecosistema CTG One.',
          href: 'https://vertice.ctgone.com',
          cta: 'Conocer VÉRTICE',
        },
        {
          icon: GraduationCap,
          title: 'Educación y conocimiento',
          text: 'Accede a formación, contenidos y servicios educativos conectados a tu cuenta y a tu biblioteca personal.',
          href: '/jpvalderrama/learningcenter',
          cta: 'Explorar educación',
        },
      ]
    : [
        {
          icon: WalletCards,
          title: 'Money and account',
          text: 'Access your Wallet and enabled financial experiences with the same CTG One identity.',
          href: '/wallet',
          cta: 'Explore Wallet',
        },
        {
          icon: PawPrint,
          title: 'Services',
          text: 'Discover ecosystem products and services without having to understand the technology behind them.',
          href: '/ecosystem',
          cta: 'View services',
        },
        {
          icon: Landmark,
          title: 'City and community',
          text: 'Connect with participation and community-management platforms such as VÉRTICE OS through CTG One.',
          href: 'https://vertice.ctgone.com',
          cta: 'Explore VÉRTICE',
        },
        {
          icon: GraduationCap,
          title: 'Education and knowledge',
          text: 'Access learning, content and educational services connected to your account and personal library.',
          href: '/jpvalderrama/learningcenter',
          cta: 'Explore education',
        },
      ];

  return (
    <section className="relative overflow-hidden border-y border-white/[0.05] bg-[#070b10] py-20 sm:py-24 md:py-28" aria-labelledby="home-use-cases-title">
      <Container size="large">
        <FadeInSection>
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
            <div>
              <span className="mb-5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-[#d6ae56]">
                {es ? 'Empieza por lo que necesitas' : 'Start with what you need'}
              </span>
              <h2 id="home-use-cases-title" className="max-w-xl font-outfit text-3xl font-semibold leading-[1.05] tracking-[-0.04em] text-white sm:text-4xl md:text-5xl">
                {es ? 'Una cuenta que conecta experiencias distintas.' : 'One account connecting different experiences.'}
              </h2>
            </div>
            <p className="max-w-2xl self-end text-sm leading-relaxed text-text-muted sm:text-base">
              {es
                ? 'CTG One funciona como puerta de entrada al ecosistema: crea una cuenta, identifica el servicio que necesitas y accede a las plataformas habilitadas sin repetir innecesariamente tu proceso de registro.'
                : 'CTG One works as the gateway to the ecosystem: create an account, find the service you need and access enabled platforms without unnecessarily repeating your registration process.'}
            </p>
          </div>
        </FadeInSection>

        <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {items.map(({ icon: Icon, title, text, href, cta }, index) => {
            const isExternal = href.startsWith('http://') || href.startsWith('https://');
            return (
              <FadeInSection key={title} delay={0.04 + index * 0.04}>
                <a
                  href={href}
                  target={isExternal ? '_blank' : undefined}
                  rel={isExternal ? 'noopener noreferrer' : undefined}
                  className="group flex h-full min-h-[250px] flex-col rounded-2xl border border-white/[0.07] bg-white/[0.018] p-6 transition duration-300 hover:-translate-y-1 hover:border-[#d6ae56]/25 hover:bg-white/[0.03] sm:p-7"
                >
                  <span className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl border border-[#d6ae56]/20 bg-[#d6ae56]/[0.035] text-[#f1c75b]">
                    <Icon size={18} strokeWidth={1.5} aria-hidden="true" />
                  </span>
                  <h3 className="mb-2 font-outfit text-lg font-semibold text-white">{title}</h3>
                  <p className="text-sm leading-relaxed text-text-muted">{text}</p>
                  <span className="mt-auto inline-flex items-center gap-2 pt-6 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#f1c75b] transition group-hover:text-white">
                    {cta} <ArrowUpRight size={13} aria-hidden="true" />
                  </span>
                </a>
              </FadeInSection>
            );
          })}
        </div>
      </Container>
    </section>
  );
};
