import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const proof = await read('src/data/technology-proof.ts');
const rewards = await read('src/components/sections/RewardsSection.tsx');
const layout = await read('src/app/layout.tsx');

assert.ok(
  proof.includes("id: 'ctg-rewards'") && proof.includes("capability: 'Cross-ecosystem CTG Rewards loyalty and referral rail'") && proof.includes("status: 'ROADMAP'"),
  'CTG Rewards must remain registered as a ROADMAP capability until production evidence exists.',
);

assert.ok(
  rewards.includes('CTG Rewards · Product concept') && rewards.includes('ROADMAP'),
  'The public Rewards section must disclose that CTG Rewards is a roadmap product concept.',
);
assert.ok(
  rewards.includes('No cross-ecosystem earning program is represented as active today.'),
  'Rewards copy must explicitly avoid implying a production earning program.',
);
assert.ok(
  !rewards.includes('Earn by Engaging') && !rewards.includes('Earn by Referring') && !rewards.includes('Redeem Across the Ecosystem'),
  'Rewards must not use active earn/redeem language while the cross-ecosystem program remains ROADMAP.',
);

assert.ok(
  layout.includes('advanced AI capabilities remain evidence-gated by maturity status'),
  'Root metadata must qualify advanced AI capabilities by their verified maturity status.',
);
assert.ok(
  layout.includes('selected automation workflows'),
  'Root metadata must not imply a universal production automation layer.',
);
assert.ok(
  !layout.includes('identity, automation and shared technology for real operating companies'),
  'Legacy metadata must not overstate automation as a universally operating platform capability.',
);

console.log('Public claims invariants: PASS');
