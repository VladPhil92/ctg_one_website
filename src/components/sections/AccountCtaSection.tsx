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
    <section className="relative py-24 sm:py-28 md:py-36 overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[760px] h-[500px] rounded-full"
          style={{ background: 'radial-gradient(ellipse, rgba(212,162,89,0.055) 0%, rgba(212,162,89,0.012) 40%, transparent 72%)' }}
        />
        <div className="absolute left-[8%] right-[8%] top-1/2 h-px bg-gradient-to-r from-transparent via-accent/10 to-transparent" />
      </div>

      <Container className="relative z-10">
        <FadeInSection>
          <div className="relative overflow-hidden border border-accent/20 bg-[#070707] p-7 sm:p-10 md:p-12 lg:p-14">
            <div className="absolute top-0 left-0 w-24 h-px bg-accent/70" />
            <div className="absolute top-0 left-0 w-px h-24 bg-accent/70" />
            <div className="absolute right-0 bottom-0 w-24 h-px bg-accent/35" />
            <div className="absolute right-0 bottom-0 w-px h-24 bg-accent/35" />

            <div
              className="absolute -right-28 -top-28 w-80 h-80 rounded-full opacity-70"
              style={{ background: 'radial-gradient(circle, rgba(212,162,89,0.08), transparent 68%)' }}
            />

            <div className="relative z-10 grid lg:grid-cols-[1fr_0.72fr] gap-12 lg:gap-16 items-center">
              <div>
                <div className="flex items-center gap-3 mb-5">
                  <span className="relative flex w-3 h-3">
                    <span className="absolute inset-0 rounded-full bg-accent/20 animate-ping" />
                    <span className="relative m-auto w-1.5 h-1.5 rounded-full bg-accent" />
                  </span>
                  <span className="text-[9px] sm:text-[10px] uppercase tracking-[0.26em] text-accent">{copy.eyebrow}</span>
                </div>

                <h2 className="text-3xl sm:text-4xl md:text-5xl font-outfit font-semibold tracking-[-0.035em] leading-[1.03] text-white mb-5 max-w-2xl">
                  {isAuthenticated ? copy.returningTitle : copy.guestTitle}
                </h2>
                <p className="text-sm sm:text-base text-text-muted leading-relaxed max-w-xl mb-8">
                  {isAuthenticated ? copy.returningDescription : copy.guestDescription}
                </p>

                <div className="flex flex-col sm:flex-row gap-3">
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

              <div className="relative">
                <div className="absolute left-5 top-6 bottom-6 w-px bg-gradient-to-b from-transparent via-accent/20 to-transparent" />
                <div className="space-y-3">
                  {signals.map(({ icon: Icon, label }, index) => (
                    <div key={label} className="group relative flex items-center gap-4 border border-white/[0.055] bg-white/[0.012] p-4 sm:p-5 hover:border-accent/25 hover:bg-accent/[0.018] transition-all duration-500">
                      <span className="relative z-10 w-10 h-10 rounded-full border border-accent/25 bg-[#090909] flex items-center justify-center shrink-0">
                        <Icon size={17} className="text-accent" strokeWidth={1.4} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <span className="block text-[9px] uppercase tracking-[0.22em] text-text-dim mb-1">0{index + 1}</span>
                        <span className="text-sm text-text-secondary">{label}</span>
                      </div>
                      <ArrowUpRight size={14} className="text-text-dim group-hover:text-accent transition-colors duration-300" />
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
