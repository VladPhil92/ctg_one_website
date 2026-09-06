import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [
  registerPage,
  loginPage,
  callbackRoute,
  recoveryPage,
  resetPage,
  authContext,
  clientPolicy,
  passwordRequirements,
  authInput,
  authLayout,
  initialMigration,
  verticeExchangeRoute,
  walletIdentityLinkRoute,
  serviceFederationRateLimitMigration,
  adminServerRpcMigration,
  walletTopupVerifyRoute,
  walletTopupReconcileRoute,
  walletTopupRejectRoute,
  kycApproveRoute,
  kycRejectRoute,
] = await Promise.all([
  readFile('src/app/(auth)/registro/page.tsx', 'utf8'),
  readFile('src/app/(auth)/iniciar-sesion/page.tsx', 'utf8'),
  readFile('src/app/auth/callback/route.ts', 'utf8'),
  readFile('src/app/(auth)/recuperar-contrasena/page.tsx', 'utf8'),
  readFile('src/app/(auth)/restablecer-contrasena/page.tsx', 'utf8'),
  readFile('src/contexts/AuthContext.tsx', 'utf8'),
  readFile('src/lib/auth/client-policy.ts', 'utf8'),
  readFile('src/components/auth/PasswordRequirements.tsx', 'utf8'),
  readFile('src/components/auth/AuthInput.tsx', 'utf8'),
  readFile('src/app/(auth)/layout.tsx', 'utf8'),
  readFile('supabase/migrations/0001_init.sql', 'utf8'),
  readFile('src/app/api/federation/vertice/exchange/route.ts', 'utf8'),
  readFile('src/app/api/wallet/identity/link/route.ts', 'utf8'),
  readFile('supabase/migrations/20260906153332_0110_service_federation_rate_limits.sql', 'utf8'),
  readFile('supabase/migrations/20260906165045_0111_admin_server_rpc_boundaries.sql', 'utf8'),
  readFile('src/app/api/admin/wallet-topups/[id]/verify/route.ts', 'utf8'),
  readFile('src/app/api/admin/wallet-topups/[id]/reconcile/route.ts', 'utf8'),
  readFile('src/app/api/admin/wallet-topups/[id]/reject/route.ts', 'utf8'),
  readFile('src/app/api/admin/kyc/[id]/approve/route.ts', 'utf8'),
  readFile('src/app/api/admin/kyc/[id]/reject/route.ts', 'utf8'),
]);

// SSR / PKCE lifecycle and redirect confinement.
assert.ok(registerPage.includes('/auth/callback?next=/dashboard'), 'Signup confirmation must return through the SSR auth callback.');
assert.ok(callbackRoute.includes('exchangeCodeForSession(code)'), 'Auth callback must exchange the PKCE code for a cookie-backed session.');
assert.ok(callbackRoute.includes('safeRedirectPath'), 'Auth callback must reject external/protocol-relative redirect targets via the shared safeRedirectPath guard.');
assert.ok(loginPage.includes('/recuperar-contrasena'), 'Login must expose password recovery.');
assert.ok(recoveryPage.includes('resetPasswordForEmail'), 'Password recovery must request a Supabase reset email.');
assert.ok(recoveryPage.includes('/auth/callback?next=/restablecer-contrasena'), 'Password recovery must return through the SSR auth callback.');
assert.ok(resetPage.includes('auth.updateUser({ password'), 'Password reset must update the authenticated recovery session password.');
assert.ok(resetPage.includes('auth.signOut()'), 'Password reset must invalidate the recovery session after success.');

// Client identity must be validated against Auth on bootstrap rather than
// inferred only from a cached browser session.
assert.match(authContext, /auth\.getUser\(\)/, 'AuthContext bootstrap must validate identity with getUser().');
assert.doesNotMatch(authContext, /auth\.getSession\(\)/, 'AuthContext must not bootstrap authenticated identity from getSession().');
assert.match(authContext, /from\('profiles'\)[\s\S]*?\.maybeSingle\(\)/, 'Profile hydration must tolerate a temporarily missing row without throwing.');
assert.match(authContext, /event === 'SIGNED_OUT'/, 'Auth state listener must explicitly clear identity on sign-out.');

// Signup must remain atomic at the database boundary: auth.users creates the
// domain profile and wallet through the immutable initial migration trigger.
assert.match(initialMigration, /create(?: or replace)? function public\.handle_new_user\(\)/i, 'Initial migration must retain the new-user provisioning function.');
assert.match(initialMigration, /insert into public\.profiles/i, 'New-user provisioning must create the public profile.');
assert.match(initialMigration, /insert into public\.wallets/i, 'New-user provisioning must create the wallet.');
assert.match(initialMigration, /after insert on auth\.users/i, 'New-user provisioning must remain attached to auth.users inserts.');

