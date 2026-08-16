'use client';

import React from 'react';
import { Container } from '@/components/ui';
import { FadeInSection } from '@/components/ui/FadeInSection';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

export const AccountCtaSection: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const { locale } = useLanguage();

  if (isLoading) return null;

  const copy = locale === 'es'
    ? {
        returningTitle: 'Bienvenido de vuelta',
        returningDescription: 'Consulta tu saldo, tu estado de verificación y las funciones disponibles desde tu panel.',
        guestTitle: 'Crea tu cuenta en CTG One',
        guestDescription: 'Regístrate para verificar tu identidad, acceder a tu panel y utilizar las plataformas habilitadas del ecosistema CTG One.',
        accountButton: 'Ir a mi cuenta',
        createButton: 'Crear cuenta',
        signInButton: 'Iniciar sesión',
      }
    : {
        returningTitle: 'Welcome back',
        returningDescription: 'Review your balance, verification status, and available features from your dashboard.',
        guestTitle: 'Create your CTG One account',
        guestDescription: 'Register to verify your identity, access your dashboard, and use the enabled platforms across the CTG One ecosystem.',
        accountButton: 'Go to my account',
        createButton: 'Create account',
        signInButton: 'Sign in',
      };

  return (
    <section
      className="relative py-16 sm:py-20 md:py-24 overflow-hidden"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      <Container className="relative z-10">
        <FadeInSection>
          <div
            className="flex flex-col sm:flex-row items-center justify-between gap-6 p-8 sm:p-10 md:p-12 rounded-lg text-center sm:text-left"
            style={{
              backgroundColor: 'rgba(201, 169, 98, 0.05)',
              border: '1px solid var(--border-accent)',
            }}
          >
            <div>
              <h2 className="text-xl sm:text-2xl font-outfit font-semibold text-white mb-2">
                {isAuthenticated ? copy.returningTitle : copy.guestTitle}
              </h2>
              <p className="text-sm text-text-muted max-w-md">
                {isAuthenticated ? copy.returningDescription : copy.guestDescription}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 flex-shrink-0">
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
        </FadeInSection>
      </Container>
    </section>
  );
};
