import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration = fs.readFileSync('supabase/migrations/20260911113727_0131_worldmakers_community_early_access.sql', 'utf8');
const contract = fs.readFileSync('src/lib/worldmakers/community.ts', 'utf8');
const publicApi = fs.readFileSync('src/app/api/worldmakers/interest/route.ts', 'utf8');
const adminApi = fs.readFileSync('src/app/api/admin/worldmakers/interest/route.ts', 'utf8');
const publicPage = fs.readFileSync('src/app/worldmakers/community/page.tsx', 'utf8');
const publicForm = fs.readFileSync('src/app/worldmakers/community/CommunityInterestForm.tsx', 'utf8');
const privacyPage = fs.readFileSync('src/app/worldmakers/privacy/page.tsx', 'utf8');
const adminPage = fs.readFileSync('src/app/admin/worldmakers/page.tsx', 'utf8');
const adminNav = fs.readFileSync('src/components/admin/AdminNav.tsx', 'utf8');
const sitemap = fs.readFileSync('src/app/worldmakers/sitemap.ts', 'utf8');

for (const status of [
  'registered',
  'reviewing',
  'shortlisted',
  'ready_to_invite',
  'contacted',
  'paused',
  'declined',
  'withdrawn',
]) {
  assert.ok(contract.includes(`'${status}'`), `community contract must include status ${status}`);
  assert.ok(migration.includes(`'${status}'`), `migration must constrain status ${status}`);
}

for (const audience of ['family', 'educator', 'tester', 'developer', 'researcher', 'other']) {
  assert.ok(contract.includes(`'${audience}'`), `community contract must include audience ${audience}`);
  assert.ok(migration.includes(`'${audience}'`), `migration must constrain audience ${audience}`);
}

assert.ok(migration.includes('alter table public.worldmakers_interest_profiles enable row level security'), 'interest profiles must enable RLS');
assert.ok(migration.includes('alter table public.worldmakers_interest_status_events enable row level security'), 'status events must enable RLS');
assert.ok(migration.includes('revoke all on table public.worldmakers_interest_profiles from public, anon, authenticated'), 'public roles must not read interest profiles directly');
assert.ok(migration.includes('revoke all on table public.worldmakers_interest_status_events from public, anon, authenticated'), 'public roles must not read status history directly');
assert.ok(migration.includes('grant select, insert, update, delete on table public.worldmakers_interest_profiles to service_role'), 'profiles must be server-boundary writable');
assert.ok(migration.includes('worldmakers_interest_audit_status_change'), 'status transitions must be audited');

for (const forbidden of ['child_name', 'child_email', 'date_of_birth', 'ip_address', 'user_agent', 'payment_method']) {
  assert.ok(!migration.toLowerCase().includes(forbidden), `community schema must not persist ${forbidden}`);
}

assert.ok(publicApi.includes('MAX_BODY_BYTES = 6 * 1024'), 'public intake payload must be bounded');
assert.ok(publicApi.includes('request.body?.getReader()'), 'public intake must enforce the body bound on streamed bytes, not only Content-Length');
assert.ok(publicApi.includes('totalBytes > MAX_BODY_BYTES'), 'streamed body bytes must be rejected above the configured limit');
assert.ok(publicApi.includes('RATE_LIMIT_MAX_REQUESTS = 8'), 'public intake must include an abuse guard');
assert.ok(publicApi.includes("website: z.string().max(200).optional()"), 'public intake must include a honeypot');
assert.ok(publicApi.includes('createHash'), 'IP material must be one-way transformed before ephemeral rate-limit use');
assert.ok(!publicApi.includes(".insert({\n    ip"), 'public intake must not persist IP data');
assert.ok(publicApi.includes('isWorldMakersSourcePath'), 'source paths must be allow-listed');
assert.ok(publicApi.includes('SUPABASE_SERVICE_ROLE_KEY'), 'persistence must cross the server trust boundary');
assert.ok(publicApi.includes('normalizedOriginHost === requestHost'), 'same-origin deployment previews must be allowed safely');
assert.ok(publicApi.includes("error.code !== '23505'"), 'duplicate email submissions must collapse to a neutral success');
assert.ok(!publicApi.includes(".from('worldmakers_interest_profiles')\n      .update"), 'unauthenticated duplicate submissions must never mutate an existing profile');
assert.ok(publicApi.includes("state: 'received'"), 'first-time and duplicate public responses must be privacy-neutral');

assert.ok(publicForm.includes('adultConfirmed'), 'form must require adult attestation');
assert.ok(publicForm.includes('privacyConsent'), 'form must require explicit privacy consent');
assert.ok(publicForm.includes('No solicites ni ingreses datos personales de niños'), 'form must warn against child data submission');
assert.ok(publicForm.includes('Un envío repetido no modifica ni reactiva un perfil previo'), 'duplicate ownership boundary must be explained to the user');
assert.ok(publicPage.includes('todavía no tiene una beta pública'), 'community page must not imply public beta availability');
assert.ok(privacyPage.includes('No solicitamos datos de niños'), 'privacy notice must disclose child-data exclusion');

assert.ok(adminApi.includes("profile?.role !== 'admin'"), 'admin API must require global admin');
assert.ok(adminApi.includes("investmentProfile?.investment_role !== 'SUPER_ADMIN'"), 'admin API must require SUPER_ADMIN');
assert.ok(adminApi.includes('const statusChanged = existing.status !== status'), 'admin patch must distinguish note edits from real status transitions');
assert.ok(adminApi.includes('if (statusChanged)'), 'status-change metadata must be conditional on a real status transition');
assert.ok(adminPage.includes("investmentProfile?.investment_role !== 'SUPER_ADMIN'"), 'admin page must require SUPER_ADMIN');
assert.ok(adminNav.includes("href: '/admin/worldmakers'"), 'admin nav must expose World Makers operations');
assert.ok(adminNav.includes("label: 'World Makers', roles: ['SUPER_ADMIN']"), 'World Makers admin navigation must remain SUPER_ADMIN-only');

assert.ok(sitemap.includes("`${siteUrl}/community`"), 'World Makers sitemap must publish community route');
assert.ok(sitemap.includes("`${siteUrl}/privacy`"), 'World Makers sitemap must publish privacy route');

console.log('World Makers community and early-access invariants passed.');
