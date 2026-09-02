import Link from 'next/link';
import {
  ArrowUpRight,
  Beer,
  BookOpen,
  BrainCircuit,
  Coins,
  GraduationCap,
  Landmark,
  Gift,
  LibraryBig,
  PawPrint,
  School,
  ShieldCheck,
  Sparkles,
  WalletCards,
  type LucideIcon,
} from 'lucide-react';

type ServiceCard = {
  code: string;
  title: string;
  description: string;
  href: string;
  cta: string;
  icon: typeof PawPrint;
  status: 'LIVE' | 'ACCOUNT' | 'BETA';
};

const services: readonly ServiceCard[] = [
  {
    code: 'VET-01',
    title: 'Nvet Care App',
    description: 'Atención veterinaria, perfiles de mascotas, citas, seguimiento y acceso a la red Nvet Care.',
    href: '/nvetcareapp',
    cta: 'Abrir Nvet Care',
    icon: PawPrint,
    status: 'LIVE',
  },
  {
    code: 'INV-02',
    title: 'CTG Craft Beer Inversión',
    description: 'Participa en lotes productivos y sigue capital, producción, comercialización y liquidaciones.',
    href: '/inversion/app',
    cta: 'Abrir inversión',
    icon: Beer,
    status: 'LIVE',
  },
  {
    code: 'TKN-03',
    title: 'CTG One Token',
    description: 'Consulta la propuesta, utilidad y evolución del activo digital del ecosistema CTG One.',
    href: '/ctgotoken',
    cta: 'Explorar Token',
    icon: Coins,
    status: 'LIVE',
  },
  {
    code: 'CIV-04',
    title: 'VÉRTICE OS',
    description: 'Inteligencia ciudadana para reportar, proponer, deliberar, seguir resultados y construir reputación cívica verificable.',
    href: 'https://vertice.ctgone.com/auth/ctgone/start',
    cta: 'Entrar con CTG One',
    icon: Landmark,
    status: 'BETA',
  },
  {
    code: 'EDU-05',
    title: 'JP Valderrama',
    description: 'Filosofía, conferencias, libros, ideas, proyectos, contenidos académicos y asesorías institucionales.',
    href: '/jpvalderrama',
    cta: 'Explorar JP Valderrama',
    icon: BookOpen,
    status: 'LIVE',
  },
  {
    code: 'EDU-06',
    title: 'Valderrama Learning Center',
    description: 'Tutorías privadas y servicios educativos para familias: refuerzo, exámenes y acompañamiento académico.',
    href: '/jpvalderrama/learningcenter',
    cta: 'Abrir Learning Center',
    icon: School,
    status: 'LIVE',
  },
  {
    code: 'LIB-07',
    title: 'Mi Educación',
    description: 'Tu biblioteca privada de cursos, conferencias, libros, clases, recursos y servicios educativos adquiridos.',
    href: '/dashboard/educacion',
    cta: 'Abrir mi biblioteca',
    icon: LibraryBig,
    status: 'ACCOUNT',
  },
] as const;
import {
  DASHBOARD_SERVICE_GROUPS,
  DASHBOARD_SERVICES,
  type DashboardServiceStatus,
} from '@/config/dashboard-services';

const SERVICE_ICONS: Record<string, LucideIcon> = {
  wallet: WalletCards,
  investment: Beer,
  identity: ShieldCheck,
  'craft-beer': Beer,
  nvet: PawPrint,
  token: Coins,
  knowledge: BrainCircuit,
  'education-jp': BookOpen,
  'learning-center': School,
  'education-library': LibraryBig,
  rewards: Gift,
};

const STATUS_LABELS: Record<DashboardServiceStatus, string> = {
  LIVE: 'Activo',
  ACCOUNT: 'Mi cuenta',
  PILOT: 'Piloto',
  DEVELOPMENT: 'En desarrollo',
  CONSOLIDATION: 'En consolidación',
  ROADMAP: 'Roadmap',
};

