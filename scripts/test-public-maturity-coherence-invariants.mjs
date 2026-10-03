import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const [proof, dashboardServices, homeShowcases] = await Promise.all([
  read('src/data/technology-proof.ts'),
  read('src/config/dashboard-services.ts'),
  read('src/components/sections/HomeProductShowcases.tsx'),
]);

function proofItemBlock(id) {
  const marker = `id: '${id}'`;
  const markerIndex = proof.indexOf(marker);
  assert.notEqual(markerIndex, -1, `Canonical proof item ${id} must exist.`);

  const blockStart = proof.lastIndexOf('{', markerIndex);
  const nextBlock = proof.indexOf('\n  {', markerIndex + marker.length);
  return proof.slice(blockStart, nextBlock === -1 ? proof.length : nextBlock);
}

const dashboardRegistryStart = dashboardServices.indexOf('export const DASHBOARD_SERVICES:');
assert.notEqual(dashboardRegistryStart, -1, 'DASHBOARD_SERVICES registry must exist.');
const dashboardRegistry = dashboardServices.slice(dashboardRegistryStart);

function serviceBlock(id) {
  const marker = `{ id: '${id}'`;
  const markerIndex = dashboardRegistry.indexOf(marker);
  assert.notEqual(markerIndex, -1, `Dashboard service ${id} must exist.`);

  const nextBlock = dashboardRegistry.indexOf('\n  {', markerIndex + marker.length);
  return dashboardRegistry.slice(markerIndex, nextBlock === -1 ? dashboardRegistry.length : nextBlock);
}

assert.match(
  proofItemBlock('investment-platform'),
  /publicStatus: 'BETA'/,
  'Investment public maturity must remain BETA until the evidence gate promotes it.',
);
assert.match(
  proofItemBlock('ctg-knowledge-v01'),
  /publicStatus: 'BETA'/,
  'CTG Knowledge public maturity must remain BETA until the evidence gate promotes it.',
);
assert.match(
  proofItemBlock('web3'),
  /status: 'PARTIAL'/,
  'CTGO/Web3 must remain PARTIAL while production is verified but market/governance evidence is still consolidating.',
);

for (const [serviceId, capabilityId, variableName] of [
  ['investment', 'investment-platform', 'investmentStatus'],
  ['token', 'web3', 'tokenStatus'],
  ['knowledge', 'ctg-knowledge-v01', 'knowledgeStatus'],
  ['vertice', 'vertice-federation', 'verticeStatus'],
]) {
  assert.ok(
    dashboardServices.includes(`getCapabilityProof('${capabilityId}')`),
    `${serviceId} must resolve maturity from ${capabilityId}.`,
  );
  assert.match(
    serviceBlock(serviceId),
    new RegExp(`status: ${variableName}`),
    `${serviceId} must render its canonical maturity variable instead of a manual status.`,
  );
}

assert.doesNotMatch(
  serviceBlock('investment'),
  /status: 'LIVE'/,
  'Investment must not be presented as LIVE while canonical public maturity is BETA.',
);
assert.doesNotMatch(
  serviceBlock('knowledge'),
  /status: 'PILOT'/,
  'Knowledge must not maintain a second PILOT label independent of canonical BETA.',
);
assert.doesNotMatch(
  serviceBlock('token'),
  /status: 'CONSOLIDATION'/,
  'CTGO must not maintain a second consolidation label independent of canonical PARTIAL.',
);

assert.ok(
  homeShowcases.includes("getCapabilityProof('web3')"),
  'CTGO homepage showcase must resolve maturity from the canonical proof registry.',
);
assert.ok(
  homeShowcases.includes('getPublicProofStatus(ctgoProof)'),
  'CTGO homepage showcase must render public maturity from the canonical proof registry.',
);
assert.match(
  homeShowcases,
  /CTGO ya está desplegado y verificado en Polygon PoS|CTGO is deployed and verified on Polygon PoS/i,
  'Homepage must acknowledge the now-verified canonical production deployment.',
);
assert.match(
  homeShowcases,
  /0xe4200d6beD0DB8E720Cbb840c572182676515132/i,
  'Homepage CTGO copy must publish the canonical Polygon contract.',
);
assert.match(
  homeShowcases,
  /no se garantiza un precio fiat fijo|no fixed fiat price is guaranteed/i,
  'Homepage CTGO copy must preserve the market-price evidence boundary.',
);

console.log('Public maturity coherence invariants: PASS');
