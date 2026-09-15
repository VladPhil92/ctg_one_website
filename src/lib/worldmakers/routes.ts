export const WORLDMAKERS_PUBLIC_ORIGIN = 'https://worldmakers.ctgone.com';
export const CTG_ONE_ORIGIN = 'https://ctgone.com';
export const WORLDMAKERS_DASHBOARD_PATH = '/worldmakers/dashboard';

function normalizeSuffix(suffix: string) {
  if (!suffix) return '';
  return suffix.startsWith('/') ? suffix : `/${suffix}`;
}

export function worldMakersPublicUrl(path = '') {
  return `${WORLDMAKERS_PUBLIC_ORIGIN}${normalizeSuffix(path)}`;
}

export function worldMakersDashboardUrl(suffix = '') {
  return `${CTG_ONE_ORIGIN}${WORLDMAKERS_DASHBOARD_PATH}${normalizeSuffix(suffix)}`;
}

export function ctgOneUrl(path = '') {
  return `${CTG_ONE_ORIGIN}${normalizeSuffix(path)}`;
}
