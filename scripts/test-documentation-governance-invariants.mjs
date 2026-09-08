import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const readme = await read('README.md');
const docsIndex = await read('docs/README.md');
const systemState = await read('docs/architecture/SYSTEM_STATE.md');
const parityRunbook = await read('docs/infrastructure/PRODUCTION_REPOSITORY_PARITY.md');

assert.ok(
  systemState.includes('CURRENT GOVERNANCE MAP')
    && systemState.includes('src/lib/observability/schema-version.ts')
    && systemState.includes('src/data/technology-proof.ts')
    && systemState.includes('supabase/migrations/'),
  'SYSTEM_STATE must identify the authoritative runtime and capability sources.',
);

assert.ok(
  docsIndex.includes('CTG One Documentation Map')
    && docsIndex.includes('architecture/SYSTEM_STATE.md')
    && docsIndex.includes('src/lib/observability/schema-version.ts')
    && docsIndex.includes('src/data/technology-proof.ts'),
  'docs/README.md must act as the repository documentation entry point and authority map.',
);

assert.ok(
  parityRunbook.includes('Production ↔ Repository Parity')
    && parityRunbook.includes('Commit parity')
    && parityRunbook.includes('Public capability parity')
    && parityRunbook.includes('src/data/technology-proof.ts'),
  'Production parity runbook must cover source, runtime and public semantic coherence.',
);

await assert.rejects(
  access(new URL('../docs/architecture/REPOSITORY_AUDIT_CURRENT.md', import.meta.url)),
  'The misleading superseded repository audit must stay removed.',
);

assert.ok(
  readme.includes('docs/architecture/SYSTEM_STATE.md'),
  'README must point engineers and agents to the source-of-truth governance map.',
);
assert.ok(
  readme.includes('docs/infrastructure/PRODUCTION_REPOSITORY_PARITY.md'),
  'README must point release verification to the production/repository parity runbook.',
);
assert.ok(
  readme.includes('`BETA`') && !readme.includes('`PILOT` cuando corresponda al producto'),
  'README maturity language must match the canonical public BETA release stage.',
);
assert.ok(
  readme.includes('La presencia de una migración en Git no prueba que esté aplicada en producción.'),
  'README must reject using the Git migration directory as proof of production runtime state.',
);

const migrationFilenamePattern = /\b\d{4}_[a-z0-9_]+\.sql\b/g;
const handWrittenMigrationFiles = readme.match(migrationFilenamePattern) ?? [];
assert.deepEqual(
  handWrittenMigrationFiles,
  [],
  `README must not enumerate migration filenames; found: ${handWrittenMigrationFiles.join(', ')}`,
);

assert.ok(
  readme.includes('EXPECTED_DATABASE_MIGRATION')
    && readme.includes('EXPECTED_DATABASE_MIGRATION_NAME')
    && readme.includes('EXPECTED_DATABASE_MIGRATION_COUNT'),
  'README must direct database-version checks to the runtime schema contract.',
);

assert.ok(
  readme.includes('JP Valderrama')
    && readme.includes('/jpvalderrama/campus')
    && readme.includes('/dashboard/educacion'),
  'README must include the current education bounded context and primary routes.',
);

assert.ok(
  systemState.includes('fixed price') || systemState.includes('fixed-price') || systemState.includes('published fixed price'),
  'SYSTEM_STATE must preserve the direct fixed-price education commerce rule.',
);

assert.ok(
  systemState.includes('source parity')
    && systemState.includes('semantic parity')
    && systemState.includes('getCapabilityProof(...)')
    && systemState.includes('getPublicProofStatus(...)'),
  'SYSTEM_STATE must preserve production/source parity and canonical public maturity derivation rules.',
);

console.log('Documentation governance invariants: PASS');
