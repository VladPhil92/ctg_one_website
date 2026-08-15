'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

const NAV_ITEMS = [
  { en: 'Batches', es: 'Lotes', href: '/inversion/lotes' },
  { en: 'How it works', es: 'Cómo funciona', href: '/inversion/como-funciona' },
  { en: 'Simulator', es: 'Simulador', href: '/inversion/simulador' },
];

export const InvestmentNav: React.FC = () => {
  const pathname = usePathname();
  const { isAuthenticated, isLoading } = useAuth();
  const { locale, t } = useLanguage();

  return (
    <nav className="sticky top-0 z-50 py-5" style={{ backgroundColor: 'rgba(5, 5, 5, 0.9)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
      <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-12 flex items-center justify-between gap-3">
        <a href="/inversion" className="flex flex-col leading-tight min-w-0">
          <span className="text-sm font-outfit font-semibold text-white tracking-wide whitespace-nowrap">
            CTG Craft Beer <span className="text-accent">{locale === 'es' ? 'Inversión' : 'Investment'}</span>
          </span>
          <span className="hidden sm:block text-[9px] text-text-dim uppercase tracking-[0.2em]">Cervecería Cartagena S.A.S.</span>
        </a>

        <div className="hidden md:flex items-center gap-8">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <a key={item.href} href={item.href} className={`text-[11px] uppercase tracking-[0.15em] font-medium transition-colors duration-500 ${isActive ? 'text-white' : 'text-text-dim hover:text-text-muted'}`}>
                {locale === 'es' ? item.es : item.en}
              </a>
            );
          })}
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <LanguageSwitcher compact />
          {!isLoading && (isAuthenticated ? (
            <Button href="/inversion/app" variant="primary" size="sm">{locale === 'es' ? 'Mi Panel' : 'My Dashboard'}</Button>
          ) : (
            <>
              <a href="/iniciar-sesion?next=/inversion/app" className="hidden lg:inline text-[11px] uppercase tracking-[0.15em] font-medium text-text-dim hover:text-text-muted transition-colors duration-500">
                {t('Sign In')}
              </a>
              <Button href="/registro?next=/inversion/app" variant="primary" size="sm">{t('Participate')}</Button>
            </>
          ))}
        </div>
      </div>
    </nav>
  );
};
