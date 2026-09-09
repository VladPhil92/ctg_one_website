import 'server-only';

export type EcosystemAppId = 'vertice' | 'pisao';

export type EcosystemApp = {
  id: EcosystemAppId;
  name: string;
  description: string;
  origin: string;
  dashboardPath: string;
  federationStartPath: string;
  federationNextPath: string;
  status: 'active' | 'maintenance' | 'disabled';
};

const APPS: Record<EcosystemAppId, EcosystemApp> = {
  vertice: {
    id: 'vertice',
    name: 'VÉRTICE',
    description: 'Gestión social y comunitaria basada en evidencia.',
    origin: 'https://vertice.ctgone.com',
    dashboardPath: '/dashboard',
    federationStartPath: '/auth/ctgone/start',
    federationNextPath: '/dashboard',
    status: 'active',
  },
  pisao: {
    id: 'pisao',
    name: 'PISÁO Gastrobar',
    description: 'Pedidos, reservas e historial del cliente con identidad CTG One.',
    origin: 'https://pisaogastrobar.com',
    dashboardPath: '/micuenta',
    federationStartPath: '/auth/ctgone/start',
    federationNextPath: '/micuenta',
    status: 'active',
  },
};

export function getEcosystemApp(value: string | null): EcosystemApp | null {
  if (!value || !(value in APPS)) return null;
  return APPS[value as EcosystemAppId];
}

export function listEcosystemApps(): EcosystemApp[] {
  return Object.values(APPS);
}
