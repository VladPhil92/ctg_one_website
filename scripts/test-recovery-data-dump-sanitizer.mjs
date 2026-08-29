import assert from 'node:assert/strict';
import { sanitizeRecoveryDataDump } from './sanitize-recovery-data-dump.mjs';

const source = `-- pg_dump data
SET statement_timeout = 0;
COPY public.profiles (id, display_name) FROM stdin;
1\tstorage.buckets is ordinary user text
\\.
COPY storage.buckets (id, name, versioning_status) FROM stdin;
receipts\treceipts\tenabled
\\.
COPY "storage"."objects" (id, bucket_id, name) FROM stdin;
1\treceipts\tproof.pdf
\\.
SELECT pg_catalog.setval('storage.multipart_uploads_id_seq'::regclass, 4, true);
COPY auth.users (id, email) FROM stdin;
00000000-0000-0000-0000-000000000001\tuser@example.invalid
\\.
`;

const result = sanitizeRecoveryDataDump(source);
assert.equal(result.removedStorageCopyBlocks, 2);
assert.equal(result.removedStorageStatements, 1);
assert.match(result.text, /COPY public\.profiles/);
assert.match(result.text, /storage\.buckets is ordinary user text/);
assert.match(result.text, /COPY auth\.users/);
assert.doesNotMatch(result.text, /^COPY\s+(?:"storage"|storage)\./m);
assert.doesNotMatch(result.text, /storage\.multipart_uploads_id_seq/);
assert.doesNotMatch(result.text, /versioning_status/);
assert.doesNotMatch(result.text, /proof\.pdf/);

assert.throws(
  () => sanitizeRecoveryDataDump('COPY storage.buckets (id) FROM stdin;\nrow-without-terminator\n'),
  /unterminated COPY block/,
);

assert.throws(
  () => sanitizeRecoveryDataDump('ALTER TABLE storage.buckets ADD COLUMN unexpected text;\n'),
  /unsupported managed Storage SQL/,
);

const crlf = 'COPY "storage"."buckets" (id) FROM stdin;\r\nreceipts\r\n\\.\r\nCOPY public.t (v) FROM stdin;\r\nok\r\n\\.\r\n';
const crlfResult = sanitizeRecoveryDataDump(crlf);
assert.equal(crlfResult.removedStorageCopyBlocks, 1);
assert.equal(crlfResult.text, 'COPY public.t (v) FROM stdin;\r\nok\r\n\\.\r\n');

console.log('Recovery data dump sanitizer: PASS');
