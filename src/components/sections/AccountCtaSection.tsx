'use client';

import React from 'react';
import { Container } from '@/components/ui';
import { FadeInSection } from '@/components/ui/FadeInSection';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';

export const AccountCtaSection: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return null;

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
                {isAuthenticated ? 'Bienvenido de vuelta' : 'Crea tu cuenta en CTG One'}
              </h2>
              <p className="text-sm text-text-muted max-w-md">
                {isAuthenticated
                  ? 'Ve tu saldo, tu estado de verificación y recarga tu cuenta desde tu dashboard.'
                  : 'Regístrate para recargar tu cuenta, verificar tu identidad y disfrutar los beneficios de CTG Rewards en todo el ecosistema.'}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 flex-shrink-0">
              {isAuthenticated ? (
                <Button href="/dashboard" variant="primary" size="md" arrow>
                  Ir a mi cuenta
                </Button>
              ) : (
                <>
                  <Button href="/registro" variant="primary" size="md" arrow>
                    Crear cuenta
                  </Button>
                  <Button href="/iniciar-sesion" variant="secondary" size="md">
                    Iniciar sesión
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
