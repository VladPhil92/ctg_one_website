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
    const handleScroll = () => setIsScrolled(window.scrollY > 64);
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
    `relative inline-flex min-h-11 items-center text-sm uppercase tracking-[0.11em] font-semibold transition-colors duration-300 ${
      active ? 'text-white after:absolute after:bottom-1 after:left-0 after:right-0 after:h-px after:bg-accent/70' : 'text-text-dim hover:text-white'
    }`;

  return (
    <>
      <SkipLink />
      <nav
        aria-label={primaryLabel}
        className={`fixed left-0 right-0 top-0 z-50 transition-[padding,background-color,border-color,backdrop-filter] duration-300 ${isScrolled ? 'py-2.5' : 'py-4 sm:py-5'}`}
        style={{
          backgroundColor: isScrolled ? 'rgba(4, 6, 9, 0.95)' : 'rgba(4,6,9,0.54)',
          backdropFilter: isScrolled ? 'blur(24px) saturate(135%)' : 'blur(14px) saturate(120%)',
          WebkitBackdropFilter: isScrolled ? 'blur(24px) saturate(135%)' : 'blur(14px) saturate(120%)',
          borderBottom: isScrolled ? '1px solid rgba(212, 162, 89, 0.14)' : '1px solid rgba(255,255,255,0.045)',
          boxShadow: isScrolled ? '0 18px 55px rgba(0,0,0,.22)' : 'none',
        }}
      >
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-accent/25 to-transparent" aria-hidden="true" />
        <div className="mx-auto max-w-7xl px-5 sm:px-8 xl:px-10">
          <div className="flex items-center justify-between gap-8">
            <a href="/" className="z-10 flex min-h-12 shrink-0 items-center xl:mr-5" aria-label={logoLabel}>
              <div className="relative h-11 w-[142px] overflow-hidden rounded-xl border border-accent/15 bg-black/25 px-2 shadow-[inset_0_1px_0_rgba(255,255,255,.035),0_10px_35px_rgba(0,0,0,.2)] sm:w-[164px]">
                <div className="absolute inset-0 bg-gradient-to-r from-accent/[.055] via-transparent to-sky-300/[.025]" aria-hidden="true" />
                <Image
                  src="/images/logo/ctg-one-logo.png"
                  alt=""
                  fill
                  className="relative object-contain object-left p-1.5"
                  priority
                  sizes="164px"
                />
              </div>
            </a>

            <div className="hidden xl:flex min-w-0 flex-1 items-center justify-center gap-5 2xl:gap-7">
              {desktopItemsBeforePlatforms.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <a key={item.href} href={item.href} aria-current={isActive ? 'page' : undefined} className={navLinkClass(isActive)}>
                    {t(item.label)}
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
                </button>

                {platformsOpen && (
                  <div
                    id={PLATFORM_MENU_ID}
                    role="menu"
                    aria-label={platformsLabel}
                    className="absolute left-1/2 top-[calc(100%+12px)] w-72 -translate-x-1/2 overflow-hidden rounded-2xl border border-accent/15 bg-[#06080b]/[.985] p-2.5 shadow-[0_28px_80px_rgba(0,0,0,.48)] backdrop-blur-2xl"
                  >
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-accent/[.045] via-transparent to-sky-300/[.025]" aria-hidden="true" />
                    {PLATFORM_NAV_ITEMS.map((item) => {
                      const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                      return (
                        <a
                          key={item.href}
                          href={item.href}
                          role="menuitem"
                          aria-current={active ? 'page' : undefined}
                          className={`relative flex min-h-11 items-center rounded-xl px-4 text-sm font-medium transition-colors ${active ? 'bg-accent/[.09] text-accent' : 'text-text-muted hover:bg-white/[.05] hover:text-white'}`}
                        >
                          {t(item.label)}
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

            <div className="hidden xl:flex shrink-0 items-center gap-3">
              <LanguageSwitcher compact />
              {!isLoading && (isAuthenticated ? (
                <Button href="/dashboard" variant="primary" size="sm">{t('My Account')}</Button>
              ) : (
                <>
                  <a
                    href="/iniciar-sesion"
                    className="inline-flex min-h-11 items-center whitespace-nowrap px-2 text-sm font-semibold uppercase tracking-[0.1em] text-text-dim hover:text-white"
                  >
                    {t('Sign In')}
                  </a>
                  <Button href="/registro" variant="primary" size="sm">{t('Create Account')}</Button>
                </>
              ))}
            </div>

            <div className="z-50 flex items-center gap-2 xl:hidden">
              <LanguageSwitcher compact />
              <button
                ref={menuButtonRef}
                type="button"
                onClick={() => setIsOpen((open) => !open)}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-accent/15 bg-black/30 shadow-[inset_0_1px_0_rgba(255,255,255,.04)]"
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
            className="fixed bottom-0 right-0 top-0 z-40 w-[86%] max-w-sm overflow-y-auto border-l border-accent/15 bg-[#06080b]/[.985] xl:hidden"
          >
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-accent/[.045] via-transparent to-sky-300/[.02]" aria-hidden="true" />
            <div className="relative flex min-h-full flex-col px-6 pb-8 pt-24 sm:px-8 sm:pt-28">
              <nav aria-label={mobileLabel} className="flex-1">
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
                        className={`flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold uppercase tracking-[0.12em] ${active ? 'bg-accent/[.07] text-white' : 'text-text-muted hover:bg-white/[.035] hover:text-white'}`}
                      >
                        {t(item.label)}
                      </a>
                    );
                  })}
                </div>

                <div className="mt-6 border-t border-white/[.08] pt-5">
                  <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-[0.16em] text-accent">{platformsLabel}</p>
                  <div className="space-y-1">
                    {PLATFORM_NAV_ITEMS.map((item) => {
                      const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                      return (
                        <a
                          key={item.href}
                          href={item.href}
                          aria-current={active ? 'page' : undefined}
                          onClick={() => setIsOpen(false)}
                          className={`flex min-h-11 items-center rounded-lg px-3 text-sm font-medium ${active ? 'bg-accent/[.07] text-accent' : 'text-text-muted hover:bg-white/[.035] hover:text-white'}`}
                        >
                          {t(item.label)}
                        </a>
                      );
                    })}
                  </div>
                </div>
              </nav>

              <div className="mt-8 space-y-3 border-t border-white/[.08] pt-6">
                {!isLoading && (isAuthenticated ? (
                  <Button href="/dashboard" variant="primary" size="md" fullWidth>{t('My Account')}</Button>
                ) : (
                  <>
                    <Button href="/registro" variant="primary" size="md" fullWidth>{t('Create Account')}</Button>
                    <a
                      href="/iniciar-sesion"
                      onClick={() => setIsOpen(false)}
                      className="flex min-h-11 items-center justify-center rounded-lg text-sm font-semibold uppercase tracking-[0.1em] text-text-muted hover:bg-white/[.03] hover:text-white"
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