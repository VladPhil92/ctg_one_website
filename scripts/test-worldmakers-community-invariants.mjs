import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration = fs.readFileSync('supabase/migrations/20260911113727_0131_worldmakers_community_early_access.sql', 'utf8');
const contract = fs.readFileSync('src/lib/worldmakers/community.ts', 'utf8');
const publicApi = fs.readFileSync('src/app/api/worldmakers/interest/route.ts', 'utf8');
const adminApi = fs.readFileSync('src/app/api/admin/worldmakers/interest/route.ts', 'utf8');
const playerStateRoute = fs.readFileSync('src/app/api/worldmakers/player-state/route.ts', 'utf8');
const playerStateBridge = fs.readFileSync('src/lib/worldmakers/player-state-bridge.ts', 'utf8');
const worldMakersRoutes = fs.readFileSync('src/lib/worldmakers/routes.ts', 'utf8');
const publicPage = fs.readFileSync('src/app/worldmakers/community/page.tsx', 'utf8');
const publicForm = fs.readFileSync('src/app/worldmakers/community/CommunityInterestForm.tsx', 'utf8');
const privacyPage = fs.readFileSync('src/app/worldmakers/privacy/page.tsx', 'utf8');
const adminPage = fs.readFileSync('src/app/admin/worldmakers/page.tsx', 'utf8');
const adminNav = fs.readFileSync('src/components/admin/AdminNav.tsx', 'utf8');
const sitemap = fs.readFileSync('src/app/worldmakers/sitemap.ts', 'utf8');
const worldMakersLayout = fs.readFileSync('src/app/worldmakers/layout.tsx', 'utf8');
const playerAccessDock = fs.readFileSync('src/app/worldmakers/PlayerAccessDock.tsx', 'utf8');
const playerAccessStyles = fs.readFileSync('src/app/worldmakers/player-access.module.css', 'utf8');
const playerAccountPage = fs.readFileSync('src/app/worldmakers/account/page.tsx', 'utf8');
const loginPage = fs.readFileSync('src/app/(auth)/iniciar-sesion/page.tsx', 'utf8');
const registrationPage = fs.readFileSync('src/app/(auth)/registro/page.tsx', 'utf8');
const authCallbackRoute = fs.readFileSync('src/app/auth/callback/route.ts', 'utf8');

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

assert.ok(worldMakersLayout.includes('<PlayerAccessDock />'), 'World Makers layout must keep player auth visibly available');
assert.ok(worldMakersLayout.includes('mobileDockSpacer'), 'World Makers layout must reserve mobile space for the fixed player access dock');
assert.ok(playerAccessStyles.includes('height: calc(84px + env(safe-area-inset-bottom))'), 'mobile World Makers pages must reserve dock height plus safe-area inset');
assert.ok(playerAccessStyles.includes('bottom: calc(12px + env(safe-area-inset-bottom))'), 'mobile player dock must respect the device safe-area inset');
assert.ok(playerAccessDock.includes('Iniciar sesión'), 'player access dock must expose sign in');
assert.ok(playerAccessDock.includes('Crear cuenta'), 'player access dock must expose account creation');
assert.ok(playerAccessDock.includes('worldMakersSignInUrl()'), 'player access dock must use the centralized World Makers sign-in route');
assert.ok(playerAccessDock.includes('worldMakersRegistrationUrl()'), 'player access dock must use the centralized World Makers registration route');
assert.ok(worldMakersRoutes.includes("export const CTG_ONE_ORIGIN = 'https://ctgone.com'"), 'World Makers auth must keep the canonical CTG One origin');
assert.ok(worldMakersRoutes.includes("export const WORLDMAKERS_DASHBOARD_PATH = '/worldmakers/dashboard'"), 'World Makers auth must return to the canonical player dashboard');
assert.ok(worldMakersRoutes.includes("/iniciar-sesion?next=${encodeURIComponent(nextPath)}"), 'World Makers sign-in helper must preserve a validated encoded return path');
assert.ok(worldMakersRoutes.includes("/registro?next=${encodeURIComponent(nextPath)}"), 'World Makers registration helper must preserve a validated encoded return path');
assert.ok(playerAccountPage.includes('supabase.auth.getUser()'), 'player account hub must validate the authenticated user server-side');
assert.ok(playerAccountPage.includes('Crear una cuenta no implica acceso inmediato a una beta jugable'), 'player account hub must preserve public availability truth');
assert.ok(playerAccountPage.includes('Sin datos de gameplay'), 'Game Hub must preserve an honest empty-progress state before first runtime sync');
assert.ok(playerAccountPage.includes('No hay partidas sincronizadas'), 'Game Hub must preserve an honest empty-save state');
assert.ok(playerAccountPage.includes('readWorldMakersPlayerState(user.id)'), 'Game Hub must read real player state from the dedicated bridge');
assert.ok(playerAccountPage.includes('remoteState?.saves.length'), 'Game Hub save counts must derive from synchronized state');
assert.ok(playerAccountPage.includes('remoteState?.missions.length'), 'Game Hub mission counts must derive from synchronized state');
assert.ok(playerAccountPage.includes('remoteState?.discoveries.length'), 'Game Hub discovery counts must derive from synchronized state');

