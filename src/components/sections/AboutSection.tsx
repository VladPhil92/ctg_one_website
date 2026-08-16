'use client';

import React from 'react';
import { Container } from '@/components/ui';
import { FadeInSection } from '@/components/ui/FadeInSection';
import { Badge } from '@/components/ui/Badge';
import { useLanguage } from '@/contexts/LanguageContext';
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

type Capability = {
  icon: LucideIcon;
  title: string;
  description: string;
  technologies: string[];
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
          'CTG One Technology es una empresa tecnológica con sede en Cartagena que diseña, desarrolla y opera software, inteligencia artificial, automatización e infraestructura digital para sus propias unidades de negocio. No funcionamos como una agencia comercial ni como una fábrica de software tercerizada: desarrollamos tecnología desde dentro de los negocios, sobre necesidades operativas reales y con capacidad de llevar soluciones hasta producción.',
        secondary:
          'Nuestro modelo integra ingeniería, producto, datos e infraestructura con empresas activas en hospitalidad, gastronomía, bebidas, educación, bienes raíces, servicios financieros, salud y servicios profesionales. Cada unidad funciona como un entorno real de validación, despliegue y mejora continua.',
        stats: [
          ['12', 'Unidades de negocio'],
          ['2024', 'Fundación'],
          ['1', 'Capa tecnológica común'],
          ['Cartagena', 'Base operativa'],
        ],
        capabilitiesBadge: 'Capacidades de desarrollo',
        capabilitiesTitle: 'De la necesidad operativa al',
        capabilitiesHighlight: 'sistema en producción.',
        capabilitiesIntro:
          'Diseñamos productos digitales de extremo a extremo: arquitectura, interfaces, lógica de negocio, automatización, datos, seguridad, integraciones y despliegue. La tecnología se construye como infraestructura reutilizable para todo el ecosistema.',
        modelBadge: 'Modelo operativo',
        modelTitle: 'Construir dentro del negocio cambia',
        modelHighlight: 'cómo se desarrolla tecnología.',
        modelText:
          'El equipo tecnológico trabaja cerca de la operación. Detectamos fricciones, modelamos procesos, desarrollamos una solución, la desplegamos en un entorno real, medimos su comportamiento y la refinamos. Ese ciclo reduce la distancia entre estrategia, producto y ejecución.',
        modelSteps: ['Observar', 'Modelar', 'Construir', 'Integrar', 'Desplegar', 'Medir'],
        stackBadge: 'Arquitectura',
        stackTitle: 'Una infraestructura compartida para múltiples negocios.',
        stackText:
          'Buscamos que identidad, datos, pagos, automatizaciones, analítica, seguridad, componentes de interfaz e integraciones puedan reutilizarse entre unidades, evitando construir sistemas aislados cada vez que aparece una nueva necesidad.',
        principle: 'Nuestro diferencial no es desarrollar más software. Es conectar software, datos e infraestructura directamente con operaciones empresariales que podemos observar, medir y mejorar.',
      }
    : {
        badge: 'About · CTG One Technology',
        eyebrow: 'Technology applied to real operations',
        title: 'We build the technology layer for',
        titleHighlight: 'our own ecosystem.',
        intro:
          'CTG One Technology is a Cartagena-based technology company that designs, builds, and operates software, artificial intelligence, automation, and digital infrastructure for its own business units. We are not a commercial agency or an outsourced software factory: we build technology from inside the businesses, around real operating needs, with the ability to take solutions all the way to production.',
        secondary:
          'Our model integrates engineering, product, data, and infrastructure with operating companies across hospitality, food, beverages, education, real estate, financial services, healthcare, and professional services. Every unit becomes a real environment for validation, deployment, and continuous improvement.',
        stats: [
          ['12', 'Business units'],
          ['2024', 'Founded'],
          ['1', 'Shared technology layer'],
          ['Cartagena', 'Operating base'],
        ],
        capabilitiesBadge: 'Development capabilities',
        capabilitiesTitle: 'From operating need to',
        capabilitiesHighlight: 'production system.',
        capabilitiesIntro:
          'We design digital products end to end: architecture, interfaces, business logic, automation, data, security, integrations, and deployment. Technology is built as reusable infrastructure for the entire ecosystem.',
        modelBadge: 'Operating model',
        modelTitle: 'Building inside the business changes',
        modelHighlight: 'how technology is developed.',
        modelText:
          'The technology team works close to operations. We identify friction, model processes, build a solution, deploy it in a real environment, measure its behavior, and refine it. That cycle reduces the distance between strategy, product, and execution.',
        modelSteps: ['Observe', 'Model', 'Build', 'Integrate', 'Deploy', 'Measure'],
        stackBadge: 'Architecture',
        stackTitle: 'Shared infrastructure for multiple businesses.',
        stackText:
          'We aim to make identity, data, payments, automation, analytics, security, interface components, and integrations reusable across units, avoiding isolated systems every time a new need appears.',
        principle: 'Our differentiator is not building more software. It is connecting software, data, and infrastructure directly to business operations we can observe, measure, and improve.',
      };

  const capabilities: Capability[] = es
    ? [
        {
          icon: Code2,
          title: 'Ingeniería de software',
          description: 'Aplicaciones web, plataformas internas, dashboards, APIs, sistemas operativos y productos digitales construidos alrededor de procesos reales.',
          technologies: ['Next.js', 'TypeScript', 'React', 'APIs'],
        },
        {
          icon: BrainCircuit,
          title: 'IA aplicada',
          description: 'Agentes inteligentes, asistencia contextual, automatización de conocimiento y herramientas de apoyo a decisiones integradas a flujos empresariales.',
          technologies: ['AI Agents', 'LLM Workflows', 'RAG', 'Automation'],
        },
        {
          icon: Workflow,
          title: 'Automatización de procesos',
          description: 'Orquestación de tareas, reglas de negocio, aprobaciones, notificaciones y conexiones entre sistemas para reducir trabajo manual y errores operativos.',
          technologies: ['Workflows', 'Webhooks', 'Events', 'Jobs'],
        },
        {
          icon: Database,
          title: 'Datos y plataformas transaccionales',
          description: 'Modelado de datos, autenticación, trazabilidad, permisos, historiales, ledgers y estructuras transaccionales para plataformas con operación real.',
          technologies: ['PostgreSQL', 'Supabase', 'RLS', 'Analytics'],
        },
        {
          icon: Network,
          title: 'Integraciones e infraestructura compartida',
          description: 'Servicios reutilizables para identidad, pagos, APIs, almacenamiento, comunicaciones y conexión entre las distintas unidades del ecosistema.',
          technologies: ['Identity', 'Payments', 'Storage', 'Integrations'],
        },
        {
          icon: Cloud,
          title: 'Cloud, seguridad y despliegue',
          description: 'Entornos productivos, CI/CD, control de versiones, variables de entorno, políticas de acceso y arquitectura preparada para evolución continua.',
          technologies: ['GitHub', 'Render', 'CI/CD', 'Cloud'],
        },
      ]
    : [
        {
          icon: Code2,
          title: 'Software engineering',
          description: 'Web applications, internal platforms, dashboards, APIs, operating systems, and digital products built around real processes.',
          technologies: ['Next.js', 'TypeScript', 'React', 'APIs'],
        },
        {
          icon: BrainCircuit,
          title: 'Applied AI',
          description: 'Intelligent agents, contextual assistance, knowledge automation, and decision-support tools embedded into business workflows.',
          technologies: ['AI Agents', 'LLM Workflows', 'RAG', 'Automation'],
        },
        {
          icon: Workflow,
          title: 'Process automation',
          description: 'Task orchestration, business rules, approvals, notifications, and system connections that reduce manual work and operating errors.',
          technologies: ['Workflows', 'Webhooks', 'Events', 'Jobs'],
        },
        {
          icon: Database,
          title: 'Data and transactional platforms',
          description: 'Data modeling, authentication, traceability, permissions, histories, ledgers, and transactional structures for real operating platforms.',
          technologies: ['PostgreSQL', 'Supabase', 'RLS', 'Analytics'],
        },
        {
          icon: Network,
          title: 'Integrations and shared infrastructure',
          description: 'Reusable services for identity, payments, APIs, storage, communications, and connectivity between ecosystem business units.',
          technologies: ['Identity', 'Payments', 'Storage', 'Integrations'],
        },
        {
          icon: Cloud,
          title: 'Cloud, security, and deployment',
          description: 'Production environments, CI/CD, version control, environment management, access policies, and architecture designed for continuous evolution.',
          technologies: ['GitHub', 'Render', 'CI/CD', 'Cloud'],
        },
      ];

  const architecture = [
    { icon: ShieldCheck, label: es ? 'Identidad y acceso' : 'Identity & access' },
    { icon: Database, label: es ? 'Datos transaccionales' : 'Transactional data' },
    { icon: Cpu, label: es ? 'Lógica de negocio' : 'Business logic' },
    { icon: Workflow, label: es ? 'Automatización' : 'Automation' },
    { icon: GitBranch, label: es ? 'Integraciones' : 'Integrations' },
    { icon: Activity, label: es ? 'Observabilidad' : 'Observability' },
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
                  <div className="group relative h-full min-h-[300px] p-7 sm:p-8 border-b border-r border-white/[0.045] hover:bg-accent/[0.025] transition-colors duration-500 overflow-hidden">
                    <div className="absolute top-0 right-0 w-28 h-28 rounded-full translate-x-1/2 -translate-y-1/2 border border-accent/[0.08] group-hover:scale-125 transition-transform duration-700" />
                    <div className="flex items-start justify-between mb-8">
                      <span className="w-12 h-12 rounded-full border border-accent/25 bg-accent/[0.035] flex items-center justify-center text-accent shadow-[0_0_40px_rgba(212,162,89,0.04)]">
                        <Icon size={20} strokeWidth={1.35} />
                      </span>
                      <span className="text-[9px] font-mono text-accent/40 tracking-[0.18em]">CAP-0{index + 1}</span>
                    </div>
                    <h3 className="text-lg sm:text-xl font-outfit font-medium text-white mb-3 tracking-tight">{capability.title}</h3>
                    <p className="text-xs sm:text-sm text-text-muted leading-relaxed mb-7">{capability.description}</p>
                    <div className="flex flex-wrap gap-2 mt-auto">
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
                  {es ? 'Explorar tecnología' : 'Explore technology'}
                  <ArrowUpRight size={14} />
                </a>
              </div>
            </FadeInSection>

            <div className="grid sm:grid-cols-2 gap-px rounded-xl overflow-hidden border border-white/[0.045] bg-white/[0.04]">
              {architecture.map(({ icon: Icon, label }, index) => (
                <FadeInSection key={label} delay={0.05 + index * 0.05}>
                  <div className="group bg-bg-secondary p-6 sm:p-7 min-h-[135px] hover:bg-accent/[0.025] transition-colors duration-500">
                    <div className="flex items-start justify-between mb-5">
                      <Icon size={18} className="text-accent" strokeWidth={1.35} />
                      <span className="text-[8px] text-text-dim font-mono">SYS-0{index + 1}</span>
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
