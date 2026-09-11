export const WORLDMAKERS_CONSENT_VERSION = 'worldmakers-community-v1-2026-09-11' as const;

export const WORLDMAKERS_AUDIENCES = [
  'family',
  'educator',
  'tester',
  'developer',
  'researcher',
  'other',
] as const;

export type WorldMakersAudience = (typeof WORLDMAKERS_AUDIENCES)[number];

export const WORLDMAKERS_INTEREST_STATUSES = [
  'registered',
  'reviewing',
  'shortlisted',
  'ready_to_invite',
  'contacted',
  'paused',
  'declined',
  'withdrawn',
] as const;

export type WorldMakersInterestStatus = (typeof WORLDMAKERS_INTEREST_STATUSES)[number];

export const WORLDMAKERS_SOURCE_PATHS = [
  '/community',
  '/families',
  '/educators',
  '/adventures',
  '/',
] as const;

export const WORLDMAKERS_AUDIENCE_LABELS: Record<WorldMakersAudience, string> = {
  family: 'Familia / adulto responsable',
  educator: 'Docente / institución educativa',
  tester: 'Tester adulto',
  developer: 'Desarrollo de videojuegos / tecnología',
  researcher: 'Investigación / aprendizaje',
  other: 'Otro interés profesional o comunitario',
};

export const WORLDMAKERS_STATUS_LABELS: Record<WorldMakersInterestStatus, string> = {
  registered: 'Registrado',
  reviewing: 'En revisión',
  shortlisted: 'Preseleccionado',
  ready_to_invite: 'Listo para invitación',
  contacted: 'Contactado',
  paused: 'En pausa',
  declined: 'No priorizado',
  withdrawn: 'Retirado',
};

export function isWorldMakersAudience(value: unknown): value is WorldMakersAudience {
  return typeof value === 'string' && WORLDMAKERS_AUDIENCES.includes(value as WorldMakersAudience);
}

export function isWorldMakersInterestStatus(value: unknown): value is WorldMakersInterestStatus {
  return typeof value === 'string' && WORLDMAKERS_INTEREST_STATUSES.includes(value as WorldMakersInterestStatus);
}

export function isWorldMakersSourcePath(value: unknown): value is (typeof WORLDMAKERS_SOURCE_PATHS)[number] {
  return typeof value === 'string' && WORLDMAKERS_SOURCE_PATHS.includes(value as (typeof WORLDMAKERS_SOURCE_PATHS)[number]);
}

export function normalizeWorldMakersEmail(value: string) {
  return value.trim().toLowerCase();
}
