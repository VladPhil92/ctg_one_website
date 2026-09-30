export const SUPERADMIN_VIEW_COOKIE = 'ctg_superadmin_view';
export const SUPERADMIN_VIEW_COOKIE_MAX_AGE = 60 * 60 * 8;

export const SUPERADMIN_VIEW_MODES = ['superadmin', 'user'] as const;
export type SuperadminViewMode = (typeof SUPERADMIN_VIEW_MODES)[number];

export function isSuperadminViewMode(value: unknown): value is SuperadminViewMode {
  return typeof value === 'string' && SUPERADMIN_VIEW_MODES.includes(value as SuperadminViewMode);
}
