'use client';

import React from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Container } from '@/components/ui';
import { Badge } from '@/components/ui/Badge';
import { FadeInSection } from '@/components/ui/FadeInSection';
import { useLanguage } from '@/contexts/LanguageContext';
import { ArrowUpRight, Beaker, Bot, Braces, DatabaseZap, FlaskConical, GitBranch, ShieldCheck } from 'lucide-react';

const tracks = [
  { icon: Bot, title: 'AI Systems', status: 'IN DEVELOPMENT', es: 'Agentes delimitados, RAG, evaluación, human-in-the-loop y automatización asistida.', en: 'Bounded agents, RAG, evaluation, human-in-the-loop, and assisted automation.' },
  { icon: DatabaseZap, title: 'Data & Operations', status: 'ROADMAP', es: 'Experimentos sobre datos operativos, analítica, forecasting y optimización dentro de unidades reales.', en: 'Experiments over operating data, analytics, forecasting, and optimization inside real business units.' },
  { icon: Braces, title: 'Internal Platforms', status: 'PARTIAL', es: 'Componentes, patrones y herramientas internas reutilizables que puedan convertirse en infraestructura común.', en: 'Reusable internal components, patterns, and tools that can become common infrastructure.' },
  { icon: ShieldCheck, title: 'Trust & Verification', status: 'ROADMAP', es: 'Pruebas sobre trazabilidad, seguridad, auditoría y mecanismos verificables para sistemas transaccionales.', en: 'Experiments around traceability, security, auditability, and verifiable mechanisms for transactional systems.' },
] as const;

