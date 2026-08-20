import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { extractCitationNumbers, validateGroundedAnswer } from '../src/lib/ai/grounding.mjs';

const route = readFileSync('src/app/api/knowledge/query/route.ts', 'utf8');
const groundingModule = readFileSync('src/lib/ai/grounding.mjs', 'utf8');

assert.deepEqual(
  extractCitationNumbers('Supported by [1] and [2]. Repeating [1] changes nothing.'),
  [1, 2],
  'citation parser must preserve unique source references in first-seen order',
);

assert.deepEqual(
  extractCitationNumbers('Combined evidence [1, 3] plus ordinary markdown [docs].'),
  [1, 3],
  'citation parser must support grouped numeric citations without treating arbitrary brackets as sources',
);

assert.deepEqual(
  extractCitationNumbers('Observe malformed numeric references [0], [-1], [+2].'),
  [0, -1, 2],
  'citation parser must retain non-positive numeric identifiers so validation can reject them',
);

assert.equal(
  validateGroundedAnswer('Supported fact [1].', [1, 2]).grounded,
  true,
  'an answer citing only supplied sources must pass the grounding integrity gate',
);

const noCitation = validateGroundedAnswer('A confident answer without evidence.', [1, 2]);
assert.equal(noCitation.grounded, false, 'answers without citations must fail closed');
assert.equal(noCitation.hasCitations, false, 'missing citations must remain distinguishable from invalid citations');

const fabricatedCitation = validateGroundedAnswer('Claim [3].', [1, 2]);
assert.equal(fabricatedCitation.grounded, false, 'fabricated citation numbers must fail closed');
assert.deepEqual(fabricatedCitation.invalidCitations, [3], 'invalid citations must be observable without logging answer text');

const mixedCitation = validateGroundedAnswer('Supported [1], unsupported [9].', [1, 2]);
assert.equal(mixedCitation.grounded, false, 'one valid citation must not mask an invalid citation');
assert.deepEqual(mixedCitation.invalidCitations, [9]);

const zeroCitation = validateGroundedAnswer('Supported [1], fabricated [0].', [1]);
assert.equal(zeroCitation.grounded, false, 'zero must be treated as a fabricated citation identifier');
assert.deepEqual(zeroCitation.invalidCitations, [0]);

const negativeCitation = validateGroundedAnswer('Supported [1], fabricated [-4].', [1]);
assert.equal(negativeCitation.grounded, false, 'negative numeric source identifiers must fail closed');
assert.deepEqual(negativeCitation.invalidCitations, [-4]);

const unsafeCitationNumber = Number.MAX_SAFE_INTEGER + 1;
const unsafeCitation = validateGroundedAnswer(`Supported [1], fabricated [${unsafeCitationNumber}].`, [1]);
assert.equal(unsafeCitation.grounded, false, 'unsafe integer source identifiers must fail closed');
assert.deepEqual(unsafeCitation.invalidCitations, [unsafeCitationNumber]);

assert.doesNotMatch(
  groundingModule,
  /fetch\s*\(/,
  'grounding validation must remain deterministic and provider-independent',
);
assert.match(
  route,
  /validateGroundedAnswer\(answer,\s*sources\.map\(\(source\) => source\.citation\)\)/,
  'knowledge query route must validate generated answers against the exact supplied citation set',
);
assert.match(
  route,
  /knowledge\.query\.grounding_rejected/,
  'grounding rejection must emit a structured observability event',
);
assert.match(
  route,
  /citationCount:\s*grounding\.citations\.length/,
  'successful knowledge queries must expose citation-count telemetry without logging answer text',
);

console.log('CTG Knowledge grounding invariants passed.');