// New passwords use one shared client policy. Existing passwords are
// intentionally not rejected client-side at login so historical users can
// still authenticate. Hosted Auth enforcement remains an operational gate.
assert.match(clientPolicy, /PASSWORD_MIN_LENGTH\s*=\s*12/, 'New account passwords must require at least 12 characters in the client policy.');
for (const requirement of ['/[a-z]/', '/[A-Z]/', '/\\d/', '/[^A-Za-z0-9]/']) {
  assert.ok(clientPolicy.includes(requirement), `Password policy must retain requirement ${requirement}.`);
}
assert.ok(registerPage.includes('strongPasswordError(password, locale)'), 'Signup must use the shared strong-password policy.');
assert.ok(resetPage.includes('strongPasswordError(password, locale)'), 'Password reset must use the shared strong-password policy.');
assert.ok(registerPage.includes('<PasswordRequirements'), 'Signup must explain password requirements before backend submission.');
assert.ok(resetPage.includes('<PasswordRequirements'), 'Password reset must explain password requirements.');
assert.doesNotMatch(loginPage, /PASSWORD_MIN_LENGTH|strongPasswordError|<PasswordRequirements/, 'Login must not impose the new-password policy on existing credentials.');
assert.match(authInput, /min-h-11/, 'Authentication fields must retain a 44px minimum interaction target.');
assert.match(passwordRequirements, /aria-live="polite"/, 'Password requirement feedback must be exposed accessibly.');

// Email identity is normalized consistently before authentication requests.
assert.ok(registerPage.includes('normalizeEmail(email)'), 'Signup must normalize email before Auth submission.');
assert.ok(loginPage.includes('normalizeEmail(email)'), 'Login must normalize email before Auth submission.');
assert.ok(recoveryPage.includes('normalizeEmail(email)'), 'Password recovery must normalize email before Auth submission.');

// Provider error payloads must never be rendered raw to users.
for (const [name, source, operation] of [
  ['signup', registerPage, 'signup'],
  ['login', loginPage, 'login'],
  ['recovery', recoveryPage, 'recovery'],
  ['password update', resetPage, 'password-update'],
]) {
  assert.ok(source.includes(`authErrorMessage(err, locale, '${operation}')`), `${name} must map provider errors through the shared safe error policy.`);
  assert.doesNotMatch(source, /err instanceof Error \? err\.message/, `${name} must not expose raw provider error messages.`);
}
assert.match(clientPolicy, /invalid_credentials/, 'Safe Auth error policy must handle invalid credentials explicitly.');
assert.match(clientPolicy, /email_not_confirmed/, 'Safe Auth error policy must handle unconfirmed email explicitly.');
assert.match(clientPolicy, /weak_password/, 'Safe Auth error policy must handle Supabase weak-password responses.');
assert.match(clientPolicy, /over_email_send_rate_limit/, 'Safe Auth error policy must handle email rate limiting.');

// Auth UI must be bilingual and part of the same accessible product shell.
for (const [name, source] of [
  ['signup', registerPage],
  ['login', loginPage],
  ['recovery', recoveryPage],
  ['password reset', resetPage],
]) {
  assert.ok(source.includes('useLanguage'), `${name} must honor the selected CTG One locale.`);
}
assert.ok(authLayout.includes('<LanguageSwitcher compact />'), 'Authentication shell must expose the language selector.');
assert.match(authLayout, /min-h-11/, 'Authentication home navigation must retain a 44px target.');

