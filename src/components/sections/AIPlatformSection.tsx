'use client';

import React from 'react';
import Link from 'next/link';
import {
  Activity, AlertTriangle, ArrowDown, ArrowUpRight, BarChart3, Bot, BrainCircuit,
  CheckCircle2, CircleDashed, Cpu, Database, Eye, FileText, Gauge, Layers3,
  Lock, Network, Search, ShieldCheck, UserCheck, Workflow, type LucideIcon,
} from 'lucide-react';
import { Container } from '@/components/ui';
import { Badge } from '@/components/ui/Badge';
import { FadeInSection } from '@/components/ui/FadeInSection';
import { useLanguage } from '@/contexts/LanguageContext';
import { getCapabilityProof, getPublicProofStatus, type ProofStatus, type PublicProofStatus } from '@/data/technology-proof';

type Status = ProofStatus;
type Capability = { icon: LucideIcon; title: string; description: string; status: Status; details: string[] };
type RiskLevel = { level: string; title: string; examples: string; rule: string };

const statusClass: Record<Status, string> = {
  LIVE: 'border-emerald-300/20 text-emerald-200 bg-emerald-300/[0.035]',
  PARTIAL: 'border-accent/20 text-accent bg-accent/[0.025]',
  'IN DEVELOPMENT': 'border-sky-300/20 text-sky-200/85 bg-sky-300/[0.025]',
  ROADMAP: 'border-white/[0.08] text-text-dim bg-white/[0.012]',
};
const publicStatusClass: Record<PublicProofStatus, string> = {
  LIVE: statusClass.LIVE,
  BETA: 'border-accent/25 text-accent bg-accent/[0.03]',
  PARTIAL: statusClass.PARTIAL,
  'IN DEVELOPMENT': statusClass['IN DEVELOPMENT'],
  ROADMAP: statusClass.ROADMAP,
};
const statusDot: Record<Status, string> = { LIVE: 'bg-emerald-300', PARTIAL: 'bg-accent', 'IN DEVELOPMENT': 'bg-sky-300', ROADMAP: 'bg-white/35' };

function StatusPill({ status }: { status: Status }) {
  return <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[8px] font-medium uppercase tracking-[0.16em] ${statusClass[status]}`}><span className={`h-1.5 w-1.5 rounded-full ${statusDot[status]}`} aria-hidden="true" />{status}</span>;
}

function PublicStatusPill({ status }: { status: PublicProofStatus }) {
  return <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[8px] font-medium uppercase tracking-[0.16em] ${publicStatusClass[status]}`}>{status}</span>;
}

function Pipeline({ steps }: { steps: { label: string; note?: string }[] }) {
  return <div className="grid gap-2" role="list" aria-label="AI architecture pipeline">{steps.map((step, index) => <React.Fragment key={step.label}><div role="listitem" className="grid grid-cols-[42px_1fr_auto] items-center gap-3 rounded-xl border border-white/[0.055] bg-black/20 px-4 py-3.5"><span className="font-mono text-[9px] text-accent/55">{String(index + 1).padStart(2, '0')}</span><div><p className="text-xs sm:text-sm text-white">{step.label}</p>{step.note && <p className="mt-1 text-[10px] leading-relaxed text-text-dim">{step.note}</p>}</div><Activity size={13} className="text-text-dim" aria-hidden="true" /></div>{index < steps.length - 1 && <ArrowDown size={12} className="mx-auto text-accent/35" aria-hidden="true" />}</React.Fragment>)}</div>;
}

function SectionHeader({ badge, title, text }: { badge: string; title: string; text: string }) {
  return <div className="mb-10 max-w-4xl sm:mb-14"><Badge variant="accent" className="mb-6">{badge}</Badge><h2 className="mb-5 font-outfit text-3xl font-semibold tracking-[-0.035em] text-white sm:text-4xl md:text-5xl">{title}</h2><p className="max-w-3xl text-sm leading-relaxed text-text-muted sm:text-base">{text}</p></div>;
}

