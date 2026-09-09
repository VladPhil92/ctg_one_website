import 'server-only';

export type EcosystemAppId = 'vertice';

export type EcosystemApp = {
  id: EcosystemAppId;
  name: string;
  description: string;
  origin: string;
  dashboardPath: string;
  federationStartPath: string;
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