// Zero-trust service API boundaries. The VERTICE exchange is a server-to-server
// identity boundary, so a valid shared secret alone is insufficient: the body
// contract, resource consumption, throttling and database privileges must all
// fail closed and remain regression-tested.
assert.match(verticeExchangeRoute, /MAX_BODY_BYTES\s*=\s*4\s*\*\s*1024/, 'VERTICE exchange must cap request bodies at 4 KiB.');
assert.match(verticeExchangeRoute, /requestMime\(request\)\s*!==\s*JSON_MIME/, 'VERTICE exchange must require application/json.');
assert.match(verticeExchangeRoute, /request\.body\.getReader\(\)/, 'VERTICE exchange must enforce the body bound while streaming, not only through Content-Length.');
assert.match(verticeExchangeRoute, /consume_service_api_rate_limit/, 'VERTICE exchange must consume the durable service rate limit before code exchange.');
assert.ok(verticeExchangeRoute.includes("SERVICE_RATE_LIMIT_SCOPE = 'federation.vertice.exchange'"), 'VERTICE exchange must use its dedicated service rate-limit scope.');
assert.ok(verticeExchangeRoute.includes("SERVICE_RATE_LIMIT_ACTOR = 'vertice'"), 'VERTICE exchange must bind rate limiting to the VERTICE service actor.');
assert.match(verticeExchangeRoute, /Retry-After/, 'VERTICE exchange must return Retry-After when throttled.');
assert.match(verticeExchangeRoute, /EXCHANGE_KEYS/, 'VERTICE exchange must reject ambiguous extra JSON fields.');
assert.match(verticeExchangeRoute, /Cache-Control'?,?\s*'no-store'|headers\.set\('Cache-Control', 'no-store'\)/, 'VERTICE exchange responses must remain non-cacheable.');

assert.match(walletIdentityLinkRoute, /requestMime\(request\)\s*!==\s*JSON_MIME/, 'Wallet identity linking must require application/json.');
assert.match(walletIdentityLinkRoute, /MAX_REQUEST_BYTES\s*=\s*4\s*\*\s*1024/, 'Wallet identity linking must retain its 4 KiB request bound.');
assert.match(walletIdentityLinkRoute, /consume_wallet_identity_link_rate_limit/, 'Wallet identity linking must retain durable throttling.');
assert.match(walletIdentityLinkRoute, /verifyPrivyIdentityToken/, 'Wallet identity linking must retain server-side Privy identity proof verification.');

assert.match(serviceFederationRateLimitMigration, /create table if not exists private\.service_api_rate_limit_windows/i, 'Service rate-limit state must remain private.');
assert.match(serviceFederationRateLimitMigration, /enable row level security/i, 'Service rate-limit table must keep RLS enabled.');
assert.match(serviceFederationRateLimitMigration, /security invoker/i, 'Service rate-limit function must remain SECURITY INVOKER.');
assert.match(serviceFederationRateLimitMigration, /revoke all on function[\s\S]*from public, anon, authenticated/i, 'Service rate-limit function must not be executable by public client roles.');
assert.match(serviceFederationRateLimitMigration, /grant execute on function[\s\S]*to service_role/i, 'Service rate-limit function must remain service-role-only.');
assert.match(serviceFederationRateLimitMigration, /p_scope is distinct from 'federation\.vertice\.exchange'/i, 'Service limiter must fail closed outside the admitted VERTICE scope.');
assert.match(serviceFederationRateLimitMigration, /p_actor_key is distinct from 'vertice'/i, 'Service limiter must fail closed outside the admitted VERTICE actor.');

// Privileged mutation boundary. Browser-authenticated callers may establish the
// actor identity, but KYC and Wallet administrative writes must cross a separate
// server-only RPC boundary that independently revalidates the canonical admin.
for (const functionName of [
  'verify_wallet_topup_claim_server',
  'reconcile_wallet_topup_claim_server',
  'reject_wallet_topup_claim_server',
  'approve_kyc_server',
  'reject_kyc_server',
]) {
  assert.ok(adminServerRpcMigration.includes(`function public.${functionName}(`), `${functionName} must be defined by migration 0111.`);
  assert.match(adminServerRpcMigration, new RegExp(`revoke all on function public\\.${functionName}\\([\\s\\S]*?from public, anon, authenticated`, 'i'), `${functionName} must not be executable by client roles.`);
  assert.match(adminServerRpcMigration, new RegExp(`grant execute on function public\\.${functionName}\\([\\s\\S]*?to service_role`, 'i'), `${functionName} must remain service-role-only.`);
}
assert.ok((adminServerRpcMigration.match(/security definer/gi) ?? []).length >= 5, 'Every privileged server RPC must remain SECURITY DEFINER.');
assert.ok((adminServerRpcMigration.match(/set search_path = ''/gi) ?? []).length >= 5, 'Every privileged server RPC must use an empty search_path.');
assert.match(adminServerRpcMigration, /p\.id = p_actor_user_id and p\.role = 'admin'/, 'Server RPCs must revalidate the canonical admin actor from profiles.');
assert.match(adminServerRpcMigration, /set_config\('request\.jwt\.claim\.sub', p_actor_user_id::text, true\)/, 'Server RPCs must bind delegated legacy authorization to the revalidated actor only.');

for (const [name, source, rpc] of [
  ['wallet top-up verify', walletTopupVerifyRoute, 'verify_wallet_topup_claim_server'],
  ['wallet top-up reconcile', walletTopupReconcileRoute, 'reconcile_wallet_topup_claim_server'],
  ['wallet top-up reject', walletTopupRejectRoute, 'reject_wallet_topup_claim_server'],
  ['KYC approve', kycApproveRoute, 'approve_kyc_server'],
  ['KYC reject', kycRejectRoute, 'reject_kyc_server'],
]) {
  assert.match(source, /auth\.getUser\(\)/, `${name} must establish the canonical authenticated actor.`);
  assert.match(source, /rpc\('is_admin'\)/, `${name} must fail before privileged execution when the user is not an admin.`);
  assert.match(source, /createAdminClient\(\)/, `${name} must execute the mutation through the server-only client.`);
  assert.ok(source.includes(`rpc('${rpc}'`), `${name} must call ${rpc}.`);
  assert.match(source, /p_actor_user_id:\s*user\.id/, `${name} must bind the server mutation to the authenticated actor id.`);
  assert.doesNotMatch(source, /error:\s*error\.message/, `${name} must not expose raw database errors to the browser.`);
}

console.log('Auth lifecycle invariants: PASS');
