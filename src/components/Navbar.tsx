'use client';

import React, { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import Image from 'next/image';
import { NAV_ITEMS, CONTACT_EMAIL } from '@/lib/constants';
import { Button } from './ui/Button';

export const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState('home');

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 80);

      const sections = NAV_ITEMS.map(item => item.href.slice(1));
      for (const section of sections.reverse()) {
        const element = document.getElementById(section);
        if (element) {
          const rect = element.getBoundingClientRect();
          if (rect.top <= 100) {
            setActiveSection(section);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-700 ${
          isScrolled ? 'py-4' : 'py-8'
        }`}
        style={{
          backgroundColor: isScrolled ? 'rgba(5, 5, 5, 0.9)' : 'transparent',
          backdropFilter: isScrolled ? 'blur(20px)' : 'none',
          WebkitBackdropFilter: isScrolled ? 'blur(20px)' : 'none',
          borderBottom: isScrolled ? '1px solid rgba(255, 255, 255, 0.03)' : 'none',
        }}
      >
        <div className="max-w-6xl mx-auto px-8 lg:px-12">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <a href="#home" className="flex items-center gap-4 z-10">
              <div className="relative w-10 h-10 rounded-full overflow-hidden">
                <Image
                  src="/images/logo/CTGLOGO.jpeg"
                  alt="CTG One Logo"
                  fill
                  className="object-cover"
                  priority
                />
              </div>
              <div className="hidden sm:flex flex-col">
                <span className="text-sm font-outfit font-medium text-white tracking-wide">
                  CTG One
                </span>
                <span className="text-[9px] text-text-dim uppercase tracking-[0.2em]">
                  Corporation
                </span>
              </div>
            </a>

            {/* Desktop Menu */}
            <div className="hidden lg:flex items-center gap-10">
              {NAV_ITEMS.map((item) => {
                const isActive = activeSection === item.href.slice(1);
                return (
                  <a
                    key={item.label}
                    href={item.href}
                    className={`text-[11px] uppercase tracking-[0.15em] font-medium transition-colors duration-500 ${
                      isActive ? 'text-white' : 'text-text-dim hover:text-text-muted'
                    }`}
                  >
                    {item.label}
                  </a>
                );
              })}
            </div>

            {/* Desktop CTA */}
            <div className="hidden lg:flex items-center">
              <Button
                href={`mailto:${CONTACT_EMAIL}`}
                variant="primary"
                size="sm"
              >
                Contact
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="lg:hidden relative z-50 p-2"
              aria-label="Toggle menu"
            >
              {isOpen ? (
                <X size={20} className="text-white" />
              ) : (
                <Menu size={20} className="text-text-muted" />
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm lg:hidden"
            onClick={() => setIsOpen(false)}
          />
          <div
            className="fixed top-0 right-0 bottom-0 w-[80%] max-w-sm z-40 lg:hidden"
            style={{
              backgroundColor: 'rgba(8, 8, 8, 0.98)',
              backdropFilter: 'blur(20px)',
              borderLeft: '1px solid rgba(255, 255, 255, 0.03)',
            }}
          >
            <div className="flex flex-col h-full pt-28 pb-10 px-8">
              <nav className="flex-1 space-y-2">
                {NAV_ITEMS.map((item) => {
                  const isActive = activeSection === item.href.slice(1);
                  return (
                    <a
                      key={item.label}
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className={`block py-4 text-[11px] uppercase tracking-[0.2em] font-medium transition-colors duration-500 ${
                        isActive ? 'text-white' : 'text-text-dim hover:text-text-muted'
                      }`}
                    >
                      {item.label}
                    </a>
                  );
                })}
              </nav>

              <div className="pt-8 border-t border-white/5">
                <Button
                  href={`mailto:${CONTACT_EMAIL}`}
                  variant="primary"
                  size="md"
                  fullWidth
                >
                  Contact
                </Button>
              </div>

              <p className="pt-8 text-[10px] text-text-dim tracking-wider">
                © 2024 CTG One Corporation
              </p>
            </div>
          </div>
        </>
      )}
    </>
  );
};
