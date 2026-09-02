import {
  ArrowUpRight,
  Beer,
  BookOpen,
  Coins,
  GraduationCap,
  Landmark,
  LibraryBig,
  PawPrint,
  School,
  Sparkles,
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

export function DashboardServiceHub() {
  return (
    <section className="border-t border-white/[.06] bg-[#030303] pb-20 pt-2 text-white" aria-labelledby="ctg-services-title">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-5 flex items-end justify-between gap-5">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[.25em] text-white/35">CTG ONE / SERVICE HUB</p>
            <h2 id="ctg-services-title" className="mt-2 font-outfit text-2xl font-semibold tracking-[-.03em] sm:text-3xl">Servicios y productos actuales</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/45">Accede desde una sola cuenta a las unidades activas del ecosistema, VÉRTICE OS y tu biblioteca educativa personal.</p>
          </div>
          <Sparkles className="hidden text-accent sm:block" size={20} aria-hidden="true" />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {services.map(({ code, title, description, href, cta, icon: Icon, status }) => (
            <a
              key={code}
              href={href}
              className="group relative overflow-hidden rounded-[20px] border border-white/[.08] bg-gradient-to-br from-white/[.045] to-white/[.012] p-6 transition duration-300 hover:-translate-y-1 hover:border-accent/30"
            >
              <div className="flex items-start justify-between gap-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-full border border-accent/25 bg-accent/[.07] text-accent">
                  <Icon size={18} aria-hidden="true" />
                </span>
                <span className="font-mono text-[8px] uppercase tracking-[.14em] text-accent">{code} · {status}</span>
              </div>
              <h3 className="mt-5 font-outfit text-lg font-semibold">{title}</h3>
              <p className="mt-2 min-h-[64px] text-[12px] leading-6 text-white/42">{description}</p>
              <span className="mt-5 inline-flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[.13em] text-accent">
                {cta}
                <ArrowUpRight size={13} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
              </span>
            </a>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-white/[.07] bg-white/[.02] px-5 py-4 text-xs leading-5 text-white/40">
          <GraduationCap className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
          <span>VÉRTICE OS se integra mediante federación segura: CTG One acredita la cuenta y VÉRTICE conserva su propia sesión y nivel de identidad. JP Valderrama concentra filosofía, divulgación y servicios institucionales; Valderrama Learning Center concentra tutorías y servicios educativos privados para familias.</span>
        </div>
      </div>
    </section>
  );
}
