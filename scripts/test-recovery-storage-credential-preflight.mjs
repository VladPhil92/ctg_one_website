import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  EXPECTED_PRODUCTION_SUPABASE_URL,
  classifyRecoveryAdminKey,
  storageCredentialFailureMessage,
  validateRecoveryStorageSource,
} from './validate-recovery-storage-source.mjs';

const workflow = await readFile(new URL('../.github/workflows/recovery-drill.yml', import.meta.url), 'utf8');
const preflightIndex = workflow.indexOf('Validate production Storage credential before expensive restore');
const installIndex = workflow.indexOf('Install repository dependencies');
const localStartIndex = workflow.indexOf('Start isolated full local Supabase recovery target');
assert.ok(preflightIndex > installIndex, 'Storage credential preflight must run only after the Supabase JS dependency is installed.');
assert.ok(localStartIndex > preflightIndex, 'Storage credential preflight must run before the expensive local Supabase recovery target starts.');
assert.match(
  workflow,
  /node scripts\/validate-recovery-storage-source\.mjs/,
  'Recovery workflow must execute the reviewed Storage credential preflight script.',
);
assert.match(
  workflow,
  /if command -v supabase >\/dev\/null 2>&1; then/,
  'Recovery cleanup must tolerate a preflight failure before Supabase CLI installation.',
);

const jwt = (payload) => {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}.signature`;
};

assert.equal(classifyRecoveryAdminKey('sb_secret_example'), 'modern-secret');
assert.equal(classifyRecoveryAdminKey(jwt({ role: 'service_role' })), 'legacy-service-role');
assert.throws(
  () => classifyRecoveryAdminKey('sb_publishable_example'),
  /publishable key/i,
  'Recovery must reject publishable keys before contacting Storage.',
);
assert.throws(
  () => classifyRecoveryAdminKey(jwt({ role: 'anon' })),
  /requires service_role privileges/i,
  'Recovery must reject low-privilege legacy JWTs.',
);
assert.throws(
  () => classifyRecoveryAdminKey('"sb_secret_example"'),
  /wrapped in quotes/i,
  'Recovery must identify quoted secrets explicitly instead of reporting a generic credential failure.',
);
assert.throws(
  () => classifyRecoveryAdminKey('SUPABASE_SECRET_KEY=sb_secret_example'),
  /environment assignment/i,
  'Recovery must reject KEY=value secret payloads and require the raw key only.',
);
assert.throws(
  () => classifyRecoveryAdminKey('eyJbroken'),
  /malformed or truncated JWT/i,
  'Recovery must distinguish malformed JWT-looking values from unrelated opaque secrets.',
);
assert.throws(
  () => classifyRecoveryAdminKey('some-random-jwt-secret-or-password'),
  /Do not use the project JWT Secret/i,
  'Recovery must explicitly warn against JWT Secret/database-password/PAT confusion.',
);

assert.match(
  storageCredentialFailureMessage('Invalid Compact JWS'),
  /sb_secret_/,
  'Invalid Compact JWS must produce actionable modern Secret-key guidance without echoing the supplied key.',
);
assert.match(
  storageCredentialFailureMessage('Invalid Compact JWS'),
  /not a usable Storage admin credential/i,
  'Provider JWS failures must explain that the configured secret is the wrong credential class.',
);

let receivedUrl;
let receivedKey;
const passingClientFactory = (url, key) => {
  receivedUrl = url;
  receivedKey = key;
  return {
    storage: {
      listBuckets: async () => ({ data: [{ id: 'one' }, { id: 'two' }], error: null }),
    },
  };
};

const pass = await validateRecoveryStorageSource({
  sourceUrl: EXPECTED_PRODUCTION_SUPABASE_URL,
  sourceKey: 'sb_secret_example',
  clientFactory: passingClientFactory,
});
assert.equal(pass.credentialKind, 'modern-secret');
assert.equal(pass.bucketCount, 2);
assert.equal(receivedUrl, EXPECTED_PRODUCTION_SUPABASE_URL);
assert.equal(receivedKey, 'sb_secret_example');

await assert.rejects(
  validateRecoveryStorageSource({
    sourceUrl: 'https://unexpected.supabase.co',
    sourceKey: 'sb_secret_example',
    clientFactory: passingClientFactory,
  }),
  /unexpected Supabase project origin/i,
  'Recovery preflight must stay bound to the reviewed production project.',
);

await assert.rejects(
  validateRecoveryStorageSource({
    sourceUrl: EXPECTED_PRODUCTION_SUPABASE_URL,
    sourceKey: 'sb_secret_example',
    clientFactory: () => ({
      storage: {
        listBuckets: async () => ({ data: null, error: { message: 'Invalid Compact JWS' } }),
      },
    }),
  }),
  /invalid JWT\/JWS/i,
  'Provider auth failures must become explicit credential-remediation guidance.',
);

console.log('Recovery Storage credential preflight contract: PASS');
