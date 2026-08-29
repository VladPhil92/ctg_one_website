import assert from 'node:assert/strict';
import {
  EXPECTED_PRODUCTION_SUPABASE_URL,
  classifyRecoveryAdminKey,
  storageCredentialFailureMessage,
  validateRecoveryStorageSource,
} from './validate-recovery-storage-source.mjs';

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
  () => classifyRecoveryAdminKey('not-a-supabase-key'),
  /not a recognized Supabase server credential/i,
  'Recovery must reject malformed credentials locally.',
);

assert.match(
  storageCredentialFailureMessage('Invalid Compact JWS'),
  /sb_secret_/,
  'Invalid Compact JWS must produce actionable modern Secret-key guidance without echoing the supplied key.',
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
