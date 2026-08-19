'use client';

import React from 'react';
import { Container } from '@/components/ui';
import { FadeInSection } from '@/components/ui/FadeInSection';
import { Badge } from '@/components/ui/Badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { getCapabilityProof, type ProofStatus } from '@/data/technology-proof';
import {
  Activity,
  ArrowUpRight,
  BrainCircuit,
  Cloud,
  Code2,
  Cpu,
  Database,
  GitBranch,
  Layers3,
  Network,
  ShieldCheck,
  Workflow,
  type LucideIcon,
} from 'lucide-react';

type Maturity = ProofStatus;

type Capability = {
  icon: LucideIcon;
  title: string;
  description: string;
  technologies: string[];
  status: Maturity;
};

const identityStatus = getCapabilityProof('identity-auth').status;
const dataSecurityStatus = getCapabilityProof('data-security').status;
const deliveryStatus = getCapabilityProof('delivery-platform').status;
const observabilityStatus = getCapabilityProof('observability-baseline').status;
const aiStatus = getCapabilityProof('ai-layer').status;

const statusClass: Record<Maturity, string> = {
  LIVE: 'border-accent/30 text-accent bg-accent/[0.035]',
  PARTIAL: 'border-white/[0.1] text-text-secondary bg-white/[0.02]',
  'IN DEVELOPMENT': 'border-white/[0.08] text-text-dim bg-white/[0.015]',
  ROADMAP: 'border-white/[0.06] text-text-dim bg-transparent',
};

