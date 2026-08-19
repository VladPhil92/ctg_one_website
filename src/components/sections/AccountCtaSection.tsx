'use client';

import React from 'react';
import { Container } from '@/components/ui';
import { FadeInSection } from '@/components/ui/FadeInSection';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Fingerprint, ShieldCheck, Activity, ArrowUpRight } from 'lucide-react';

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
    <section className="relative overflow-hidden py-20 sm:py-24 md:py-28" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div
          className="absolute left-1/2 top-1/2 h-[500px] w-[760px] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ background: 'radial-gradient(ellipse, rgba(212,162,89,0.055) 0%, rgba(212,162,89,0.012) 40%, transparent 72%)' }}
        />
        <div className="absolute left-[8%] right-[8%] top-1/2 h-px bg-gradient-to-r from-transparent via-accent/10 to-transparent" />
      </div>

      <Container className="relative z-10">
        <FadeInSection>
          <div className="relative overflow-hidden border border-accent/25 bg-[#070707] p-7 sm:p-10 md:p-12 lg:p-14">
            <div className="absolute left-0 top-0 h-px w-24 bg-accent/70" aria-hidden="true" />
            <div className="absolute left-0 top-0 h-24 w-px bg-accent/70" aria-hidden="true" />
            <div className="absolute bottom-0 right-0 h-px w-24 bg-accent/35" aria-hidden="true" />
            <div className="absolute bottom-0 right-0 h-24 w-px bg-accent/35" aria-hidden="true" />

            <div
              className="absolute -right-28 -top-28 h-80 w-80 rounded-full opacity-70"
              style={{ background: 'radial-gradient(circle, rgba(212,162,89,0.08), transparent 68%)' }}
              aria-hidden="true"
            />

            <div className="relative z-10 grid items-center gap-10 lg:grid-cols-[1fr_0.72fr] lg:gap-16">
              <div>
                <div className="mb-5 flex items-center gap-3">
                  <span className="relative flex h-3 w-3 shrink-0" aria-hidden="true">
                    <span className="absolute inset-0 rounded-full bg-accent/20 animate-ping" />
                    <span className="relative m-auto h-1.5 w-1.5 rounded-full bg-accent" />
                  </span>
                  <span className="min-w-0 text-[11px] sm:text-xs font-semibold uppercase tracking-[0.18em] text-accent leading-tight">{copy.eyebrow}</span>
                </div>

                <h2 className="mb-5 max-w-2xl text-3xl sm:text-4xl md:text-5xl font-outfit font-semibold tracking-[-0.035em] leading-[1.03] text-white">
                  {isAuthenticated ? copy.returningTitle : copy.guestTitle}
                </h2>
                <p className="mb-8 max-w-xl text-sm sm:text-base text-text-muted leading-relaxed">
                  {isAuthenticated ? copy.returningDescription : copy.guestDescription}
                </p>

                <div className="flex flex-col gap-3 sm:flex-row">
                  {isAuthenticated ? (
                    <Button href="/dashboard" variant="primary" size="md" arrow>
                      {copy.accountButton}
                    </Button>
                  ) : (
                    <>
                      <Button href="/registro" variant="primary" size="md" arrow>
                        {copy.createButton}
                      </Button>
                      <Button href="/iniciar-sesion" variant="secondary" size="md">
                        {copy.signInButton}
                      </Button>
                    </>
                  )}
                </div>
              </div>

              <div className="relative min-w-0">
                <div className="absolute bottom-6 left-9 top-6 w-px bg-gradient-to-b from-transparent via-accent/20 to-transparent" aria-hidden="true" />
                <div className="space-y-3">
                  {signals.map(({ icon: Icon, label }, index) => (
                    <div key={label} className="group relative flex min-w-0 items-center gap-4 overflow-hidden border border-white/[0.075] bg-[#0a0a0a]/95 p-4 transition-[border-color,background-color] duration-300 hover:border-accent/30 hover:bg-[#0c0c0c] sm:p-5">
                      <span className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-accent/25 bg-[#090909]">
                        <Icon className="h-[18px] w-[18px] shrink-0 text-accent" strokeWidth={1.4} aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-text-dim leading-tight">0{index + 1}</span>
                        <span className="block truncate text-sm text-text-secondary">{label}</span>
                      </div>
                      <ArrowUpRight className="h-4 w-4 shrink-0 text-text-dim transition-colors duration-300 group-hover:text-accent" aria-hidden="true" />
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
