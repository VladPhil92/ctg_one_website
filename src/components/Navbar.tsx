'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import Image from 'next/image';
import { NAV_ITEMS } from '@/lib/constants';
import { Button } from './ui/Button';
import { LanguageSwitcher } from './LanguageSwitcher';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

export const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const pathname = usePathname();
  const { isAuthenticated, isLoading } = useAuth();
  const { t } = useLanguage();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 80);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-700 ${isScrolled ? 'py-4' : 'py-8'}`}
        style={{
          backgroundColor: isScrolled ? 'rgba(5, 5, 5, 0.9)' : 'transparent',
          backdropFilter: isScrolled ? 'blur(20px)' : 'none',
          WebkitBackdropFilter: isScrolled ? 'blur(20px)' : 'none',
          borderBottom: isScrolled ? '1px solid rgba(255, 255, 255, 0.03)' : 'none',
        }}
      >
        <div className="max-w-6xl mx-auto px-8 lg:px-12">
          <div className="flex items-center justify-between">
            <a href="/" className="flex items-center gap-4 z-10">
              <div className="relative w-10 h-10 rounded-full overflow-hidden">
                <Image src="/images/logo/CTGLOGO.jpeg" alt="CTG One Logo" fill className="object-cover" priority />
              </div>
              <div className="hidden sm:flex flex-col">
                <span className="text-sm font-outfit font-medium text-white tracking-wide">CTG One</span>
                <span className="text-[9px] text-text-dim uppercase tracking-[0.2em]">Technology</span>
              </div>
            </a>

            <div className="hidden lg:flex items-center gap-5 xl:gap-7">
              {NAV_ITEMS.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    className={`text-[11px] uppercase tracking-[0.15em] font-medium transition-colors duration-500 ${isActive ? 'text-white' : 'text-text-dim hover:text-text-muted'}`}
                  >
                    {t(item.label)}
                  </a>
                );
              })}
            </div>

            <div className="hidden lg:flex items-center gap-3">
              <LanguageSwitcher compact />
              {!isLoading && (isAuthenticated ? (
                <Button href="/dashboard" variant="primary" size="sm">{t('My Account')}</Button>
              ) : (
                <>
                  <a href="/iniciar-sesion" className="whitespace-nowrap text-[11px] uppercase tracking-[0.15em] font-medium text-text-dim hover:text-text-muted transition-colors duration-500">
                    {t('Sign In')}
                  </a>
                  <Button href="/registro" variant="primary" size="sm">{t('Create Account')}</Button>
                </>
              ))}
            </div>

            <div className="lg:hidden flex items-center gap-2 z-50">
              <LanguageSwitcher compact />
              <button onClick={() => setIsOpen(!isOpen)} className="p-2" aria-label={isOpen ? 'Close menu' : 'Open menu'}>
                {isOpen ? <X size={20} className="text-white" /> : <Menu size={20} className="text-text-muted" />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm lg:hidden" onClick={() => setIsOpen(false)} />
          <div className="fixed top-0 right-0 bottom-0 w-[80%] max-w-sm z-40 lg:hidden" style={{ backgroundColor: 'rgba(8, 8, 8, 0.98)', backdropFilter: 'blur(20px)', borderLeft: '1px solid rgba(255, 255, 255, 0.03)' }}>
            <div className="flex flex-col h-full pt-28 pb-10 px-8">
              <nav className="flex-1 space-y-2">
                {NAV_ITEMS.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <a key={item.href} href={item.href} onClick={() => setIsOpen(false)} className={`block py-4 text-[11px] uppercase tracking-[0.2em] font-medium transition-colors duration-500 ${isActive ? 'text-white' : 'text-text-dim hover:text-text-muted'}`}>
                      {t(item.label)}
                    </a>
                  );
                })}
              </nav>
              <div className="pt-8 border-t border-white/5 space-y-3">
                {!isLoading && (isAuthenticated ? (
                  <Button href="/dashboard" variant="primary" size="md" fullWidth>{t('My Account')}</Button>
                ) : (
                  <>
                    <Button href="/registro" variant="primary" size="md" fullWidth>{t('Create Account')}</Button>
                    <a href="/iniciar-sesion" onClick={() => setIsOpen(false)} className="block text-center py-2 text-[11px] uppercase tracking-[0.15em] font-medium text-text-dim hover:text-text-muted transition-colors duration-500">
                      {t('Sign In')}
                    </a>
                  </>
                ))}
              </div>
              <p className="pt-8 text-[10px] text-text-dim tracking-wider">© {new Date().getFullYear()} CTG One Technology</p>
            </div>
          </div>
        </>
      )}
    </>
  );
};
