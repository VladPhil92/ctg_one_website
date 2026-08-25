'use client';

import React from 'react';
import Link from 'next/link';
import { Container } from '@/components/ui';
import { FadeInSection } from '@/components/ui/FadeInSection';
import { Badge } from '@/components/ui/Badge';
import { ECOSYSTEM } from '@/data/content';
import { getCapabilityProof, type ProofStatus } from '@/data/technology-proof';
import {
  Activity,
  ArrowUpRight,
  Beer,
  Bot,
  Boxes,
  BrainCircuit,
  Cloud,
  Code2,
  Database,
  GitBranch,
  KeyRound,
  Layers3,
  Network,
  ShieldCheck,
  WalletCards,
  Workflow,
  type LucideIcon,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

type Status = ProofStatus;

type TechnologyLayer = {
  icon: LucideIcon;
  code: string;
  title: string;
  description: string;
  technologies: string[];
  status: Status;
};

type OSModule = {
  icon: LucideIcon;
  title: string;
  description: string;
  status: Status;
};

type PlainCapability = {
  icon: LucideIcon;
  title: string;
  description: string;
};

const identityStatus = getCapabilityProof('identity-auth').status;
const dataSecurityStatus = getCapabilityProof('data-security').status;
const deliveryStatus = getCapabilityProof('delivery-platform').status;
const observabilityStatus = getCapabilityProof('observability-baseline').status;
const aiStatus = getCapabilityProof('ai-layer').status;

// CTG One Technology is rendered as the OS/core above this operating layer,
// so the business-unit tiles intentionally derive every other unit from the
// canonical ecosystem registry rather than maintaining a second name list.
const operatingBusinessUnits = ECOSYSTEM.units
  .filter((unit) => unit.id !== 'tech')
  .map((unit) => unit.name);

const STATUS_STYLES: Record<Status, string> = {
  LIVE: 'border-accent/30 text-accent bg-accent/[0.035]',
  PARTIAL: 'border-amber-300/20 text-amber-200/80 bg-amber-200/[0.025]',
  'IN DEVELOPMENT': 'border-sky-300/20 text-sky-200/75 bg-sky-200/[0.025]',
  ROADMAP: 'border-white/[0.08] text-text-dim bg-white/[0.015]',
};

export const ServicesSection: React.FC = () => {
  const { locale } = useLanguage();
  const es = locale === 'es';

  const copy = es
    ? {
        badge: 'Tecnología de CTG One',
        eyebrow: 'Cómo trabajamos',
        title: 'Construimos la tecnología',
        highlight: 'que usan nuestros propios negocios.',
        description:
          'Diseñamos una base tecnológica común (cuentas de usuario, gestión de información, automatización de tareas y seguridad) y la llevamos a cada negocio del ecosistema a su propio ritmo. Más abajo puedes ver en detalle qué está disponible hoy en cada uno y qué seguimos construyendo.',
        visibleBadge: 'Qué hacemos',
        visibleTitle: 'Así ayuda la tecnología a nuestros negocios.',
        layersBadge: 'Ver arquitectura técnica',
        layersTitle: 'Capas que convierten operaciones en sistemas.',
        layersDescription:
          'No presentamos una lista decorativa de herramientas. Cada capa representa una responsabilidad técnica dentro de la arquitectura actual o prevista del ecosistema.',
        osBadge: 'CTG One OS',
        osTitle: 'One technology layer. Multiple operating businesses.',
        osDescription:
          'CTG One OS es el nombre arquitectónico de la capa compartida que conecta identidad, datos, transacciones, automatización, seguridad e inteligencia. No es un sistema operativo convencional ni un producto terminado: es una arquitectura evolutiva construida a partir de capacidades reales del ecosistema.',
        operatingLayer: 'Capa operativa',
        operatingDescription: 'Las unidades de negocio funcionan como entornos reales de aplicación, validación y mejora.',
        proofBadge: 'Technology in action',
        proofTitle: 'CTG Craft Beer Inversión',
        proofDescription:
          'El primer caso tecnológico verificable de este modelo integra autenticación, lotes de producción, asignaciones, inventario, ledger, liquidaciones y paneles especializados alrededor de una operación física real.',
        open: 'Explorar plataforma',
        maturity: 'Modelo de madurez',
        maturityText: 'LIVE = implementado · PARTIAL = implementación limitada · IN DEVELOPMENT = construcción activa · ROADMAP = arquitectura prevista',
      }
    : {
        badge: 'CTG One Technology',
        eyebrow: 'How we work',
        title: 'We build the technology',
        highlight: 'that powers our own businesses.',
        description:
          'We design one common technology foundation (user accounts, information management, task automation, and security) and bring it to each business in the ecosystem at its own pace. Further down you can see in detail what is available today in each one and what we are still building.',
        visibleBadge: 'What we do',
        visibleTitle: 'This is how technology helps our businesses.',
        layersBadge: 'View technical architecture',
        layersTitle: 'Layers that turn operations into systems.',
        layersDescription:
          'This is not a decorative list of tools. Each layer represents a technical responsibility within the current or planned ecosystem architecture.',
        osBadge: 'CTG One OS',
        osTitle: 'One technology layer. Multiple operating businesses.',
        osDescription:
          'CTG One OS is the architectural name for the shared layer connecting identity, data, transactions, automation, security, and intelligence. It is not a conventional operating system or a finished product; it is an evolving architecture built from real ecosystem capabilities.',
        operatingLayer: 'Operating layer',
        operatingDescription: 'Business units act as real environments for application, validation, and continuous improvement.',
        proofBadge: 'Technology in action',
        proofTitle: 'CTG Craft Beer Investment',
        proofDescription:
          'The first verifiable technology case for this model combines authentication, production batches, allocations, inventory, ledger, settlements, and specialized dashboards around a real physical operation.',
        open: 'Explore platform',
        maturity: 'Maturity model',
        maturityText: 'LIVE = implemented · PARTIAL = limited implementation · IN DEVELOPMENT = active build · ROADMAP = planned architecture',
      };

  const plainCapabilities: PlainCapability[] = es
    ? [
        { icon: Code2, title: 'Creamos software', description: 'Desarrollamos aplicaciones y plataformas.' },
        { icon: Database, title: 'Organizamos información', description: 'Creamos sistemas que permiten gestionar datos y operaciones.' },
        { icon: Network, title: 'Conectamos servicios', description: 'Integramos diferentes herramientas y procesos.' },
        { icon: Workflow, title: 'Automatizamos', description: 'Reducimos tareas manuales.' },
        { icon: ShieldCheck, title: 'Protegemos', description: 'Implementamos controles de acceso y seguridad.' },
        { icon: BrainCircuit, title: 'Desarrollamos IA', description: 'Exploramos inteligencia artificial en las áreas donde ya está disponible o en desarrollo activo.' },
      ]
    : [
        { icon: Code2, title: 'We build software', description: 'We develop applications and platforms.' },
        { icon: Database, title: 'We organize information', description: 'We build systems that manage data and operations.' },
        { icon: Network, title: 'We connect services', description: 'We integrate different tools and processes.' },
        { icon: Workflow, title: 'We automate', description: 'We reduce manual work.' },
        { icon: ShieldCheck, title: 'We protect', description: 'We implement access controls and security.' },
        { icon: BrainCircuit, title: 'We build AI', description: 'We explore artificial intelligence where it is genuinely available or under active development.' },
      ];

  const layers: TechnologyLayer[] = es
    ? [
        {
          icon: Code2,
          code: 'EXP',
          title: 'Experience Layer',
          description: 'Interfaces, portales, dashboards y aplicaciones construidas para experiencias públicas, operativas y administrativas.',
          technologies: ['Next.js', 'React', 'TypeScript', 'Tailwind'],
          status: 'LIVE',
        },
        {
          icon: Boxes,
          code: 'APP',
          title: 'Application Layer',
          description: 'Lógica de negocio, Route Handlers, validación, estados y autorización server-side para procesos transaccionales.',
          technologies: ['Server Components', 'Route Handlers', 'Zod', 'RBAC patterns'],
          status: 'LIVE',
        },
        {
          icon: Database,
          code: 'DAT',
          title: 'Data Layer',
          description: 'Persistencia transaccional, perfiles, KYC, ledgers, auditoría y políticas de acceso a nivel de fila.',
          technologies: ['PostgreSQL', 'Supabase', 'RLS', 'Storage'],
          status: dataSecurityStatus,
        },
        {
          icon: Workflow,
          code: 'AUT',
          title: 'Automation Layer',
          description: 'Triggers, transiciones de estado, validaciones y flujos server-side existentes; una capa de orquestación general aún no está consolidada.',
          technologies: ['DB Triggers', 'Server Flows', 'Events', 'Validation'],
          status: 'PARTIAL',
        },
        {
          icon: BrainCircuit,
          code: 'INT',
          title: 'Intelligence Layer',
          description: 'Arquitectura prevista para agentes, RAG, asistencia contextual y apoyo a decisiones. No existe todavía como runtime productivo general.',
          technologies: ['AI Agents', 'RAG', 'LLM Workflows', 'Evaluations'],
          status: aiStatus,
        },
        {
          icon: Cloud,
          code: 'INF',
          title: 'Infrastructure Layer',
          description: 'Control de versiones, CI, build productivo, despliegue en Render y configuración segura por entorno.',
          technologies: ['GitHub', 'GitHub Actions', 'Render', 'Node Runtime'],
          status: deliveryStatus,
        },
      ]
    : [
        {
          icon: Code2,
          code: 'EXP',
          title: 'Experience Layer',
          description: 'Interfaces, portals, dashboards, and applications built for public, operational, and administrative experiences.',
          technologies: ['Next.js', 'React', 'TypeScript', 'Tailwind'],
          status: 'LIVE',
        },
        {
          icon: Boxes,
          code: 'APP',
          title: 'Application Layer',
          description: 'Business logic, Route Handlers, validation, state handling, and server-side authorization for transactional processes.',
          technologies: ['Server Components', 'Route Handlers', 'Zod', 'RBAC patterns'],
          status: 'LIVE',
        },
        {
          icon: Database,
          code: 'DAT',
          title: 'Data Layer',
          description: 'Transactional persistence, profiles, KYC, ledgers, audit records, and row-level access policies.',
          technologies: ['PostgreSQL', 'Supabase', 'RLS', 'Storage'],
          status: dataSecurityStatus,
        },
        {
          icon: Workflow,
          code: 'AUT',
          title: 'Automation Layer',
          description: 'Existing triggers, state transitions, validation, and server-side flows; a general orchestration layer is not yet consolidated.',
          technologies: ['DB Triggers', 'Server Flows', 'Events', 'Validation'],
          status: 'PARTIAL',
        },
        {
          icon: BrainCircuit,
          code: 'INT',
          title: 'Intelligence Layer',
          description: 'Planned architecture for agents, RAG, contextual assistance, and decision support. It is not yet a general production runtime.',
          technologies: ['AI Agents', 'RAG', 'LLM Workflows', 'Evaluations'],
          status: aiStatus,
        },
        {
          icon: Cloud,
          code: 'INF',
          title: 'Infrastructure Layer',
          description: 'Version control, CI, production builds, Render deployment, and secure environment configuration.',
          technologies: ['GitHub', 'GitHub Actions', 'Render', 'Node Runtime'],
          status: deliveryStatus,
        },
      ];

  const modules: OSModule[] = es
    ? [
        { icon: KeyRound, title: 'Identidad', description: 'Autenticación, sesiones, perfiles y acceso protegido.', status: identityStatus },
        { icon: Database, title: 'Datos', description: 'PostgreSQL, RLS, storage y modelos transaccionales.', status: dataSecurityStatus },
        { icon: WalletCards, title: 'Transacciones', description: 'Ledger, asignaciones y movimientos en contextos especializados.', status: 'LIVE' },
        { icon: Workflow, title: 'Automatización', description: 'Triggers y flujos parciales; orquestación común en evolución.', status: 'PARTIAL' },
        { icon: Network, title: 'Integraciones', description: 'Servicios compartidos aún no consolidados como gateway único.', status: 'PARTIAL' },
        { icon: ShieldCheck, title: 'Seguridad', description: 'RLS, autorización server-side, validación y headers baseline.', status: dataSecurityStatus },
        { icon: Bot, title: 'AI Runtime', description: 'Agentes, RAG y evaluaciones pendientes de implementación productiva.', status: aiStatus },
        { icon: Activity, title: 'Observabilidad', description: 'Health checks, logging estructurado, correlation IDs y compatibilidad de schema forman un baseline operativo; métricas y trazas avanzadas siguen en evolución.', status: observabilityStatus },
      ]
    : [
        { icon: KeyRound, title: 'Identity', description: 'Authentication, sessions, profiles, and protected access.', status: identityStatus },
        { icon: Database, title: 'Data', description: 'PostgreSQL, RLS, storage, and transactional models.', status: dataSecurityStatus },
        { icon: WalletCards, title: 'Transactions', description: 'Ledger, allocations, and movements in specialized contexts.', status: 'LIVE' },
        { icon: Workflow, title: 'Automation', description: 'Triggers and partial flows; shared orchestration is evolving.', status: 'PARTIAL' },
        { icon: Network, title: 'Integrations', description: 'Shared services are not yet consolidated behind a single gateway.', status: 'PARTIAL' },
        { icon: ShieldCheck, title: 'Security', description: 'RLS, server-side authorization, validation, and baseline headers.', status: dataSecurityStatus },
        { icon: Bot, title: 'AI Runtime', description: 'Agents, RAG, and evaluations are pending production implementation.', status: aiStatus },
        { icon: Activity, title: 'Observability', description: 'Health checks, structured logging, correlation IDs, and schema compatibility form an operating baseline; advanced metrics and tracing remain in evolution.', status: observabilityStatus },
      ];

  return (
    <section id="services" className="relative overflow-hidden bg-bg-primary">
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute -top-32 right-[-12%] w-[820px] h-[820px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(212,162,89,0.065), transparent 66%)' }} />
        <div className="absolute inset-0 opacity-[0.13]" style={{ backgroundImage: 'linear-gradient(rgba(212,162,89,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(212,162,89,0.06) 1px, transparent 1px)', backgroundSize: '76px 76px' }} />
      </div>

      <div className="relative pt-20 sm:pt-28 md:pt-32 pb-20 sm:pb-28">
        <Container>
          <FadeInSection>
            <div className="max-w-5xl">
              <Badge variant="accent" className="mb-7">{copy.badge}</Badge>
              <div className="flex items-center gap-3 mb-5">
                <span className="w-8 h-px bg-accent/60" />
                <span className="text-[9px] uppercase tracking-[0.24em] text-text-dim">{copy.eyebrow}</span>
              </div>
              <h1 className="font-outfit font-semibold text-4xl sm:text-5xl md:text-6xl xl:text-[4.7rem] leading-[1.02] tracking-[-0.045em] max-w-5xl mb-7">
                <span className="text-white">{copy.title}</span>{' '}
                <span className="text-accent">{copy.highlight}</span>
              </h1>
              <p className="text-sm sm:text-base text-text-muted leading-relaxed max-w-3xl">{copy.description}</p>
              <div className="mt-8 inline-flex items-center gap-3 border border-white/[0.06] rounded-full px-4 py-2 bg-black/20">
                <Layers3 size={14} className="text-accent" strokeWidth={1.4} />
                <span className="text-[9px] uppercase tracking-[0.16em] text-text-dim">{copy.maturity}</span>
                <span className="hidden md:inline text-[9px] text-text-dim/70">· {copy.maturityText}</span>
              </div>
            </div>
          </FadeInSection>
        </Container>
      </div>

      <div className="relative py-16 sm:py-20">
        <Container>
          <FadeInSection>
            <div className="max-w-3xl mb-10 sm:mb-12">
              <Badge variant="accent" className="mb-6">{copy.visibleBadge}</Badge>
              <h2 className="font-outfit font-semibold text-2xl sm:text-3xl md:text-4xl tracking-[-0.03em] text-white">{copy.visibleTitle}</h2>
            </div>
          </FadeInSection>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {plainCapabilities.map(({ icon: Icon, title, description }, index) => (
              <FadeInSection key={title} delay={0.03 + index * 0.03}>
                <div className="h-full rounded-xl border border-white/[0.055] bg-white/[0.012] p-6">
                  <span className="mb-5 flex w-10 h-10 rounded-full border border-accent/20 items-center justify-center text-accent">
                    <Icon size={17} strokeWidth={1.4} />
                  </span>
                  <h3 className="text-base font-outfit font-medium text-white mb-2">{title}</h3>
                  <p className="text-xs sm:text-sm text-text-muted leading-relaxed">{description}</p>
                </div>
              </FadeInSection>
            ))}
          </div>
        </Container>
      </div>

      <div className="relative py-20 sm:py-28 md:py-32 bg-bg-secondary border-y border-white/[0.035]">
        <Container>
          <FadeInSection>
            <div className="max-w-3xl mb-12 sm:mb-16">
              <Badge variant="accent" className="mb-6">{copy.layersBadge}</Badge>
              <h2 className="font-outfit font-semibold text-3xl sm:text-4xl md:text-5xl tracking-[-0.035em] text-white mb-5">{copy.layersTitle}</h2>
              <p className="text-sm sm:text-base text-text-muted leading-relaxed">{copy.layersDescription}</p>
            </div>
          </FadeInSection>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 border border-white/[0.05] rounded-2xl overflow-hidden bg-white/[0.02]">
            {layers.map((layer, index) => {
              const Icon = layer.icon;
              return (
                <FadeInSection key={layer.code} delay={0.04 + index * 0.045}>
                  <article className="relative h-full min-h-[315px] p-7 sm:p-8 bg-bg-secondary border-r border-b border-white/[0.045] hover:bg-accent/[0.02] transition-colors duration-500">
                    <div className="flex items-start justify-between mb-8">
                      <span className="w-12 h-12 rounded-full border border-accent/25 bg-accent/[0.03] flex items-center justify-center text-accent">
                        <Icon size={20} strokeWidth={1.35} />
                      </span>
                      <span className={`text-[8px] uppercase tracking-[0.16em] px-2.5 py-1.5 rounded-full border ${STATUS_STYLES[layer.status]}`}>{layer.status}</span>
                    </div>
                    <span className="block text-[8px] font-mono tracking-[0.2em] text-accent/45 mb-3">LAYER-{layer.code}</span>
                    <h3 className="text-lg font-outfit font-medium text-white mb-3">{layer.title}</h3>
                    <p className="text-xs sm:text-sm text-text-muted leading-relaxed mb-7">{layer.description}</p>
                    <div className="flex flex-wrap gap-2">
                      {layer.technologies.map((technology) => (
                        <span key={technology} className="text-[8px] uppercase tracking-[0.11em] px-2.5 py-1.5 rounded-full border border-white/[0.06] text-text-dim bg-black/20">{technology}</span>
                      ))}
                    </div>
                  </article>
                </FadeInSection>
              );
            })}
          </div>
        </Container>
      </div>

      <div className="relative py-20 sm:py-28 md:py-36">
        <Container>
          <FadeInSection>
            <div className="max-w-3xl mx-auto text-center mb-14 sm:mb-16">
              <Badge variant="accent" className="mb-6">{copy.osBadge}</Badge>
              <h2 className="font-outfit font-semibold text-3xl sm:text-4xl md:text-5xl tracking-[-0.04em] text-white mb-6">{copy.osTitle}</h2>
              <p className="text-sm sm:text-base text-text-muted leading-relaxed">{copy.osDescription}</p>
            </div>
          </FadeInSection>

          <FadeInSection delay={0.08}>
            <div className="relative max-w-6xl mx-auto rounded-[28px] border border-accent/15 bg-[#070707]/95 p-5 sm:p-8 md:p-10 overflow-hidden shadow-[0_40px_120px_rgba(0,0,0,0.3)]">
              <div className="absolute inset-0 pointer-events-none opacity-70" style={{ background: 'radial-gradient(circle at 50% 40%, rgba(212,162,89,0.075), transparent 40%)' }} />

              <div className="relative flex justify-center mb-10 sm:mb-12">
                <div className="relative w-44 h-44 sm:w-52 sm:h-52 rounded-full border border-accent/25 flex items-center justify-center">
                  <div className="absolute inset-[14%] rounded-full border border-white/[0.05] border-dashed" />
                  <div className="absolute inset-[28%] rounded-full border border-accent/10" />
                  <div className="relative z-10 text-center">
                    <Layers3 size={27} className="text-accent mx-auto mb-3" strokeWidth={1.3} />
                    <div className="font-outfit text-xl sm:text-2xl text-white tracking-tight">CTG One OS</div>
                    <div className="text-[8px] uppercase tracking-[0.18em] text-text-dim mt-1">Shared technology layer</div>
                  </div>
                </div>
              </div>

              <div className="relative grid sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-10">
                {modules.map((module) => {
                  const Icon = module.icon;
                  return (
                    <div key={module.title} className="rounded-xl border border-white/[0.055] bg-white/[0.012] p-5 min-h-[170px]">
                      <div className="flex items-start justify-between gap-3 mb-5">
                        <Icon size={18} className="text-accent" strokeWidth={1.35} />
                        <span className={`text-[7px] uppercase tracking-[0.14em] px-2 py-1 rounded-full border ${STATUS_STYLES[module.status]}`}>{module.status}</span>
                      </div>
                      <h3 className="text-sm font-outfit font-medium text-white mb-2">{module.title}</h3>
                      <p className="text-[11px] sm:text-xs leading-relaxed text-text-muted">{module.description}</p>
                    </div>
                  );
                })}
              </div>

              <div className="relative border-t border-white/[0.05] pt-8">
                <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5 mb-6">
                  <div>
                    <span className="text-[9px] uppercase tracking-[0.2em] text-accent">{copy.operatingLayer}</span>
                    <p className="text-xs sm:text-sm text-text-muted mt-2 max-w-2xl">{copy.operatingDescription}</p>
                  </div>
                  <GitBranch size={20} className="text-accent/60" strokeWidth={1.3} />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-px bg-white/[0.04] border border-white/[0.04] rounded-xl overflow-hidden">
                  {operatingBusinessUnits.map((unit) => (
                    <div key={unit} className="bg-[#080808] px-3 py-4 min-h-[68px] flex items-center justify-center text-center">
                      <span className="text-[9px] sm:text-[10px] uppercase tracking-[0.09em] text-text-muted">{unit}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </FadeInSection>
        </Container>
      </div>

      <div className="relative py-20 sm:py-28 bg-bg-secondary border-t border-white/[0.035]">
        <Container>
          <FadeInSection>
            <Link href="/inversion" className="group grid lg:grid-cols-[0.8fr_1.2fr_auto] gap-7 lg:gap-10 items-center p-7 sm:p-9 md:p-11 rounded-2xl border border-accent/20 bg-accent/[0.03] hover:bg-accent/[0.055] transition-colors duration-500">
              <div>
                <Badge variant="accent">{copy.proofBadge}</Badge>
              </div>
              <div>
                <h3 className="font-outfit text-2xl sm:text-3xl text-white tracking-tight mb-3">{copy.proofTitle}</h3>
                <p className="text-xs sm:text-sm text-text-muted leading-relaxed">{copy.proofDescription}</p>
              </div>
              <div className="flex items-center gap-3 text-accent">
                <Beer size={19} strokeWidth={1.4} />
                <span className="text-[9px] uppercase tracking-[0.16em] whitespace-nowrap">{copy.open}</span>
                <ArrowUpRight size={15} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </div>
            </Link>
          </FadeInSection>
        </Container>
      </div>
    </section>
  );
};