'use client';

import React from 'react';
import { Container } from '@/components/ui';
import { FadeInSection } from '@/components/ui/FadeInSection';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { CONTACT } from '@/data/content';
import { Mail, Phone, MapPin, Twitter, Linkedin, MessageCircle } from 'lucide-react';

const socialIcons: Record<string, React.ReactNode> = {
  twitter: <Twitter size={16} strokeWidth={1.5} />,
  linkedin: <Linkedin size={16} strokeWidth={1.5} />,
  telegram: <MessageCircle size={16} strokeWidth={1.5} />,
};

export const ContactSection: React.FC = () => {
  return (
    <section
      id="contact"
      className="relative py-24 md:py-32 lg:py-40 overflow-hidden"
      style={{ backgroundColor: 'var(--bg-secondary)' }}
    >
      <Container className="relative z-10">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <FadeInSection>
            <div className="text-center mb-16 md:mb-20">
              <Badge variant="accent" className="mb-8">
                {CONTACT.badge}
              </Badge>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-outfit font-semibold mb-5 tracking-tight">
                {CONTACT.title}{' '}
                <span className="text-accent">{CONTACT.titleHighlight}</span>
              </h2>
              <p className="text-sm md:text-base text-text-muted leading-relaxed max-w-md mx-auto px-4">
                {CONTACT.description}
              </p>
            </div>
          </FadeInSection>

          {/* Contact Info - Clean Grid */}
          <FadeInSection delay={0.1}>
            <div 
              className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-6 mb-16 md:mb-20 py-10 md:py-12"
              style={{ borderTop: '1px solid rgba(255, 255, 255, 0.04)', borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}
            >
              <div className="flex flex-col items-center text-center">
                <Mail size={20} className="text-accent mb-4" strokeWidth={1.5} />
                <h3 className="text-[11px] uppercase tracking-[0.15em] text-text-dim mb-3 font-medium">Email</h3>
                <a
                  href={`mailto:${CONTACT.email}`}
                  className="text-[13px] md:text-sm text-text-secondary hover:text-white transition-colors duration-500 break-all"
                >
                  {CONTACT.email}
                </a>
              </div>
              <div className="flex flex-col items-center text-center">
                <Phone size={20} className="text-accent mb-4" strokeWidth={1.5} />
                <h3 className="text-[11px] uppercase tracking-[0.15em] text-text-dim mb-3 font-medium">Phone</h3>
                <a
                  href={`tel:${CONTACT.phone}`}
                  className="text-[13px] md:text-sm text-text-secondary hover:text-white transition-colors duration-500"
                >
                  {CONTACT.phone}
                </a>
              </div>
              <div className="flex flex-col items-center text-center">
                <MapPin size={20} className="text-accent mb-4" strokeWidth={1.5} />
                <h3 className="text-[11px] uppercase tracking-[0.15em] text-text-dim mb-3 font-medium">Location</h3>
                <p className="text-[13px] md:text-sm text-text-secondary">
                  {CONTACT.location}
                </p>
              </div>
            </div>
          </FadeInSection>

          {/* CTA */}
          <FadeInSection delay={0.2}>
            <div className="text-center mb-12 md:mb-16">
              <h3 className="text-sm md:text-base font-outfit font-medium text-white mb-3">
                Ready to Transform Your Business?
              </h3>
              <p className="text-[13px] md:text-sm text-text-muted mb-8 px-4">
                Let&apos;s discuss how CTG One can help you achieve your goals.
              </p>
              <Button
                href={`mailto:${CONTACT.email}`}
                variant="primary"
                size="md"
              >
                Send Message
              </Button>
            </div>
          </FadeInSection>

          {/* Social Links */}
          <FadeInSection delay={0.3}>
            <div className="flex justify-center gap-8">
              {CONTACT.socials.map((social) => (
                <a
                  key={social.name}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-text-dim hover:text-accent transition-colors duration-500"
                  aria-label={social.name}
                >
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
