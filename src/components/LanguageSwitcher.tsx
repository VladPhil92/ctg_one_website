'use client';

import React from 'react';
import { Languages } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale } = useLanguage();
  const groupLabel = locale === 'es' ? 'Seleccionar idioma' : 'Select language';

  return (
    <fieldset
      className="m-0 inline-flex min-h-11 min-w-0 items-center rounded-full border border-white/10 bg-white/[0.025] p-0.5"
      aria-label={groupLabel}
      data-no-translate
    >
      {!compact && <Languages size={15} className="ml-3 mr-1 text-text-dim" aria-hidden="true" />}
      {(['es', 'en'] as const).map((item) => {
        const label = item === 'es'
          ? (locale === 'es' ? 'Español' : 'Spanish')
          : (locale === 'es' ? 'Inglés' : 'English');
        return (
          <button
            key={item}
            type="button"
            onClick={() => setLocale(item)}
            aria-label={label}
            aria-pressed={locale === item}
            className={`flex h-11 min-w-11 items-center justify-center rounded-full px-2.5 text-xs font-bold tracking-[0.1em] transition-colors duration-200 ${
              locale === item
                ? 'bg-accent text-black'
                : 'text-text-dim hover:bg-white/[.04] hover:text-white'
            }`}
          >
            {item.toUpperCase()}
          </button>
        );
      })}
    </fieldset>
  );
}
