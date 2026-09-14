'use client';

import React from 'react';
import Link from 'next/link';
import { Container } from '@/components/ui';
import { FadeInSection } from '@/components/ui/FadeInSection';
import { Badge } from '@/components/ui/Badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { Award, Database, Gift, ShieldCheck } from 'lucide-react';

const iconMap: Record<string, React.ReactNode> = {
  award: <Award size={22} strokeWidth={1.5} />,
  database: <Database size={22} strokeWidth={1.5} />,
  gift: <Gift size={22} strokeWidth={1.5} />,
  shield: <ShieldCheck size={22} strokeWidth={1.5} />,
};

export const RewardsSection: React.FC = () => {
  const { locale } = useLanguage();
  const es = locale === 'es';

  const copy = es
    ? {
        badge: 'CTG Rewards · Foundation v1 · En desarrollo',
        title: 'CTG',
        highlight: 'Rewards',
        description:
          'Ya construimos la base técnica de CTG Rewards: una cuenta de puntos off-chain por identidad CTG One y un historial auditable. El programa comercial todavía no está activo: aún no hay reglas publicadas para acumular, redimir, referir usuarios ni convertir puntos a CTGO.',
        features: [
          {
            title: 'Cuenta Rewards',
            description: 'Infraestructura autenticada vinculada a tu identidad CTG One, separada de Wallet, COP y CTGO.',
            icon: 'award',
            status: 'Foundation disponible',
          },
          {
            title: 'Ledger auditable',
            description: 'La arquitectura registra movimientos como entradas inmutables; no reconstruye ni inventa recompensas históricas.',
            icon: 'database',
            status: 'Foundation disponible',
          },
          {
            title: 'Acumulación y referidos',
            description: 'Las reglas comerciales deberán publicarse y aprobarse antes de que una interacción pueda generar puntos.',
            icon: 'shield',
            status: 'Todavía no activo',
          },
          {
            title: 'Redención entre unidades',
            description: 'La utilidad cruzada entre negocios sigue siendo una meta. Foundation v1 no habilita canjes ni valor monetario.',
            icon: 'gift',
            status: 'Todavía no activo',
          },
        ],
        accountCta: 'Abrir mi cuenta Rewards',
        accountNote: 'Requiere una cuenta CTG One. Si aún no tienes una, el acceso te llevará al inicio de sesión.',
      }
    : {
        badge: 'CTG Rewards · Foundation v1 · In development',
        title: 'CTG',
        highlight: 'Rewards',
        description:
          'We have built the technical foundation for CTG Rewards: one off-chain points account per CTG One identity and an auditable history. The commercial program is not active yet: there are no published rules for earning, redeeming, referrals, or CTGO conversion.',
        features: [
          {
            title: 'Rewards account',
            description: 'Authenticated infrastructure linked to your CTG One identity and separated from Wallet, fiat balances, and CTGO.',
            icon: 'award',
            status: 'Foundation available',
          },
          {
            title: 'Auditable ledger',
            description: 'The architecture records real movements as immutable entries; it does not fabricate historical rewards.',
            icon: 'database',
            status: 'Foundation available',
          },
          {
            title: 'Earning and referrals',
            description: 'Commercial rules must be approved and published before interactions can generate points.',
            icon: 'shield',
            status: 'Not active yet',
          },
          {
            title: 'Cross-unit redemption',
            description: 'Cross-business utility remains a goal. Foundation v1 does not enable redemption or monetary value.',
            icon: 'gift',
            status: 'Not active yet',
          },
        ],
        accountCta: 'Open my Rewards account',
        accountNote: 'Requires a CTG One account. If needed, access will continue through sign in.',
      };

  return (
    <section
      id="rewards"
      className="relative py-20 sm:py-28 md:py-32 lg:py-40 overflow-hidden"
      style={{ backgroundColor: 'var(--bg-secondary)' }}
    >
      <Container className="relative z-10">
        <FadeInSection>
          <div className="max-w-2xl mb-12 sm:mb-16 md:mb-20">
            <Badge variant="accent" className="mb-6 sm:mb-8">
              {copy.badge}
            </Badge>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-outfit font-semibold mb-4 sm:mb-5 tracking-tight">
              {copy.title}{' '}
              <span className="text-accent">{copy.highlight}</span>
            </h2>
            <p className="text-[13px] sm:text-sm md:text-base text-text-muted leading-relaxed">
              {copy.description}
            </p>
          </div>
        </FadeInSection>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-white/[0.02] rounded-lg overflow-hidden">
          {copy.features.map((feature, index) => (
            <FadeInSection key={feature.title} delay={0.05 + index * 0.05}>
              <div className="p-6 sm:p-8 md:p-10 lg:p-12 bg-bg-secondary hover:bg-white/[0.01] transition-colors duration-500 h-full">
                <span className="text-accent mb-4 sm:mb-5 md:mb-6 block">
                  {iconMap[feature.icon]}
                </span>
                <p className="mb-2 text-[9px] font-semibold uppercase tracking-[.16em] text-white/35">{feature.status}</p>
                <h3 className="text-[13px] sm:text-sm md:text-base font-outfit font-medium text-white mb-2 sm:mb-3">
                  {feature.title}
                </h3>
                <p className="text-[12px] sm:text-[13px] md:text-sm text-text-muted leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </FadeInSection>
          ))}
        </div>

        <FadeInSection delay={0.25}>
          <div className="mt-10 flex flex-col items-start gap-3 rounded-2xl border border-white/[.07] bg-white/[.02] p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
            <div>
              <strong className="block text-sm font-outfit font-medium text-white">Foundation v1</strong>
              <p className="mt-1 max-w-xl text-[11px] leading-relaxed text-text-muted">{copy.accountNote}</p>
            </div>
            <Link
              href="/dashboard/rewards"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-accent/35 bg-accent/10 px-5 text-[10px] font-semibold uppercase tracking-[.12em] text-accent transition hover:bg-accent/15"
            >
              {copy.accountCta}
            </Link>
          </div>
        </FadeInSection>
      </Container>
    </section>
  );
};
