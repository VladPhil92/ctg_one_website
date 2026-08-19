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
]);

// SSR / PKCE lifecycle and redirect confinement.
assert.ok(registerPage.includes('/auth/callback?next=/dashboard'), 'Signup confirmation must return through the SSR auth callback.');
assert.ok(callbackRoute.includes('exchangeCodeForSession(code)'), 'Auth callback must exchange the PKCE code for a cookie-backed session.');
assert.ok(callbackRoute.includes("!value.startsWith('/') || value.startsWith('//')"), 'Auth callback must reject external/protocol-relative redirect targets.');
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

// New passwords use one shared policy. Existing passwords are intentionally not
// rejected client-side at login so historical users can still authenticate.
assert.match(clientPolicy, /PASSWORD_MIN_LENGTH\s*=\s*12/, 'New account passwords must require at least 12 characters.');
for (const requirement of [/[a-z]/, /[A-Z]/, /\\d/, /[^A-Za-z0-9]/]) {
  assert.ok(clientPolicy.includes(requirement.source), `Password policy must retain requirement ${requirement}.`);
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

console.log('Auth lifecycle invariants: PASS');
