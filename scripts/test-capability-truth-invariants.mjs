import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const [proof, hero, about, token, content, flags, legal, ecosystemTechnology] = await Promise.all([
  read('src/data/technology-proof.ts'),
  read('src/components/sections/HeroSection.tsx'),
  read('src/components/sections/AboutSection.tsx'),
  read('src/components/sections/TokenSection.tsx'),
  read('src/data/content.ts'),
  read('src/lib/investment/flags.ts'),
  read('src/app/inversion/legal/page.tsx'),
  read('src/data/ecosystem-technology.ts'),
]);

assert.ok(proof.includes("publicStatus: 'BETA'"), 'Controlled pilots must be representable as BETA in the public capability registry.');
assert.match(
  proof,
  /id: 'investment-platform'[\s\S]*?publicStatus: 'BETA'/,
  'CTG Craft Beer Investment must remain publicly classified as BETA while public funding is fail-closed.',
);
assert.match(
  proof,
  /id: 'web3'[\s\S]*?status: 'ROADMAP'/,
  'CTGO/Web3 must remain ROADMAP until verifiable on-chain production evidence exists.',
);
assert.match(
  proof,
  /id: 'ai-layer'[\s\S]*?status: 'IN DEVELOPMENT'/,
  'The general AI layer must not be promoted to LIVE without production evidence.',
);
assert.match(
  proof,
  /id: 'ctg-knowledge-v01'[\s\S]*?publicStatus: 'BETA'/,
  'CTG Knowledge must remain a BETA pilot until reproducible evaluation and operating evidence exist.',
);
assert.match(
  proof,
  /id: 'observability-baseline'[\s\S]*?status: 'PARTIAL'/,
  'Observability baseline must reflect the implemented health/logging/correlation layer.',
);

assert.ok(hero.includes('getCapabilityProof'), 'Hero capability states must come from the canonical proof registry.');
assert.ok(hero.includes('getPublicProofStatus'), 'Hero must render public maturity from the canonical proof registry.');
assert.ok(!hero.includes("en: 'Proprietary software · Live'"), 'Hero must not hard-code maturity labels independently of Technology Status.');
assert.ok(!hero.includes("en: 'Applied AI · In development'"), 'Hero AI maturity must not be hard-coded independently of Technology Status.');

assert.ok(about.includes("getCapabilityProof('observability-baseline').status"), 'About observability maturity must come from the canonical proof registry.');
assert.ok(about.includes("getCapabilityProof('ai-layer').status"), 'About AI maturity must come from the canonical proof registry.');
assert.ok(about.includes("getCapabilityProof('data-security').status"), 'About data/security maturity must come from the canonical proof registry.');
assert.ok(about.includes("getCapabilityProof('delivery-platform').status"), 'About delivery maturity must come from the canonical proof registry.');
assert.doesNotMatch(
  about,
  /label: es \? 'Observabilidad' : 'Observability', status: 'ROADMAP'/,
  'About must not independently downgrade the implemented observability baseline to ROADMAP.',
);

for (const forbidden of [
  /\b2[,.]?450\+?\s+holders\b/i,
  /\b45%\s+(?:tokens\s+)?staked\b/i,
  /\b(?:apy|tvl)\s*[:·-]?\s*\d/i,
  /\b(?:usd|us\$|\$)\s*0[.,]10\b/i,
  /\b1\s*b(?:illion)?\s+ctgo\b/i,
]) {
  assert.ok(!forbidden.test(`${token}\n${content}`), `Unverified CTGO metric reintroduced: ${forbidden}`);
}
assert.ok(token.includes('No publicamos cifras de holders, precio, APY, TVL'), 'Token surface must explicitly reject unverified on-chain metrics.');
assert.ok(content.includes("status: 'ROADMAP'"), 'Shared CTGO content must remain ROADMAP.');

assert.ok(flags.includes('CTG_INVESTMENT_PUBLIC_FUNDING_ENABLED'), 'Investment public-funding feature flag must remain explicit.');
assert.ok(flags.includes('defaultValue = false') || flags.includes("=== 'true'"), 'Investment flags must remain fail-closed.');
assert.match(legal, /beta cerrada|closed beta/i, 'Investment legal surface must disclose the controlled beta stage.');

assert.doesNotMatch(
  ecosystemTechnology,
  /id: 'craftbeer'[\s\S]*?status: 'LIVE'/,
  'The ecosystem map must not present CTG Craft Beer Investment as fully LIVE while the public release stage is BETA.',
);
assert.match(
  ecosystemTechnology,
  /id: 'craftbeer'[\s\S]*?beta controlada/i,
  'The ecosystem map must disclose that CTG Craft Beer Investment remains a controlled beta.',
);

assert.match(content, /badge: 'CTG Rewards · Roadmap'/, 'CTG Rewards must be visibly classified as roadmap.');
assert.match(
  content,
  /CTG Rewards is a roadmap concept[\s\S]*?not represented as a currently active cross-ecosystem rewards program/i,
  'CTG Rewards must not imply that a shared cross-ecosystem loyalty program is already active.',
);
assert.doesNotMatch(content, /title: 'Earn by (?:Engaging|Referring)'/, 'Roadmap Rewards copy must not use active earning language without a verified program.');

const ecosystemUnits = [...content.matchAll(/\{ id: '[^']+', name: '[^']+'/g)].length;
const heroBusinessUnits = content.match(/\{ value: '(\d+)', label: 'Business Units'/)?.[1];
assert.ok(heroBusinessUnits, 'Hero Business Units metric must remain explicit.');
assert.equal(Number(heroBusinessUnits), ecosystemUnits, 'Hero Business Units metric must equal the canonical ecosystem unit list.');

console.log('Capability truth invariants: PASS');