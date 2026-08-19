import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const KEY = '91c0bf8c45352125228946934655c313';
const read = (file) => readFile(new URL(`../${file}`, import.meta.url), 'utf8');
const [workflow, submitter, keyFile, sitemap] = await Promise.all([
  read('.github/workflows/indexnow.yml'),
  read('scripts/submit-indexnow.mjs'),
  read(`public/${KEY}.txt`),
  read('src/app/sitemap.ts'),
]);

assert.equal(keyFile.trim(), KEY, 'IndexNow ownership file must contain exactly the configured key.');
assert.match(workflow, /name:\s*IndexNow Recrawl Notification/, 'IndexNow workflow must have a stable name.');
assert.match(workflow, /\n\s*schedule:\s*\n/, 'IndexNow workflow must periodically discover new main commits.');
assert.match(workflow, /\n\s*workflow_dispatch:\s*\n/, 'IndexNow workflow must support explicit recrawl notification.');
assert.doesNotMatch(workflow, /\n\s*push:\s*\n/, 'IndexNow notification must not run before Render deploys a pushed main commit.');
assert.doesNotMatch(workflow, /\n\s*pull_request:\s*\n/, 'Unmerged content must never be submitted for recrawl.');
assert.doesNotMatch(workflow, /\n\s*workflow_run:\s*\n/, 'IndexNow must remain outside deployment check ordering.');
assert.match(workflow, /key:\s*indexnow-\$\{\{ github\.sha \}\}/, 'IndexNow workflow must deduplicate normal submissions by main commit SHA.');
assert.match(workflow, /api\.indexnow\.org\/indexnow/, 'IndexNow workflow must use the protocol global endpoint.');

assert.match(submitter, new RegExp(KEY), 'IndexNow submitter must use the deployed ownership key.');
assert.match(submitter, /keyLocation/, 'IndexNow batch must publish the ownership key location.');
assert.match(submitter, /urlList/, 'IndexNow submission must send a bounded URL batch.');
assert.match(submitter, /routePaths\.length > 10000/, 'IndexNow submission must enforce the protocol batch maximum.');
assert.match(submitter, /\[200, 202\]/, 'IndexNow submitter must accept only successful/accepted protocol responses.');
assert.match(submitter, /await response\.text\(\)/, 'IndexNow network timeout must cover complete response-body consumption.');

const sitemapRoutes = [...sitemap.matchAll(/path:\s*'([^']+)'/g)].length;
assert.ok(sitemapRoutes > 0 && sitemapRoutes < 10000, 'Repository sitemap must fit in one IndexNow batch.');

console.log(`IndexNow invariants: PASS (${sitemapRoutes} public URLs).`);
