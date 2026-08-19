'use client';

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

export function SkipLink() {
  const { locale } = useLanguage();
  return (
    <a href="#main-content" className="skip-link">
      {locale === 'es' ? 'Saltar al contenido' : 'Skip to content'}
    </a>
  );
}
