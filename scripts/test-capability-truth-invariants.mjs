import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const [
  proof,
  hero,
  about,
  services,
  aiPlatform,
  token,
  rewards,
  content,
  homeOverview,
  ecosystemSection,
  translations,
  flags,
  legal,
  ecosystemTechnology,
] = await Promise.all([
  read('src/data/technology-proof.ts'),
  read('src/components/sections/HeroSection.tsx'),
  read('src/components/sections/AboutSection.tsx'),
  read('src/components/sections/ServicesSection.tsx'),
  read('src/components/sections/AIPlatformSection.tsx'),
  read('src/components/sections/TokenSection.tsx'),
  read('src/components/sections/RewardsSection.tsx'),
  read('src/data/content.ts'),
  read('src/data/home-overview.ts'),
  read('src/components/sections/EcosystemSection.tsx'),
  read('src/i18n/translations.ts'),
  read('src/lib/investment/flags.ts'),
  read('src/app/inversion/legal/page.tsx'),
  read('src/data/ecosystem-technology.ts'),
]);

function proofItemBlock(id) {
  const marker = `id: '${id}'`;
  const markerIndex = proof.indexOf(marker);
  assert.notEqual(markerIndex, -1, `Canonical proof item ${id} must exist.`);

  const blockStart = proof.lastIndexOf('{', markerIndex);
  const nextBlock = proof.indexOf('\n  {', markerIndex + marker.length);
  return proof.slice(blockStart, nextBlock === -1 ? proof.length : nextBlock);
}

function between(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  assert.notEqual(start, -1, `Missing start marker: ${startMarker}`);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert.notEqual(end, -1, `Missing end marker after ${startMarker}: ${endMarker}`);
  return source.slice(start, end);
}

function idsFromRegistryBlock(source, startMarker, endMarker) {
  return [...between(source, startMarker, endMarker).matchAll(/\bid:\s*'([^']+)'/g)]
    .map((match) => match[1])
    .sort();
}

assert.ok(proof.includes("publicStatus: 'BETA'"), 'Controlled pilots must be representable as BETA in the public capability registry.');
assert.match(
  proofItemBlock('investment-platform'),
  /publicStatus: 'BETA'/,
  'CTG Craft Beer Investment must remain publicly classified as BETA while public funding is fail-closed.',
);
assert.match(
  proofItemBlock('web3'),
  /status: 'ROADMAP'/,
  'CTGO/Web3 must remain ROADMAP until verifiable on-chain production evidence exists.',
);
assert.match(
  proofItemBlock('ai-layer'),
  /status: 'IN DEVELOPMENT'/,
  'The general AI layer must not be promoted to LIVE without production evidence.',
);
assert.match(
  proofItemBlock('ctg-knowledge-v01'),
  /publicStatus: 'BETA'/,
  'CTG Knowledge must remain a BETA pilot until reproducible evaluation and operating evidence exist.',
);
assert.match(
  proofItemBlock('observability-baseline'),
  /status: 'PARTIAL'/,
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

for (const capabilityId of ['identity-auth', 'data-security', 'delivery-platform', 'observability-baseline', 'ai-layer']) {
  assert.ok(
    services.includes(`getCapabilityProof('${capabilityId}').status`),
    `Services maturity for ${capabilityId} must come from the canonical proof registry.`,
  );
}
assert.ok(services.includes('ECOSYSTEM.units'), 'Services operating-business tiles must derive from the canonical ecosystem registry.');
assert.ok(services.includes(".filter((unit) => unit.id !== 'tech')"), 'Services must explicitly exclude the CTG One Technology core from the operating-business tile layer.');
assert.doesNotMatch(
  services,
  /title: 'Observabilidad'[\s\S]*?status: 'ROADMAP'/,
  'Services must not independently downgrade the implemented observability baseline to ROADMAP.',
);
assert.doesNotMatch(
  services,
  /title: 'Observability'[\s\S]*?status: 'ROADMAP'/,
  'Services must not independently downgrade the implemented observability baseline to ROADMAP in English.',
);

assert.ok(aiPlatform.includes("getCapabilityProof('ai-layer')"), 'AI platform overall maturity must come from the canonical proof registry.');
assert.ok(aiPlatform.includes("getCapabilityProof('ctg-knowledge-v01')"), 'CTG Knowledge maturity must come from the canonical proof registry.');
assert.ok(aiPlatform.includes('getPublicProofStatus(knowledgeProof)'), 'AI platform must render CTG Knowledge public release stage from the canonical registry.');
assert.match(aiPlatform, /CTG Knowledge ya cuenta con un piloto autenticado/i, 'Spanish AI copy must acknowledge the implemented authenticated CTG Knowledge pilot.');
assert.match(aiPlatform, /CTG Knowledge already has an authenticated pilot/i, 'English AI copy must acknowledge the implemented authenticated CTG Knowledge pilot.');
assert.doesNotMatch(aiPlatform, /hasta que exista pipeline real/i, 'AI platform must not claim CTG Knowledge lacks a real pipeline after the authenticated pilot exists.');
assert.doesNotMatch(aiPlatform, /until a real pipeline/i, 'AI platform must not claim CTG Knowledge lacks a real pipeline after the authenticated pilot exists.');
assert.match(aiPlatform, /no se promoverá a LIVE hasta contar con evaluación reproducible/i, 'Spanish AI copy must keep LIVE promotion evidence-gated.');
assert.match(aiPlatform, /will not be promoted to LIVE until reproducible evaluation/i, 'English AI copy must keep LIVE promotion evidence-gated.');

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
  /CTG Rewards is a planned loyalty and referral program[\s\S]*?isn't live yet/i,
  'CTG Rewards must not imply that a shared cross-ecosystem loyalty program is already active.',
);
assert.doesNotMatch(content, /title: 'Earn by (?:Engaging|Referring)'/, 'Roadmap Rewards copy must not use active earning language without a verified program.');
assert.ok(rewards.includes('useLanguage'), 'Rewards must respect the selected public locale.');
assert.match(rewards, /CTG Rewards · Hoja de ruta/, 'Spanish Rewards must visibly disclose roadmap status.');
assert.doesNotMatch(rewards, /Gana al participar|Gana al referir/, 'Roadmap Rewards must not use active earning language in Spanish.');

