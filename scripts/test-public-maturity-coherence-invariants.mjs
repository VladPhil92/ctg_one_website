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

function serviceBlock(id) {
  const marker = `{ id: '${id}'`;
  const markerIndex = dashboardServices.indexOf(marker);
  assert.notEqual(markerIndex, -1, `Dashboard service ${id} must exist.`);

  const nextBlock = dashboardServices.indexOf('\n  {', markerIndex + marker.length);
  return dashboardServices.slice(markerIndex, nextBlock === -1 ? dashboardServices.length : nextBlock);
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
  /status: 'ROADMAP'/,
  'CTGO/Web3 must remain ROADMAP until verified production evidence exists.',
);

for (const [serviceId, capabilityId, variableName] of [
  ['investment', 'investment-platform', 'investmentStatus'],
  ['token', 'web3', 'tokenStatus'],
  ['knowledge', 'ctg-knowledge-v01', 'knowledgeStatus'],
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
  'CTGO must not maintain a second consolidation label independent of canonical ROADMAP.',
);

assert.ok(
  homeShowcases.includes("getCapabilityProof('web3')"),
  'CTGO homepage showcase must resolve maturity from the canonical proof registry.',
);
assert.ok(
  homeShowcases.includes('getPublicProofStatus(ctgoProof)'),
  'CTGO homepage showcase must render public maturity from the canonical proof registry.',
);
assert.doesNotMatch(
  homeShowcases,
  /CTGO ya fue desplegado en Polygon|CTGO has already been deployed on Polygon/i,
  'Homepage must not publish an on-chain production deployment claim without canonical evidence.',
);
assert.match(
  homeShowcases,
  /no publicamos un contrato o red de producción como verificados|do not publish a production contract or network as verified/i,
  'Homepage CTGO copy must disclose the current evidence boundary.',
);

console.log('Public maturity coherence invariants: PASS');
