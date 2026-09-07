import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const readme = await read('README.md');
const docsIndex = await read('docs/README.md');
const systemState = await read('docs/architecture/SYSTEM_STATE.md');

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

await assert.rejects(
  access(new URL('../docs/architecture/REPOSITORY_AUDIT_CURRENT.md', import.meta.url)),
  'The misleading superseded repository audit must stay removed.',
);

assert.ok(
  readme.includes('docs/architecture/SYSTEM_STATE.md'),
  'README must point engineers and agents to the source-of-truth governance map.',
);
assert.ok(
  readme.includes('`BETA`') && !readme.includes('`PILOT` cuando corresponda al producto'),
  'README maturity language must match the canonical public BETA release stage.',
);
assert.ok(
  readme.includes('No se mantiene una lista manual de migraciones en este README.'),
  'README must explicitly reject a second hand-written migration registry.',
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

console.log('Documentation governance invariants: PASS');
