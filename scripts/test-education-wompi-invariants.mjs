import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const [checkoutApi, checkoutClient, wompi, eventsApi, returnPage, migration, goldenJourney] = await Promise.all([
  read('src/app/api/education/checkout/route.ts'),
  read('src/components/jpvalderrama/EducationCheckoutClient.tsx'),
  read('src/lib/education/wompi.ts'),
  read('src/app/api/education/payments/wompi/events/route.ts'),
  read('src/app/jpvalderrama/campus/pago/retorno/page.tsx'),
  read('supabase/migrations/20260907031457_0122_jp_education_wompi_provider_boundary.sql'),
  read('scripts/education-wompi-golden-journey.sql'),
]);

// Checkout remains server-authoritative: browser supplies only offering slug + idempotency key.
assert.match(checkoutApi, /createAuthenticatedRequestContext/);
assert.match(checkoutApi, /create_education_order/);
assert.match(checkoutApi, /prepare_education_wompi_order/);
assert.match(checkoutApi, /buildWompiCheckoutUrl/);
assert.match(checkoutApi, /getWompiConfig/);
assert.match(checkoutApi, /paymentRedirectUrl/);
assert.match(checkoutApi, /WOMPI_REDIRECT_ORIGIN/);
assert.doesNotMatch(checkoutApi, /body\.amount/);
assert.doesNotMatch(checkoutApi, /body\.currency/);
assert.doesNotMatch(checkoutApi, /body\.price/);
assert.match(checkoutApi, /provider: 'manual_assisted'/);
assert.match(checkoutApi, /provider: 'wompi'/);

// Checkout signature is computed server-side and environment keys cannot be mixed.
assert.match(wompi, /WOMPI_PUBLIC_KEY/);
assert.match(wompi, /WOMPI_INTEGRITY_SECRET/);
assert.match(wompi, /WOMPI_EVENTS_SECRET/);
assert.match(wompi, /pub_prod_/);
assert.match(wompi, /pub_test_/);
assert.match(wompi, /prod_integrity_/);
assert.match(wompi, /test_integrity_/);
assert.match(wompi, /prod_events_/);
assert.match(wompi, /test_events_/);
assert.match(wompi, /createHash\('sha256'\)/);
assert.match(wompi, /https:\/\/checkout\.wompi\.co\/p\//);
assert.match(wompi, /signature:integrity/);
assert.match(wompi, /amount-in-cents/);
assert.match(wompi, /timingSafeEqual/);
assert.match(wompi, /__proto__/);
assert.match(wompi, /prototype/);
assert.match(wompi, /constructor/);

// Public webhook has no browser auth; trust comes exclusively from Wompi signature validation.
assert.match(eventsApi, /verifyWompiEventSignature/);
assert.match(eventsApi, /x-event-checksum/);
assert.match(eventsApi, /transaction\.updated/);
assert.match(eventsApi, /process_education_wompi_transaction_event/);
assert.match(eventsApi, /createAdminClient/);
assert.match(eventsApi, /EDUCATION_WOMPI_EVENT_SIGNATURE_INVALID/);
assert.match(eventsApi, /MAX_BODY_BYTES/);
assert.doesNotMatch(eventsApi, /complete_education_order/);
assert.doesNotMatch(eventsApi, /createAuthenticatedRequestContext/);

// Database settlement boundary revalidates amount/currency and browser roles remain excluded.
assert.match(migration, /create table if not exists public\.education_payment_provider_events/);
assert.match(migration, /prepare_education_wompi_order/);
assert.match(migration, /process_education_wompi_transaction_event/);
assert.match(migration, /EDUCATION_WOMPI_AMOUNT_MISMATCH/);
assert.match(migration, /EDUCATION_WOMPI_CURRENCY_MISMATCH/);
assert.match(migration, /EDUCATION_WOMPI_ORDER_TOTAL_INVALID/);
assert.match(migration, /settlement_source/);
assert.match(migration, /provider_webhook/);
assert.match(migration, /perform public\.complete_education_order/);
assert.match(migration, /revoke all on table public\.education_payment_provider_events from public, anon, authenticated/);
assert.match(migration, /revoke all on function public\.prepare_education_wompi_order\(uuid,uuid\) from public, anon, authenticated/);
assert.match(migration, /revoke all on function public\.process_education_wompi_transaction_event\(uuid,text,text,bigint,text,text\)/);

// Browser UX redirects to provider checkout when configured and labels assisted payment as fallback only.
assert.match(checkoutClient, /window\.location\.assign\(payload\.payment\.checkoutUrl\)/);
assert.match(checkoutClient, /payload\.payment\.provider === 'wompi'/);
assert.match(checkoutClient, /Abriendo Wompi/);
assert.match(checkoutClient, /canal asistido temporal/);
assert.match(checkoutClient, /gateway de pago en línea no está configurado/i);
assert.match(checkoutClient, /evento firmado del proveedor/i);

// Redirect is informational, never settlement authority.
assert.match(returnPage, /Volver desde la pasarela no equivale a una aprobación/);
assert.match(returnPage, /evento firmado del proveedor/);
assert.match(returnPage, /\/dashboard\/educacion/);

// Disposable DB proof covers amount tampering, settlement, entitlement and replay.
assert.match(goldenJourney, /prepare_education_wompi_order/);
assert.match(goldenJourney, /EDUCATION_WOMPI_AMOUNT_MISMATCH/);
assert.match(goldenJourney, /'PENDING'/);
assert.match(goldenJourney, /'APPROVED'/);
assert.match(goldenJourney, /provider_webhook/);
assert.match(goldenJourney, /operator_user_id IS NULL/);
assert.match(goldenJourney, /education_entitlements/);
assert.match(goldenJourney, /replayed/);
assert.match(goldenJourney, /ROLLBACK/);

console.log('Education Wompi checkout, signature and settlement invariants: PASS');
