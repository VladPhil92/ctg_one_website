'use client';

import React from 'react';
import Link from 'next/link';
import { Container } from '@/components/ui';
import { Badge } from '@/components/ui/Badge';
import { FadeInSection } from '@/components/ui/FadeInSection';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Activity,
  ArrowDown,
  ArrowUpRight,
  Bot,
  BrainCircuit,
  Database,
  Layers3,
  Network,
  ShieldCheck,
  Workflow,
  type LucideIcon,
} from 'lucide-react';

type Status = 'LIVE' | 'PARTIAL' | 'IN DEVELOPMENT' | 'ROADMAP';

type Item = {
  icon: LucideIcon;
  title: string;
  description: string;
  status: Status;
};

const statusClass: Record<Status, string> = {
  LIVE: 'border-accent/30 text-accent bg-accent/[0.035]',
  PARTIAL: 'border-white/[0.10] text-text-secondary bg-white/[0.02]',
  'IN DEVELOPMENT': 'border-sky-300/20 text-sky-200/80 bg-sky-200/[0.025]',
  ROADMAP: 'border-white/[0.07] text-text-dim bg-white/[0.01]',
};

export const AIArchitectureSection: React.FC = () => {
  const { locale } = useLanguage();
  const es = locale === 'es';

  const copy = es
    ? {
        badge: 'AI · Arquitectura y gobernanza',
        eyebrow: 'Inteligencia aplicada con disciplina de ingeniería',
        title: 'La IA no es una capa decorativa.',
        highlight: 'Debe ser medible, gobernable y auditable.',
        description:
          'CTG One está diseñando una capa de inteligencia para su propio ecosistema. En esta fase no presentamos agentes, RAG o workflows LLM como capacidades productivas: definimos la arquitectura, los controles y los criterios que deberán cumplirse antes de promover cualquier sistema de IA a LIVE.',
        maturityTitle: 'Estado actual',
        maturityText:
          'No se verificó en el repositorio un runtime productivo de modelos, agentes, embeddings o RAG. La arquitectura de IA permanece IN DEVELOPMENT hasta contar con integración real, evaluaciones y evidencia operativa.',
        pipelineBadge: 'CTG AI Layer',
        pipelineTitle: 'Del dato a la acción, con controles en cada paso.',
        pipelineDescription:
          'La arquitectura objetivo separa conocimiento, contexto, inferencia, agentes y workflows. Ningún resultado de IA debería entrar directamente a procesos sensibles sin autorización, validación y trazabilidad.',
        governanceBadge: 'AI Governance',
        governanceTitle: 'Controles antes que autonomía.',
        governanceDescription:
          'Las capacidades de IA se diseñarán con límites explícitos sobre datos, permisos, decisiones y escalamiento humano. El objetivo es construir sistemas alrededor de modelos, no depender ciegamente del modelo.',
        useCasesBadge: 'Casos iniciales',
        useCasesTitle: 'Empezar por problemas estrechos y medibles.',
        useCasesDescription:
          'Los primeros casos deben tener bajo riesgo, datos delimitados y criterios de evaluación claros. Se evita desplegar agentes autónomos de propósito general sin evidencia de calidad y control.',
        principle:
          'Una capacidad de IA solo cambia a LIVE cuando existe código productivo, datos autorizados, evaluación reproducible, monitoreo, costos medidos, fallback definido y responsabilidad humana explícita.',
        technologyLink: 'Volver a Technology',
      }
    : {
        badge: 'AI · Architecture & governance',
        eyebrow: 'Applied intelligence with engineering discipline',
        title: 'AI is not a decorative layer.',
        highlight: 'It must be measurable, governable, and auditable.',
        description:
          'CTG One is designing an intelligence layer for its own ecosystem. At this stage, agents, RAG, and LLM workflows are not presented as production capabilities: we define the architecture, controls, and promotion criteria required before any AI system can become LIVE.',
        maturityTitle: 'Current state',
        maturityText:
          'No production model runtime, agent framework, embeddings pipeline, or RAG implementation was verified in the repository. The AI architecture remains IN DEVELOPMENT until real integration, evaluations, and operating evidence exist.',
        pipelineBadge: 'CTG AI Layer',
        pipelineTitle: 'From data to action, with controls at every step.',
        pipelineDescription:
          'The target architecture separates knowledge, context, inference, agents, and workflows. No AI output should enter sensitive processes directly without authorization, validation, and traceability.',
        governanceBadge: 'AI Governance',
        governanceTitle: 'Controls before autonomy.',
        governanceDescription:
          'AI capabilities will be designed with explicit boundaries around data, permissions, decisions, and human escalation. The goal is to build systems around models rather than blindly depend on a model.',
        useCasesBadge: 'Initial use cases',
        useCasesTitle: 'Start with narrow, measurable problems.',
        useCasesDescription:
          'Initial use cases should be low-risk, bounded by known data, and evaluated against explicit criteria. General-purpose autonomous agents should not be deployed without evidence of quality and control.',
        principle:
          'An AI capability moves to LIVE only when production code, authorized data, reproducible evaluation, monitoring, measured cost, defined fallback, and explicit human accountability all exist.',
        technologyLink: 'Back to Technology',
      };

  const pipeline = es
    ? ['Datos autorizados', 'Contexto', 'Modelos', 'Agentes', 'Workflows', 'Operación']
    : ['Authorized data', 'Context', 'Models', 'Agents', 'Workflows', 'Operations'];

  const architecture: Item[] = es
    ? [
        { icon: Database, title: 'Data Boundary', description: 'Fuentes de datos permitidas, clasificación de PII, minimización y reglas de acceso antes de cualquier inferencia.', status: 'IN DEVELOPMENT' },
        { icon: Network, title: 'Context Layer', description: 'Recuperación de contexto, conocimiento autorizado y trazabilidad de las fuentes utilizadas por cada respuesta.', status: 'IN DEVELOPMENT' },
        { icon: BrainCircuit, title: 'Model Gateway', description: 'Capa futura para abstraer proveedor, modelo, versión, parámetros, costos y políticas de uso.', status: 'ROADMAP' },
        { icon: Bot, title: 'Agent Runtime', description: 'Agentes con herramientas explícitas, scopes restringidos, límites de acción y escalamiento humano.', status: 'IN DEVELOPMENT' },
        { icon: Workflow, title: 'Workflow Orchestration', description: 'Conexión de salidas de IA con procesos reales mediante reglas determinísticas, validación y estados controlados.', status: 'PARTIAL' },
        { icon: Activity, title: 'Evaluation & Observability', description: 'Calidad, latencia, costo, errores, trazas y evaluación continua antes y después de producción.', status: 'ROADMAP' },
      ]
    : [
        { icon: Database, title: 'Data Boundary', description: 'Allowed data sources, PII classification, minimization, and access rules before inference occurs.', status: 'IN DEVELOPMENT' },
        { icon: Network, title: 'Context Layer', description: 'Context retrieval, authorized knowledge, and traceability for the sources used by each response.', status: 'IN DEVELOPMENT' },
        { icon: BrainCircuit, title: 'Model Gateway', description: 'Future abstraction layer for provider, model, version, parameters, costs, and usage policies.', status: 'ROADMAP' },
        { icon: Bot, title: 'Agent Runtime', description: 'Agents with explicit tools, restricted scopes, action limits, and human escalation.', status: 'IN DEVELOPMENT' },
        { icon: Workflow, title: 'Workflow Orchestration', description: 'Connect AI outputs to real processes through deterministic rules, validation, and controlled state transitions.', status: 'PARTIAL' },
        { icon: Activity, title: 'Evaluation & Observability', description: 'Quality, latency, cost, failures, traces, and continuous evaluation before and after production.', status: 'ROADMAP' },
      ];

  const governance: Item[] = es
    ? [
        { icon: ShieldCheck, title: 'Human-in-the-loop', description: 'Decisiones sensibles requieren aprobación humana; la autonomía aumenta solo cuando la evidencia lo justifica.', status: 'IN DEVELOPMENT' },
        { icon: Database, title: 'Privacidad y minimización', description: 'No enviar más datos de los necesarios; PII y datos financieros deben tener tratamiento y permisos explícitos.', status: 'IN DEVELOPMENT' },
        { icon: Layers3, title: 'Versionado y trazabilidad', description: 'Registrar versión de modelo, configuración y contexto técnico suficiente para reproducir resultados sin exponer secretos.', status: 'ROADMAP' },
        { icon: Activity, title: 'Evaluaciones', description: 'Fixtures, criterios de calidad, regresión, seguridad y aceptación definidos antes de ampliar un caso de uso.', status: 'ROADMAP' },
        { icon: Workflow, title: 'Fallbacks y límites', description: 'Timeouts, validaciones, rutas determinísticas y escalamiento cuando un modelo falla o no alcanza confianza suficiente.', status: 'IN DEVELOPMENT' },
        { icon: Network, title: 'Cost & usage controls', description: 'Presupuestos, límites por flujo y telemetría de consumo antes de escalar inferencias al ecosistema completo.', status: 'ROADMAP' },
      ]
    : [
        { icon: ShieldCheck, title: 'Human-in-the-loop', description: 'Sensitive decisions require human approval; autonomy increases only when evidence supports it.', status: 'IN DEVELOPMENT' },
        { icon: Database, title: 'Privacy & minimization', description: 'Send only the data required; PII and financial data require explicit treatment and permissions.', status: 'IN DEVELOPMENT' },
        { icon: Layers3, title: 'Versioning & traceability', description: 'Record model version, configuration, and enough technical context to reproduce outcomes without exposing secrets.', status: 'ROADMAP' },
        { icon: Activity, title: 'Evaluations', description: 'Fixtures, quality criteria, regression, safety, and acceptance thresholds before expanding a use case.', status: 'ROADMAP' },
        { icon: Workflow, title: 'Fallbacks & limits', description: 'Timeouts, validation, deterministic paths, and escalation when a model fails or confidence is insufficient.', status: 'IN DEVELOPMENT' },
        { icon: Network, title: 'Cost & usage controls', description: 'Budgets, per-flow limits, and usage telemetry before inference scales across the ecosystem.', status: 'ROADMAP' },
      ];

  const useCases = es
    ? [
        ['Document intelligence', 'Extracción, clasificación y resumen de documentos internos con revisión humana.', 'IN DEVELOPMENT' as Status],
        ['Knowledge assistant', 'Asistencia contextual sobre documentación autorizada, con citas y límites de dominio.', 'ROADMAP' as Status],
        ['Operational copilot', 'Apoyo a equipos con recomendaciones sobre datos operativos sin ejecución autónoma inicial.', 'ROADMAP' as Status],
        ['Customer support', 'Clasificación y borradores de respuesta con escalamiento humano para casos sensibles.', 'ROADMAP' as Status],
      ]
    : [
        ['Document intelligence', 'Extraction, classification, and summarization of internal documents with human review.', 'IN DEVELOPMENT' as Status],
        ['Knowledge assistant', 'Contextual assistance over authorized documentation with citations and domain boundaries.', 'ROADMAP' as Status],
        ['Operational copilot', 'Support teams with recommendations over operating data without initial autonomous execution.', 'ROADMAP' as Status],
        ['Customer support', 'Classification and response drafts with human escalation for sensitive cases.', 'ROADMAP' as Status],
      ];

  return (
    <section className="relative overflow-hidden bg-bg-primary">
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute -top-36 right-[-12%] w-[850px] h-[850px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(212,162,89,0.065), transparent 68%)' }} />
        <div className="absolute inset-0 opacity-[0.13]" style={{ backgroundImage: 'linear-gradient(rgba(212,162,89,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(212,162,89,0.05) 1px, transparent 1px)', backgroundSize: '76px 76px' }} />
      </div>

      <div className="relative py-20 sm:py-28 md:py-36">
        <Container>
          <FadeInSection>
            <div className="max-w-5xl">
              <Badge variant="accent" className="mb-7">{copy.badge}</Badge>
              <div className="flex items-center gap-3 mb-5"><span className="w-8 h-px bg-accent/60" /><span className="text-[9px] uppercase tracking-[0.24em] text-text-dim">{copy.eyebrow}</span></div>
              <h1 className="font-outfit font-semibold text-4xl sm:text-5xl md:text-6xl xl:text-[4.6rem] leading-[1.02] tracking-[-0.045em] mb-7">
                <span className="text-white">{copy.title}</span>{' '}<span className="text-accent">{copy.highlight}</span>
              </h1>
              <p className="text-sm sm:text-base text-text-muted leading-relaxed max-w-3xl">{copy.description}</p>
            </div>
          </FadeInSection>

          <FadeInSection delay={0.1}>
            <div className="mt-12 border border-sky-300/15 bg-sky-300/[0.02] rounded-xl p-6 sm:p-8 max-w-4xl">
              <div className="flex items-center gap-3 mb-3"><BrainCircuit size={18} className="text-sky-200/75" /><span className="text-[9px] uppercase tracking-[0.18em] text-sky-200/75">IN DEVELOPMENT</span></div>
              <h2 className="text-lg sm:text-xl font-outfit text-white mb-3">{copy.maturityTitle}</h2>
              <p className="text-xs sm:text-sm text-text-muted leading-relaxed">{copy.maturityText}</p>
            </div>
          </FadeInSection>
        </Container>
      </div>

      <div className="relative py-20 sm:py-28 md:py-32 bg-bg-secondary border-y border-white/[0.035]">
        <Container>
          <FadeInSection><div className="max-w-3xl mb-12"><Badge variant="accent" className="mb-6">{copy.pipelineBadge}</Badge><h2 className="font-outfit font-semibold text-3xl sm:text-4xl md:text-5xl text-white tracking-[-0.035em] mb-5">{copy.pipelineTitle}</h2><p className="text-sm sm:text-base text-text-muted leading-relaxed">{copy.pipelineDescription}</p></div></FadeInSection>

          <div className="grid lg:grid-cols-[0.8fr_1.2fr] gap-8 lg:gap-12">
            <FadeInSection direction="left">
              <div className="rounded-2xl border border-accent/15 bg-black/25 p-6 sm:p-8">
                {pipeline.map((step, index) => (
                  <React.Fragment key={step}>
                    <div className="flex items-center justify-between rounded-lg border border-white/[0.055] bg-white/[0.01] px-4 py-3.5"><span className="font-mono text-[9px] text-accent/55">0{index + 1}</span><span className="text-xs sm:text-sm text-white">{step}</span><Activity size={13} className="text-text-dim" /></div>
                    {index < pipeline.length - 1 && <ArrowDown size={12} className="mx-auto my-2 text-accent/35" />}
                  </React.Fragment>
                ))}
              </div>
            </FadeInSection>

            <div className="grid sm:grid-cols-2 gap-3">
              {architecture.map(({ icon: Icon, title, description, status }, index) => (
                <FadeInSection key={title} delay={0.04 + index * 0.04}>
                  <div className="h-full min-h-[190px] rounded-xl border border-white/[0.055] bg-white/[0.01] p-5 sm:p-6">
                    <div className="flex items-start justify-between gap-3 mb-5"><Icon size={19} className="text-accent" strokeWidth={1.35} /><span className={`text-[7px] uppercase tracking-[0.14em] px-2 py-1 rounded-full border ${statusClass[status]}`}>{status}</span></div>
                    <h3 className="font-outfit text-sm sm:text-base text-white mb-2">{title}</h3><p className="text-[11px] sm:text-xs text-text-dim leading-relaxed">{description}</p>
                  </div>
                </FadeInSection>
              ))}
            </div>
          </div>
        </Container>
      </div>

      <div className="relative py-20 sm:py-28 md:py-32">
        <Container>
          <FadeInSection><div className="max-w-3xl mb-12"><Badge variant="accent" className="mb-6">{copy.governanceBadge}</Badge><h2 className="font-outfit font-semibold text-3xl sm:text-4xl md:text-5xl text-white tracking-[-0.035em] mb-5">{copy.governanceTitle}</h2><p className="text-sm sm:text-base text-text-muted leading-relaxed">{copy.governanceDescription}</p></div></FadeInSection>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px rounded-xl overflow-hidden border border-white/[0.05] bg-white/[0.04]">
            {governance.map(({ icon: Icon, title, description, status }, index) => (
              <FadeInSection key={title} delay={0.04 + index * 0.04}>
                <div className="h-full min-h-[220px] bg-bg-primary p-6 sm:p-7">
                  <div className="flex justify-between gap-4 mb-6"><Icon size={19} className="text-accent" strokeWidth={1.35} /><span className={`text-[7px] uppercase tracking-[0.14em] px-2 py-1 rounded-full border ${statusClass[status]}`}>{status}</span></div>
                  <h3 className="font-outfit text-base text-white mb-3">{title}</h3><p className="text-xs text-text-muted leading-relaxed">{description}</p>
                </div>
              </FadeInSection>
            ))}
          </div>
        </Container>
      </div>

      <div className="relative py-20 sm:py-28 md:py-32 bg-bg-secondary border-y border-white/[0.035]">
        <Container>
          <FadeInSection><div className="max-w-3xl mb-12"><Badge variant="accent" className="mb-6">{copy.useCasesBadge}</Badge><h2 className="font-outfit font-semibold text-3xl sm:text-4xl md:text-5xl text-white tracking-[-0.035em] mb-5">{copy.useCasesTitle}</h2><p className="text-sm sm:text-base text-text-muted leading-relaxed">{copy.useCasesDescription}</p></div></FadeInSection>
          <div className="grid md:grid-cols-2 gap-4">
            {useCases.map(([title, description, status], index) => (
              <FadeInSection key={title} delay={0.05 + index * 0.05}>
                <div className="rounded-xl border border-white/[0.055] bg-white/[0.01] p-6 sm:p-7 min-h-[175px]">
                  <div className="flex items-start justify-between gap-4 mb-5"><Bot size={18} className="text-accent" /><span className={`text-[7px] uppercase tracking-[0.14em] px-2 py-1 rounded-full border ${statusClass[status]}`}>{status}</span></div>
                  <h3 className="font-outfit text-base text-white mb-2">{title}</h3><p className="text-xs text-text-muted leading-relaxed">{description}</p>
                </div>
              </FadeInSection>
            ))}
          </div>

          <FadeInSection delay={0.22}>
            <div className="mt-14 border-l border-accent/40 pl-6 sm:pl-8 max-w-4xl"><p className="font-outfit text-xl sm:text-2xl md:text-3xl leading-relaxed tracking-[-0.02em] text-white/90">{copy.principle}</p></div>
          </FadeInSection>
          <FadeInSection delay={0.28}>
            <Link href="/services" className="mt-10 inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-accent hover:text-white transition-colors">{copy.technologyLink}<ArrowUpRight size={14} /></Link>
          </FadeInSection>
        </Container>
      </div>
    </section>
  );
};
