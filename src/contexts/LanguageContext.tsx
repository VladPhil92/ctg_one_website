'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Locale, translatePhrase } from '@/i18n/translations';
import { translateExtendedPhrase } from '@/i18n/extendedTranslations';
import { translateContentPhrase } from '@/i18n/contentTranslations';
import { translateInvestmentEconomicsPhrase } from '@/i18n/investmentEconomicsTranslations';
import { translateCommandCenterPhrase } from '@/i18n/commandCenterTranslations';

type LanguageContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
  t: (value: string) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);
const STORAGE_KEY = 'ctg-one-language';
const COOKIE_KEY = 'ctg_locale';

function translateValue(value: string, locale: Locale) {
  const primary = translatePhrase(value, locale);
  if (primary !== value) return primary;
  const extended = translateExtendedPhrase(value, locale);
  if (extended !== value) return extended;
  const investmentEconomics = translateInvestmentEconomicsPhrase(value, locale);
  if (investmentEconomics !== value) return investmentEconomics;
  const commandCenter = translateCommandCenterPhrase(value, locale);
  if (commandCenter !== value) return commandCenter;
  return translateContentPhrase(value, locale);
}

function translateNode(node: Node, locale: Locale) {
  if (node.nodeType === Node.TEXT_NODE && node.textContent) {
    const parent = node.parentElement;
    if (parent?.closest('[data-no-translate]')) return;
    const translated = translateValue(node.textContent, locale);
    if (translated !== node.textContent) node.textContent = translated;
    return;
  }

  if (!(node instanceof HTMLElement) || node.closest('[data-no-translate]')) return;
  const attributes = ['placeholder', 'title', 'aria-label'] as const;
  attributes.forEach((attribute) => {
    const value = node.getAttribute(attribute);
    if (!value) return;
    const translated = translateValue(value, locale);
    if (translated !== value) node.setAttribute(attribute, translated);
  });
  node.childNodes.forEach((child) => translateNode(child, locale));
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const initial: Locale = stored === 'es' || stored === 'en'
      ? stored
      : navigator.language.toLowerCase().startsWith('es') ? 'es' : 'en';
    setLocaleState(initial);
    setReady(true);
  }, []);

  const setLocale = useCallback((nextLocale: Locale) => {
    setLocaleState(nextLocale);
    window.localStorage.setItem(STORAGE_KEY, nextLocale);
    document.cookie = `${COOKIE_KEY}=${nextLocale}; path=/; max-age=31536000; samesite=lax`;
  }, []);

  const toggleLocale = useCallback(() => setLocale(locale === 'en' ? 'es' : 'en'), [locale, setLocale]);
  const t = useCallback((value: string) => translateValue(value, locale), [locale]);

  useEffect(() => {
    if (!ready) return;
    document.documentElement.lang = locale === 'es' ? 'es-CO' : 'en';
    translateNode(document.body, locale);

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => translateNode(node, locale));
        if (mutation.type === 'characterData') translateNode(mutation.target, locale);
      }
    });
    observer.observe(document.body, { subtree: true, childList: true, characterData: true });
    return () => observer.disconnect();
  }, [locale, ready]);

  const value = useMemo(() => ({ locale, setLocale, toggleLocale, t }), [locale, setLocale, toggleLocale, t]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used inside LanguageProvider');
  return context;
}
