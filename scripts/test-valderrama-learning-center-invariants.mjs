import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read = path => readFile(new URL('../'+path, import.meta.url),'utf8');
const [proxy,services,render,landing,home,demo,engine,robots] = await Promise.all([
  read('src/proxy.ts'),read('src/config/dashboard-services.ts'),read('render.yaml'),
  read('src/app/valderrama-learning-center/page.tsx'),
  read('public/valderrama-learning-center/index.html'),
  read('public/valderrama-learning-center/demo/index.html'),
  read('public/valderrama-learning-center/src/marketplace.js'),
  read('public/valderrama-learning-center/robots.txt')
]);
assert.match(proxy,/valderramalearnigncenter\.ctgone\.com/);
assert.match(proxy,/handleValderramaLearningCenterHost\(request\)/);
assert.match(proxy,/status: 404/);
assert.match(proxy,/\/valderrama-learning-center/);
assert.match(services,/id: 'learning-center-marketplace'/);
assert.match(services,/status: 'DEVELOPMENT'/);
assert.match(render,/valderramalearnigncenter\.ctgone\.com/);
assert.match(landing,/robots: \{ index: false, follow: false \}/);
assert.match(home,/noindex,nofollow/);
assert.match(demo,/ENTORNO DE DEMOSTRACIÓN/);
assert.match(engine,/export function requestClass/);
assert.match(engine,/export function reportIncident/);
assert.match(robots,/Disallow: \/$/m);
console.log('VLC subdomain, static snapshot and isolation contract OK.');