assert.ok(playerStateRoute.includes('createAuthenticatedRequestContext(request)'), 'player-state API must accept canonical cookie or bearer CTG One authentication');
assert.ok(playerStateRoute.includes("'Cache-Control': 'no-store'"), 'player-state API must not cache private player data');
assert.ok(playerStateRoute.includes("Vary: 'Authorization, Cookie'"), 'player-state API must vary private responses by authentication transport');
assert.ok(playerStateRoute.includes('MAX_BODY_BYTES = 64 * 1024'), 'player-state writes must have a bounded request body');
assert.ok(playerStateRoute.includes("request.headers.get('idempotency-key')"), 'player-state writes must require an idempotency key');
assert.ok(playerStateRoute.includes('expectedRevision'), 'player-state writes must use optimistic revision control');
assert.ok(playerStateRoute.includes('readWorldMakersPlayerState(context.user.id)'), 'player-state reads must derive ownership from the authenticated CTG One user');
assert.ok(playerStateRoute.includes('writeWorldMakersPlayerState(context.user.id'), 'player-state writes must derive ownership from the authenticated CTG One user');
assert.ok(playerStateRoute.includes("gameRuntime: state.exists ? 'synced' : 'awaiting_first_sync'"), 'runtime sync status must reflect real dedicated state');
assert.ok(playerStateRoute.includes('cloudSave: true'), 'cloud-save capability must only be enabled through the secured bridge');
assert.ok(!playerStateRoute.includes('SUPABASE_SERVICE_ROLE_KEY'), 'runtime player-state route must never expose or rely on a service-role key');

assert.ok(playerStateBridge.includes("import 'server-only'"), 'dedicated player-state bridge must remain server-only');
assert.ok(playerStateBridge.includes('createHmac'), 'bridge calls must be signed');
assert.ok(playerStateBridge.includes('randomBytes'), 'bridge calls must use one-time nonces');
assert.ok(playerStateBridge.includes("client.rpc('wm_bridge_player_state'"), 'bridge must use the constrained World Makers RPC boundary');
assert.ok(playerStateBridge.includes('WORLDMAKERS_SUPABASE_PUBLISHABLE_KEY'), 'bridge must use the World Makers publishable key at the HTTP boundary');
assert.ok(playerStateBridge.includes('revision_conflict'), 'bridge must surface optimistic concurrency conflicts');
assert.ok(!playerStateBridge.includes('SUPABASE_SERVICE_ROLE_KEY'), 'bridge must not contain a World Makers service-role path');

assert.ok(loginPage.includes("safeRedirectPath(searchParams.get('next'), '/dashboard')"), 'login must validate its post-auth destination');
assert.ok(loginPage.includes('isWorldMakersFlow'), 'login must expose World Makers context when returning to the player hub');
assert.ok(registrationPage.includes("safeRedirectPath(searchParams.get('next'), '/dashboard')"), 'registration must validate its post-auth destination');
assert.ok(registrationPage.includes('emailRedirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(redirectTo)}`'), 'registration confirmation must preserve the validated World Makers destination');
assert.ok(registrationPage.includes('no implica acceso inmediato a una beta jugable'), 'registration must not imply immediate game availability');
assert.ok(authCallbackRoute.includes("next === '/worldmakers/account'"), 'World Makers email confirmation must preserve verified/activated funnel milestones');
assert.ok(authCallbackRoute.includes("eventName: 'email_verified'"), 'World Makers confirmation must retain email verification metrics');
assert.ok(authCallbackRoute.includes("eventName: 'first_login'"), 'World Makers confirmation must retain first-login metrics');

console.log('World Makers community, early-access, player-account and secure runtime-sync invariants passed.');
