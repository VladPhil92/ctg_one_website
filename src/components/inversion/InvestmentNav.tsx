'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';

const NAV_ITEMS = [
  { label: 'Lotes', href: '/inversion/lotes' },
  { label: 'Cómo funciona', href: '/inversion/como-funciona' },
  { label: 'Simulador', href: '/inversion/simulador' },
];

// Scoped nav for /inversion — deliberately separate from the main
// site's <Navbar/> (ADR-012, docs/investment/adr): it links back to the
// main site, but the investment section owns its own chrome so this
// initiative never has to touch the global Navbar component.
export const InvestmentNav: React.FC = () => {
  const pathname = usePathname();
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <nav
      className="sticky top-0 z-50 py-5"
      style={{
        backgroundColor: 'rgba(5, 5, 5, 0.9)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
      }}
    >
      <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-12 flex items-center justify-between gap-4">
        <a href="/inversion" className="flex flex-col leading-tight">
          <span className="text-sm font-outfit font-semibold text-white tracking-wide">
            CTG Craft Beer <span className="text-accent">Inversión</span>
          </span>
          <span className="text-[9px] text-text-dim uppercase tracking-[0.2em]">
            Cervecería Cartagena S.A.S.
          </span>
        </a>

        <div className="hidden md:flex items-center gap-8">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <a
                key={item.href}
                href={item.href}
                className={`text-[11px] uppercase tracking-[0.15em] font-medium transition-colors duration-500 ${
                  isActive ? 'text-white' : 'text-text-dim hover:text-text-muted'
                }`}
              >
                {item.label}
              </a>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          {!isLoading && (
            isAuthenticated ? (
              <Button href="/inversion/app" variant="primary" size="sm">
                Mi Panel
              </Button>
            ) : (
              <>
                <a
                  href="/iniciar-sesion?next=/inversion/app"
                  className="hidden sm:inline text-[11px] uppercase tracking-[0.15em] font-medium text-text-dim hover:text-text-muted transition-colors duration-500"
                >
                  Iniciar Sesión
                </a>
                <Button href="/registro?next=/inversion/app" variant="primary" size="sm">
                  Participar
                </Button>
              </>
            )
          )}
        </div>
      </div>
    </nav>
  );
};
