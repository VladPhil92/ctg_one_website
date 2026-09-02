import type { FunnelServiceKey } from '@/lib/analytics/funnel';

export type DashboardServiceGroup = 'finance' | 'care' | 'knowledge' | 'education';
export type DashboardServiceStatus = 'LIVE' | 'ACCOUNT' | 'PILOT' | 'DEVELOPMENT' | 'CONSOLIDATION' | 'ROADMAP';

export type DashboardService = {
  id: string;
  code: string;
  title: string;
  description: string;
  href: string;
  cta: string;
  group: DashboardServiceGroup;
  status: DashboardServiceStatus;
  serviceKey?: FunnelServiceKey;
  aliases?: readonly string[];
  secondaryAction?: {
    label: string;
    href: string;
  };
};

export const DASHBOARD_SERVICE_GROUPS: ReadonlyArray<{
  id: DashboardServiceGroup;
  label: string;
  description: string;
}> = [
  {
    id: 'finance',
    label: 'Capital e identidad',
    description: 'Wallet, inversión e identidad verificable bajo una sola cuenta CTG One.',
  },
  {
    id: 'care',
    label: 'Aplicaciones y productos',
    description: 'Productos y experiencias operativas conectadas al ecosistema CTG One.',
  },
  {
    id: 'knowledge',
    label: 'Conocimiento y tecnología',
    description: 'Inteligencia, activos digitales y capas de conocimiento institucional.',
  },
  {
    id: 'education',
    label: 'Educación',
    description: 'Contenido académico, servicios educativos y biblioteca personal.',
  },
] as const;

export const DASHBOARD_SERVICES: readonly DashboardService[] = [
  {
    id: 'wallet',
    code: 'FIN-01',
    title: 'CTG One Wallet',
    description: 'Consulta saldo COP, actividad canónica, activos Polygon y vínculos de wallet verificados.',
    href: '/dashboard/wallet',
    cta: 'Abrir Wallet',
    group: 'finance',
    status: 'ACCOUNT',
    serviceKey: 'wallet',
    aliases: ['/dashboard/depositos'],
    secondaryAction: { label: 'Añadir fondos', href: '/dashboard/depositos' },
  },
  {
    id: 'investment',
    code: 'INV-02',
    title: 'CTG Craft Beer Inversión',
    description: 'Participa en lotes productivos y sigue capital, producción, comercialización y liquidaciones.',
    href: '/inversion/app',
    cta: 'Abrir inversión',
    group: 'finance',
    status: 'LIVE',
    serviceKey: 'investment',
    aliases: ['/dashboard/inversion'],
  },
  {
    id: 'identity',
    code: 'ID-03',
    title: 'Identidad CTG One',
    description: 'Gestiona KYC, permisos financieros y los vínculos de identidad que protegen el ecosistema.',
    href: '/dashboard/kyc',
    cta: 'Gestionar identidad',
    group: 'finance',
    status: 'ACCOUNT',
    serviceKey: 'identity',
  },
  {
    id: 'craft-beer',
    code: 'BRW-04',
    title: 'CTG Craft Beer',
    description: 'Explora el portafolio de cerveza artesanal, la marca y su operación productiva en Cartagena.',
    href: '/craft-beer',
    cta: 'Explorar Craft Beer',
    group: 'care',
    status: 'LIVE',
  },
  {
    id: 'nvet',
    code: 'VET-05',
    title: 'Nvet Care App',
    description: 'Atención veterinaria, mascotas, citas, seguimiento, mensajería y acceso a la red Nvet Care.',
    href: '/nvetcareapp',
    cta: 'Explorar Nvet Care',
    group: 'care',
    status: 'DEVELOPMENT',
    serviceKey: 'nvet',
  },
  {
    id: 'token',
    code: 'TKN-06',
    title: 'CTG One Token',
    description: 'Consulta la propuesta, utilidad, documentación y evolución del activo digital del ecosistema.',
    href: '/ctgotoken',
    cta: 'Explorar Token',
    group: 'knowledge',
    status: 'CONSOLIDATION',
    serviceKey: 'token',
  },
  {
    id: 'knowledge',
    code: 'KNW-07',
    title: 'CTG Knowledge',
    description: 'Inteligencia institucional basada en conocimiento autorizado, trazable y consultable.',
    href: '/knowledge',
    cta: 'Consultar Knowledge',
    group: 'knowledge',
    status: 'PILOT',
    serviceKey: 'knowledge',
  },
  {
    id: 'education-jp',
    code: 'EDU-08',
    title: 'JP Valderrama',
    description: 'Filosofía, conferencias, libros, ideas, proyectos, contenidos académicos y asesorías institucionales.',
    href: '/jpvalderrama',
    cta: 'Explorar JP Valderrama',
    group: 'education',
    status: 'LIVE',
    serviceKey: 'education_jp',
  },
  {
    id: 'learning-center',
    code: 'EDU-09',
    title: 'Valderrama Learning Center',
    description: 'Tutorías privadas, refuerzo, preparación de exámenes y servicios educativos para familias.',
    href: '/jpvalderrama/learningcenter',
    cta: 'Abrir Learning Center',
    group: 'education',
    status: 'LIVE',
    serviceKey: 'education_learning_center',
  },
  {
    id: 'education-library',
    code: 'LIB-10',
    title: 'Mi Educación',
    description: 'Biblioteca privada de cursos, conferencias, libros, clases, recursos y servicios educativos adquiridos.',
    href: '/dashboard/educacion',
    cta: 'Abrir mi biblioteca',
    group: 'education',
    status: 'ACCOUNT',
    serviceKey: 'education_library',
  },
  {
    id: 'rewards',
    code: 'RWD-11',
    title: 'CTG Rewards',
    description: 'Beneficios, reconocimiento y fidelización previstos para la experiencia transversal del ecosistema.',
    href: '/rewards',
    cta: 'Explorar roadmap',
    group: 'care',
    status: 'ROADMAP',
  },
] as const;

export const DASHBOARD_SERVICE_ROUTES: ReadonlyArray<{
  prefix: string;
  serviceKey: FunnelServiceKey;
}> = DASHBOARD_SERVICES.flatMap((service) => {
  if (!service.serviceKey) return [];
  return [service.href, ...(service.aliases ?? [])].map((prefix) => ({
    prefix,
    serviceKey: service.serviceKey as FunnelServiceKey,
  }));
});
