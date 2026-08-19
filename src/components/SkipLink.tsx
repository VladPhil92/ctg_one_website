'use client';

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

export const AFTER_PRIMARY_NAVIGATION_ID = 'after-primary-navigation';

export function SkipLink() {
  const { locale } = useLanguage();
  return (
    <a href={`#${AFTER_PRIMARY_NAVIGATION_ID}`} className="skip-link">
      {locale === 'es' ? 'Saltar al contenido' : 'Skip to content'}
    </a>
  );
}
