import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

function requireCondition(condition, message) {
  if (!condition) throw new Error(message);
}

function normalizeRiffPadding(bytes) {
  if (bytes.length < 8) return bytes;
  const declaredLength = bytes.readUInt32LE(4) + 8;
  const missingBytes = declaredLength - bytes.length;
  if (missingBytes > 0 && missingBytes <= 2) {
    return Buffer.concat([bytes, Buffer.alloc(missingBytes)]);
  }
  return bytes;
}

function assertWebpIntegrity(bytes, label) {
  const hasSignature = bytes.length >= 12
    && bytes.subarray(0, 4).toString('ascii') === 'RIFF'
    && bytes.subarray(8, 12).toString('ascii') === 'WEBP';
  const declaredLength = bytes.length >= 8 ? bytes.readUInt32LE(4) + 8 : 0;

  requireCondition(hasSignature, `${label}: missing RIFF/WEBP signature`);
  requireCondition(bytes.length >= 512, `${label}: payload is unexpectedly small (${bytes.length} bytes)`);
  requireCondition(declaredLength === bytes.length, `${label}: RIFF length mismatch actual=${bytes.length} declared=${declaredLength}`);

  let offset = 12;
  let hasImageChunk = false;
  while (offset < bytes.length) {
    requireCondition(offset + 8 <= bytes.length, `${label}: truncated chunk header at offset=${offset}`);
    const chunkType = bytes.subarray(offset, offset + 4).toString('ascii');
    const chunkSize = bytes.readUInt32LE(offset + 4);
    const payloadEnd = offset + 8 + chunkSize;
    requireCondition(payloadEnd <= bytes.length, `${label}: truncated ${chunkType} chunk end=${payloadEnd} actual=${bytes.length}`);
    if (chunkType === 'VP8 ' || chunkType === 'VP8L' || chunkType === 'VP8X') hasImageChunk = true;
    offset = payloadEnd + (chunkSize % 2);
  }

  requireCondition(hasImageChunk, `${label}: no WebP image chunk found`);
  requireCondition(offset === bytes.length, `${label}: invalid padded chunk layout offset=${offset} actual=${bytes.length}`);
}

const routePath = 'src/app/api/jpvalderrama/assets/[asset]/route.ts';
const iconPath = 'src/data/jpvalderrama-visuals/jp-icon.ts';
const [route, iconSource] = await Promise.all([
  readFile(routePath, 'utf8'),
  readFile(iconPath, 'utf8'),
]);

requireCondition(route.includes("import jpIcon from '@/data/jpvalderrama-visuals/jp-icon';"), 'JP icon must use the canonical repository payload');
requireCondition(route.includes("'jp-icon': jpIcon"), 'jp-icon compatibility alias must resolve to the canonical payload');
requireCondition(!route.includes("'jp-icon': 'brand.webp'"), 'jp-icon must not regress to the known truncated legacy brand.webp');
requireCondition(route.includes("'X-Content-Type-Options': 'nosniff'"), 'JP asset responses must explicitly emit nosniff');
requireCondition(route.includes('payloadEnd > bytes.length'), 'Runtime WebP validation must reject truncated inner chunks');

const encodedChunks = [...iconSource.matchAll(/'([A-Za-z0-9+/=]+)'/g)].map((match) => match[1]);
requireCondition(encodedChunks.length > 0, 'Canonical JP icon base64 chunks are missing');
const iconBytes = Buffer.from(encodedChunks.join(''), 'base64');
assertWebpIntegrity(iconBytes, 'canonical jp-icon');
const iconDigest = createHash('sha256').update(iconBytes).digest('hex');
requireCondition(iconDigest === '5fdc0f6a7d133e6b24ab2ea975889a864c5effcd886e57503503532efd5bd230', `Canonical JP icon digest changed unexpectedly: ${iconDigest}`);

const fileAssetsBlock = route.match(/const FILE_ASSETS = \{([\s\S]*?)\} as const;/)?.[1] ?? '';
const fileAssetNames = [...fileAssetsBlock.matchAll(/:\s*'([^']+\.webp)'/g)].map((match) => match[1]);
requireCondition(fileAssetNames.length > 0, 'FILE_ASSETS contract could not be parsed');

for (const fileName of fileAssetNames) {
  const raw = await readFile(join('public', 'jpvalderrama', fileName));
  assertWebpIntegrity(normalizeRiffPadding(raw), `file-backed JP asset ${fileName}`);
}

console.log(`JP Valderrama asset integrity contract passed: canonical jp-icon + ${fileAssetNames.length} file-backed aliases.`);