// Public positioning must remain affirmative and technology-first. Historical
// positioning language is forbidden even when used as a negation or disclaimer.
const publicPositioningSources = [
  ['hero', hero],
  ['about', about],
  ['services', services],
  ['shared content', content],
  ['home overview', homeOverview],
  ['ecosystem', ecosystemSection],
  ['rewards', rewards],
  ['token', token],
  ['translations', translations],
];
for (const [name, source] of publicPositioningSources) {
  assert.doesNotMatch(source, /\bagencia\b/i, `${name} must not mention historical agency positioning.`);
  assert.doesNotMatch(source, /\bagency\b/i, `${name} must not mention historical agency positioning.`);
  assert.doesNotMatch(source, /\barquitectura\s+dual\b/i, `${name} must not reintroduce the historical dual-positioning narrative.`);
  assert.doesNotMatch(source, /\bdual\s+architecture\b/i, `${name} must not reintroduce the historical dual-positioning narrative.`);
}

// Ecosystem identity: CTG One Technology is the technology core; operating
// businesses are derived from the same canonical registry everywhere.
assert.match(content, /export const ECOSYSTEM_UNITS\s*=\s*\[/, 'A canonical ecosystem unit registry must exist.');
assert.match(
  content,
  /export const OPERATING_BUSINESS_UNITS\s*=\s*ECOSYSTEM_UNITS\.filter\(\(unit\) => unit\.id !== 'tech'\)/,
  'Operating businesses must be derived by excluding the CTG One Technology core.',
);
assert.match(
  content,
  /export const OPERATING_BUSINESS_UNIT_COUNT\s*=\s*OPERATING_BUSINESS_UNITS\.length/,
  'Operating-business count must be derived from the canonical operating-business registry.',
);
assert.match(
  content,
  /value:\s*String\(OPERATING_BUSINESS_UNIT_COUNT\),\s*label:\s*'Operating Businesses'/,
  'Hero operating-business metric must use the derived canonical count.',
);
assert.ok(about.includes('OPERATING_BUSINESS_UNIT_COUNT'), 'About operating-business metric must use the canonical derived count.');
assert.ok(homeOverview.includes('OPERATING_BUSINESS_UNIT_COUNT'), 'Home overview ecosystem copy must use the canonical derived count.');
assert.match(
  ecosystemSection,
  /operatingTechnologyUnits\s*=\s*ECOSYSTEM_TECHNOLOGY_UNITS\.filter\(\(unit\) => unit\.id !== 'tech'\)/,
  'Ecosystem aggregate operating metrics must exclude the technology core.',
);
assert.match(
  ecosystemSection,
  /CTG One Technology (?:se representa como la capa central|is represented as the core layer)/i,
  'Ecosystem public copy must explicitly model CTG One Technology as the central technology layer.',
);

const contentRegistryIds = idsFromRegistryBlock(
  content,
  'export const ECOSYSTEM_UNITS = [',
  '] as const;',
);
const technologyRegistryIds = idsFromRegistryBlock(
  ecosystemTechnology,
  'export const ECOSYSTEM_TECHNOLOGY_UNITS: EcosystemTechnologyUnit[] = [',
  '];\n\nexport const CTG_ONE_OS_MODULES',
);
assert.deepEqual(
  contentRegistryIds,
  technologyRegistryIds,
  'Canonical ecosystem identity and technology-map registries must contain the same unit IDs.',
);
assert.equal(
  contentRegistryIds.filter((id) => id !== 'tech').length,
  technologyRegistryIds.filter((id) => id !== 'tech').length,
  'Operating-business counts must remain aligned across public registries.',
);
assert.match(translations, /en: 'Operating Businesses', es: 'Negocios operativos'/, 'Operating-business metric must have explicit bilingual terminology.');
assert.match(
  hero,
  /'Portal multiservicios · Una sola cuenta'[\s\S]*?'Multi-service portal · One account'/,
  'Hero multi-service identity eyebrow must have explicit bilingual terminology.',
);

console.log('Capability truth invariants: PASS');