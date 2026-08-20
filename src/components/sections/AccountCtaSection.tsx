'use client';

import React from 'react';
import { Container } from '@/components/ui';
import { FadeInSection } from '@/components/ui/FadeInSection';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Fingerprint, ShieldCheck, Activity, ArrowUpRight } from 'lucide-react';
import styles from '@/styles/CommandCenter.module.css';

export const AccountCtaSection: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const { locale } = useLanguage();

  if (isLoading) return null;

  const copy = locale === 'es'
    ? {
        eyebrow: 'Acceso al ecosistema',
        returningTitle: 'Tu punto de control digital.',
        returningDescription: 'Consulta tu saldo, estado de verificación y funciones habilitadas desde una sola interfaz conectada al ecosistema CTG One.',
        guestTitle: 'Una identidad. Un ecosistema.',
        guestDescription: 'Crea tu cuenta para verificar tu identidad, acceder a tu panel y utilizar las plataformas habilitadas de CTG One.',
        accountButton: 'Ir a mi cuenta',
        createButton: 'Crear cuenta',
        signInButton: 'Iniciar sesión',
        identity: 'Identidad verificada',
        security: 'Acceso seguro',
        activity: 'Operación conectada',
      }
    : {
        eyebrow: 'Ecosystem access',
        returningTitle: 'Your digital control point.',
        returningDescription: 'Review your balance, verification status, and enabled features from one interface connected to the CTG One ecosystem.',
        guestTitle: 'One identity. One ecosystem.',
        guestDescription: 'Create your account to verify your identity, access your dashboard, and use the enabled CTG One platforms.',
        accountButton: 'Go to my account',
        createButton: 'Create account',
        signInButton: 'Sign in',
        identity: 'Verified identity',
        security: 'Secure access',
        activity: 'Connected operation',
      };

  const signals = [
    { icon: Fingerprint, label: copy.identity },
    { icon: ShieldCheck, label: copy.security },
    { icon: Activity, label: copy.activity },
  ];

  return (
    <section className={`${styles.theme} relative overflow-hidden py-20 sm:py-24 md:py-28 lg:py-32`} style={{ backgroundColor: '#030507' }}>
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute left-1/2 top-1/2 h-[540px] w-[880px] -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ background: 'radial-gradient(ellipse, rgba(214,174,86,0.055) 0%, rgba(36,140,255,0.022) 42%, transparent 72%)' }} />
        <div className="absolute left-[6%] right-[6%] top-1/2 h-px bg-gradient-to-r from-transparent via-[#d6ae56]/12 to-transparent" />
      </div>

      <Container size="large" className="relative z-10">
        <FadeInSection>
          <div className={`${styles.commandPanel} p-7 sm:p-10 md:p-12 lg:p-14`}>
            <div className="pointer-events-none absolute right-0 top-0 h-full w-[44%] opacity-[.12]" style={{ backgroundImage: 'linear-gradient(rgba(36,140,255,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(214,174,86,.08) 1px, transparent 1px)', backgroundSize: '54px 54px', maskImage: 'linear-gradient(to left, black, transparent)', WebkitMaskImage: 'linear-gradient(to left, black, transparent)' }} aria-hidden="true" />

            <div className="relative z-10 grid items-center gap-10 lg:grid-cols-[1fr_0.72fr] lg:gap-16">
              <div>
                <div className="mb-5 flex items-center gap-3">
                  <span className="relative flex h-3 w-3 shrink-0" aria-hidden="true">
                    <span className="absolute inset-0 rounded-full bg-[#d6ae56]/20 animate-ping" />
                    <span className="relative m-auto h-1.5 w-1.5 rounded-full bg-[#f1c75b] shadow-[0_0_10px_rgba(241,199,91,.7)]" />
                  </span>
                  <span className="min-w-0 text-[11px] sm:text-xs font-semibold uppercase tracking-[0.18em] text-[#f1c75b] leading-tight">{copy.eyebrow}</span>
                </div>

                <h2 className="mb-5 max-w-2xl text-3xl sm:text-4xl md:text-5xl font-outfit font-semibold tracking-[-0.04em] leading-[1.02] text-white">
                  {isAuthenticated ? copy.returningTitle : copy.guestTitle}
                </h2>
                <p className="mb-8 max-w-xl text-sm sm:text-base text-text-muted leading-relaxed">
                  {isAuthenticated ? copy.returningDescription : copy.guestDescription}
                </p>

                <div className="flex flex-col gap-3 sm:flex-row">
                  {isAuthenticated ? (
                    <Button href="/dashboard" variant="primary" size="md" arrow className="rounded-xl border border-[#ffd56a]/25 bg-[#d6ae56] hover:-translate-y-px">
                      {copy.accountButton}
                    </Button>
                  ) : (
                    <>
                      <Button href="/registro" variant="primary" size="md" arrow className="rounded-xl border border-[#ffd56a]/25 bg-[#d6ae56] hover:-translate-y-px">
                        {copy.createButton}
                      </Button>
                      <Button href="/iniciar-sesion" variant="secondary" size="md" className="rounded-xl border-[#248cff]/30 bg-[#071a32]/20 hover:border-[#248cff]/55 hover:bg-[#071a32]/35">
                        {copy.signInButton}
                      </Button>
                    </>
                  )}
                </div>
              </div>

              <div className="relative min-w-0">
                <div className="absolute bottom-6 left-[27px] top-6 w-px bg-gradient-to-b from-transparent via-[#248cff]/25 to-transparent" aria-hidden="true" />
                <div className="space-y-3">
                  {signals.map(({ icon: Icon, label }, index) => (
                    <div key={label} className={`${styles.techCard} group flex min-w-0 items-center gap-4 p-4 sm:p-5`}>
                      <span className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#d6ae56]/25 bg-[#050a10]">
                        <Icon className="h-[18px] w-[18px] shrink-0 text-[#f1c75b]" strokeWidth={1.4} aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <span className="mb-1 block font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#248cff]/55 leading-tight">AUTH-0{index + 1}</span>
                        <span className="block truncate text-sm text-text-secondary">{label}</span>
                      </div>
                      <ArrowUpRight className="h-4 w-4 shrink-0 text-text-dim transition-colors duration-300 group-hover:text-[#f1c75b]" aria-hidden="true" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </FadeInSection>
      </Container>
    </section>
  );
};
