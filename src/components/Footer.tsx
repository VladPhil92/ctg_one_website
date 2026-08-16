'use client';

import React from 'react';
import Image from 'next/image';
import { Container } from '@/components/ui';
import { FOOTER, CONTACT } from '@/data/content';
import { NAV_ITEMS } from '@/lib/constants';
import { useLanguage } from '@/contexts/LanguageContext';

const PLATFORM_LINKS = [
  { label: 'CTG Craft Beer Investment', href: '/inversion' },
  { label: 'Rewards', href: '/rewards' },
  { label: 'Token', href: '/token' },
];

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const { locale, t } = useLanguage();

  return (
    <footer
      className="relative py-12 sm:py-16 md:py-20 overflow-hidden"
      style={{
        backgroundColor: 'var(--bg-primary)',
        borderTop: '1px solid rgba(255, 255, 255, 0.03)',
      }}
    >
      <Container className="relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-5 gap-8 sm:gap-12 md:gap-16 mb-12 sm:mb-16 md:mb-20">
          <div className="col-span-2 lg:col-span-2">
            <a href="/" className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
              <div className="relative w-9 h-9 rounded-full overflow-hidden">
                <Image
                  src="/images/logo/CTGLOGO.jpeg"
                  alt="CTG One Logo"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-outfit font-medium text-white tracking-wide">CTG One</span>
                <span className="text-[9px] text-text-dim uppercase tracking-[0.2em]">Technology</span>
              </div>
            </a>
            <p className="text-sm text-text-dim leading-relaxed max-w-xs">{t(FOOTER.tagline)}</p>
          </div>

          <div>
            <h4 className="text-[10px] uppercase tracking-[0.2em] text-text-dim mb-6">
              {locale === 'es' ? 'Navegación' : 'Navigation'}
            </h4>
            <ul className="space-y-3">
              {NAV_ITEMS.map((item) => (
                <li key={item.href}>
                  <a href={item.href} className="text-sm text-text-muted hover:text-white transition-colors duration-500">
                    {t(item.label)}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-[10px] uppercase tracking-[0.2em] text-text-dim mb-6">
              {locale === 'es' ? 'Plataformas' : 'Platforms'}
            </h4>
            <ul className="space-y-3">
              {PLATFORM_LINKS.map((link) => (
                <li key={link.href}>
                  <a href={link.href} className="text-sm text-text-muted hover:text-white transition-colors duration-500">
                    {t(link.label)}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-[10px] uppercase tracking-[0.2em] text-text-dim mb-6">Legal</h4>
            <ul className="space-y-3">
              <li>
                <a href="/privacidad" className="text-sm text-text-muted hover:text-white transition-colors duration-500">
                  {t('Privacy Policy')}
                </a>
              </li>
              <li>
                <a href="/inversion/legal" className="text-sm text-text-muted hover:text-white transition-colors duration-500">
                  {locale === 'es' ? 'Información legal de inversión' : 'Investment legal information'}
                </a>
              </li>
              <li>
                <a href="/inversion/riesgos" className="text-sm text-text-muted hover:text-white transition-colors duration-500">
                  {locale === 'es' ? 'Riesgos de inversión' : 'Investment risks'}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div
          className="pt-8 sm:pt-10 flex flex-col md:flex-row justify-between items-center gap-4 sm:gap-6"
          style={{ borderTop: '1px solid rgba(255, 255, 255, 0.03)' }}
        >
          <p className="text-[10px] sm:text-[11px] text-text-dim tracking-wide">
            © {currentYear} CTG One Technology
          </p>
          <a
            href="/contact"
            className="text-[10px] sm:text-[11px] text-text-dim hover:text-text-muted transition-colors duration-500 tracking-wide"
          >
            {t('Contact')}
          </a>
          <p className="text-[10px] sm:text-[11px] text-text-dim tracking-wide text-center md:text-right">
            {CONTACT.location}
          </p>
        </div>
      </Container>
    </footer>
  );
};
