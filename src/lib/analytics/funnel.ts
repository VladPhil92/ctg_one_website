export const FUNNEL_EVENT_NAMES = [
  'home_viewed',
  'create_account_clicked',
  'signup_started',
  'email_verified',
  'first_login',
  'dashboard_viewed',
  'first_service_used',
] as const;

export type FunnelEventName = (typeof FUNNEL_EVENT_NAMES)[number];

export const CLIENT_FUNNEL_EVENT_NAMES = [
  'home_viewed',
  'create_account_clicked',
  'signup_started',
  'first_login',
  'dashboard_viewed',
  'first_service_used',
] as const satisfies readonly FunnelEventName[];

export const FUNNEL_SERVICE_KEYS = [
  'investment',
  'wallet',
  'identity',
  'knowledge',
  'nvet',
  'token',
  'vertice',
  'education_jp',
  'education_learning_center',
  'education_library',
] as const;

export type FunnelServiceKey = (typeof FUNNEL_SERVICE_KEYS)[number];

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isFunnelEventName(value: unknown): value is FunnelEventName {
  return typeof value === 'string' && (FUNNEL_EVENT_NAMES as readonly string[]).includes(value);
}

export function isClientFunnelEventName(value: unknown): value is (typeof CLIENT_FUNNEL_EVENT_NAMES)[number] {
  return typeof value === 'string' && (CLIENT_FUNNEL_EVENT_NAMES as readonly string[]).includes(value);
}

export function isFunnelServiceKey(value: unknown): value is FunnelServiceKey {
  return typeof value === 'string' && (FUNNEL_SERVICE_KEYS as readonly string[]).includes(value);
}

export function isAnalyticsAnonymousId(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

export function isAnalyticsSourcePath(value: unknown): value is string {
  return typeof value === 'string' && value.length >= 1 && value.length <= 180 && value.startsWith('/');
}

export const ANALYTICS_COOKIE_NAME = 'ctg_analytics_id';
export const ANALYTICS_STORAGE_KEY = 'ctg.analytics.anonymous_id';
