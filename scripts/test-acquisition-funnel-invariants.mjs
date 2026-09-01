import fs from 'node:fs';
import assert from 'node:assert/strict';

const migration = fs.readFileSync('supabase/migrations/20260831223000_0092_acquisition_activation_funnel_telemetry.sql', 'utf8');
const contract = fs.readFileSync('src/lib/analytics/funnel.ts', 'utf8');
const ingest = fs.readFileSync('src/app/api/analytics/event/route.ts', 'utf8');
const register = fs.readFileSync('src/app/(auth)/registro/page.tsx', 'utf8');
const callback = fs.readFileSync('src/app/auth/callback/route.ts', 'utf8');
const dashboard = fs.readFileSync('src/app/dashboard/layout.tsx', 'utf8');
const hero = fs.readFileSync('src/components/sections/HeroSection.tsx', 'utf8');
const adminAnalyticsPage = fs.readFileSync('src/app/admin/analytics/page.tsx', 'utf8');
const adminAnalyticsPanel = fs.readFileSync('src/components/admin/AcquisitionFunnelPanel.tsx', 'utf8');
const adminNav = fs.readFileSync('src/components/admin/AdminNav.tsx', 'utf8');

const events = [
  'home_viewed',
  'create_account_clicked',
  'signup_started',
  'email_verified',
  'first_login',
  'dashboard_viewed',
  'first_service_used',
];

for (const event of events) {
  assert.ok(contract.includes(`'${event}'`), `analytics contract must include ${event}`);
  assert.ok(migration.includes(`'${event}'`), `analytics migration must constrain ${event}`);
}

assert.ok(migration.includes('alter table public.product_analytics_events enable row level security'), 'analytics event table must enable RLS');
assert.ok(migration.includes('revoke all on table public.product_analytics_events from public, anon, authenticated'), 'raw analytics events must be closed to browser roles');
assert.ok(migration.includes('grant select, insert on table public.product_analytics_events to service_role'), 'only the server trust boundary may persist raw analytics events');
assert.ok(migration.includes('create unique index if not exists product_analytics_user_milestone_uidx'), 'authenticated activation milestones must be idempotent');
assert.ok(migration.includes('get_acquisition_funnel_snapshot'), 'admin aggregate funnel read model must exist');
assert.ok(migration.includes("if not public.is_admin()"), 'aggregate funnel read model must enforce admin authorization');

for (const forbidden of ['email text', 'phone text', 'full_name text', 'ip_address', 'user_agent']) {
  assert.ok(!migration.toLowerCase().includes(forbidden), `raw analytics schema must not persist ${forbidden}`);
}

assert.ok(ingest.includes('MAX_BODY_BYTES = 2048'), 'analytics ingestion payload must be bounded');
assert.ok(ingest.includes('isClientFunnelEventName'), 'analytics ingestion must use event allowlist');
assert.ok(ingest.includes('isFunnelServiceKey'), 'analytics ingestion must use service allowlist');
assert.ok(ingest.includes('SUPABASE_SERVICE_ROLE_KEY'), 'analytics persistence must cross the server trust boundary');
assert.ok(!ingest.includes('body.metadata'), 'analytics endpoint must not accept arbitrary client metadata');

assert.ok(register.includes('analytics_anonymous_id: analyticsAnonymousId'), 'signup must persist the pseudonymous acquisition cohort id');
assert.ok(callback.includes("next === '/dashboard'"), 'activation callback must exclude password recovery from acquisition metrics');
assert.ok(callback.includes("eventName: 'email_verified'"), 'registration callback must record verified email milestone');
assert.ok(callback.includes("eventName: 'first_login'"), 'registration callback must record first authenticated session milestone');
assert.ok(hero.includes("trackFunnelEvent('home_viewed'"), 'home must record acquisition entry');
assert.ok(hero.includes("trackFunnelEvent('create_account_clicked'"), 'home account CTA must record conversion click');
assert.ok(dashboard.includes("trackFunnelEvent('dashboard_viewed'"), 'authenticated dashboard must record activation view');
assert.ok(dashboard.includes("trackFunnelEvent('first_service_used'"), 'dashboard must record first service activation');

assert.ok(adminAnalyticsPage.includes("investment_role !== 'SUPER_ADMIN'"), 'analytics dashboard route must remain restricted to SUPER_ADMIN');
assert.ok(adminAnalyticsPanel.includes('/api/admin/analytics/funnel?days=${windowDays}'), 'analytics dashboard must consume the protected aggregate endpoint');
assert.ok(adminAnalyticsPanel.includes('home_to_first_service'), 'analytics dashboard must expose end-to-end activation conversion');
assert.ok(adminAnalyticsPanel.includes('first_service_breakdown'), 'analytics dashboard must expose first-service activation mix');
assert.ok(adminNav.includes("href: '/admin/analytics'"), 'admin navigation must expose analytics route');
assert.ok(adminNav.includes("label: 'Analytics', roles: ['SUPER_ADMIN']"), 'analytics navigation item must remain SUPER_ADMIN-only');

console.log('Acquisition funnel telemetry and admin dashboard invariants passed.');
