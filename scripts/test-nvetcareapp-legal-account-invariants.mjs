import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const layout = read('src/app/nvetcareapp/layout.tsx');
const booking = read('src/app/nvetcareapp/dashboard/reservar/client-booking-flow.tsx');
const consent = read('src/app/nvetcareapp/dashboard/reservar/beta-legal-consent-card.tsx');
const profile = read('src/app/nvetcareapp/dashboard/perfil/page.tsx');
const analytics = read('src/lib/analytics/client.ts');
const legal = read('src/lib/nvetcareapp/legal.ts');

assert(layout.includes('<NvetCookieConsent />'), 'Nvet layout must mount cookie consent.');
assert(analytics.includes("sourcePath.startsWith('/nvetcareapp')"), 'Nvet analytics must be scoped by consent.');
assert(analytics.includes('consent.analytics === true'), 'Nvet analytics must require affirmative analytics consent.');
assert(booking.includes('<BetaLegalConsentCard onAcceptanceChange={setLegalAccepted} />'), 'Booking must render legal consent.');
assert(booking.includes('!legalAccepted'), 'Booking must fail closed without legal acceptance.');
assert(consent.includes('NVET_BETA_TERMS_VERSION') && consent.includes('NVET_BETA_PRIVACY_VERSION'), 'Consent must bind exact legal versions.');
assert(profile.includes('<AccountSecurityActions'), 'Profile must expose account self-service.');
assert(fs.existsSync('src/app/nvetcareapp/eliminar-cuenta/page.tsx'), 'Public account deletion page is required.');
assert(fs.existsSync('src/app/api/nvetcareapp/auth/account/route.ts'), 'Authenticated deletion BFF is required.');
assert(fs.existsSync('src/app/api/nvetcareapp/auth/change-password/route.ts'), 'Password change BFF is required.');
assert(fs.existsSync('src/app/nvetcareapp/privacidad/page.tsx'), 'Nvet privacy page is required.');
assert(fs.existsSync('src/app/nvetcareapp/terminos/page.tsx'), 'Nvet terms page is required.');
assert(fs.existsSync('src/app/nvetcareapp/cookies/page.tsx'), 'Nvet cookie policy is required.');
assert(legal.includes('cartagena-beta-terms-v1-2026-09-03'), 'Web terms version must match Nvet backend beta terms.');
assert(legal.includes('cartagena-beta-privacy-v1-2026-09-03'), 'Web privacy version must match Nvet backend beta privacy.');

console.log('Nvet legal/privacy/account invariants: OK');
