'use client';

import React, { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ChevronDown, Menu, X } from 'lucide-react';
import Image from 'next/image';
import { PLATFORM_NAV_ITEMS, PRIMARY_NAV_ITEMS } from '@/lib/constants';
import { Button } from './ui/Button';
import { LanguageSwitcher } from './LanguageSwitcher';
import { AFTER_PRIMARY_NAVIGATION_ID, SkipLink } from './SkipLink';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import styles from '@/styles/CommandCenter.module.css';

const MOBILE_NAVIGATION_ID = 'mobile-navigation';
const PLATFORM_MENU_ID = 'platform-navigation';

export const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [platformsOpen, setPlatformsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const pathname = usePathname();
  const { isAuthenticated, isLoading } = useAuth();
  const { locale, t } = useLanguage();
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const firstMobileLinkRef = useRef<HTMLAnchorElement>(null);
  const platformRootRef = useRef<HTMLDivElement>(null);

  const primaryLabel = locale === 'es' ? 'Navegación principal' : 'Primary navigation';
  const mobileLabel = locale === 'es' ? 'Navegación móvil' : 'Mobile navigation';
  const logoLabel = locale === 'es' ? 'CTG One Technology, ir al inicio' : 'CTG One Technology, go to home';
  const openMenuLabel = locale === 'es' ? 'Abrir menú' : 'Open menu';
  const closeMenuLabel = locale === 'es' ? 'Cerrar menú' : 'Close menu';
  const platformsLabel = locale === 'es' ? 'Plataformas' : 'Platforms';
  const contentStartLabel = locale === 'es' ? 'Inicio del contenido' : 'Start of content';
  const isPlatformActive = PLATFORM_NAV_ITEMS.some((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 48);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (isOpen) {
        setIsOpen(false);
        menuButtonRef.current?.focus();
      }
      setPlatformsOpen(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (!platformsOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!platformRootRef.current?.contains(event.target as Node)) setPlatformsOpen(false);
    };
    window.addEventListener('pointerdown', handlePointerDown);
    return () => window.removeEventListener('pointerdown', handlePointerDown);
  }, [platformsOpen]);

  useEffect(() => {
    setIsOpen(false);
    setPlatformsOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusTimer = window.setTimeout(() => firstMobileLinkRef.current?.focus(), 30);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.clearTimeout(focusTimer);
    };
  }, [isOpen]);

  const desktopItemsBeforePlatforms = PRIMARY_NAV_ITEMS.slice(0, 4);
  const contactItem = PRIMARY_NAV_ITEMS[4];

  const navLinkClass = (active: boolean) =>
    `relative inline-flex min-h-11 items-center text-sm uppercase tracking-[0.105em] font-semibold transition-colors duration-200 ${
      active ? 'text-[#f1c75b]' : 'text-text-dim hover:text-white'
    }`;

  return (
    <>
      <SkipLink />
      <nav
        aria-label={primaryLabel}
        className="fixed left-0 right-0 top-0 z-50 px-2.5 pt-2.5 sm:px-4 sm:pt-4 lg:px-6"
      >
        <div
          className={`${styles.theme} ${styles.navFrame} ${isScrolled ? styles.navFrameScrolled : ''} mx-auto max-w-[1500px] px-4 sm:px-5 lg:px-7`}
        >
          <div className="relative z-10 flex min-h-[72px] items-center justify-between gap-5 lg:min-h-[78px]">
            <a href="/" className="z-10 flex min-h-12 shrink-0 items-center" aria-label={logoLabel}>
              <Image
                src="/images/logo/ctg-one-logo.png"
                alt=""
                width={196}
                height={48}
                priority
                className={`${styles.logoGlow} h-auto w-[132px] object-contain sm:w-[168px] 2xl:w-[188px]`}
              />
            </a>

            <div className="hidden min-w-0 flex-1 items-center justify-center gap-4 xl:flex 2xl:gap-7">
              {desktopItemsBeforePlatforms.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <a key={item.href} href={item.href} aria-current={isActive ? 'page' : undefined} className={navLinkClass(isActive)}>
                    {t(item.label)}
                    {isActive && (
                      <>
                        <span className="absolute -bottom-0.5 left-1/2 h-px w-full -translate-x-1/2 bg-gradient-to-r from-transparent via-[#f1c75b] to-transparent" aria-hidden="true" />
                        <span className="absolute -bottom-2 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-[#f1c75b] shadow-[0_0_12px_rgba(241,199,91,.8)]" aria-hidden="true" />
                      </>
                    )}
                  </a>
                );
              })}

              <div className="relative" ref={platformRootRef}>
                <button
                  type="button"
                  className={`${navLinkClass(isPlatformActive)} gap-1.5 bg-transparent`}
                  aria-expanded={platformsOpen}
                  aria-controls={PLATFORM_MENU_ID}
                  aria-haspopup="menu"
                  onClick={() => setPlatformsOpen((open) => !open)}
                >
                  {platformsLabel}
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${platformsOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                  {isPlatformActive && <span className="absolute -bottom-2 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-[#f1c75b] shadow-[0_0_12px_rgba(241,199,91,.8)]" aria-hidden="true" />}
                </button>

                {platformsOpen && (
                  <div
                    id={PLATFORM_MENU_ID}
                    role="menu"
                    aria-label={platformsLabel}
                    className="absolute left-1/2 top-[calc(100%+18px)] w-72 -translate-x-1/2 overflow-hidden rounded-2xl border border-[#d6ae56]/20 bg-[#050a10]/[.985] p-2.5 shadow-[0_30px_90px_rgba(0,0,0,.55)] backdrop-blur-2xl"
                  >
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#d6ae56]/[.055] via-transparent to-[#248cff]/[.035]" aria-hidden="true" />
                    {PLATFORM_NAV_ITEMS.map((item, index) => {
                      const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                      return (
                        <a
                          key={item.href}
                          href={item.href}
                          role="menuitem"
                          aria-current={active ? 'page' : undefined}
                          className={`relative flex min-h-11 items-center justify-between rounded-xl px-4 text-sm font-medium transition-colors ${active ? 'bg-[#d6ae56]/[.09] text-[#f1c75b]' : 'text-text-muted hover:bg-white/[.05] hover:text-white'}`}
                        >
                          <span>{t(item.label)}</span>
                          <span className="font-mono text-[9px] tracking-[.12em] text-text-dim">0{index + 1}</span>
                        </a>
                      );
                    })}
                  </div>
                )}
              </div>

              <a
                href={contactItem.href}
                aria-current={pathname === contactItem.href ? 'page' : undefined}
                className={navLinkClass(pathname === contactItem.href)}
              >
                {t(contactItem.label)}
              </a>
            </div>

            <div className="hidden shrink-0 items-center gap-3 xl:flex">
              <LanguageSwitcher compact />
              {!isLoading && (isAuthenticated ? (
                <Button href="/dashboard" variant="primary" size="sm" className="rounded-xl border border-[#ffd56a]/25 bg-[#d6ae56] shadow-[0_0_28px_rgba(214,174,86,.12)] hover:-translate-y-px">
                  {t('My Account')}
                </Button>
              ) : (
                <>
                  <a
                    href="/iniciar-sesion"
                    className="inline-flex min-h-11 items-center whitespace-nowrap px-2 text-sm font-semibold uppercase tracking-[0.1em] text-text-dim hover:text-white"
                  >
                    {t('Sign In')}
                  </a>
                  <Button href="/registro" variant="primary" size="sm" className="rounded-xl border border-[#ffd56a]/20 bg-[#d6ae56] hover:-translate-y-px">
                    {t('Create Account')}
                  </Button>
                </>
              ))}
            </div>

            <div className="z-50 flex items-center gap-2 xl:hidden">
              <LanguageSwitcher compact />
              <button
                ref={menuButtonRef}
                type="button"
                onClick={() => setIsOpen((open) => !open)}
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#d6ae56]/20 bg-[#050a10]/80 shadow-[inset_0_1px_0_rgba(255,255,255,.04)]"
                aria-label={isOpen ? closeMenuLabel : openMenuLabel}
                aria-expanded={isOpen}
                aria-controls={MOBILE_NAVIGATION_ID}
              >
                {isOpen ? <X size={21} className="text-white" aria-hidden="true" /> : <Menu size={21} className="text-text-secondary" aria-hidden="true" />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div id={AFTER_PRIMARY_NAVIGATION_ID} tabIndex={-1} className="h-0 w-full overflow-hidden">
        <span className="sr-only">{contentStartLabel}</span>
      </div>

      {isOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm xl:hidden"
            onClick={() => setIsOpen(false)}
            aria-label={closeMenuLabel}
          />
          <div
            id={MOBILE_NAVIGATION_ID}
            role="dialog"
            aria-modal="true"
            aria-label={mobileLabel}
            className={`${styles.theme} fixed bottom-0 right-0 top-0 z-40 w-[88%] max-w-sm overflow-y-auto border-l border-[#d6ae56]/20 bg-[#050a10]/[.985] xl:hidden`}
          >
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#d6ae56]/[.05] via-transparent to-[#248cff]/[.035]" aria-hidden="true" />
            <div className="relative flex min-h-full flex-col px-6 pb-8 pt-28 sm:px-8 sm:pt-32">
              <div className="mb-7 border-b border-white/[.07] pb-6">
                <Image src="/images/logo/ctg-one-logo.png" alt="" width={196} height={48} className="h-auto w-[168px] object-contain" />
              </div>
              <div aria-label={mobileLabel} className="flex-1">
                <div className="space-y-1">
                  {PRIMARY_NAV_ITEMS.map((item, index) => {
                    const active = pathname === item.href;
                    return (
                      <a
                        key={item.href}
                        ref={index === 0 ? firstMobileLinkRef : undefined}
                        href={item.href}
                        aria-current={active ? 'page' : undefined}
                        onClick={() => setIsOpen(false)}
                        className={`flex min-h-11 items-center justify-between rounded-xl px-3 text-sm font-semibold uppercase tracking-[0.12em] ${active ? 'bg-[#d6ae56]/[.08] text-[#f1c75b]' : 'text-text-muted hover:bg-white/[.035] hover:text-white'}`}
                      >
                        <span>{t(item.label)}</span>
                        <span className="font-mono text-[9px] text-text-dim">0{index + 1}</span>
                      </a>
                    );
                  })}
                </div>

                <div className="mt-6 border-t border-white/[.08] pt-5">
                  <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#f1c75b]">{platformsLabel}</p>
                  <div className="space-y-1">
                    {PLATFORM_NAV_ITEMS.map((item) => {
                      const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                      return (
                        <a
                          key={item.href}
                          href={item.href}
                          aria-current={active ? 'page' : undefined}
                          onClick={() => setIsOpen(false)}
                          className={`flex min-h-11 items-center rounded-xl px-3 text-sm font-medium ${active ? 'bg-[#d6ae56]/[.07] text-[#f1c75b]' : 'text-text-muted hover:bg-white/[.035] hover:text-white'}`}
                        >
                          {t(item.label)}
                        </a>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="mt-8 space-y-3 border-t border-white/[.08] pt-6">
                {!isLoading && (isAuthenticated ? (
                  <Button href="/dashboard" variant="primary" size="md" fullWidth className="rounded-xl">{t('My Account')}</Button>
                ) : (
                  <>
                    <Button href="/registro" variant="primary" size="md" fullWidth className="rounded-xl">{t('Create Account')}</Button>
                    <a
                      href="/iniciar-sesion"
                      onClick={() => setIsOpen(false)}
                      className="flex min-h-11 items-center justify-center rounded-xl text-sm font-semibold uppercase tracking-[0.1em] text-text-muted hover:bg-white/[.03] hover:text-white"
                    >
                      {t('Sign In')}
                    </a>
                  </>
                ))}
              </div>
              <p className="pt-7 text-xs text-text-dim tracking-wide">© {new Date().getFullYear()} CTG One Technology</p>
            </div>
          </div>
        </>
      )}
    </>
  );
};