function ServiceCard({ service }: { service: (typeof DASHBOARD_SERVICES)[number] }) {
  const Icon = SERVICE_ICONS[service.id] ?? Sparkles;
  const muted = service.status === 'ROADMAP';

  return (
    <article
      className={`group relative flex h-full flex-col overflow-hidden rounded-[20px] border p-6 transition duration-300 hover:-translate-y-1 ${
        muted
          ? 'border-white/[.06] bg-white/[.015] hover:border-white/[.12]'
          : 'border-white/[.08] bg-gradient-to-br from-white/[.045] to-white/[.012] hover:border-accent/30'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-full border border-accent/25 bg-accent/[.07] text-accent">
          <Icon size={18} aria-hidden="true" />
        </span>
        <span className={`font-mono text-[8px] uppercase tracking-[.14em] ${muted ? 'text-white/30' : 'text-accent'}`}>
          {service.code} · {STATUS_LABELS[service.status]}
        </span>
      </div>

      <h3 className="mt-5 font-outfit text-lg font-semibold">{service.title}</h3>
      <p className="mt-2 flex-1 text-[12px] leading-6 text-white/42">{service.description}</p>

      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
        <Link
          href={service.href}
          prefetch={!muted}
          data-service-key={service.serviceKey}
          className={`inline-flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[.13em] transition-colors ${
            muted ? 'text-white/45 hover:text-white/70' : 'text-accent'
          }`}
        >
          {service.cta}
          <ArrowUpRight
            size={13}
            className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            aria-hidden="true"
          />
        </Link>

        {service.secondaryAction ? (
          <Link
            href={service.secondaryAction.href}
            data-service-key={service.serviceKey}
            className="text-[9px] font-semibold uppercase tracking-[.12em] text-white/35 transition-colors hover:text-white/65"
          >
            {service.secondaryAction.label}
          </Link>
        ) : null}
      </div>
    </article>
  );
}

export function DashboardServiceHub() {
  return (
    <section className="border-t border-white/[.06] bg-[#030303] pb-20 pt-8 text-white" aria-labelledby="ctg-services-title">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[.25em] text-white/35">CTG ONE / SERVICE HUB</p>
            <h2 id="ctg-services-title" className="mt-2 font-outfit text-2xl font-semibold tracking-[-.03em] sm:text-3xl">Servicios y productos actuales</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/45">Accede desde una sola cuenta a las unidades activas del ecosistema, VÉRTICE OS y tu biblioteca educativa personal.</p>
            <p className="text-[9px] font-semibold uppercase tracking-[.25em] text-white/35">CTG ONE / ECOSYSTEM OS</p>
            <h2 id="ctg-services-title" className="mt-2 font-outfit text-2xl font-semibold tracking-[-.03em] sm:text-3xl">
              Un acceso para todo el ecosistema
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/45">
              Wallet, inversión, Craft Beer, Nvet Care, Token, conocimiento y educación organizados desde un único centro de servicios.
            </p>
          </div>

          <nav className="flex flex-wrap gap-2" aria-label="Catálogos CTG One">
            <Link
              href="/products"
              className="rounded-xl border border-white/[.09] bg-white/[.025] px-4 py-2.5 text-[9px] font-semibold uppercase tracking-[.12em] text-white/55 transition hover:border-accent/30 hover:text-white"
            >
              Todos los productos
            </Link>
            <Link
              href="/services"
              className="rounded-xl border border-white/[.09] bg-white/[.025] px-4 py-2.5 text-[9px] font-semibold uppercase tracking-[.12em] text-white/55 transition hover:border-accent/30 hover:text-white"
            >
              Todos los servicios
            </Link>
          </nav>
        </div>

        <div className="space-y-8">
          {DASHBOARD_SERVICE_GROUPS.map((group) => {
            const services = DASHBOARD_SERVICES.filter((service) => service.group === group.id);
            if (!services.length) return null;

            return (
              <section key={group.id} aria-labelledby={`dashboard-group-${group.id}`}>
                <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between sm:gap-5">
                  <h3 id={`dashboard-group-${group.id}`} className="font-outfit text-lg font-semibold tracking-[-.02em]">
                    {group.label}
                  </h3>
                  <p className="max-w-2xl text-[11px] leading-5 text-white/35 sm:text-right">{group.description}</p>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {services.map((service) => (
                    <ServiceCard key={service.id} service={service} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-white/[.07] bg-white/[.02] px-5 py-4 text-xs leading-5 text-white/40">
          <GraduationCap className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
          <span>VÉRTICE OS se integra mediante federación segura: CTG One acredita la cuenta y VÉRTICE conserva su propia sesión y nivel de identidad. JP Valderrama concentra filosofía, divulgación y servicios institucionales; Valderrama Learning Center concentra tutorías y servicios educativos privados para familias.</span>
        <div className="mt-8 flex items-start gap-3 rounded-2xl border border-accent/15 bg-accent/[.035] px-5 py-4 text-xs leading-5 text-white/45">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
          <span>
            Las capacidades financieras conservan sus controles de identidad, permisos y reconciliación. El dashboard centraliza acceso y estado; no sustituye las reglas de autorización de cada producto.
          </span>
        </div>
      </div>
    </section>
  );
}
