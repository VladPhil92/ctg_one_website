'use client';

import React from 'react';
import { Container } from '@/components/ui';
import { FadeInSection } from '@/components/ui/FadeInSection';
import { ABOUT, SERVICES, ECOSYSTEM, REWARDS, TOKEN, CONTACT } from '@/data/content';
import { Eye, Cpu, Network, Award, Wallet, Mail, ArrowRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const ITEMS = [
  { href: '/about', badge: ABOUT.badge, title: ABOUT.title, titleHighlight: ABOUT.titleHighlight, description: ABOUT.description, icon: <Eye size={20} strokeWidth={1.5} /> },
  { href: '/services', badge: SERVICES.badge, title: SERVICES.title, titleHighlight: SERVICES.titleHighlight, description: SERVICES.description, icon: <Cpu size={20} strokeWidth={1.5} /> },
  { href: '/ecosystem', badge: ECOSYSTEM.badge, title: ECOSYSTEM.title, titleHighlight: ECOSYSTEM.titleHighlight, description: ECOSYSTEM.description, icon: <Network size={20} strokeWidth={1.5} /> },
  { href: '/rewards', badge: REWARDS.badge, title: REWARDS.title, titleHighlight: REWARDS.titleHighlight, description: REWARDS.description, icon: <Award size={20} strokeWidth={1.5} /> },
  { href: '/token', badge: TOKEN.badge, title: TOKEN.title, titleHighlight: TOKEN.titleHighlight, description: TOKEN.description, icon: <Wallet size={20} strokeWidth={1.5} /> },
  { href: '/contact', badge: CONTACT.badge, title: CONTACT.title, titleHighlight: CONTACT.titleHighlight, description: CONTACT.description, icon: <Mail size={20} strokeWidth={1.5} /> },
];

export const HomeOverviewSection: React.FC = () => {
  const { t } = useLanguage();

  return (
    <section
      className="relative py-20 sm:py-28 md:py-32 lg:py-40 overflow-hidden"
      style={{ backgroundColor: 'var(--bg-secondary)' }}
    >
      <Container className="relative z-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-white/[0.02] rounded-lg overflow-hidden">
          {ITEMS.map((item, index) => (
            <FadeInSection key={item.href} delay={0.05 + index * 0.05}>
              <a
                href={item.href}
                className="group block p-6 sm:p-8 md:p-10 bg-bg-secondary hover:bg-white/[0.01] transition-colors duration-500 h-full"
              >
                <span className="text-accent mb-4 sm:mb-5 block">{item.icon}</span>
                <span className="block text-[9px] uppercase tracking-[0.18em] text-text-dim mb-2">
                  {t(item.badge)}
                </span>
                <h3 className="text-[13px] sm:text-sm md:text-base font-outfit font-medium text-white mb-2 sm:mb-3">
                  {t(item.title)} {t(item.titleHighlight)}
                </h3>
                <p className="text-[12px] sm:text-[13px] md:text-sm text-text-muted leading-relaxed mb-4 line-clamp-3">
                  {t(item.description)}
                </p>
                <span className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.15em] text-accent">
                  {t('See more')}
                  <ArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-1" />
                </span>
              </a>
            </FadeInSection>
          ))}
        </div>
      </Container>
    </section>
  );
};
