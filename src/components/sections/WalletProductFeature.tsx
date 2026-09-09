'use client';

import React from 'react';
import { ArrowUpRight, History, ShieldCheck, Smartphone, WalletCards } from 'lucide-react';
import { Container } from '@/components/ui';
import { FadeInSection } from '@/components/ui/FadeInSection';
import { useLanguage } from '@/contexts/LanguageContext';
import { CTG_WALLET_URL } from '@/lib/constants';

export const WalletProductFeature: React.FC = () => {
  const { locale } = useLanguage();
  const es = locale === 'es';

  const benefits = es
    ? [
        { icon: WalletCards, title: 'Tu Wallet', text: 'Consulta saldo y movimientos desde tu experiencia CTG One.' },
        { icon: History, title: 'Tu actividad', text: 'Mantén una referencia clara de tus operaciones dentro del ecosistema.' },
        { icon: ShieldCheck, title: 'Tu identidad', text: 'Accede con la misma cuenta a las experiencias que estén habilitadas para ti.' },
      ]
    : [
        { icon: WalletCards, title: 'Your Wallet', text: 'View your balance and activity from your CTG One experience.' },
        { icon: History, title: 'Your activity', text: 'Keep a clear reference of your operations across the ecosystem.' },
        { icon: ShieldCheck, title: 'Your identity', text: 'Use the same account across experiences that are enabled for you.' },
      ];

  return (
    <section className="relative overflow-hidden bg-[#030507] py-10 sm:py-14 md:py-16" aria-labelledby="wallet-feature-title">
      <Container size="large">
        <FadeInSection>
          <article className="relative overflow-hidden rounded-[32px] border border-[#c9a962]/25 bg-[linear-gradient(135deg,#0b0b09_0%,#06090d_56%,#05070a_100%)] shadow-[0_34px_110px_rgba(0,0,0,.42)]">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(201,169,98,.13),transparent_32%),radial-gradient(circle_at_83%_28%,rgba(36,140,255,.10),transparent_30%)]" aria-hidden="true" />
            <div className="relative grid min-h-[560px] lg:grid-cols-[0.92fr_1.08fr]">
              <div className="flex flex-col justify-center p-7 sm:p-10 md:p-12 lg:p-14">
                <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-[#c9a962]/25 bg-[#c9a962]/[0.055] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#d4b676]">
                  <WalletCards size={14} aria-hidden="true" /> CTG One Wallet
                </div>
                <h2 id="wallet-feature-title" className="max-w-2xl font-outfit text-4xl font-semibold leading-[.98] tracking-[-0.05em] text-white sm:text-5xl md:text-6xl">
                  {es ? 'Una cuenta. Una Wallet. Menos fricción.' : 'One account. One Wallet. Less friction.'}
                </h2>
                <p className="mt-6 max-w-xl text-sm leading-relaxed text-text-muted sm:text-base">
                  {es
                    ? 'CTG One Wallet concentra tu experiencia financiera dentro del ecosistema. La meta es simple: que puedas entrar, consultar y continuar tu actividad sin tener que entender la infraestructura que opera detrás.'
                    : 'CTG One Wallet concentrates your financial experience inside the ecosystem. The goal is simple: enter, review and continue your activity without needing to understand the infrastructure behind it.'}
                </p>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <a href={CTG_WALLET_URL} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#c9a962] px-5 text-xs font-semibold uppercase tracking-[0.1em] text-black transition-all hover:-translate-y-0.5 hover:bg-[#d4b676]">
                    {es ? 'Abrir CTG Wallet' : 'Open CTG Wallet'} <ArrowUpRight size={14} aria-hidden="true" />
                  </a>
                  <a href="/wallet#app" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/[0.12] bg-white/[0.025] px-5 text-xs font-semibold uppercase tracking-[0.1em] text-white transition-all hover:-translate-y-0.5 hover:border-[#c9a962]/35 hover:bg-white/[0.05]">
                    {es ? 'Ver opciones de app' : 'View app options'} <Smartphone size={14} aria-hidden="true" />
                  </a>
                </div>
              </div>

              <div className="relative flex items-center justify-center p-7 sm:p-10 lg:p-12">
                <div className="relative w-full max-w-[560px]">
                  <div className="absolute -inset-8 rounded-[44px] bg-[radial-gradient(circle,rgba(201,169,98,.10),transparent_64%)] blur-2xl" aria-hidden="true" />
                  <div className="relative overflow-hidden rounded-[30px] border border-white/[0.10] bg-[#070b10]/95 p-5 shadow-[0_35px_90px_rgba(0,0,0,.55)] backdrop-blur-xl sm:p-6">
                    <div className="border-b border-white/[0.07] pb-5">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#d4b676]">CTG One / Wallet</p>
                      <p className="mt-2 font-outfit text-2xl font-semibold tracking-[-0.04em] text-white">
                        {es ? 'Tu acceso financiero al ecosistema' : 'Your financial access to the ecosystem'}
                      </p>
                    </div>

                    <div className="mt-5 space-y-3">
                      {benefits.map(({ icon: Icon, title, text }) => (
                        <div key={title} className="flex gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4 sm:p-5">
                          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#c9a962]/20 bg-[#c9a962]/[0.05] text-[#d4b676]">
                            <Icon size={18} aria-hidden="true" />
                          </span>
                          <div>
                            <p className="text-sm font-semibold text-white">{title}</p>
                            <p className="mt-1 text-xs leading-relaxed text-white/45">{text}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 rounded-2xl border border-[#248cff]/15 bg-[#248cff]/[0.035] p-4">
                      <p className="text-xs leading-relaxed text-white/50">
                        {es
                          ? 'Las capacidades disponibles dependen del estado de tu cuenta y del servicio. CTG One muestra por separado lo que está activo, en beta o todavía en desarrollo.'
                          : 'Available capabilities depend on your account and the service. CTG One separates what is active, in beta, or still in development.'}
                      </p>
                    </div>
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
