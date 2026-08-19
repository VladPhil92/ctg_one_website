import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [registerPage, loginPage, callbackRoute, recoveryPage, resetPage] = await Promise.all([
  readFile('src/app/(auth)/registro/page.tsx', 'utf8'),
  readFile('src/app/(auth)/iniciar-sesion/page.tsx', 'utf8'),
  readFile('src/app/auth/callback/route.ts', 'utf8'),
  readFile('src/app/(auth)/recuperar-contrasena/page.tsx', 'utf8'),
  readFile('src/app/(auth)/restablecer-contrasena/page.tsx', 'utf8'),
]);

assert.ok(registerPage.includes('/auth/callback?next=/dashboard'), 'Signup confirmation must return through the SSR auth callback.');
assert.ok(callbackRoute.includes('exchangeCodeForSession(code)'), 'Auth callback must exchange the PKCE code for a cookie-backed session.');
assert.ok(callbackRoute.includes("!value.startsWith('/') || value.startsWith('//')"), 'Auth callback must reject external/protocol-relative redirect targets.');
assert.ok(loginPage.includes('/recuperar-contrasena'), 'Login must expose password recovery.');
assert.ok(recoveryPage.includes('resetPasswordForEmail'), 'Password recovery must request a Supabase reset email.');
assert.ok(recoveryPage.includes('/auth/callback?next=/restablecer-contrasena'), 'Password recovery must return through the SSR auth callback.');
assert.ok(resetPage.includes('auth.updateUser({ password:'), 'Password reset must update the authenticated recovery session password.');
assert.ok(resetPage.includes('auth.signOut()'), 'Password reset must invalidate the recovery session after success.');

console.log('Auth lifecycle invariants: PASS');
