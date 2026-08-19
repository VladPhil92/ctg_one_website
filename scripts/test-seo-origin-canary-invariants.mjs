import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), 'utf8');
const [workflow, verifier] = await Promise.all([
  read('.github/workflows/seo-origin-canary.yml'),
  read('scripts/verify-seo-origin.mjs'),
]);

assert.match(workflow, /name:\s*SEO Origin Canary/, 'SEO origin workflow must have a stable name.');
assert.match(workflow, /\n\s*schedule:\s*\n/, 'SEO origin canary must run periodically.');
assert.match(workflow, /\n\s*workflow_dispatch:\s*\n/, 'SEO origin canary must support explicit verification.');
assert.doesNotMatch(workflow, /\n\s*push:\s*\n/, 'SEO origin canary must not join the pre-deploy push check graph.');
assert.doesNotMatch(workflow, /\n\s*pull_request:\s*\n/, 'SEO origin canary must not run against unmerged branches.');
assert.doesNotMatch(workflow, /\n\s*workflow_run:\s*\n/, 'SEO origin canary must remain independent from deployment trigger ordering.');
assert.match(workflow, /node scripts\/verify-seo-origin\.mjs/, 'Workflow must execute the repository-owned SEO verifier.');
assert.match(workflow, /timeout-minutes:\s*8/, 'SEO origin workflow must be time-bounded.');

assert.match(verifier, /robots\.txt/, 'SEO verifier must validate robots.txt.');
assert.match(verifier, /sitemap\.xml/, 'SEO verifier must validate sitemap.xml.');
assert.match(verifier, /canonicalHref/, 'SEO verifier must inspect rendered canonical links.');
assert.match(verifier, /canonical does not self-reference/, 'SEO verifier must reject non-self-canonical public routes.');
assert.match(verifier, /unexpectedly declares noindex/, 'SEO verifier must reject noindex on sitemap routes.');
assert.match(verifier, /requestTimeoutMs/, 'Every SEO origin request must have a bounded timeout.');
assert.match(verifier, /await response\.text\(\)/, 'SEO verifier must consume the complete response body before clearing its request timer.');

console.log('SEO origin canary invariants: PASS');
