'use client';

import React from 'react';
import Link from 'next/link';
import { Container } from '@/components/ui';
import { FadeInSection } from '@/components/ui/FadeInSection';
import { Badge } from '@/components/ui/Badge';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  ArrowDown,
  ArrowUpRight,
  Beer,
  Boxes,
  CircleDollarSign,
  Database,
  Factory,
  Gauge,
  Layers3,
  PackageCheck,
  ReceiptText,
  ShieldCheck,
  ShoppingCart,
  type LucideIcon,
} from 'lucide-react';

type Status = 'LIVE' | 'PARTIAL' | 'IN DEVELOPMENT' | 'ROADMAP';

type Capability = {
  icon: LucideIcon;
  title: string;
  description: string;
  status: Status;
};

const statusClass: Record<Status, string> = {
  LIVE: 'border-accent/30 text-accent bg-accent/[0.035]',
  PARTIAL: 'border-white/[0.10] text-text-secondary bg-white/[0.02]',
  'IN DEVELOPMENT': 'border-white/[0.08] text-text-dim bg-white/[0.015]',
  ROADMAP: 'border-white/[0.06] text-text-dim bg-transparent',
};

export const ProductsCaseStudiesSection: React.FC = () => {
  const { locale } = useLanguage();
  const es = locale === 'es';

  const copy = es
    ? {
        badge: 'Productos · Tecnología en acción',
        title: 'Demostramos capacidad con',
        highlight: 'sistemas reales.',
        description:
          'Un producto entra en esta sección únicamente cuando existe evidencia técnica suficiente para explicar el problema, la arquitectura, el flujo operativo y su estado de madurez. CTG Craft Beer Inversión es el primer caso documentado bajo este estándar.',
        caseLabel: 'CASE-001 · LIVE / FEATURE-GATED',
        caseTitle: 'CTG Craft Beer Inversión',
        problemLabel: 'Problema',
        problem:
          'Conectar participación económica por lotes de cerveza con una operación física real: producción, inventario, ventas, trazabilidad, liquidación y retiro, manteniendo separación de roles y registro transaccional.',
        architectureLabel: 'Arquitectura verificable',
        architecture:
          'Next.js + TypeScript en la capa de aplicación; Supabase/PostgreSQL para autenticación, datos y Row Level Security; estructuras específicas para lotes, asignaciones, inventario, ledger, ventas, liquidaciones y retiros.',
        flowLabel: 'Flujo del sistema',
        evidenceLabel: 'Capacidades verificadas',
        open: 'Explorar plataforma',
        inspect: 'Ver lotes públicos',
        nextTitle: 'Siguiente estándar de producto',
        nextText:
          'Las demás unidades del ecosistema no se presentan todavía como productos tecnológicos terminados. Cada una deberá alcanzar evidencia suficiente antes de convertirse en un case study público: arquitectura, flujo, datos, seguridad, despliegue y resultado operativo.',
      }
    : {
        badge: 'Products · Technology in action',
        title: 'We prove capability through',
        highlight: 'real systems.',
        description:
          'A product enters this section only when there is enough technical evidence to explain the problem, architecture, operating flow, and maturity state. CTG Craft Beer Investment is the first case documented under this standard.',
        caseLabel: 'CASE-001 · LIVE / FEATURE-GATED',
        caseTitle: 'CTG Craft Beer Investment',
        problemLabel: 'Problem',
        problem:
          'Connect economic participation in beer production batches to a real physical operation: production, inventory, sales, traceability, settlement, and withdrawals while preserving role separation and transactional records.',
        architectureLabel: 'Verifiable architecture',
        architecture:
          'Next.js + TypeScript at the application layer; Supabase/PostgreSQL for authentication, data, and Row Level Security; dedicated structures for batches, allocations, inventory, ledger, sales, settlements, and withdrawals.',
        flowLabel: 'System flow',
        evidenceLabel: 'Verified capabilities',
        open: 'Explore platform',
        inspect: 'View public batches',
        nextTitle: 'Next product standard',
        nextText:
          'The remaining ecosystem units are not yet presented as completed technology products. Each one must reach sufficient evidence before becoming a public case study: architecture, flow, data, security, deployment, and operating result.',
      };

  const flow = es
    ? ['Capital', 'Lote', 'Producción', 'Inventario', 'Venta', 'Ledger', 'Liquidación']
    : ['Capital', 'Batch', 'Production', 'Inventory', 'Sale', 'Ledger', 'Settlement'];

  const capabilities: Capability[] = es
    ? [
        { icon: ShieldCheck, title: 'Identidad y autorización', description: 'Autenticación y separación de superficies públicas, participante y administración.', status: 'LIVE' },
        { icon: Factory, title: 'Lotes de producción', description: 'Modelo dedicado para representar lotes y su ciclo operativo.', status: 'LIVE' },
        { icon: Boxes, title: 'Asignaciones e inventario', description: 'Estructuras para participación, unidades e inventario asociado al lote.', status: 'LIVE' },
        { icon: ReceiptText, title: 'Ledger transaccional', description: 'Registro de movimientos y eventos económicos del bounded context.', status: 'LIVE' },
        { icon: ShoppingCart, title: 'Ventas y liquidaciones', description: 'Estructuras de venta y settlement vinculadas al desempeño real registrado.', status: 'LIVE' },
        { icon: CircleDollarSign, title: 'Retiros', description: 'Flujo protegido y sujeto a feature flags y condiciones operativas.', status: 'PARTIAL' },
      ]
    : [
        { icon: ShieldCheck, title: 'Identity & authorization', description: 'Authentication and separation of public, participant, and administrative surfaces.', status: 'LIVE' },
        { icon: Factory, title: 'Production batches', description: 'Dedicated model representing batches and their operating lifecycle.', status: 'LIVE' },
        { icon: Boxes, title: 'Allocations & inventory', description: 'Structures for participation, units, and inventory associated with a batch.', status: 'LIVE' },
        { icon: ReceiptText, title: 'Transactional ledger', description: 'Record of movements and economic events inside the bounded context.', status: 'LIVE' },
        { icon: ShoppingCart, title: 'Sales & settlements', description: 'Sales and settlement structures linked to recorded real performance.', status: 'LIVE' },
        { icon: CircleDollarSign, title: 'Withdrawals', description: 'Protected flow subject to feature flags and operating readiness.', status: 'PARTIAL' },
      ];

  return (
    <section className="relative overflow-hidden bg-bg-primary py-20 sm:py-28 md:py-36">
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-0 right-[-8%] w-[650px] h-[650px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(212,162,89,0.07), transparent 68%)' }} />
        <div className="absolute inset-0 opacity-[0.12]" style={{ backgroundImage: 'linear-gradient(rgba(212,162,89,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(212,162,89,0.05) 1px, transparent 1px)', backgroundSize: '72px 72px' }} />
      </div>

      <Container className="relative z-10">
        <FadeInSection>
          <div className="max-w-3xl mb-14 sm:mb-18 md:mb-20">
            <Badge variant="accent" className="mb-6">{copy.badge}</Badge>
            <h1 className="font-outfit font-semibold text-4xl sm:text-5xl md:text-6xl tracking-[-0.04em] leading-[1.02] mb-6">
              <span className="text-white">{copy.title}</span>{' '}
              <span className="text-accent">{copy.highlight}</span>
            </h1>
            <p className="text-sm sm:text-base text-text-muted leading-relaxed max-w-2xl">{copy.description}</p>
          </div>
        </FadeInSection>

        <FadeInSection delay={0.08}>
          <div className="rounded-2xl border border-accent/20 bg-black/25 overflow-hidden">
            <div className="grid lg:grid-cols-[0.9fr_1.1fr]">
              <div className="p-7 sm:p-9 md:p-11 border-b lg:border-b-0 lg:border-r border-white/[0.05]">
                <div className="flex items-center justify-between gap-4 mb-10">
                  <div className="w-14 h-14 rounded-full border border-accent/30 bg-accent/[0.035] flex items-center justify-center text-accent">
                    <Beer size={23} strokeWidth={1.4} />
                  </div>
                  <span className="text-[8px] sm:text-[9px] uppercase tracking-[0.18em] px-3 py-1.5 rounded-full border border-accent/25 text-accent">{copy.caseLabel}</span>
                </div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-outfit font-medium text-white mb-8 tracking-[-0.03em]">{copy.caseTitle}</h2>

                <div className="space-y-8">
                  <div>
                    <div className="text-[9px] uppercase tracking-[0.18em] text-accent mb-3">{copy.problemLabel}</div>
                    <p className="text-xs sm:text-sm text-text-muted leading-relaxed">{copy.problem}</p>
                  </div>
                  <div>
                    <div className="text-[9px] uppercase tracking-[0.18em] text-accent mb-3">{copy.architectureLabel}</div>
                    <p className="text-xs sm:text-sm text-text-muted leading-relaxed">{copy.architecture}</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 mt-10">
                  <Link href="/inversion" className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-md bg-accent text-black text-[10px] uppercase tracking-[0.14em] font-medium">
                    {copy.open}<ArrowUpRight size={14} />
                  </Link>
                  <Link href="/inversion/lotes" className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-md border border-white/[0.08] text-text-secondary text-[10px] uppercase tracking-[0.14em] hover:border-accent/30 hover:text-accent transition-colors">
                    {copy.inspect}<PackageCheck size={14} />
                  </Link>
                </div>
              </div>

              <div className="p-7 sm:p-9 md:p-11">
                <div className="text-[9px] uppercase tracking-[0.18em] text-accent mb-6">{copy.flowLabel}</div>
                <div className="flex flex-col gap-2 mb-10">
                  {flow.map((step, index) => (
                    <React.Fragment key={step}>
                      <div className="flex items-center justify-between gap-4 rounded-lg border border-white/[0.055] bg-white/[0.012] px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-[9px] text-accent/55">0{index + 1}</span>
                          <span className="text-xs sm:text-sm text-white">{step}</span>
                        </div>
                        <Gauge size={14} className="text-text-dim" strokeWidth={1.4} />
                      </div>
                      {index < flow.length - 1 && <ArrowDown size={12} className="mx-auto text-accent/35" />}
                    </React.Fragment>
                  ))}
                </div>

                <div className="text-[9px] uppercase tracking-[0.18em] text-accent mb-6">{copy.evidenceLabel}</div>
                <div className="grid sm:grid-cols-2 gap-3">
                  {capabilities.map(({ icon: Icon, title, description, status }) => (
                    <div key={title} className="rounded-lg border border-white/[0.055] bg-white/[0.01] p-4 min-h-[150px]">
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <Icon size={17} className="text-accent" strokeWidth={1.4} />
                        <span className={`text-[7px] uppercase tracking-[0.14em] px-2 py-1 rounded-full border ${statusClass[status]}`}>{status}</span>
                      </div>
                      <h3 className="text-xs sm:text-sm text-white font-outfit mb-2">{title}</h3>
                      <p className="text-[10px] sm:text-[11px] text-text-dim leading-relaxed">{description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </FadeInSection>

        <FadeInSection delay={0.18}>
          <div className="mt-12 rounded-xl border border-white/[0.055] bg-white/[0.008] p-7 sm:p-9 flex flex-col md:flex-row md:items-center md:justify-between gap-8">
            <div className="max-w-3xl">
              <div className="flex items-center gap-3 mb-3">
                <Layers3 size={17} className="text-accent" strokeWidth={1.4} />
                <span className="text-[9px] uppercase tracking-[0.18em] text-accent">CASE-STUDY STANDARD</span>
              </div>
              <h3 className="text-lg sm:text-xl font-outfit text-white mb-3">{copy.nextTitle}</h3>
              <p className="text-xs sm:text-sm text-text-muted leading-relaxed">{copy.nextText}</p>
            </div>
            <Database size={28} className="text-accent/50 shrink-0" strokeWidth={1.2} />
          </div>
        </FadeInSection>
      </Container>
    </section>
  );
};