export default function LabsPage() {
  const { locale } = useLanguage();
  const es = locale === 'es';

  return (
    <main className="min-h-screen bg-bg-primary">
      <Navbar />
      <section className="relative overflow-hidden pt-32 sm:pt-36 md:pt-40 pb-20 sm:pb-28">
        <div className="absolute inset-0 pointer-events-none opacity-[0.14]" aria-hidden="true" style={{ backgroundImage: 'linear-gradient(rgba(212,162,89,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(212,162,89,0.05) 1px, transparent 1px)', backgroundSize: '72px 72px' }} />
        <Container className="relative z-10">
          <FadeInSection>
            <Badge variant="accent" className="mb-7">CTG One Labs · ROADMAP</Badge>
            <div className="max-w-5xl">
              <div className="flex items-center gap-3 mb-5"><span className="w-8 h-px bg-accent/60" /><span className="text-[9px] uppercase tracking-[0.24em] text-text-dim">{es ? 'Experimentar sin confundir prototipo con producto' : 'Experiment without confusing prototype with product'}</span></div>
              <h1 className="font-outfit font-semibold text-4xl sm:text-5xl md:text-6xl xl:text-[4.7rem] leading-[1.02] tracking-[-0.045em] mb-7 text-white">
                {es ? 'Un marco para convertir preguntas técnicas en' : 'A framework for turning technical questions into'} <span className="text-accent">{es ? 'evidencia.' : 'evidence.'}</span>
              </h1>
              <p className="text-sm sm:text-base text-text-muted leading-relaxed max-w-3xl">
                {es
                  ? 'CTG One Labs se define como el espacio de experimentación técnica del ecosistema. En esta fase es un marco público, no una afirmación de laboratorio con proyectos productivos ya desplegados. Los experimentos solo se publicarán cuando exista código, metodología, resultados y límites explícitos.'
                  : 'CTG One Labs is defined as the ecosystem’s technical experimentation space. At this stage it is a public framework, not a claim that production research projects are already deployed. Experiments will only be published when code, methodology, results, and explicit limits exist.'}
              </p>
            </div>
          </FadeInSection>
        </Container>
      </section>

      <section className="py-20 sm:py-28 bg-bg-secondary border-y border-white/[0.035]">
        <Container>
          <FadeInSection>
            <div className="max-w-3xl mb-12"><Badge variant="accent" className="mb-6">{es ? 'Líneas de exploración' : 'Exploration tracks'}</Badge><h2 className="text-3xl sm:text-4xl md:text-5xl font-outfit font-semibold text-white tracking-[-0.035em]">{es ? 'Laboratorios con criterio de salida.' : 'Labs with exit criteria.'}</h2></div>
          </FadeInSection>
          <div className="grid md:grid-cols-2 gap-4">
            {tracks.map(({ icon: Icon, title, status, es: esText, en: enText }, index) => (
              <FadeInSection key={title} delay={0.03 + index * 0.03}>
                <article className="h-full rounded-xl border border-white/[0.055] bg-black/20 p-6 sm:p-7">
                  <div className="flex items-start justify-between gap-4 mb-6"><div className="w-11 h-11 rounded-full border border-accent/20 flex items-center justify-center"><Icon size={18} className="text-accent" /></div><span className="text-[7px] uppercase tracking-[0.12em] px-2 py-1 rounded-full border border-white/[0.08] text-text-dim">{status}</span></div>
                  <h3 className="text-xl text-white font-outfit mb-3">{title}</h3><p className="text-xs sm:text-sm text-text-dim leading-relaxed">{es ? esText : enText}</p>
                </article>
              </FadeInSection>
            ))}
          </div>
        </Container>
      </section>

      <section className="py-20 sm:py-28 bg-bg-primary">
        <Container>
          <FadeInSection>
            <div className="grid lg:grid-cols-[0.8fr_1.2fr] gap-8 lg:gap-12 items-start">
              <div><Badge variant="accent" className="mb-6">{es ? 'Protocolo de publicación' : 'Publication protocol'}</Badge><h2 className="text-3xl sm:text-4xl font-outfit font-semibold text-white tracking-[-0.03em] mb-5">{es ? 'Nada se publica como innovación solo porque suene nuevo.' : 'Nothing is published as innovation just because it sounds new.'}</h2><p className="text-sm text-text-muted leading-relaxed">{es ? 'Cada experimento debe dejar una huella reproducible suficiente para distinguir hipótesis, prototipo, piloto y capacidad productiva.' : 'Each experiment must leave enough reproducible evidence to distinguish hypothesis, prototype, pilot, and production capability.'}</p></div>
              <div className="space-y-3">
                {[
                  es ? 'Problema e hipótesis explícitos' : 'Explicit problem and hypothesis',
                  es ? 'Código o artefacto técnico verificable' : 'Verifiable code or technical artifact',
                  es ? 'Datos autorizados y límites de privacidad' : 'Authorized data and privacy boundaries',
                  es ? 'Métricas o criterios de evaluación definidos antes del resultado' : 'Metrics or evaluation criteria defined before the outcome',
                  es ? 'Riesgos, fallos y resultados negativos documentados' : 'Risks, failures, and negative results documented',
                  es ? 'Decisión final: descartar, iterar, pilotear o promover' : 'Final decision: discard, iterate, pilot, or promote',
                ].map((item, index) => <div key={item} className="flex items-center gap-4 rounded-lg border border-white/[0.055] bg-black/20 px-4 py-3.5"><span className="font-mono text-[9px] text-accent/55">0{index + 1}</span><span className="text-xs sm:text-sm text-text-secondary">{item}</span></div>)}
              </div>
            </div>
          </FadeInSection>

          <FadeInSection delay={0.08}>
            <div className="mt-16 rounded-2xl border border-accent/15 bg-accent/[0.02] p-7 sm:p-9 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="max-w-2xl"><div className="flex items-center gap-3 mb-3"><FlaskConical size={18} className="text-accent" /><span className="text-[9px] uppercase tracking-[0.18em] text-accent">{es ? 'Regla de evidencia' : 'Evidence rule'}</span></div><p className="text-sm text-text-muted leading-relaxed">{es ? 'Un experimento de Labs no modifica automáticamente el Technology Status. La promoción ocurre solo cuando cumple los criterios de producción y operación definidos por CTG One.' : 'A Labs experiment does not automatically change Technology Status. Promotion happens only when it meets CTG One production and operating criteria.'}</p></div>
              <div className="flex flex-wrap gap-3"><Link href="/technology/status" className="inline-flex items-center gap-2 text-[9px] uppercase tracking-[0.16em] text-accent border border-accent/20 rounded-full px-4 py-2.5">Technology Status <ArrowUpRight size={12} /></Link><Link href="/changelog" className="inline-flex items-center gap-2 text-[9px] uppercase tracking-[0.16em] text-text-secondary border border-white/[0.08] rounded-full px-4 py-2.5">Changelog <GitBranch size={12} /></Link></div>
            </div>
          </FadeInSection>
        </Container>
      </section>
      <Footer />
    </main>
  );
}