export const AboutSection: React.FC = () => {
  const { locale } = useLanguage();
  const es = locale === 'es';

  const copy = es
    ? {
        badge: 'Nosotros · CTG One Technology',
        eyebrow: 'Tecnología aplicada a operaciones reales',
        title: 'Construimos la capa tecnológica de',
        titleHighlight: 'nuestro propio ecosistema.',
        intro:
          'CTG One Technology es una empresa tecnológica con sede en Cartagena que desarrolla software propietario e infraestructura digital para sus propias unidades de negocio. Nuestro modelo conecta ingeniería, datos, seguridad y producto con operaciones reales. Las capacidades avanzadas de inteligencia artificial se encuentran en desarrollo y se presentan con su estado de madurez explícito.',
        secondary:
          'No funcionamos como agencia comercial ni como fábrica de software tercerizada. Construimos desde dentro de los negocios, desplegamos en entornos reales y buscamos convertir componentes tecnológicos repetibles en una capa común para el ecosistema.',
        stats: [
          ['12', 'Unidades de negocio'],
          ['2024', 'Fundación'],
          ['1', 'Capa tecnológica común'],
          ['Cartagena', 'Base operativa'],
        ],
        capabilitiesBadge: 'Capacidades verificables',
        capabilitiesTitle: 'De la necesidad operativa al',
        capabilitiesHighlight: 'sistema en producción.',
        capabilitiesIntro:
          'Cada bloque indica su madurez. LIVE significa implementación comprobable en el proyecto actual; PARTIAL identifica capacidades existentes pero todavía no consolidadas como plataforma compartida; IN DEVELOPMENT y ROADMAP representan trabajo futuro.',
        modelBadge: 'Modelo operativo',
        modelTitle: 'Construir dentro del negocio cambia',
        modelHighlight: 'cómo desarrollamos tecnología.',
        modelText:
          'Detectamos fricciones operativas, modelamos procesos, construimos una solución, la integramos, desplegamos y medimos. El objetivo es reducir la distancia entre estrategia y software, sin confundir una visión tecnológica con una capacidad que todavía no ha llegado a producción.',
        modelSteps: ['Observar', 'Modelar', 'Construir', 'Integrar', 'Desplegar', 'Medir'],
        stackBadge: 'Arquitectura compartida',
        stackTitle: 'Una base común, con estados de madurez visibles.',
        stackText:
          'Identidad, datos, lógica de negocio y despliegue ya forman parte de la arquitectura productiva. Automatización e integraciones existen de forma parcial. La observabilidad avanzada permanece como una prioridad de profesionalización y no se presenta como una capacidad completa.',
        principle:
          'Nuestra credibilidad tecnológica depende de una regla simple: lo que mostramos como activo debe poder demostrarse en código, infraestructura o producto funcionando.',
        explore: 'Explorar tecnología',
      }
    : {
        badge: 'About · CTG One Technology',
        eyebrow: 'Technology applied to real operations',
        title: 'We build the technology layer for',
        titleHighlight: 'our own ecosystem.',
        intro:
          'CTG One Technology is a Cartagena-based technology company building proprietary software and digital infrastructure for its own business units. Our model connects engineering, data, security, and product with real operations. Advanced artificial-intelligence capabilities remain in development and are presented with an explicit maturity status.',
        secondary:
          'We are not a commercial agency or an outsourced software factory. We build from inside the businesses, deploy into real environments, and aim to turn repeatable technology components into a shared ecosystem layer.',
        stats: [
          ['12', 'Business units'],
          ['2024', 'Founded'],
          ['1', 'Shared technology layer'],
          ['Cartagena', 'Operating base'],
        ],
        capabilitiesBadge: 'Verifiable capabilities',
        capabilitiesTitle: 'From operating need to',
        capabilitiesHighlight: 'production system.',
        capabilitiesIntro:
          'Every block shows its maturity. LIVE means implementation can be verified in the current project; PARTIAL identifies existing capabilities not yet consolidated as a shared platform; IN DEVELOPMENT and ROADMAP represent future work.',
        modelBadge: 'Operating model',
        modelTitle: 'Building inside the business changes',
        modelHighlight: 'how we develop technology.',
        modelText:
          'We identify operational friction, model processes, build a solution, integrate it, deploy it, and measure it. The goal is to reduce the distance between strategy and software without confusing technology vision with a capability that has not reached production.',
        modelSteps: ['Observe', 'Model', 'Build', 'Integrate', 'Deploy', 'Measure'],
        stackBadge: 'Shared architecture',
        stackTitle: 'A common foundation with visible maturity states.',
        stackText:
          'Identity, data, business logic, and deployment are already part of the production architecture. Automation and integrations exist partially. Advanced observability remains a professionalization priority and is not presented as a complete capability.',
        principle:
          'Our technology credibility depends on a simple rule: anything presented as live must be demonstrable in code, infrastructure, or a working product.',
        explore: 'Explore technology',
      };

  const capabilities: Capability[] = es
    ? [
        {
          icon: Code2,
          title: 'Ingeniería de software',
          description: 'Aplicaciones Next.js y React, TypeScript, dashboards, autenticación, Route Handlers, lógica server-side y productos digitales desplegados en producción.',
          technologies: ['Next.js', 'TypeScript', 'React', 'Server-side'],
          status: 'LIVE',
        },
        {
          icon: BrainCircuit,
          title: 'IA aplicada',
          description: 'La visión incluye agentes, RAG, asistencia contextual y automatización basada en modelos. Estas capacidades todavía no constituyen una capa productiva verificable del repositorio.',
          technologies: ['AI Agents', 'RAG', 'LLM Workflows'],
          status: aiStatus,
        },
        {
          icon: Workflow,
          title: 'Automatización de procesos',
          description: 'Existen flujos server-side, validaciones, triggers de base de datos y lógica de estados; falta consolidarlos en una capa transversal de orquestación y automatización.',
          technologies: ['Workflows', 'DB Triggers', 'Validation'],
          status: 'PARTIAL',
        },
        {
          icon: Database,
          title: 'Datos y plataformas transaccionales',
          description: 'PostgreSQL, Supabase Auth, Row Level Security, almacenamiento, ledgers, trazabilidad y estructuras transaccionales soportan funciones reales de la plataforma.',
          technologies: ['PostgreSQL', 'Supabase', 'RLS', 'Ledger'],
          status: dataSecurityStatus,
        },
        {
          icon: Network,
          title: 'Integraciones e infraestructura compartida',
          description: 'La aplicación ya comparte autenticación, datos, almacenamiento y componentes; pagos e integraciones externas amplias permanecen condicionados a configuración y despliegue real.',
          technologies: ['Identity', 'Storage', 'APIs', 'Integrations'],
          status: 'PARTIAL',
        },
        {
          icon: Cloud,
          title: 'Cloud, seguridad y despliegue',
          description: 'GitHub, GitHub Actions, Render, variables de entorno, autorización server-side y controles de acceso forman parte de la operación productiva actual.',
          technologies: ['GitHub', 'Render', 'CI/CD', 'Security'],
          status: deliveryStatus,
        },
      ]
    : [
        {
          icon: Code2,
          title: 'Software engineering',
          description: 'Next.js and React applications, TypeScript, dashboards, authentication, Route Handlers, server-side logic, and digital products deployed to production.',
          technologies: ['Next.js', 'TypeScript', 'React', 'Server-side'],
          status: 'LIVE',
        },
        {
          icon: BrainCircuit,
          title: 'Applied AI',
          description: 'The vision includes agents, RAG, contextual assistance, and model-driven automation. These capabilities do not yet constitute a verifiable production layer in the repository.',
          technologies: ['AI Agents', 'RAG', 'LLM Workflows'],
          status: aiStatus,
        },
        {
          icon: Workflow,
          title: 'Process automation',
          description: 'Server-side flows, validation, database triggers, and state logic exist today; a reusable cross-ecosystem orchestration layer has not yet been consolidated.',
          technologies: ['Workflows', 'DB Triggers', 'Validation'],
          status: 'PARTIAL',
        },
        {
          icon: Database,
          title: 'Data and transactional platforms',
          description: 'PostgreSQL, Supabase Auth, Row Level Security, storage, ledgers, traceability, and transactional structures support real platform functions.',
          technologies: ['PostgreSQL', 'Supabase', 'RLS', 'Ledger'],
          status: dataSecurityStatus,
        },
        {
          icon: Network,
          title: 'Integrations and shared infrastructure',
          description: 'The application already shares authentication, data, storage, and components; payments and broader external integrations remain dependent on real production configuration.',
          technologies: ['Identity', 'Storage', 'APIs', 'Integrations'],
          status: 'PARTIAL',
        },
        {
          icon: Cloud,
          title: 'Cloud, security, and deployment',
          description: 'GitHub, GitHub Actions, Render, environment configuration, server-side authorization, and access controls are part of the current production operation.',
          technologies: ['GitHub', 'Render', 'CI/CD', 'Security'],
          status: deliveryStatus,
        },
      ];

  const architecture: Array<{ icon: LucideIcon; label: string; status: Maturity }> = [
    { icon: ShieldCheck, label: es ? 'Identidad y acceso' : 'Identity & access', status: identityStatus },
    { icon: Database, label: es ? 'Datos transaccionales' : 'Transactional data', status: dataSecurityStatus },
    { icon: Cpu, label: es ? 'Lógica de negocio' : 'Business logic', status: 'LIVE' },
    { icon: Workflow, label: es ? 'Automatización' : 'Automation', status: 'PARTIAL' },
    { icon: GitBranch, label: es ? 'Integraciones' : 'Integrations', status: 'PARTIAL' },
    { icon: Activity, label: es ? 'Observabilidad' : 'Observability', status: observabilityStatus },
  ];

  return (
    <section id="about" className="relative overflow-hidden bg-bg-primary">
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute -top-24 right-[-12%] w-[760px] h-[760px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(212,162,89,0.075) 0%, rgba(212,162,89,0.02) 36%, transparent 68%)' }} />
        <div className="absolute inset-x-0 top-[610px] h-px bg-gradient-to-r from-transparent via-accent/15 to-transparent" />
        <div className="absolute left-[8%] top-[12%] h-[78%] w-px bg-gradient-to-b from-transparent via-white/[0.035] to-transparent" />
        <div className="absolute right-[8%] top-[5%] h-[88%] w-px bg-gradient-to-b from-transparent via-accent/[0.055] to-transparent" />
      </div>

      <div className="relative pt-10 sm:pt-16 md:pt-20 pb-20 sm:pb-28 md:pb-32">
        <Container>
          <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-12 lg:gap-20 items-end min-h-[560px]">
            <FadeInSection direction="left">
              <div>
                <Badge variant="accent" className="mb-7">{copy.badge}</Badge>
                <div className="flex items-center gap-3 mb-5">
                  <span className="w-8 h-px bg-accent/60" />
                  <span className="text-[9px] sm:text-[10px] uppercase tracking-[0.24em] text-text-dim">{copy.eyebrow}</span>
                </div>
                <h1 className="font-outfit font-semibold text-4xl sm:text-5xl md:text-6xl xl:text-[4.7rem] leading-[1.02] tracking-[-0.04em] max-w-4xl">
                  <span className="text-white">{copy.title}</span>{' '}
                  <span className="text-accent">{copy.titleHighlight}</span>
                </h1>
              </div>
            </FadeInSection>

            <FadeInSection direction="right" delay={0.12}>
              <div className="lg:pb-3">
                <p className="text-sm sm:text-base text-text-secondary leading-relaxed mb-5">{copy.intro}</p>
                <p className="text-xs sm:text-sm text-text-muted leading-relaxed">{copy.secondary}</p>
              </div>
            </FadeInSection>
          </div>

          <FadeInSection delay={0.18}>
            <div className="grid grid-cols-2 lg:grid-cols-4 border-y border-white/[0.055] mt-12">
              {copy.stats.map(([value, label], index) => (
                <div key={label} className={`relative py-7 sm:py-9 px-4 sm:px-7 ${index > 0 ? 'border-l border-white/[0.045]' : ''}`}>
                  <span className="absolute top-3 right-3 text-[8px] tracking-[0.2em] text-accent/35">0{index + 1}</span>
                  <div className="text-2xl sm:text-3xl font-outfit font-medium text-white tracking-tight mb-1.5">{value}</div>
                  <div className="text-[9px] sm:text-[10px] uppercase tracking-[0.16em] text-text-dim">{label}</div>
                </div>
              ))}
            </div>
          </FadeInSection>
        </Container>
      </div>

      <div className="relative py-20 sm:py-28 md:py-36 bg-bg-secondary border-y border-white/[0.035]">
        <Container>
          <FadeInSection>
            <div className="max-w-3xl mb-12 sm:mb-16">
              <Badge variant="accent" className="mb-6">{copy.capabilitiesBadge}</Badge>
              <h2 className="font-outfit font-semibold text-3xl sm:text-4xl md:text-5xl tracking-[-0.035em] leading-[1.05] mb-6">
                <span className="text-white">{copy.capabilitiesTitle}</span>{' '}
                <span className="text-accent">{copy.capabilitiesHighlight}</span>
              </h2>
              <p className="text-sm sm:text-base text-text-muted leading-relaxed max-w-2xl">{copy.capabilitiesIntro}</p>
            </div>
          </FadeInSection>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 border border-white/[0.05] rounded-2xl overflow-hidden bg-white/[0.008]">
            {capabilities.map((capability, index) => {
              const Icon = capability.icon;
              return (
                <FadeInSection key={capability.title} delay={0.04 + index * 0.05}>
                  <div className="group relative h-full min-h-[320px] p-7 sm:p-8 border-b border-r border-white/[0.045] hover:bg-accent/[0.025] transition-colors duration-500 overflow-hidden">
                    <div className="absolute top-0 right-0 w-28 h-28 rounded-full translate-x-1/2 -translate-y-1/2 border border-accent/[0.08] group-hover:scale-125 transition-transform duration-700" />
                    <div className="flex items-start justify-between gap-3 mb-8">
                      <span className="w-12 h-12 rounded-full border border-accent/25 bg-accent/[0.035] flex items-center justify-center text-accent">
                        <Icon size={20} strokeWidth={1.35} />
                      </span>
                      <span className={`text-[8px] uppercase tracking-[0.16em] px-2.5 py-1.5 rounded-full border ${statusClass[capability.status]}`}>{capability.status}</span>
                    </div>
                    <h3 className="text-lg sm:text-xl font-outfit font-medium text-white mb-3 tracking-tight">{capability.title}</h3>
                    <p className="text-xs sm:text-sm text-text-muted leading-relaxed mb-7">{capability.description}</p>
                    <div className="flex flex-wrap gap-2">
                      {capability.technologies.map((technology) => (
                        <span key={technology} className="text-[8px] sm:text-[9px] uppercase tracking-[0.12em] px-2.5 py-1.5 rounded-full border border-white/[0.06] text-text-dim bg-black/20">{technology}</span>
                      ))}
                    </div>
                  </div>
                </FadeInSection>
              );
            })}
          </div>
        </Container>
      </div>

      <div className="relative py-20 sm:py-28 md:py-36">
        <Container>
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <FadeInSection direction="left">
              <div>
                <Badge variant="accent" className="mb-6">{copy.modelBadge}</Badge>
                <h2 className="font-outfit font-semibold text-3xl sm:text-4xl md:text-5xl tracking-[-0.035em] leading-[1.05] mb-6">
                  <span className="text-white">{copy.modelTitle}</span>{' '}
                  <span className="text-accent">{copy.modelHighlight}</span>
                </h2>
                <p className="text-sm sm:text-base text-text-muted leading-relaxed max-w-xl">{copy.modelText}</p>
              </div>
            </FadeInSection>

            <FadeInSection direction="right" delay={0.12}>
              <div className="relative rounded-full aspect-square max-w-[500px] mx-auto border border-accent/15 flex items-center justify-center">
                <div className="absolute inset-[10%] rounded-full border border-white/[0.045] border-dashed" />
                <div className="absolute inset-[24%] rounded-full border border-accent/10" />
                <div className="w-28 h-28 rounded-full border border-accent/30 bg-black/60 flex flex-col items-center justify-center shadow-[0_0_90px_rgba(212,162,89,0.08)]">
                  <Layers3 className="text-accent mb-2" size={24} strokeWidth={1.3} />
                  <span className="text-[8px] uppercase tracking-[0.18em] text-text-dim text-center px-3">CTG One Core</span>
                </div>
                {copy.modelSteps.map((step, index) => {
                  const angle = (index / copy.modelSteps.length) * Math.PI * 2 - Math.PI / 2;
                  const x = 50 + 42 * Math.cos(angle);
                  const y = 50 + 42 * Math.sin(angle);
                  return (
                    <div key={step} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${x}%`, top: `${y}%` }}>
                      <div className="min-w-[78px] sm:min-w-[92px] text-center px-3 py-2 rounded-full border border-white/[0.065] bg-bg-primary/95 backdrop-blur-sm">
                        <span className="text-[8px] sm:text-[9px] uppercase tracking-[0.13em] text-text-muted">{step}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </FadeInSection>
          </div>
        </Container>
      </div>

      <div className="relative py-20 sm:py-28 md:py-32 bg-bg-secondary border-t border-white/[0.035]">
        <Container>
          <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-12 lg:gap-20 items-start">
            <FadeInSection direction="left">
              <div>
                <Badge variant="accent" className="mb-6">{copy.stackBadge}</Badge>
                <h2 className="font-outfit font-semibold text-3xl sm:text-4xl md:text-[2.8rem] tracking-[-0.035em] leading-[1.07] text-white mb-6">{copy.stackTitle}</h2>
                <p className="text-sm sm:text-base text-text-muted leading-relaxed mb-8">{copy.stackText}</p>
                <a href="/services" className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-accent hover:text-white transition-colors">
                  {copy.explore}
                  <ArrowUpRight size={14} />
                </a>
              </div>
            </FadeInSection>

            <div className="grid sm:grid-cols-2 gap-px rounded-xl overflow-hidden border border-white/[0.045] bg-white/[0.04]">
              {architecture.map(({ icon: Icon, label, status }, index) => (
                <FadeInSection key={label} delay={0.05 + index * 0.05}>
                  <div className="group bg-bg-secondary p-6 sm:p-7 min-h-[150px] hover:bg-accent/[0.025] transition-colors duration-500">
                    <div className="flex items-start justify-between gap-3 mb-5">
                      <Icon size={18} className="text-accent" strokeWidth={1.35} />
                      <span className={`text-[8px] uppercase tracking-[0.14em] px-2 py-1 rounded-full border ${statusClass[status]}`}>{status}</span>
                    </div>
                    <span className="text-xs sm:text-sm text-white font-outfit">{label}</span>
                  </div>
                </FadeInSection>
              ))}
            </div>
          </div>

          <FadeInSection delay={0.22}>
            <div className="mt-20 sm:mt-24 border-l border-accent/40 pl-6 sm:pl-8 max-w-4xl">
              <p className="font-outfit text-xl sm:text-2xl md:text-3xl leading-relaxed tracking-[-0.02em] text-white/90">{copy.principle}</p>
            </div>
          </FadeInSection>
        </Container>
      </div>
    </section>
  );
};