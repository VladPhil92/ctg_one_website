'use client';

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

export const InvestmentFooter: React.FC = () => {
  const { locale } = useLanguage();
  const isEs = locale === 'es';

  return (
    <footer
      className="py-12 px-6 sm:px-8 lg:px-12"
      style={{ borderTop: '1px solid rgba(255, 255, 255, 0.04)' }}
    >
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
        <div>
          <p className="text-sm font-outfit font-medium text-white">
            CTG Craft Beer <span className="text-accent">{isEs ? 'Inversión' : 'Investment'}</span>
          </p>
          <p className="text-[11px] text-text-dim mt-1">
            {isEs
              ? 'Un programa de Cervecería Cartagena S.A.S., dentro del ecosistema CTG One.'
              : 'A Cervecería Cartagena S.A.S. program within the CTG One ecosystem.'}
          </p>
        </div>
        <div className="flex items-center gap-6 text-[11px] uppercase tracking-[0.15em] text-text-dim">
          <a href="/inversion/riesgos" className="hover:text-text-muted transition-colors">
            {isEs ? 'Riesgos' : 'Risks'}
          </a>
          <a href="/inversion/legal" className="hover:text-text-muted transition-colors">Legal</a>
          <a href="/" className="hover:text-text-muted transition-colors">ctgone.com</a>
        </div>
      </div>
      <p className="max-w-6xl mx-auto mt-8 text-[11px] text-text-dim leading-relaxed">
        {isEs
          ? 'La participación en CTG Craft Beer Inversión no constituye la adquisición de acciones ni de ningún instrumento de patrimonio de Cervecería Cartagena S.A.S. Los valores proyectados son estimados y no constituyen una rentabilidad garantizada.'
          : 'Participation in CTG Craft Beer Investment does not constitute the acquisition of shares or any equity instrument of Cervecería Cartagena S.A.S. Projected values are estimates and do not constitute guaranteed returns.'}{' '}
        © {new Date().getFullYear()} CTG One Technology.
      </p>
    </footer>
  );
};
