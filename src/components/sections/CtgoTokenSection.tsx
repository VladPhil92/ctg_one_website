'use client';

import React from 'react';
import Image from 'next/image';
import { Container } from '@/components/ui';
import { FadeInSection } from '@/components/ui/FadeInSection';
import { Badge } from '@/components/ui/Badge';
import { BlockchainNetwork } from '../BlockchainNetwork';
import { useLanguage } from '@/contexts/LanguageContext';
import { Check, CircleDashed, ShieldCheck } from 'lucide-react';

export const CtgoTokenSection: React.FC = () => {
  const { locale } = useLanguage();
  const es = locale === 'es';

  const copy = es
    ? {
        badge: 'CTGO · En consolidación',
        title: 'Un token real, todavía',
        highlight: 'en consolidación.',
        description:
          'CTGO es la capa de utilidad cripto de CTG One. Su contrato ya fue desplegado en la red Polygon hace varios meses, con un grupo reducido de titulares iniciales. Antes de cualquier apertura o comunicación pública más amplia, estamos fortaleciendo su infraestructura: liquidez, verificación del contrato y revisión de seguridad.',
        status: 'Estado',
        statusValue: 'En consolidación',
        network: 'Red',
        networkValue: 'Polygon',
        audit: 'Auditoría de seguridad',
        auditValue: 'Pendiente',
        availability: 'Disponibilidad pública',
        availabilityValue: 'No abierta',
        phasesTitle: 'Fases de consolidación',
        phasesIntro: 'Este es el camino real hacia una presencia pública responsable — no todas las fases están completas.',
        phases: [
          { label: 'Despliegue del contrato', status: 'Completada', done: true },
          { label: 'Fortalecimiento de liquidez', status: 'En curso', done: false },
          { label: 'Verificación del contrato y auditoría de seguridad', status: 'Pendiente', done: false },
          { label: 'Apertura pública', status: 'No programada', done: false },
        ],
        purposeTitle: 'Propósito',
        purposeIntro: 'Estas funciones describen el modelo objetivo del token dentro del ecosistema CTG One. Esta página no ofrece ninguna forma de comprar, vender o intercambiar CTGO.',
        utilities: [
          'Pagos y transacciones entre unidades del ecosistema CTG One.',
          'Beneficios y reconocimientos vinculados a productos y servicios, como CTG Rewards.',
          'Trazabilidad y transparencia de operaciones dentro del ecosistema.',
          'Participación en mecanismos de utilidad que se documentarán en detalle antes de cualquier apertura pública.',
        ],
        verificationTitle: 'Transparencia antes que promoción',
        verificationText:
          'Esta página no es una invitación a comprar, adquirir ni intercambiar CTGO. Existe un contrato real desplegado en Polygon, pero su dirección, auditoría y estado de verificación se publicarán aquí una vez completada la fase de consolidación. Hasta entonces, cualquier operación con este token debe considerarse de alto riesgo.',
        roadmap: 'EN CONSOLIDACIÓN',
      }
    : {
        badge: 'CTGO · Under consolidation',
        title: 'A real token, still',
        highlight: 'under consolidation.',
        description:
          'CTGO is CTG One’s crypto utility layer. Its contract was deployed on the Polygon network several months ago, with a small group of early holders. Before any broader public rollout, we are strengthening its foundations: liquidity, contract verification, and a security review.',
        status: 'Status',
        statusValue: 'Under consolidation',
        network: 'Network',
        networkValue: 'Polygon',
        audit: 'Security audit',
        auditValue: 'Pending',
        availability: 'Public availability',
        availabilityValue: 'Not open',
        phasesTitle: 'Consolidation phases',
        phasesIntro: 'This is the real path toward a responsible public presence — not every phase is complete yet.',
        phases: [
          { label: 'Contract deployment', status: 'Completed', done: true },
          { label: 'Liquidity strengthening', status: 'In progress', done: false },
          { label: 'Contract verification & security audit', status: 'Pending', done: false },
          { label: 'Public rollout', status: 'Not scheduled', done: false },
        ],
        purposeTitle: 'Purpose',
        purposeIntro: 'These functions describe the target model for the token within the CTG One ecosystem. This page does not offer any way to buy, sell, or exchange CTGO.',
        utilities: [
          'Payments and transactions across CTG One ecosystem business units.',
          'Benefits and recognition connected to products and services, such as CTG Rewards.',
          'Traceability and transparency of operations within the ecosystem.',
          'Participation in utility mechanisms that will be documented in detail before any public rollout.',
        ],
        verificationTitle: 'Transparency before promotion',
        verificationText:
          'This page is not an invitation to buy, acquire, or trade CTGO. A real contract exists on Polygon, but its address, audit, and verification status will be published here once the consolidation phase is complete. Until then, any transaction involving this token should be considered high risk.',
        roadmap: 'UNDER CONSOLIDATION',
      };

  const statusItems = [
    [copy.status, copy.statusValue],
    [copy.network, copy.networkValue],
    [copy.audit, copy.auditValue],
    [copy.availability, copy.availabilityValue],
  ];

  return (
    <section id="ctgotoken" className="relative py-20 sm:py-28 md:py-32 lg:py-40 overflow-hidden bg-bg-primary">
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

        <FadeInSection delay={0.1}>
          <div className="mb-16 sm:mb-20">
            <h3 className="text-lg font-outfit font-medium text-white mb-2">{copy.phasesTitle}</h3>
            <p className="text-xs sm:text-sm text-text-dim leading-relaxed mb-7 max-w-2xl">{copy.phasesIntro}</p>
            <ol className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {copy.phases.map((phase, index) => (
                <li key={phase.label} className={`relative p-5 rounded-2xl border ${phase.done ? 'border-accent/25 bg-accent/[0.03]' : 'border-white/[0.05] bg-white/[0.008]'}`}>
                  <span className="absolute top-4 right-4 text-[8px] tracking-[0.2em] text-accent/35">0{index + 1}</span>
                  <div className={`w-8 h-8 rounded-full border flex items-center justify-center mb-4 ${phase.done ? 'border-accent/30 text-accent' : 'border-white/10 text-text-dim'}`}>
                    {phase.done ? <Check size={14} strokeWidth={1.75} /> : <CircleDashed size={14} strokeWidth={1.75} />}
                  </div>
                  <p className="text-xs sm:text-sm text-white font-medium leading-snug mb-2">{phase.label}</p>
                  <p className={`text-[10px] uppercase tracking-[0.14em] ${phase.done ? 'text-accent' : 'text-text-dim'}`}>{phase.status}</p>
                </li>
              ))}
            </ol>
          </div>
        </FadeInSection>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
          <FadeInSection direction="left">
            <div className="h-full p-7 sm:p-9 rounded-2xl border border-white/[0.05] bg-white/[0.008]">
              <h3 className="text-lg font-outfit font-medium text-white mb-2">{copy.purposeTitle}</h3>
              <p className="text-xs sm:text-sm text-text-dim leading-relaxed mb-7">{copy.purposeIntro}</p>
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
          <div className="grid grid-cols-2 gap-1 sm:gap-2 mt-16 max-w-lg mx-auto opacity-75">
            {[
              '/images/token/file_00000000818471f58dcdf9a124fb690f.png',
              '/images/token/file_000000009950720ea0fa3d0139de0cdb.png',
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
