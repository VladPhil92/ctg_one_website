'use client';

import React from 'react';
import { ArrowUpRight, Globe2, Landmark, ShieldCheck, Smartphone, WalletCards } from 'lucide-react';
import { Container } from '@/components/ui';
import { FadeInSection } from '@/components/ui/FadeInSection';
import { useLanguage } from '@/contexts/LanguageContext';
import { CTG_WALLET_URL } from '@/lib/constants';

export const WalletProductFeature: React.FC = () => {
  const { locale } = useLanguage();
  const es = locale === 'es';

  return (
    <section className="relative overflow-hidden bg-[#030507] py-10 sm:py-14 md:py-16">
      <Container size="large">
        <FadeInSection>
          <article className="relative overflow-hidden rounded-[32px] border border-[#c9a962]/25 bg-[linear-gradient(135deg,#0b0b09_0%,#06090d_56%,#05070a_100%)] shadow-[0_34px_110px_rgba(0,0,0,.42)]">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(201,169,98,.13),transparent_32%),radial-gradient(circle_at_83%_28%,rgba(36,140,255,.10),transparent_30%)]" aria-hidden="true" />
            <div className="relative grid min-h-[620px] lg:grid-cols-[0.92fr_1.08fr]">
              <div className="flex flex-col justify-center p-7 sm:p-10 md:p-12 lg:p-14">
                <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-[#c9a962]/25 bg-[#c9a962]/[0.055] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#d4b676]">
                  <WalletCards size={14} /> CTG One Wallet
                </div>
                <h2 className="max-w-2xl font-outfit text-4xl font-semibold leading-[.98] tracking-[-0.05em] text-white sm:text-5xl md:text-6xl">
                  {es ? 'Una cuenta. Una wallet. Todo CTG One.' : 'One account. One wallet. All of CTG One.'}
                </h2>
                <p className="mt-6 max-w-xl text-sm leading-relaxed text-text-muted sm:text-base">
                  {es
                    ? 'Consulta tu Saldo CTG, tus activos digitales y tu actividad desde la web o la app usando la misma identidad CTG One. Si ya tenías una wallet verificada, la arquitectura está diseñada para preservarla y vincularla, no para reemplazarla.'
                    : 'View your CTG Balance, digital assets and activity on web or app using the same CTG One identity. If you already had a verified wallet, the architecture is designed to preserve and link it rather than replace it.'}
                </p>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <a href={CTG_WALLET_URL} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#c9a962] px-5 text-xs font-semibold uppercase tracking-[0.1em] text-black transition-all hover:-translate-y-0.5 hover:bg-[#d4b676]">
                    {es ? 'Abrir CTG Wallet' : 'Open CTG Wallet'} <ArrowUpRight size={14} />
                  </a>
                  <a href="/wallet#app" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/[0.12] bg-white/[0.025] px-5 text-xs font-semibold uppercase tracking-[0.1em] text-white transition-all hover:-translate-y-0.5 hover:border-[#c9a962]/35 hover:bg-white/[0.05]">
                    {es ? 'Instalar app' : 'Install app'} <Smartphone size={14} />
                  </a>
                </div>

                <div className="mt-9 flex flex-wrap gap-2 text-[10px] font-medium uppercase tracking-[0.12em] text-white/45">
                  {[
                    [Globe2, es ? 'Wallet Web' : 'Web Wallet'],
                    [Smartphone, 'PWA · Android · iOS'],
                    [ShieldCheck, es ? 'Identidad CTG One' : 'CTG One identity'],
                  ].map(([Icon, label]) => {
                    const IconComponent = Icon as typeof Globe2;
                    return (
                      <span key={String(label)} className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.025] px-3 py-2">
                        <IconComponent size={12} /> {String(label)}
                      </span>
                    );
                  })}
                </div>
              </div>

              <div className="relative flex items-center justify-center p-7 sm:p-10 lg:p-12">
                <div className="relative w-full max-w-[560px]">
                  <div className="absolute -inset-8 rounded-[44px] bg-[radial-gradient(circle,rgba(201,169,98,.10),transparent_64%)] blur-2xl" aria-hidden="true" />
                  <div className="relative overflow-hidden rounded-[30px] border border-white/[0.10] bg-[#070b10]/95 p-5 shadow-[0_35px_90px_rgba(0,0,0,.55)] backdrop-blur-xl sm:p-6">
                    <div className="flex items-center justify-between border-b border-white/[0.07] pb-5">
                      <div>
                        <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#d4b676]">CTG One / Wallet</p>
                        <p className="mt-2 font-outfit text-2xl font-semibold tracking-[-0.04em] text-white">{es ? 'Centro financiero personal' : 'Personal finance center'}</p>
                      </div>
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#c9a962]/25 bg-[#c9a962]/[0.07] text-[#d4b676]"><WalletCards size={19} /></div>
                    </div>

                    <div className="mt-5 rounded-2xl border border-[#c9a962]/20 bg-[linear-gradient(135deg,rgba(201,169,98,.10),rgba(255,255,255,.02))] p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-[9px] uppercase tracking-[0.18em] text-white/35">Saldo CTG</p>
                          <p className="mt-3 font-outfit text-3xl font-semibold tracking-[-0.04em] text-white">{es ? 'Sincronizado' : 'Synchronized'}</p>
                          <p className="mt-2 text-xs text-white/40">COP · CTG One ledger</p>
                        </div>
                        <Landmark size={19} className="text-[#d4b676]" />
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
                        <p className="text-[9px] uppercase tracking-[0.18em] text-white/30">Identity</p>
                        <p className="mt-3 text-sm font-semibold text-white">1 CTG One account</p>
                        <p className="mt-1 text-xs leading-relaxed text-white/38">Supabase identity + verified wallet link</p>
                      </div>
                      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
                        <p className="text-[9px] uppercase tracking-[0.18em] text-white/30">Access</p>
                        <p className="mt-3 text-sm font-semibold text-white">Web + App</p>
                        <p className="mt-1 text-xs leading-relaxed text-white/38">Same wallet, same user, same activity model</p>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center gap-3 rounded-2xl border border-[#248cff]/15 bg-[#248cff]/[0.035] p-4">
                      <ShieldCheck size={17} className="shrink-0 text-[#7db8ff]" />
                      <p className="text-xs leading-relaxed text-white/50">
                        {es ? 'Las wallets legacy verificadas se preservan. CTG One bloquea cualquier reemplazo silencioso ante una discrepancia.' : 'Verified legacy wallets are preserved. CTG One blocks silent replacement whenever a mismatch is detected.'}
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
