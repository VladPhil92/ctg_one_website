import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const readme = await read('README.md');
const systemState = await read('docs/architecture/SYSTEM_STATE.md');
const historicalAudit = await read('docs/architecture/REPOSITORY_AUDIT_CURRENT.md');

assert.ok(
  systemState.includes('CURRENT GOVERNANCE MAP')
    && systemState.includes('src/lib/observability/schema-version.ts')
    && systemState.includes('src/data/technology-proof.ts')
    && systemState.includes('supabase/migrations/'),
  'SYSTEM_STATE must identify the authoritative runtime and capability sources.',
);

assert.ok(
  historicalAudit.includes('SUPERSEDED') && historicalAudit.includes('DO NOT USE AS CURRENT SYSTEM STATE'),
  'The dated repository audit must never masquerade as current system state.',
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
  'README must not maintain a second hand-written migration registry.',
);
assert.ok(
  !readme.includes('0027_inventory_location_fk_index.sql'),
  'README must not retain the obsolete migration list that stopped at 0027.',
);
assert.ok(
  readme.includes('EXPECTED_DATABASE_MIGRATION')
    && readme.includes('EXPECTED_DATABASE_MIGRATION_NAME')
    && readme.includes('EXPECTED_DATABASE_MIGRATION_COUNT'),
  'README must direct database-version checks to the runtime schema contract.',
);

console.log('Documentation governance invariants: PASS');
