'use client';

import React from 'react';
import Image from 'next/image';
import { Container } from '@/components/ui';
import { FadeInSection } from '@/components/ui/FadeInSection';
import { Badge } from '@/components/ui/Badge';
import { BlockchainNetwork } from '../BlockchainNetwork';
import { useLanguage } from '@/contexts/LanguageContext';
import { Check, CircleDashed, ShieldCheck } from 'lucide-react';

export const TokenSection: React.FC = () => {
  const { locale } = useLanguage();
  const es = locale === 'es';

  const copy = es
    ? {
        badge: 'CTGO · Estrategia Web3',
        title: 'Una capa de utilidad en',
        highlight: 'fase de desarrollo.',
        description:
          'CTGO forma parte de la visión fintech y Web3 de CTG One. En esta etapa lo presentamos como una arquitectura de utilidad en desarrollo, no como un activo con métricas públicas on-chain verificadas. No publicamos cifras de holders, precio, APY, TVL ni direcciones de contrato mientras no exista evidencia productiva verificable.',
        status: 'Estado',
        statusValue: 'En desarrollo',
        network: 'Red productiva',
        networkValue: 'No publicada',
        sale: 'Venta pública',
        saleValue: 'No activa',
        evidence: 'Criterio de evidencia',
        evidenceValue: 'Solo datos verificables',
        utilityTitle: 'Utilidades diseñadas',
        utilityIntro: 'Estas funciones describen el modelo objetivo y no implican que todas estén activas actualmente.',
        utilities: [
          'Pagos y transacciones entre unidades del ecosistema.',
          'Beneficios y reconocimientos vinculados a productos y servicios.',
          'Integración potencial con CTG Rewards y experiencias digitales.',
          'Participación en mecanismos de utilidad que deberán documentarse antes de producción.',
        ],
        verificationTitle: 'Transparencia antes que marketing',
        verificationText:
          'Cuando exista un despliegue productivo, esta sección deberá publicar red, dirección de contrato, mecanismo de emisión, utilidades activas, auditorías aplicables y enlaces verificables a exploradores on-chain. Hasta entonces, CTGO permanece identificado como roadmap tecnológico.',
        roadmap: 'ROADMAP',
      }
    : {
        badge: 'CTGO · Web3 Strategy',
        title: 'A utility layer currently',
        highlight: 'in development.',
        description:
          'CTGO is part of CTG One’s fintech and Web3 vision. At this stage it is presented as a utility architecture in development, not as an asset with verified public on-chain metrics. We do not publish holder counts, price, APY, TVL, or contract addresses until production evidence can be independently verified.',
        status: 'Status',
        statusValue: 'In development',
        network: 'Production network',
        networkValue: 'Not published',
        sale: 'Public sale',
        saleValue: 'Not active',
        evidence: 'Evidence standard',
        evidenceValue: 'Verified data only',
        utilityTitle: 'Designed utilities',
        utilityIntro: 'These functions describe the target model and do not imply that every capability is active today.',
        utilities: [
          'Payments and transactions across ecosystem business units.',
          'Benefits and recognition connected to products and services.',
          'Potential integration with CTG Rewards and digital experiences.',
          'Participation in utility mechanisms that must be documented before production.',
        ],
        verificationTitle: 'Transparency before marketing',
        verificationText:
          'Once a production deployment exists, this section must publish the network, contract address, issuance mechanics, active utilities, applicable audits, and independently verifiable explorer links. Until then, CTGO remains explicitly identified as a technology roadmap.',
        roadmap: 'ROADMAP',
      };

  const statusItems = [
    [copy.status, copy.statusValue],
    [copy.network, copy.networkValue],
    [copy.sale, copy.saleValue],
    [copy.evidence, copy.evidenceValue],
  ];

  return (
    <section id="token" className="relative py-20 sm:py-28 md:py-32 lg:py-40 overflow-hidden bg-bg-primary">
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute -top-40 right-[-12%] w-[720px] h-[720px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(212,162,89,0.07), transparent 68%)' }} />
        <div className="absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-accent/10 to-transparent" />
      </div>

      <Container className="relative z-10">
        <FadeInSection>
          <div className="max-w-3xl mb-12 sm:mb-16">
            <Badge variant="accent" className="mb-6 sm:mb-8">{copy.badge}</Badge>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-outfit font-semibold mb-5 tracking-[-0.035em] leading-[1.05]">
              <span className="text-white">{copy.title}</span>{' '}
              <span className="text-accent">{copy.highlight}</span>
            </h2>
            <p className="text-sm sm:text-base text-text-muted leading-relaxed max-w-2xl">{copy.description}</p>
          </div>
        </FadeInSection>

        <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-10 lg:gap-16 items-center mb-16 sm:mb-20">
          <FadeInSection direction="left" delay={0.08}>
            <div className="relative flex justify-center">
              <div className="scale-75 sm:scale-90 origin-center opacity-90">
                <BlockchainNetwork size="lg" interactive />
              </div>
              <span className="absolute bottom-2 left-1/2 -translate-x-1/2 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-bg-primary/90 px-4 py-2 text-[9px] uppercase tracking-[0.2em] text-accent">
                <CircleDashed size={13} /> {copy.roadmap}
              </span>
            </div>
          </FadeInSection>

          <FadeInSection direction="right" delay={0.12}>
            <div className="grid sm:grid-cols-2 border border-white/[0.055] rounded-2xl overflow-hidden bg-white/[0.008]">
              {statusItems.map(([label, value], index) => (
                <div key={label} className={`relative p-6 sm:p-7 min-h-[138px] ${index % 2 ? 'sm:border-l' : ''} ${index > 1 ? 'border-t' : ''} border-white/[0.05]`}>
                  <span className="absolute top-4 right-4 text-[8px] tracking-[0.2em] text-accent/35">0{index + 1}</span>
                  <p className="text-[9px] uppercase tracking-[0.18em] text-text-dim mb-3">{label}</p>
                  <p className="font-outfit text-lg text-white">{value}</p>
                </div>
              ))}
            </div>
          </FadeInSection>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
          <FadeInSection direction="left">
            <div className="h-full p-7 sm:p-9 rounded-2xl border border-white/[0.05] bg-white/[0.008]">
              <h3 className="text-lg font-outfit font-medium text-white mb-2">{copy.utilityTitle}</h3>
              <p className="text-xs sm:text-sm text-text-dim leading-relaxed mb-7">{copy.utilityIntro}</p>
              <ul className="space-y-4">
                {copy.utilities.map((utility) => (
                  <li key={utility} className="flex items-start gap-3">
                    <Check size={15} className="text-accent mt-0.5 shrink-0" strokeWidth={1.5} />
                    <span className="text-xs sm:text-sm text-text-muted leading-relaxed">{utility}</span>
                  </li>
                ))}
              </ul>
            </div>
          </FadeInSection>

          <FadeInSection direction="right">
            <div className="h-full p-7 sm:p-9 rounded-2xl border border-accent/15 bg-accent/[0.025] relative overflow-hidden">
              <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full border border-accent/10" />
              <div className="w-11 h-11 rounded-full border border-accent/25 flex items-center justify-center text-accent mb-6">
                <ShieldCheck size={19} strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-outfit font-medium text-white mb-3">{copy.verificationTitle}</h3>
              <p className="text-xs sm:text-sm text-text-muted leading-relaxed">{copy.verificationText}</p>
            </div>
          </FadeInSection>
        </div>

        <FadeInSection delay={0.16}>
          <div className="grid grid-cols-3 gap-1 sm:gap-2 mt-16 max-w-2xl mx-auto opacity-75">
            {[
              '/images/token/file_000000000d5c71f58f3d2c236138f0b6.png',
              '/images/token/file_00000000782871f5b796d4bee7ec65b9.png',
              '/images/token/file_00000000818471f58dcdf9a124fb690f.png',
            ].map((src, index) => (
              <div key={src} className="relative aspect-square rounded overflow-hidden border border-white/[0.035]">
                <Image src={src} alt={`CTGO concept visual ${index + 1}`} fill sizes="(max-width: 640px) 30vw, 200px" className="object-cover" loading="lazy" />
              </div>
            ))}
          </div>
        </FadeInSection>
      </Container>
    </section>
  );
};
