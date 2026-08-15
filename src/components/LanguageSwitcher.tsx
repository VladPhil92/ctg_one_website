'use client';

import React from 'react';
import { Languages } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale } = useLanguage();

  return (
    <div
      className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.025] p-1"
      aria-label={locale === 'es' ? 'Seleccionar idioma' : 'Select language'}
      data-no-translate
    >
      {!compact && <Languages size={14} className="ml-2 mr-1 text-text-dim" aria-hidden="true" />}
      {(['es', 'en'] as const).map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => setLocale(item)}
          aria-pressed={locale === item}
          className={`rounded-full px-2.5 py-1.5 text-[10px] font-semibold tracking-[0.14em] transition-all duration-300 ${
            locale === item
              ? 'bg-accent text-black'
              : 'text-text-dim hover:text-white'
          }`}
        >
          {item.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