function ArchitectureLayer({ title, status, items, icon: Icon }: { title: string; status: string; items: string[]; icon: LucideIcon }) {
  return <div className="rounded-2xl border border-white/[0.055] bg-white/[0.012] p-6 sm:p-7"><div className="mb-6 flex items-center justify-between gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-full border border-accent/20 text-accent"><Icon size={17} /></div><span className="text-[8px] uppercase tracking-[0.16em] text-text-dim">{status}</span></div><h3 className="mb-5 font-outfit text-base text-white">{title}</h3><div className="flex flex-wrap gap-2">{items.map((item) => <span key={item} className="rounded-full border border-white/[0.055] px-2.5 py-1 text-[8px] uppercase tracking-[0.11em] text-text-dim">{item}</span>)}</div></div>;
}

export const AIPlatformSection: React.FC = () => {
  const { locale } = useLanguage();
  const es = locale === 'es';
  const aiProof = getCapabilityProof('ai-layer');
  const knowledgeProof = getCapabilityProof('ctg-knowledge-v01');
  const overallStatus: Status = aiProof.status;
  const knowledgePublicStatus = getPublicProofStatus(knowledgeProof);

  const copy = es ? {
    badge: 'CTG ONE AI · Arquitectura pública', eyebrow: 'Inteligencia integrada a la operación',
    title: 'La IA no es una función aislada.', highlight: 'Es una capa de inteligencia.',
    description: 'CTG One está construyendo una arquitectura para conectar datos autorizados, contexto, modelos, agentes y workflows dentro de su propio ecosistema. Esta página separa explícitamente lo que existe, lo que está en desarrollo y lo que permanece en roadmap.',
    current: 'Estado de plataforma', currentText: 'No existe todavía un runtime general de modelos, RAG o agentes promovido a producción. La arquitectura y la gobernanza están definidas; la capacidad general permanece IN DEVELOPMENT.',
    evidence: 'Evidence before answers', evidenceText: 'Las respuestas factuales deben privilegiar contexto verificable, fuentes rastreables y controles antes que fluidez sin evidencia.',
    architectureBadge: '01 · AI Architecture', architectureTitle: 'Cómo entra la inteligencia al sistema.', architectureText: 'La autorización ocurre antes del modelo. La acción ocurre después de validación, políticas y, cuando corresponde, supervisión humana.',
    capabilitiesBadge: '02 · Capabilities', capabilitiesTitle: 'Capacidades con madurez explícita.', capabilitiesText: 'Un diagrama, una librería o un prompt no convierten una capacidad en LIVE. Cada bloque debe demostrar implementación, evaluación y operación.',
    agentBadge: '03 · Agent Runtime', agentTitle: 'Un agente es un sistema, no un chatbot.', agentText: 'El runtime objetivo combina modelo, contexto, herramientas, memoria controlada, permisos, políticas, evaluación y escalamiento humano.',
    knowledgeBadge: '04 · CTG Knowledge', knowledgeTitle: 'Primer piloto RAG verificable del ecosistema.', knowledgeText: 'CTG Knowledge ya cuenta con un piloto autenticado con ingesta curada, pgvector, recuperación semántica, acceso server-side a modelos y metadatos de citas. Permanece en BETA/PARTIAL: no se promoverá a LIVE hasta contar con evaluación reproducible y evidencia operativa suficiente.',
    citationTitle: 'Citation-First AI', citationText: 'Pregunta → recuperación → ranking → contexto → generación → citas. Para conocimiento interno, una respuesta sin trazabilidad debe considerarse inferior a una respuesta sustentada.',
    humanBadge: '05 · Human Authority', humanTitle: 'La IA propone. Las personas autorizan.', humanText: 'La autonomía depende del riesgo. Las operaciones financieras, legales, de identidad y otras acciones sensibles conservan control humano explícito.',
    governanceBadge: '06 · Governance & Security', governanceTitle: 'Controlar la inteligencia antes de escalarla.', governanceText: 'Datos, permisos, tool scopes, prompt injection, privacidad, versionado, evaluación, fallbacks, costo y observabilidad forman parte del producto, no son anexos.',
    evaluationBadge: '07 · Evaluation', evaluationTitle: 'Una capacidad no está lista porque “parece funcionar”.', evaluationText: 'Antes de promover un sistema a LIVE debe existir un dataset de evaluación, métricas, revisión, comparación y criterios de release.',
    ecosystemBadge: '08 · Applied AI', ecosystemTitle: 'IA aplicada a problemas operativos concretos.', ecosystemText: 'Los casos se mantienen como desarrollo o roadmap mientras no exista evidencia técnica suficiente en cada unidad.',
    osBadge: '09 · CTG One OS', osTitle: 'La inteligencia se apoya en la plataforma compartida.', osText: 'CTG One OS aporta identidad, datos, seguridad, transacciones, documentos e integraciones. CTG One AI añade contexto, modelos, agentes y evaluación sobre límites autorizados.',
    proof: 'Ver estado técnico', labs: 'Explorar Labs', technology: 'Explorar Technology', products: 'Ver productos', demo: 'ARCHITECTURE DEMO · No ejecuta un modelo real',
  } : {
    badge: 'CTG ONE AI · Public architecture', eyebrow: 'Intelligence embedded into operations',
    title: 'AI is not an isolated feature.', highlight: 'It is an intelligence layer.',
    description: 'CTG One is building an architecture that connects authorized data, context, models, agents, and workflows across its own ecosystem. This page explicitly separates what exists, what is in development, and what remains on the roadmap.',
    current: 'Platform status', currentText: 'There is not yet a general production model, RAG, or agent runtime promoted to LIVE. Architecture and governance are defined; the general capability remains IN DEVELOPMENT.',
    evidence: 'Evidence before answers', evidenceText: 'Factual answers should favor verifiable context, traceable sources, and controls over unsupported fluency.',
    architectureBadge: '01 · AI Architecture', architectureTitle: 'How intelligence enters the system.', architectureText: 'Authorization occurs before the model. Action occurs after validation, policy, and human oversight where required.',
    capabilitiesBadge: '02 · Capabilities', capabilitiesTitle: 'Capabilities with explicit maturity.', capabilitiesText: 'A diagram, library, or prompt does not make a capability LIVE. Every block must demonstrate implementation, evaluation, and operating evidence.',
    agentBadge: '03 · Agent Runtime', agentTitle: 'An agent is a system, not a chatbot.', agentText: 'The target runtime combines model, context, tools, controlled memory, permissions, policy, evaluation, and human escalation.',
    knowledgeBadge: '04 · CTG Knowledge', knowledgeTitle: 'The ecosystem’s first verifiable RAG pilot.', knowledgeText: 'CTG Knowledge already has an authenticated pilot with curated ingestion, pgvector, semantic retrieval, server-side model access, and citation metadata. It remains BETA/PARTIAL and will not be promoted to LIVE until reproducible evaluation and sufficient operating evidence exist.',
    citationTitle: 'Citation-First AI', citationText: 'Question → retrieval → ranking → context → generation → citations. For internal knowledge, an untraceable answer should be considered inferior to a grounded answer.',
    humanBadge: '05 · Human Authority', humanTitle: 'AI proposes. Humans authorize.', humanText: 'Autonomy depends on risk. Financial, legal, identity, and other sensitive actions retain explicit human control.',
    governanceBadge: '06 · Governance & Security', governanceTitle: 'Control intelligence before scaling it.', governanceText: 'Data boundaries, permissions, tool scopes, prompt injection, privacy, versioning, evaluation, fallbacks, cost, and observability are part of the product, not add-ons.',
    evaluationBadge: '07 · Evaluation', evaluationTitle: 'A capability is not ready because it “seems to work”.', evaluationText: 'Before promoting a system to LIVE, an evaluation dataset, metrics, review process, comparison, and release criteria must exist.',
    ecosystemBadge: '08 · Applied AI', ecosystemTitle: 'AI applied to concrete operating problems.', ecosystemText: 'Use cases remain in development or roadmap until sufficient technical evidence exists for each business unit.',
    osBadge: '09 · CTG One OS', osTitle: 'Intelligence is built on the shared platform.', osText: 'CTG One OS provides identity, data, security, transactions, documents, and integrations. CTG One AI adds context, models, agents, and evaluation within authorized boundaries.',
    proof: 'View technology status', labs: 'Explore Labs', technology: 'Explore Technology', products: 'View products', demo: 'ARCHITECTURE DEMO · Does not execute a real model',
  };

  const mainPipeline = es ? [
    { label: 'Datos autorizados', note: 'Fuentes permitidas y delimitadas por identidad, rol y unidad.' }, { label: 'Ingesta', note: 'Documentos, eventos y sistemas internos pasan por validación.' }, { label: 'Contexto', note: 'Solo la información necesaria para la tarea.' }, { label: 'Retrieval', note: 'Recuperación semántica cuando el caso lo requiere.' }, { label: 'Modelo', note: 'Selección según política, tarea, costo y evaluación.' }, { label: 'Agente + herramientas', note: 'Herramientas explícitas, scope restringido y límites de acción.' }, { label: 'Workflow', note: 'Reglas determinísticas conectan inferencia con procesos.' }, { label: 'Supervisión humana', note: 'Obligatoria cuando el nivel de riesgo lo exige.' }, { label: 'Acción + auditoría', note: 'Resultado trazable con logs y evidencia suficiente.' },
  ] : [
    { label: 'Authorized data', note: 'Sources bounded by identity, role, and business unit.' }, { label: 'Ingestion', note: 'Documents, events, and internal systems pass through validation.' }, { label: 'Context', note: 'Only the information required for the task.' }, { label: 'Retrieval', note: 'Semantic retrieval where the use case requires it.' }, { label: 'Model', note: 'Selected according to policy, task, cost, and evaluation.' }, { label: 'Agent + tools', note: 'Explicit tools, restricted scope, and action limits.' }, { label: 'Workflow', note: 'Deterministic rules connect inference to processes.' }, { label: 'Human oversight', note: 'Required whenever the risk level demands it.' }, { label: 'Action + audit', note: 'Traceable outcome with logs and sufficient evidence.' },
  ];

  const capabilities: Capability[] = es ? [
    { icon: FileText, title: 'Document Intelligence', description: 'Extracción, clasificación, resumen y salidas estructuradas sobre documentos autorizados.', status: 'IN DEVELOPMENT', details: ['Parsing', 'Clasificación', 'Resumen', 'Structured output'] },
    { icon: Search, title: 'Knowledge Systems', description: 'Búsqueda semántica, RAG, recuperación contextual y respuestas con fuentes.', status: knowledgeProof.status, details: ['Semantic retrieval', 'RAG', 'Citations', 'Context boundaries'] },
    { icon: Bot, title: 'AI Agents', description: 'Agentes especializados con identidad, propósito, herramientas, permisos y escalamiento.', status: 'ROADMAP', details: ['Tool scopes', 'Policy', 'Human escalation', 'Audit'] },
    { icon: Workflow, title: 'AI Automation', description: 'Clasificación, routing, borradores, alertas y recomendaciones dentro de workflows controlados.', status: 'PARTIAL', details: ['Routing', 'Drafting', 'Alerts', 'Rules'] },
    { icon: BarChart3, title: 'Decision Support', description: 'Análisis y recomendaciones para apoyar decisiones, sin reemplazar autoridad humana en procesos sensibles.', status: 'ROADMAP', details: ['Analysis', 'Patterns', 'Scenarios', 'Recommendations'] },
    { icon: Gauge, title: 'AI Observability', description: 'Latencia, tokens, costo, errores, tool calls, escalamiento y calidad por caso de uso.', status: 'ROADMAP', details: ['Latency', 'Cost', 'Errors', 'Quality'] },
  ] : [
    { icon: FileText, title: 'Document Intelligence', description: 'Extraction, classification, summarization, and structured outputs over authorized documents.', status: 'IN DEVELOPMENT', details: ['Parsing', 'Classification', 'Summarization', 'Structured output'] },
    { icon: Search, title: 'Knowledge Systems', description: 'Semantic search, RAG, contextual retrieval, and source-grounded answers.', status: knowledgeProof.status, details: ['Semantic retrieval', 'RAG', 'Citations', 'Context boundaries'] },
    { icon: Bot, title: 'AI Agents', description: 'Specialized agents with identity, purpose, tools, permissions, and escalation.', status: 'ROADMAP', details: ['Tool scopes', 'Policy', 'Human escalation', 'Audit'] },
    { icon: Workflow, title: 'AI Automation', description: 'Classification, routing, drafting, alerts, and recommendations inside controlled workflows.', status: 'PARTIAL', details: ['Routing', 'Drafting', 'Alerts', 'Rules'] },
    { icon: BarChart3, title: 'Decision Support', description: 'Analysis and recommendations to support decisions without replacing human authority in sensitive processes.', status: 'ROADMAP', details: ['Analysis', 'Patterns', 'Scenarios', 'Recommendations'] },
    { icon: Gauge, title: 'AI Observability', description: 'Latency, tokens, cost, errors, tool calls, escalation, and quality by use case.', status: 'ROADMAP', details: ['Latency', 'Cost', 'Errors', 'Quality'] },
  ];

  const risks: RiskLevel[] = es ? [
    { level: 'L1', title: 'Bajo riesgo', examples: 'Búsqueda, clasificación, resumen, apoyo informativo.', rule: 'Puede automatizarse con controles y trazabilidad.' },
    { level: 'L2', title: 'Riesgo moderado', examples: 'Borradores, routing, recomendaciones, priorización.', rule: 'Requiere revisión contextual y límites de acción.' },
    { level: 'L3', title: 'Alto riesgo', examples: 'Finanzas, identidad, legal, pagos, cambios sensibles.', rule: 'Requiere autorización humana explícita.' },
  ] : [
    { level: 'L1', title: 'Low risk', examples: 'Search, classification, summarization, informational support.', rule: 'May be automated with controls and traceability.' },
    { level: 'L2', title: 'Moderate risk', examples: 'Drafting, routing, recommendations, prioritization.', rule: 'Requires contextual review and action boundaries.' },
    { level: 'L3', title: 'High risk', examples: 'Finance, identity, legal, payments, sensitive changes.', rule: 'Requires explicit human authorization.' },
  ];

  return (
    <section id="ai-platform" className="relative overflow-hidden bg-bg-primary py-20 sm:py-28 md:py-32">
      <Container>
        <FadeInSection>
          <div className="max-w-5xl mb-14">
            <Badge variant="accent" className="mb-7">{copy.badge}</Badge>
            <div className="flex items-center gap-3 mb-5"><span className="w-8 h-px bg-accent/60" /><span className="text-[9px] uppercase tracking-[0.24em] text-text-dim">{copy.eyebrow}</span></div>
            <h1 className="font-outfit font-semibold text-4xl sm:text-5xl md:text-6xl xl:text-[4.5rem] leading-[1.02] tracking-[-0.045em] max-w-5xl mb-7"><span className="text-white">{copy.title}</span>{' '}<span className="text-accent">{copy.highlight}</span></h1>
            <p className="text-sm sm:text-base text-text-muted leading-relaxed max-w-3xl">{copy.description}</p>
          </div>
        </FadeInSection>

        <div className="grid lg:grid-cols-2 gap-6 mb-20">
          <FadeInSection direction="left"><div className="h-full rounded-2xl border border-white/[0.055] bg-white/[0.012] p-7 sm:p-8"><div className="flex items-center justify-between gap-4 mb-5"><span className="text-[9px] uppercase tracking-[0.18em] text-text-dim">{copy.current}</span><StatusPill status={overallStatus} /></div><p className="text-sm leading-relaxed text-text-muted">{copy.currentText}</p></div></FadeInSection>
          <FadeInSection direction="right"><div className="h-full rounded-2xl border border-accent/15 bg-accent/[0.025] p-7 sm:p-8"><div className="flex items-center gap-3 mb-5"><Eye size={17} className="text-accent" /><span className="text-[9px] uppercase tracking-[0.18em] text-accent">{copy.evidence}</span></div><p className="text-sm leading-relaxed text-text-muted">{copy.evidenceText}</p></div></FadeInSection>
        </div>

        <SectionHeader badge={copy.architectureBadge} title={copy.architectureTitle} text={copy.architectureText} />
        <div className="grid lg:grid-cols-[0.8fr_1.2fr] gap-8 mb-24"><FadeInSection direction="left"><Pipeline steps={mainPipeline} /></FadeInSection><FadeInSection direction="right"><div className="grid sm:grid-cols-2 gap-4"><ArchitectureLayer title="Identity & policy" status="LIVE" items={['Auth', 'RBAC', 'RLS', 'Tool scopes']} icon={ShieldCheck} /><ArchitectureLayer title="Context & retrieval" status={knowledgePublicStatus} items={['Curated ingestion', 'pgvector', 'Semantic retrieval', 'Citations']} icon={Database} /><ArchitectureLayer title="Models & agents" status="IN DEVELOPMENT" items={['LLM access', 'Agents', 'Tool use', 'Fallbacks']} icon={BrainCircuit} /><ArchitectureLayer title="Evaluation & audit" status="IN DEVELOPMENT" items={['Datasets', 'Metrics', 'Human review', 'Logs']} icon={BarChart3} /></div></FadeInSection></div>

        <SectionHeader badge={copy.capabilitiesBadge} title={copy.capabilitiesTitle} text={copy.capabilitiesText} />
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-24">{capabilities.map((capability, index) => { const Icon = capability.icon; return <FadeInSection key={capability.title} delay={0.03 + index * 0.04}><article className="h-full rounded-2xl border border-white/[0.05] bg-white/[0.01] p-6"><div className="flex items-start justify-between gap-3 mb-6"><span className="w-10 h-10 rounded-full border border-accent/20 flex items-center justify-center text-accent"><Icon size={17} /></span><StatusPill status={capability.status} /></div><h3 className="font-outfit text-lg text-white mb-3">{capability.title}</h3><p className="text-xs sm:text-sm text-text-muted leading-relaxed mb-5">{capability.description}</p><div className="flex flex-wrap gap-2">{capability.details.map((detail) => <span key={detail} className="text-[8px] uppercase tracking-[0.11em] rounded-full border border-white/[0.055] px-2.5 py-1 text-text-dim">{detail}</span>)}</div></article></FadeInSection>; })}</div>

        <SectionHeader badge={copy.agentBadge} title={copy.agentTitle} text={copy.agentText} />
        <div className="grid lg:grid-cols-3 gap-4 mb-24">{['Model + context', 'Tools + permissions', 'Policy + human escalation'].map((label, index) => <FadeInSection key={label} delay={0.04 + index * 0.04}><div className="rounded-2xl border border-white/[0.05] p-6 min-h-[170px]"><div className="text-accent mb-5">{index === 0 ? <Cpu size={19} /> : index === 1 ? <Lock size={19} /> : <UserCheck size={19} />}</div><h3 className="font-outfit text-base text-white">{label}</h3></div></FadeInSection>)}</div>

        <div className="mb-24 rounded-2xl border border-accent/15 bg-accent/[0.02] p-7 sm:p-9">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-5 mb-6"><div><Badge variant="accent" className="mb-5">{copy.knowledgeBadge}</Badge><h2 className="font-outfit text-2xl sm:text-3xl text-white mb-3">{copy.knowledgeTitle}</h2><p className="text-sm text-text-muted leading-relaxed max-w-3xl">{copy.knowledgeText}</p></div><PublicStatusPill status={knowledgePublicStatus} /></div>
          <div className="grid lg:grid-cols-2 gap-5"><div className="rounded-xl border border-white/[0.05] p-6"><h3 className="font-outfit text-base text-white mb-3">{copy.citationTitle}</h3><p className="text-xs sm:text-sm text-text-muted leading-relaxed">{copy.citationText}</p></div><div className="rounded-xl border border-white/[0.05] p-6"><div className="grid grid-cols-2 gap-3 text-[9px] uppercase tracking-[0.12em] text-text-dim"><span>Curated ingestion</span><span>pgvector</span><span>Semantic retrieval</span><span>Citation metadata</span></div></div></div>
        </div>

        <SectionHeader badge={copy.humanBadge} title={copy.humanTitle} text={copy.humanText} />
        <div className="grid md:grid-cols-3 gap-4 mb-24">{risks.map((risk) => <div key={risk.level} className="rounded-2xl border border-white/[0.05] p-6"><div className="flex items-center gap-3 mb-4"><span className="font-mono text-accent text-xs">{risk.level}</span><h3 className="font-outfit text-white">{risk.title}</h3></div><p className="text-xs text-text-muted mb-3">{risk.examples}</p><p className="text-[11px] text-text-dim leading-relaxed">{risk.rule}</p></div>)}</div>

        <SectionHeader badge={copy.governanceBadge} title={copy.governanceTitle} text={copy.governanceText} />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-24">{[['Data boundaries', Database], ['Tool scopes', Network], ['Prompt injection', AlertTriangle], ['Audit trail', FileText]].map(([label, Icon]) => { const C = Icon as LucideIcon; return <div key={label as string} className="rounded-xl border border-white/[0.05] p-5"><C size={17} className="text-accent mb-4" /><span className="text-sm text-white">{label as string}</span></div>; })}</div>

        <SectionHeader badge={copy.evaluationBadge} title={copy.evaluationTitle} text={copy.evaluationText} />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-24">{['Evaluation dataset', 'Quality metrics', 'Human review', 'Release gate'].map((item, index) => <div key={item} className="rounded-xl border border-white/[0.05] p-5"><div className="flex items-center gap-3 mb-3">{index < 3 ? <CircleDashed size={15} className="text-text-dim" /> : <CheckCircle2 size={15} className="text-accent" />}<span className="text-sm text-white">{item}</span></div></div>)}</div>

        <SectionHeader badge={copy.ecosystemBadge} title={copy.ecosystemTitle} text={copy.ecosystemText} />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-24">{['Knowledge', 'Operations', 'Customer support', 'Decision support'].map((item) => <div key={item} className="rounded-xl border border-white/[0.05] p-5 text-sm text-white">{item}</div>)}</div>

        <SectionHeader badge={copy.osBadge} title={copy.osTitle} text={copy.osText} />
        <div className="flex flex-wrap gap-3"><Link href="/technology/status" className="inline-flex items-center gap-2 text-accent text-xs uppercase tracking-[0.14em]">{copy.proof}<ArrowUpRight size={14} /></Link><Link href="/labs" className="inline-flex items-center gap-2 text-accent text-xs uppercase tracking-[0.14em]">{copy.labs}<ArrowUpRight size={14} /></Link><Link href="/services" className="inline-flex items-center gap-2 text-accent text-xs uppercase tracking-[0.14em]">{copy.technology}<ArrowUpRight size={14} /></Link><Link href="/products" className="inline-flex items-center gap-2 text-accent text-xs uppercase tracking-[0.14em]">{copy.products}<ArrowUpRight size={14} /></Link></div>
      </Container>
    </section>
  );
};
