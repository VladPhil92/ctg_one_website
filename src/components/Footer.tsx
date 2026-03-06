'use client';

import React from 'react';
import { Container } from '@/components/ui';
import { FOOTER, NAV_ITEMS, CONTACT } from '@/data/content';
import Image from 'next/image';

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      className="relative py-12 sm:py-16 md:py-20 overflow-hidden"
      style={{
        backgroundColor: 'var(--bg-primary)',
        borderTop: '1px solid rgba(255, 255, 255, 0.03)',
      }}
    >
      <Container className="relative z-10">
        {/* Main Footer Content */}
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-5 gap-8 sm:gap-12 md:gap-16 mb-12 sm:mb-16 md:mb-20">
          {/* Brand Column */}
          <div className="col-span-2 lg:col-span-2">
            <a href="#home" className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
              <div className="relative w-9 h-9 rounded-full overflow-hidden">
                <Image
                  src="/images/logo/CTGLOGO.jpeg"
                  alt="CTG One Logo"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-outfit font-medium text-white tracking-wide">
                  CTG One
                </span>
                <span className="text-[9px] text-text-dim uppercase tracking-[0.2em]">
                  Corporation
                </span>
              </div>
            </a>
            <p className="text-sm text-text-dim leading-relaxed max-w-xs">
              {FOOTER.tagline}
            </p>
          </div>

          {/* Navigation Links */}
          <div>
            <h4 className="text-[10px] uppercase tracking-[0.2em] text-text-dim mb-6">
              Navigation
            </h4>
            <ul className="space-y-3">
              {NAV_ITEMS.map((item) => (
                <li key={item.label}>
                  <a
                    href={item.href}
                    className="text-sm text-text-muted hover:text-white transition-colors duration-500"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h4 className="text-[10px] uppercase tracking-[0.2em] text-text-dim mb-6">
              Company
            </h4>
            <ul className="space-y-3">
              {FOOTER.links.company.map((link) => (
                <li key={link}>
                  <a
                    href="#"
                    className="text-sm text-text-muted hover:text-white transition-colors duration-500"
                  >
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources Links */}
          <div>
            <h4 className="text-[10px] uppercase tracking-[0.2em] text-text-dim mb-6">
              Resources
            </h4>
            <ul className="space-y-3">
              {FOOTER.links.resources.map((link) => (
                <li key={link}>
                  <a
                    href="#"
                    className="text-sm text-text-muted hover:text-white transition-colors duration-500"
                  >
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

          {/* Bottom Bar */}
        <div
          className="pt-8 sm:pt-10 flex flex-col md:flex-row justify-between items-center gap-4 sm:gap-6"
          style={{ borderTop: '1px solid rgba(255, 255, 255, 0.03)' }}
        >
          <p className="text-[10px] sm:text-[11px] text-text-dim tracking-wide">
            © {currentYear} CTG One Corporation
          </p>
          <div className="flex items-center gap-6 sm:gap-10">
            <a
              href="/privacidad"
              className="text-[10px] sm:text-[11px] text-text-dim hover:text-text-muted transition-colors duration-500 tracking-wide"
            >
              Privacy Policy
            </a>
            <a
              href="#"
              className="text-[10px] sm:text-[11px] text-text-dim hover:text-text-muted transition-colors duration-500 tracking-wide"
            >
              Terms of Service
            </a>
            <a
              href="#"
              className="text-[10px] sm:text-[11px] text-text-dim hover:text-text-muted transition-colors duration-500 tracking-wide"
            >
              Cookie Policy
            </a>
          </div>
          <p className="text-[10px] sm:text-[11px] text-text-dim tracking-wide text-center md:text-right">
            {CONTACT.location}
          </p>
        </div>
      </Container>
    </footer>
  );
};
