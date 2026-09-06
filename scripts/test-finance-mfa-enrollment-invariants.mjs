import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const files = {
  page: path.join(root, 'src/app/admin/security/mfa/page.tsx'),
  panel: path.join(root, 'src/app/admin/security/mfa/FinanceMfaPanel.tsx'),
  nav: path.join(root, 'src/components/admin/AdminNav.tsx'),
};

for (const [label, file] of Object.entries(files)) {
  if (!fs.existsSync(file)) throw new Error(`Finance MFA ${label} missing: ${path.relative(root, file)}`);
}

const source = Object.fromEntries(
  Object.entries(files).map(([key, file]) => [key, fs.readFileSync(file, 'utf8')]),
);

function requireFragments(text, label, fragments) {
  for (const fragment of fragments) {
    if (!text.includes(fragment)) throw new Error(`${label} missing invariant fragment: ${fragment}`);
  }
}

requireFragments(source.page, 'Finance MFA server boundary', [
  "redirect('/iniciar-sesion')",
  ".from('investment_participant_profiles')",
  ".select('investment_role')",
  "investmentRole !== 'SUPER_ADMIN' && investmentRole !== 'FINANCE_ADMIN'",
  "redirect('/admin')",
  '<FinanceMfaPanel />',
]);

requireFragments(source.panel, 'Finance MFA TOTP UX', [
  "supabase.auth.mfa.listFactors()",
  "supabase.auth.mfa.getAuthenticatorAssuranceLevel()",
  "supabase.auth.mfa.enroll({",
  "factorType: 'totp'",
  "friendlyName: 'CTG One Finance OS'",
  "supabase.auth.mfa.challengeAndVerify({",
  "supabase.auth.mfa.unenroll({ factorId })",
  "!/^\\d{6}$/.test(code)",
  "assurance.currentLevel !== 'aal2'",
  "autoComplete=\"one-time-code\"",
]);

for (const forbidden of [
  "fetch('/api/",
  'logger.',
  'recordFinancialSecurityEvent',
  'SUPABASE_SERVICE_ROLE_KEY',
  '.from(',
  '.insert(',
  '.update(',
  '.rpc(',
]) {
  if (source.panel.includes(forbidden)) {
    throw new Error(`Finance MFA client must not persist or proxy TOTP enrollment data: ${forbidden}`);
  }
}

if (!source.panel.includes('data.totp?.qr_code') || !source.panel.includes('data.totp.secret')) {
  throw new Error('Finance MFA panel must keep the provider-issued QR and secret in client state only.');
}
if (source.page.includes('secret') || source.page.includes('qrCode') || source.page.includes('factorId')) {
  throw new Error('Finance MFA server page must not receive TOTP enrollment secrets or factor challenge material.');
}

requireFragments(source.nav, 'Finance MFA navigation', [
  "{ href: '/admin/security/mfa', label: 'MFA Seguridad', roles: ['SUPER_ADMIN','FINANCE_ADMIN'] }",
]);

console.log('Finance MFA enrollment and AAL2 challenge invariants: PASS');
