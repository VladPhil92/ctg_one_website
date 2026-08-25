'use client';

import React from 'react';
import { Container } from '@/components/ui';
import { FadeInSection } from '@/components/ui/FadeInSection';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { CONTACT } from '@/data/content';
import { useLanguage } from '@/contexts/LanguageContext';
import { Mail, Phone, MapPin, Share2, Building2, MessageCircle } from 'lucide-react';

const socialIcons: Record<string, React.ReactNode> = {
  twitter: <Share2 size={16} strokeWidth={1.5} />,
  linkedin: <Building2 size={16} strokeWidth={1.5} />,
  telegram: <MessageCircle size={16} strokeWidth={1.5} />,
};

export const ContactSection: React.FC = () => {
  const { locale } = useLanguage();
  const es = locale === 'es';

  const copy = es
    ? {
        badge: 'Contacto', title: 'Tecnología para', titleHighlight: 'operaciones reales',
        description: 'Así construimos y operamos tecnología en nuestros negocios, y en qué punto está nuestro trabajo de IA.',
        emailLabel: 'Correo', phoneLabel: 'Teléfono', locationLabel: 'Ubicación',
        ctaTitle: '¿Tienes un proyecto o una pregunta?',
        ctaText: 'Escríbenos y te respondemos directamente.',
        ctaButton: 'Escríbenos',
      }
    : {
        badge: CONTACT.badge, title: CONTACT.title, titleHighlight: CONTACT.titleHighlight,
        description: CONTACT.description,
        emailLabel: 'Email', phoneLabel: 'Phone', locationLabel: 'Location',
        ctaTitle: 'Have a project or a question?',
        ctaText: "Send us a message and we'll get back to you directly.",
        ctaButton: 'Send us a message',
      };

  return (
    <section
      id="contact"
      className="relative py-24 md:py-32 lg:py-40 overflow-hidden"
      style={{ backgroundColor: 'var(--bg-secondary)' }}
    >
      <Container className="relative z-10">
        <div className="max-w-2xl mx-auto">
          <FadeInSection>
            <div className="text-center mb-16 md:mb-20">
              <Badge variant="accent" className="mb-8">{copy.badge}</Badge>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-outfit font-semibold mb-5 tracking-tight">
                {copy.title}{' '}<span className="text-accent">{copy.titleHighlight}</span>
              </h2>
              <p className="text-sm md:text-base text-text-muted leading-relaxed max-w-md mx-auto px-4">{copy.description}</p>
            </div>
          </FadeInSection>

          <FadeInSection delay={0.1}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-6 mb-16 md:mb-20 py-10 md:py-12" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.04)', borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
              <div className="flex flex-col items-center text-center">
                <Mail size={20} className="text-accent mb-4" strokeWidth={1.5} />
                <h3 className="text-[11px] uppercase tracking-[0.15em] text-text-dim mb-3 font-medium">{copy.emailLabel}</h3>
                <a href={`mailto:${CONTACT.email}`} className="text-[13px] md:text-sm text-text-secondary hover:text-white transition-colors duration-500 break-all">{CONTACT.email}</a>
              </div>
              <div className="flex flex-col items-center text-center">
                <Phone size={20} className="text-accent mb-4" strokeWidth={1.5} />
                <h3 className="text-[11px] uppercase tracking-[0.15em] text-text-dim mb-3 font-medium">{copy.phoneLabel}</h3>
                <a href={`tel:${CONTACT.phone}`} className="text-[13px] md:text-sm text-text-secondary hover:text-white transition-colors duration-500">{CONTACT.phone}</a>
              </div>
              <div className="flex flex-col items-center text-center">
                <MapPin size={20} className="text-accent mb-4" strokeWidth={1.5} />
                <h3 className="text-[11px] uppercase tracking-[0.15em] text-text-dim mb-3 font-medium">{copy.locationLabel}</h3>
                <p className="text-[13px] md:text-sm text-text-secondary">{CONTACT.location}</p>
              </div>
            </div>
          </FadeInSection>

          <FadeInSection delay={0.2}>
            <div className="text-center mb-12 md:mb-16">
              <h3 className="text-sm md:text-base font-outfit font-medium text-white mb-3">{copy.ctaTitle}</h3>
              <p className="text-[13px] md:text-sm text-text-muted mb-8 px-4">{copy.ctaText}</p>
              <Button href={`mailto:${CONTACT.email}`} variant="primary" size="md">{copy.ctaButton}</Button>
            </div>
          </FadeInSection>

          <FadeInSection delay={0.3}>
            <div className="flex justify-center gap-8">
              {CONTACT.socials.map((social) => (
                <a key={social.name} href={social.url} target="_blank" rel="noopener noreferrer" className="text-text-dim hover:text-accent transition-colors duration-500" aria-label={social.name}>
                  {socialIcons[social.icon]}
                </a>
              ))}
            </div>
          </FadeInSection>
        </div>
      </Container>
    </section>
  );
};
