'use client';

import React from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Container } from '@/components/ui';
import { Badge } from '@/components/ui/Badge';
import { FadeInSection } from '@/components/ui/FadeInSection';
import { useLanguage } from '@/contexts/LanguageContext';
import { TECHNICAL_CHANGELOG } from '@/data/technology-proof';
import { ArrowUpRight, GitBranch, ShieldCheck } from 'lucide-react';

export default function ChangelogPage() {
  const { locale } = useLanguage();
  const es = locale === 'es';

  const esDetails: Record<string, { title: string; detail: string }> = {
    '01': { title: 'Endurecimiento de credibilidad', detail: 'Separamos capacidades verificables de claims de roadmap y corregimos narrativas desactualizadas de deployment y seguridad.' },
    '02': { title: 'CTG One OS', detail: 'Formalizamos la capa tecnológica compartida y el modelo de madurez para identidad, datos, transacciones, automatización, seguridad e inteligencia.' },
    '03': { title: 'Productos y casos técnicos', detail: 'Introdujimos case studies basados en evidencia, con CTG Craft Beer Inversión como CASE-001.' },
    '04': { title: 'Arquitectura y gobernanza de IA', detail: 'Definimos límites de IA, human-in-the-loop, evaluaciones y criterios para promover capacidades a producción.' },
    '05': { title: 'Seguridad, observabilidad y testing', detail: 'Añadimos health checks, logging estructurado con redacción, pruebas críticas, auditoría de dependencias y headers reforzados.' },
    '06': { title: 'Mapa tecnológico del ecosistema', detail: 'Mapeamos cada unidad contra problemas operativos, módulos CTG One OS y estados verificables de madurez.' },
    '07': { title: 'Prueba técnica pública', detail: 'Creamos Technology Status, CTG One Labs y este changelog como superficies públicas de evidencia y evolución.' },
  };

  return (
    <main className="min-h-screen bg-bg-primary">
      <Navbar />
      <section className="relative overflow-hidden pt-32 sm:pt-36 md:pt-40 pb-20 sm:pb-28">
        <div className="absolute inset-0 pointer-events-none opacity-[0.14]" aria-hidden="true" style={{ backgroundImage: 'linear-gradient(rgba(212,162,89,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(212,162,89,0.05) 1px, transparent 1px)', backgroundSize: '72px 72px' }} />
        <Container className="relative z-10">
          <FadeInSection>
            <Badge variant="accent" className="mb-7">{es ? 'Technical Changelog · Evolución verificable' : 'Technical Changelog · Verifiable evolution'}</Badge>
            <div className="max-w-5xl">
              <div className="flex items-center gap-3 mb-5"><span className="w-8 h-px bg-accent/60" /><span className="text-[9px] uppercase tracking-[0.24em] text-text-dim">{es ? 'Cambios de sistema, no anuncios vacíos' : 'System changes, not empty announcements'}</span></div>
              <h1 className="font-outfit font-semibold text-4xl sm:text-5xl md:text-6xl xl:text-[4.7rem] leading-[1.02] tracking-[-0.045em] mb-7 text-white">
                {es ? 'La evolución técnica debe dejar' : 'Technical evolution should leave'} <span className="text-accent">{es ? 'rastro.' : 'a trail.'}</span>
              </h1>
              <p className="text-sm sm:text-base text-text-muted leading-relaxed max-w-3xl">{es ? 'Este changelog resume hitos arquitectónicos y de ingeniería de la profesionalización de CTG One. No sustituye el historial Git ni pretende documentar cada commit: identifica cambios que alteran de forma material la capacidad, seguridad o verificabilidad de la plataforma.' : 'This changelog summarizes architectural and engineering milestones in CTG One’s professionalization. It does not replace Git history or document every commit; it identifies changes that materially affect platform capability, security, or verifiability.'}</p>
            </div>
          </FadeInSection>
        </Container>
      </section>

      <section className="py-20 sm:py-28 bg-bg-secondary border-y border-white/[0.035]">
        <Container>
          <div className="max-w-5xl mx-auto">
            {TECHNICAL_CHANGELOG.map((entry, index) => {
              const localized = es ? esDetails[entry.phase] : entry;
              return (
                <FadeInSection key={entry.phase} delay={0.02 + index * 0.025}>
                  <div className="relative grid sm:grid-cols-[88px_1fr] gap-5 sm:gap-8 pb-10 last:pb-0">
                    <div className="flex sm:block items-center gap-4"><div className="w-12 h-12 rounded-full border border-accent/20 bg-accent/[0.025] flex items-center justify-center font-mono text-[10px] text-accent">P{entry.phase}</div>{index < TECHNICAL_CHANGELOG.length - 1 && <div className="hidden sm:block w-px h-[calc(100%-48px)] min-h-20 bg-gradient-to-b from-accent/20 to-transparent ml-6" />}</div>
                    <div className="rounded-xl border border-white/[0.055] bg-black/20 p-6 sm:p-7"><div className="flex items-start justify-between gap-4 mb-3"><h2 className="text-lg sm:text-xl font-outfit text-white">{localized.title}</h2><GitBranch size={15} className="text-text-dim shrink-0" /></div><p className="text-xs sm:text-sm text-text-dim leading-relaxed">{localized.detail}</p></div>
                  </div>
                </FadeInSection>
              );
            })}
          </div>

          <FadeInSection delay={0.08}>
            <div className="mt-16 rounded-2xl border border-accent/15 bg-accent/[0.02] p-7 sm:p-9 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="max-w-2xl"><div className="flex items-center gap-3 mb-3"><ShieldCheck size={17} className="text-accent" /><span className="text-[9px] uppercase tracking-[0.18em] text-accent">{es ? 'Política de transparencia' : 'Transparency policy'}</span></div><p className="text-sm text-text-muted leading-relaxed">{es ? 'Los cambios del changelog no convierten automáticamente una capacidad en LIVE. El estado técnico se publica por separado y exige evidencia suficiente.' : 'Changelog entries do not automatically make a capability LIVE. Technical status is published separately and requires sufficient evidence.'}</p></div>
              <Link href="/technology/status" className="inline-flex items-center gap-2 text-[9px] uppercase tracking-[0.16em] text-accent border border-accent/20 rounded-full px-4 py-2.5">Technology Status <ArrowUpRight size={12} /></Link>
            </div>
          </FadeInSection>
        </Container>
      </section>
      <Footer />
    </main>
  );
}
